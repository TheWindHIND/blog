from fastapi import APIRouter, Body, UploadFile, File, Form
import httpx
import hashlib
import time
import string
import random

router = APIRouter()

# StarDots API 基础地址
STARDOTS_API_BASE = "https://api.stardots.io"
# 默认空间名
STARDOTS_DEFAULT_SPACE = "blogimg111"


def _generate_nonce(length=16):
    """生成随机字符串（大写字母+小写字母+数字）"""
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))


def _make_stardots_headers(client_key: str, client_secret: str):
    """生成 StarDots API 认证头"""
    timestamp = str(int(time.time()))
    nonce = _generate_nonce()
    # 签名算法: md5(timestamp + "|" + secret + "|" + nonce) 然后转大写
    sign_str = f"{timestamp}|{client_secret}|{nonce}"
    sign = hashlib.md5(sign_str.encode()).hexdigest().upper()

    return {
        "x-stardots-timestamp": timestamp,
        "x-stardots-nonce": nonce,
        "x-stardots-key": client_key,
        "x-stardots-sign": sign,
    }


def _detect_picbed_type(url: str, token: str) -> str:
    """自动检测图床类型：stardots 或 lsky"""
    if "stardots" in url.lower():
        return "stardots"
    # 如果 token 包含 | 分隔符，可能是 StarDots 的 key|secret 格式
    if "|" in token:
        return "stardots"
    return "lsky"


@router.post("/test")
async def test_picbed_connection(payload: dict = Body(...)):
    url = payload.get("url", "").strip().rstrip('/')
    token = payload.get("token", "").strip()
    picbed_type = payload.get("type", "").strip() or _detect_picbed_type(url, token)

    if not url or not token:
        return {"success": False, "message": "图床 API 地址和 Token 不能为空"}

    # StarDots 类型
    if picbed_type == "stardots":
        return await _test_stardots(url, token)

    # Lsky Pro 类型（默认）
    return await _test_lsky(url, token)


async def _test_stardots(url: str, token: str):
    """测试 StarDots 连接"""
    # token 格式: "client_key|client_secret" 或仅 client_key（secret 在 URL 中）
    parts = token.split("|", 1)
    if len(parts) == 2:
        client_key, client_secret = parts
    else:
        return {"success": False, "message": "StarDots Token 格式错误，应为: key|secret"}

    headers = _make_stardots_headers(client_key.strip(), client_secret.strip())
    headers["Accept"] = "application/json"

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            # 获取空间列表来验证凭据
            response = await client.get(
                f"{STARDOTS_API_BASE}/openapi/space/list?page=1&pageSize=10",
                headers=headers
            )
            data = response.json()
            if data.get("success"):
                spaces = data.get("data", [])
                space_names = [s["name"] for s in spaces] if spaces else []
                return {
                    "success": True,
                    "message": f"连接成功！可用空间: {', '.join(space_names) if space_names else '无（需先创建空间）'}"
                }
            else:
                return {"success": False, "message": f"认证失败: {data.get('message', '未知错误')}"}
    except Exception as e:
        return {"success": False, "message": f"网络异常: {str(e)}"}


async def _test_lsky(url: str, token: str):
    """测试 Lsky Pro 连接（原有逻辑）"""
    test_endpoint = f"{url}/api/v1/profile"
    if not token.startswith("Bearer "):
        token = f"Bearer {token}"

    headers = {"Authorization": token, "Accept": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(test_endpoint, headers=headers)
            if response.status_code != 200:
                return {"success": False, "message": f"校验失败，服务器返回了 {response.status_code} 错误"}

            data = response.json()
            if data.get("status") is True:
                user_email = data.get("data", {}).get("email", "未知用户")
                return {"success": True, "message": f"连接成功！当前账户: {user_email}"}
            else:
                return {"success": False, "message": f"Token 无效: {data.get('message', '未知错误')}"}
    except Exception as e:
        return {"success": False, "message": f"网络异常: {str(e)}"}


@router.post("/upload")
async def upload_image(
        file: UploadFile = File(...),
        url: str = Form(...),
        token: str = Form(...),
        picbed_type: str = Form(default=""),
        space: str = Form(default="")
):
    url = url.strip().rstrip('/')
    token = token.strip()

    if not picbed_type:
        picbed_type = _detect_picbed_type(url, token)

    if picbed_type == "stardots":
        return await _upload_stardots(file, token, space or STARDOTS_DEFAULT_SPACE)

    return await _upload_lsky(file, url, token)


async def _upload_stardots(file: UploadFile, token: str, space: str):
    """上传图片到 StarDots"""
    parts = token.split("|", 1)
    if len(parts) == 2:
        client_key, client_secret = parts
    else:
        return {"success": False, "message": "StarDots Token 格式错误，应为: key|secret"}

    headers = _make_stardots_headers(client_key.strip(), client_secret.strip())
    headers["Accept"] = "application/json"

    try:
        content = await file.read()
        # StarDots 使用 multipart/form-data + PUT 方法
        files = {'file': (file.filename, content, file.content_type)}
        data = {'space': space}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                f"{STARDOTS_API_BASE}/openapi/file/upload",
                headers=headers,
                files=files,
                data=data
            )

            if response.status_code != 200:
                return {"success": False, "message": f"上传失败，StarDots 返回了 {response.status_code} 错误"}

            result = response.json()
            if result.get("success"):
                img_url = result.get("data", {}).get("url")
                return {"success": True, "message": "上传成功", "url": img_url}
            else:
                return {"success": False, "message": f"上传失败: {result.get('message', '未知错误')}"}
    except httpx.ReadTimeout:
        return {"success": False, "message": "图片上传超时，请检查网络或图片是否过大（限制 10MB）"}
    except Exception as e:
        return {"success": False, "message": f"服务器异常: {str(e)}"}


async def _upload_lsky(file: UploadFile, url: str, token: str):
    """上传图片到 Lsky Pro（原有逻辑）"""
    if not token.startswith("Bearer "):
        token = f"Bearer {token}"

    upload_endpoint = f"{url}/api/v1/upload"
    headers = {
        "Authorization": token,
        "Accept": "application/json"
    }

    try:
        content = await file.read()
        files = {'file': (file.filename, content, file.content_type)}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(upload_endpoint, headers=headers, files=files)

            if response.status_code != 200:
                return {"success": False, "message": f"上传失败，图床返回了 {response.status_code} 错误"}

            data = response.json()
            if data.get("status") is True:
                img_url = data.get("data", {}).get("links", {}).get("url")
                return {"success": True, "message": "上传成功", "url": img_url}
            else:
                return {"success": False, "message": f"图床拒绝接收: {data.get('message', '未知')}"}
    except httpx.ReadTimeout:
        return {"success": False, "message": "图片上传超时，请检查网络或图片是否过大"}
    except Exception as e:
        return {"success": False, "message": f"服务器异常: {str(e)}"}
