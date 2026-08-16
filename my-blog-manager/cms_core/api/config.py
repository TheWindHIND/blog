from fastapi import APIRouter, Body
import os
import re
import json
from typing import Dict, Any

router = APIRouter()

# ---------------------------------------------------------
# 🛠️ 寻址引擎：物理锁死 Manager 本地根目录！(终极修复版)
# ---------------------------------------------------------
CURRENT_API_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_API_DIR, "..", ".."))


def get_config_path():
    possible_paths = [
        os.path.join(PROJECT_ROOT, 'siteConfig.ts'),
        os.path.join(PROJECT_ROOT, 'src', 'siteConfig.ts'),
        os.path.join(os.path.dirname(CURRENT_API_DIR), 'siteConfig.ts')
    ]

    for p in possible_paths:
        if os.path.exists(p):
            return p

    print(f"❌ 警告：在 Manager 目录未找到 siteConfig.ts！正在搜索的根目录是: {PROJECT_ROOT}")
    return None


def dict_to_ts_string(data, indent=2):
    """安全地将字典转为 TypeScript 格式，自动处理多行字符串转义"""
    if isinstance(data, dict):
        lines = ["{"]
        for k, v in data.items():
            # 🌟 核心修复：无论是字典还是外层，全部使用 json.dumps 强制安全转义，彻底消灭 Unterminated string constant
            val = json.dumps(v, ensure_ascii=False)
            lines.append(f"{' ' * (indent + 2)}{k}: {val},")
        lines.append(" " * indent + "}")
        return "\n".join(lines)
    return json.dumps(data, ensure_ascii=False)


def find_matching_bracket(content, start_pos, open_bracket='['):
    """
    智能查找匹配的闭合括号位置，不会被字符串里的括号干扰
    支持 [] 和 {}
    返回闭合括号的索引位置，找不到返回 -1
    """
    close_bracket = ']' if open_bracket == '[' else '}'
    depth = 1
    in_string = False
    string_quote = ''
    escaped = False

    i = start_pos + 1
    while i < len(content):
        char = content[i]

        if escaped:
            escaped = False
            i += 1
            continue

        if char == '\\' and in_string:
            escaped = True
            i += 1
            continue

        if char in ('"', "'", '`'):
            if not in_string:
                in_string = True
                string_quote = char
            elif char == string_quote:
                in_string = False
            i += 1
            continue

        if not in_string:
            if char == open_bracket:
                depth += 1
            elif char == close_bracket:
                depth -= 1
                if depth == 0:
                    return i

        i += 1

    return -1


# =========================================================
# 🌟 通用 TypeScript 对象解析器（F1 修复核心）
# 逐字符扫描顶层键值对，正确处理：
#   - 字符串内的括号/逗号/注释（不误判）
#   - 数组值（localMusic / cloudMusicIds / bgImages 等）→ json.loads
#   - 嵌套对象值（social / gitalkConfig 等）→ 递归解析
#   - 行注释与块注释
# =========================================================
def _skip_ws_and_comments(content, i):
    n = len(content)
    while i < n:
        c = content[i]
        if c in ' \t\r\n,':
            i += 1
        elif c == '/' and i + 1 < n and content[i + 1] == '/':
            j = content.find('\n', i)
            i = n if j == -1 else j + 1
        elif c == '/' and i + 1 < n and content[i + 1] == '*':
            j = content.find('*/', i + 2)
            i = n if j == -1 else j + 2
        else:
            break
    return i


def _convert_scalar(raw):
    """将标量原文转换为 Python 值，无法识别返回 None"""
    raw = raw.strip()
    if not raw:
        return None
    if raw in ('true', 'false'):
        return raw == 'true'
    if raw == 'null' or raw == 'undefined':
        return None
    # 引号字符串（优先 json.loads 保证转义正确）
    if raw[0] in ('"', "'", '`'):
        quote = raw[0]
        inner = raw[1:-1] if raw.endswith(quote) and len(raw) >= 2 else raw[1:]
        if quote == '"':
            try:
                return json.loads(raw)
            except Exception:
                return inner.replace('\\n', '\n')
        # 单引号/反引号：手动还原常见转义
        return inner.replace("\\\\", "\x00").replace("\\'", "'").replace('\\n', '\n').replace("\x00", "\\")
    try:
        return int(raw)
    except ValueError:
        pass
    try:
        return float(raw)
    except ValueError:
        return None


def parse_ts_object(body_text):
    """解析 TS 对象字面量的内部文本（不含最外层花括号），返回 dict"""
    result = {}
    n = len(body_text)
    i = 0
    while i < n:
        i = _skip_ws_and_comments(body_text, i)
        if i >= n:
            break
        # ---- 读取 key（支持不带引号 / 双引号 / 单引号）----
        key_match = re.match(r'(?:"([^"]+)"|\'([^\']+)\'|([A-Za-z_$][A-Za-z0-9_$]*))\s*:', body_text[i:])
        if not key_match:
            # 无法识别的片段，跳过一个字符防止死循环
            i += 1
            continue
        key = key_match.group(1) or key_match.group(2) or key_match.group(3)
        i += key_match.end()

        i = _skip_ws_and_comments(body_text, i)
        if i >= n:
            break

        # ---- 读取 value ----
        c = body_text[i]
        if c in '[{':
            close_pos = find_matching_bracket(body_text, i, c)
            if close_pos == -1:
                break
            raw_value = body_text[i:close_pos + 1]
            i = close_pos + 1
            if c == '[':
                # 数组：siteConfig 中的数组均由 json.dumps 生成，为合法 JSON
                try:
                    result[key] = json.loads(raw_value)
                except Exception:
                    # 兜底：尝试修复单引号/尾逗号后重试
                    fixed = re.sub(r',\s*\]', ']', raw_value)
                    try:
                        result[key] = json.loads(fixed)
                    except Exception:
                        print(f"  ⚠️ 数组字段 [{key}] 解析失败，已跳过")
            else:
                # 嵌套对象：递归解析
                result[key] = parse_ts_object(raw_value[1:-1])
        else:
            # 标量：读到本层级的逗号或结尾
            j = i
            in_string = False
            quote = ''
            escaped = False
            while j < n:
                cj = body_text[j]
                if escaped:
                    escaped = False
                    j += 1
                    continue
                if in_string:
                    if cj == '\\':
                        escaped = True
                    elif cj == quote:
                        in_string = False
                    j += 1
                    continue
                if cj in ('"', "'", '`'):
                    in_string = True
                    quote = cj
                    j += 1
                    continue
                if cj == ',':
                    break
                # 行注释出现在值后面（如 photos: 128, // 注释）
                if cj == '/' and j + 1 < n and body_text[j + 1] == '/':
                    k = body_text.find('\n', j)
                    j = n if k == -1 else k
                    break
                if cj == '/' and j + 1 < n and body_text[j + 1] == '*':
                    k = body_text.find('*/', j + 2)
                    j = n if k == -1 else k + 2
                    continue
                if cj in '{[(':  # 标量后紧跟结构（异常情况），交给下一轮
                    break
                j += 1
            raw_value = body_text[i:j].strip()
            converted = _convert_scalar(raw_value)
            if converted is not None:
                result[key] = converted
            i = j
    return result


def parse_site_config(content):
    """从 siteConfig.ts 全文中提取根对象并解析为 dict"""
    # 定位 export const siteConfig = {
    header_match = re.search(r'export\s+const\s+\w+\s*=\s*\{', content)
    if not header_match:
        return {}
    open_pos = content.find('{', header_match.start())
    close_pos = find_matching_bracket(content, open_pos, '{')
    if close_pos == -1:
        return {}
    return parse_ts_object(content[open_pos + 1:close_pos])


# =========================================================
# 🚀 接口 1：读取配置 (GET) - 通用解析器版
# 🌟 F1 修复：正确返回所有数组字段（localMusic/cloudMusicIds/bgImages 等），
#    彻底消除旧正则解析丢数组、被歌词内容污染产生垃圾键的问题
# =========================================================
@router.get("/get")
def get_site_config():
    config_path = get_config_path()
    if not config_path:
        return {"success": False, "message": "未能找到 siteConfig.ts 文件"}

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()

        parsed_config = parse_site_config(content)

        # 兼容旧前端：Gitalk 的 admin 数组兜底
        gitalk = parsed_config.get('gitalkConfig')
        if isinstance(gitalk, dict) and 'admin' not in gitalk:
            gitalk['admin'] = []

        if not parsed_config:
            return {"success": False, "message": "siteConfig.ts 解析结果为空，请检查文件格式"}

        return {"success": True, "data": parsed_config}
    except Exception as e:
        return {"success": False, "message": f"解析失败: {str(e)}"}


# =========================================================
# 🚀 接口 2：写入配置 (POST) - 白名单防漏防崩溃版
# =========================================================
@router.post("/update")
def update_site_config(payload: Dict[str, Any] = Body(...)):
    updates = payload.get("updates", {})
    if not updates:
        return {"success": False, "message": "没有收到需要更新的数据"}

    config_path = get_config_path()
    if not config_path:
        return {"success": False, "message": "未能扫描到 siteConfig.ts"}

    # 🌟 核心防线：绝对安全的根节点白名单！
    VALID_ROOT_KEYS = {
        "title", "authorName", "bio", "avatarUrl", "useGradient", "themeColors",
        "bgImages", "defaultPostCover", "photoWallImage", "cloudMusicIds", "social",
        "counts", "chatterTitle", "chatterDescription", "picBedName", "picBedUrl",
        "picBedToken", "danmakuList", "gitalkConfig", "buildDate", "footerBadges",
        "icpConfig", "geminiConfig", "localMusic", "desktopPetConfig",
        "faviconUrl",
        "navTitle",
        "navSuffix",
        "navAfter",
        "friendLinkApplyFormat",
        "enableLevelSystem" # 👈 你加的字段在这里，完美！
    }

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 🌟 F3 防覆盖保险：写盘前自动备份上一版配置
        try:
            import shutil
            shutil.copy2(config_path, config_path + '.bak')
        except Exception as backup_err:
            print(f"  ⚠️ 备份失败（不阻塞写入）: {backup_err}")

        print("\n" + "=" * 50)
        print(f"🔥 启动物理引擎，目标文件: {config_path}")
        updated_count = 0

        for key, value in updates.items():

            # 拦截非白名单字段，彻底防止二次覆写灾难
            if key not in VALID_ROOT_KEYS:
                print(f"  🛑 拦截非根节点危险字段 -> [{key}]")
                continue

            # 专属通道 1：Gitalk 特殊格式组装
            if key == "gitalkConfig":
                admin_list = value.get("admin", [])
                if isinstance(admin_list, str):
                    admin_list = [admin_list]
                admin_str = '["' + '", "'.join(admin_list) + '"]'

                # 安全转义客户端凭据
                cid = json.dumps(value.get('clientID', ''), ensure_ascii=False)
                csec = json.dumps(value.get('clientSecret', ''), ensure_ascii=False)
                repo = json.dumps(value.get('repo', ''), ensure_ascii=False)
                owner = json.dumps(value.get('owner', ''), ensure_ascii=False)

                gitalk_ts_code = f"""{{
    clientID: {cid},
    clientSecret: {csec},
    repo: {repo},
    owner: {owner},
    admin: {admin_str},
  }}"""
                pattern = rf"({key}\s*:\s*)\{{[\s\S]*?\}}"
                if re.search(pattern, content):
                    content = re.sub(pattern, lambda m: m.group(1) + gitalk_ts_code, content, count=1)
                    print(f"  ✅ 成功修改并落盘(专列) -> [{key}]")
                    updated_count += 1
                continue

            # ================= 原有的通用处理逻辑 =================
            # 🌟 核心修复：这里原本就支持将 bool 转换成 'true' 或 'false' 字符串写入，所以 POST 没问题！
            if isinstance(value, str):
                val_str = json.dumps(value, ensure_ascii=False)
            elif isinstance(value, bool):
                val_str = str(value).lower() # 👈 这里完美的把 bool 变成了 'true' / 'false'
            elif isinstance(value, dict):
                val_str = dict_to_ts_string(value, indent=2)
            else:
                val_str = json.dumps(value, ensure_ascii=False)

            if isinstance(value, dict):
                # 🌟 智能匹配：用 find_matching_bracket 精确找到闭合 }，不会被字符串里的 } 干扰
                match = re.search(rf'({key}\s*:\s*)\{{', content)
                if match:
                    open_brace_pos = match.end() - 1  # { 的位置
                    close_brace_pos = find_matching_bracket(content, open_brace_pos, '{')
                    if close_brace_pos != -1:
                        prefix = content[:match.start()]
                        key_part = match.group(1)
                        suffix = content[close_brace_pos + 1:]
                        content = prefix + key_part + val_str + suffix
                        print(f"  ✅ 成功修改并落盘(智能匹配) -> [{key}]")
                        updated_count += 1
            elif isinstance(value, list):
                # 🌟 智能匹配：用 find_matching_bracket 精确找到闭合 ]，不会被字符串里的 ] 干扰
                match = re.search(rf'({key}\s*:\s*)\[', content)
                if match:
                    open_bracket_pos = match.end() - 1  # [ 的位置
                    close_bracket_pos = find_matching_bracket(content, open_bracket_pos, '[')
                    if close_bracket_pos != -1:
                        prefix = content[:match.start()]
                        key_part = match.group(1)
                        suffix = content[close_bracket_pos + 1:]
                        content = prefix + key_part + val_str + suffix
                        print(f"  ✅ 成功修改并落盘(智能匹配) -> [{key}]")
                        updated_count += 1
            else:
                # 写入正则也能匹配布尔值和数字，所以替换没有问题
                pattern = rf"({key}\s*:\s*)(['\"`][\s\S]*?['\"`]|true|false|\d+)"
                if re.search(pattern, content):
                    content = re.sub(pattern, lambda m: m.group(1) + val_str, content, count=1)
                    print(f"  ✅ 成功修改并落盘 -> [{key}]")
                    updated_count += 1

        # 写入物理磁盘
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"🔥 任务圆满完成，共刷新 {updated_count} 个字段")
        print("=" * 50 + "\n")

        return {"success": True, "message": "本地 siteConfig.ts 修改成功！"}

    except Exception as e:
        print(f"❌ 物理写入发生灾难性错误: {str(e)}")
        return {"success": False, "message": f"文件读写错误: {str(e)}"}