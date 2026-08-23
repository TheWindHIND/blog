import os
import re
import json
from fastapi import APIRouter, Request

router = APIRouter()

# 🌟 动态寻址逻辑
CURRENT_API_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_API_DIR, "..", ".."))
FRIENDS_TS_PATH = os.path.join(PROJECT_ROOT, "data", "friends.ts")


@router.get("/list")
async def list_friends():
    """读取 data/friends.ts 文件，解析并返回最新的友链数据。"""
    try:
        if not os.path.exists(FRIENDS_TS_PATH):
            return {"success": True, "friends": []}

        with open(FRIENDS_TS_PATH, "r", encoding="utf-8") as f:
            content = f.read()

        match = re.search(r'export\s+const\s+friendsData\s*:\s*Friend\[\]\s*=\s*(\[[\s\S]*?\]);', content)
        if not match:
            return {"success": True, "friends": []}

        json_str = match.group(1)
        friends_data = json.loads(json_str)
        return {"success": True, "friends": friends_data}
    except Exception as e:
        return {"success": False, "message": f"读取失败: {str(e)}", "friends": []}


@router.post("/sync")
async def sync_friends(request: Request):
    try:
        payload = await request.json()
        friends_list = payload.get("friends", [])

        # 1. 序列化
        json_str = json.dumps(friends_list, ensure_ascii=False, indent=2)

        # 2. 构造 TS 模板
        ts_content = (
            "// 🛡️ 本文件由 XingHuiSama 控制台自动生成\n"
            "export interface Friend { id: string; name: string; url: string; description: string; avatar: string; themeColor: string; }\n\n"
            f"export const friendsData: Friend[] = {json_str};"
        )

        # 3. 物理落盘
        os.makedirs(os.path.dirname(FRIENDS_TS_PATH), exist_ok=True)
        with open(FRIENDS_TS_PATH, "w", encoding="utf-8") as f:
            f.write(ts_content)

        return {"success": True, "message": f"✨ 友链物理文件已更新！共同步 {len(friends_list)} 位好友。"}
    except Exception as e:
        return {"success": False, "message": f"后端同步崩溃: {str(e)}"}