import os
import json
from fastapi import APIRouter, Request

router = APIRouter()

# 🌟 核心修复：动态获取项目根目录
# __file__ 是当前文件的绝对路径
# os.path.dirname(__file__) 是 cms_core/api/
# 再向上两级就是项目根目录 my-blog-manager/
CURRENT_API_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_API_DIR, "..", ".."))

# 🌟 根据你提供的位置，目标文件在项目根目录下的 data/albums.ts
ALBUMS_TS_PATH = os.path.join(PROJECT_ROOT, "data", "albums.ts")


@router.post("/sync")
async def sync_gallery(request: Request):
    """
    接收前端传来的全量相册数组，并将其物理重写回 data/albums.ts
    """
    try:
        payload = await request.json()
        albums_data = payload.get("albums", [])

        if not isinstance(albums_data, list):
            return {"success": False, "message": "数据格式非法，预期为数组"}

        # 1. 序列化数据（确保中文不乱码，缩进漂亮）
        json_str = json.dumps(albums_data, ensure_ascii=False, indent=2)

        # 2. 构造标准的 TypeScript 导出模板（包含 AnimationMode 类型）
        ts_content = (
            "// 🛡️ 本文件由 XingHuiSama 控制台自动生成，请勿手动修改\n"
            "export interface Photo { url: string; caption?: string; }\n\n"
            "// 7 种模式（含无动画）\n"
            "export type AnimationMode =\n"
            "  | 'none'              // 无动画（默认网格展示）\n"
            "  | 'spatial-rift'      // 时空裂隙\n"
            "  | 'card-flip'         // 卡片翻转\n"
            "  | 'slide-switch'      // 滑动切换\n"
            "  | 'fade-zoom'         // 淡入缩放\n"
            "  | 'page-turn'         // 仿真翻页\n"
            "  | 'carousel-3d';      // 3D 走马灯\n\n"
            "export interface Album {\n"
            "  id: string;\n"
            "  title: string;\n"
            "  description?: string;\n"
            "  cover: string;\n"
            "  date: string;\n"
            "  photos: Photo[];\n"
            "  animationMode?: AnimationMode;\n"
            "}\n\n"
            f"export const albums: Album[] = {json_str};"
        )

        # 3. 确保目录存在并执行覆盖写入
        os.makedirs(os.path.dirname(ALBUMS_TS_PATH), exist_ok=True)
        with open(ALBUMS_TS_PATH, "w", encoding="utf-8") as f:
            f.write(ts_content)

        return {
            "success": True,
            "message": f"📸 画廊物理文件已更新！已同步 {len(albums_data)} 个相册。"
        }
    except Exception as e:
        # 这里把具体的报错抛给前端方便排查
        return {"success": False, "message": f"同步失败: {str(e)}"}


@router.get("/debug_path")
async def debug_path():
    """用于检查当前后端锁定的物理路径"""
    return {
        "project_root": PROJECT_ROOT,
        "target_file": ALBUMS_TS_PATH,
        "exists": os.path.exists(ALBUMS_TS_PATH)
    }