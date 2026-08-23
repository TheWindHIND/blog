import os
import re
import json
from fastapi import APIRouter, Request

router = APIRouter()

# 🌟 核心修复：去掉了多余的 "src"，精准定位到你的真实目录
CURRENT_API_DIR = os.path.dirname(os.path.abspath(__file__))  # cms_core/api/
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_API_DIR, "..", ".."))  # 回退两级到根目录

# 👇 就是这里！直接指向 data/projects.ts
TARGET_FILE = os.path.join(PROJECT_ROOT, "data", "projects.ts")


@router.get("/list")
async def list_projects():
    """读取 data/projects.ts 文件，解析并返回最新的项目数据。"""
    try:
        if not os.path.exists(TARGET_FILE):
            return {"success": True, "projects": []}

        with open(TARGET_FILE, "r", encoding="utf-8") as f:
            content = f.read()

        match = re.search(r'export\s+const\s+projectsData\s*:\s*Project\[\]\s*=\s*(\[[\s\S]*?\]);', content)
        if not match:
            return {"success": True, "projects": []}

        json_str = match.group(1)
        projects_data = json.loads(json_str)
        return {"success": True, "projects": projects_data}
    except Exception as e:
        return {"success": False, "message": f"读取失败: {str(e)}", "projects": []}


@router.post("/sync")
async def sync_projects(request: Request):
    try:
        payload = await request.json()
        projects_list = payload.get("projects", [])

        print(f"🚀 尝试物理写入项目矩阵: {TARGET_FILE}")

        # 序列化
        json_str = json.dumps(projects_list, ensure_ascii=False, indent=2)

        # 构造格式
        ts_content = (
            "// 🛡️ 本文件由控制台自动生成，请勿手动修改\n\n"
            "export type Project = {\n"
            "  id: string;\n"
            "  name: string;\n"
            "  description: string;\n"
            "  icon: string;\n"
            "  githubUrl: string;\n"
            "  tags: string[];\n"
            "};\n\n"
            f"export const projectsData: Project[] = {json_str};"
        )

        # 执行覆盖写入
        os.makedirs(os.path.dirname(TARGET_FILE), exist_ok=True)
        with open(TARGET_FILE, "w", encoding="utf-8") as f:
            f.write(ts_content)

        print("✅ 项目矩阵物理落盘成功！")
        return {"success": True, "message": "写入成功"}
    except Exception as e:
        print(f"❌ 写入失败: {str(e)}")
        return {"success": False, "message": str(e)}