from fastapi import APIRouter
import requests
import time
from concurrent.futures import ThreadPoolExecutor

router = APIRouter()

# 🌟 性能优化（2026-08-16）：
# 1. 全局 Session 复用 TCP 连接，避免每次请求重新握手
# 2. 内存缓存查询结果（详情/歌词），重复查询瞬时返回
# 3. 缩短各级超时，快速回退
_session = requests.Session()
_session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Referer": "https://music.163.com/",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
})

_CACHE_TTL = 1800  # 缓存 30 分钟
_cache: dict = {}
_executor = ThreadPoolExecutor(max_workers=4)


def _cache_get(key: str):
    item = _cache.get(key)
    if item and time.time() - item[0] < _CACHE_TTL:
        return item[1]
    return None


def _cache_set(key: str, value):
    _cache[key] = (time.time(), value)


def _query_official(song_id: str):
    """网易云官方详情接口"""
    api_url = f"https://music.163.com/api/song/detail/?id={song_id}&ids=[{song_id}]"
    response = _session.get(api_url, timeout=(3, 4))
    data = response.json()
    if data.get("songs") and len(data["songs"]) > 0:
        song = data["songs"][0]
        return {
            "id": song_id,
            "name": song["name"],
            "artist": song["artists"][0]["name"],
            "album": song["album"]["name"],
            "cover": song["album"]["picUrl"]
        }
    return None


def _query_meting(song_id: str):
    """Meting API 备用接口"""
    api_url = f"https://api.injahow.cn/meting/?server=netease&type=song&id={song_id}"
    response = _session.get(api_url, timeout=(3, 5))
    data = response.json()
    if isinstance(data, list) and len(data) > 0 and data[0].get("name"):
        song = data[0]
        return {
            "id": song_id,
            "name": song["name"],
            "artist": song.get("artist", "未知歌手"),
            "album": song.get("album", ""),
            "cover": song.get("cover", "")
        }
    return None


@router.get("/query/{song_id}")
def query_netease_music(song_id: str):
    """通过网易云公开接口查询歌曲详情（缓存 + 连接复用 + 快速回退）"""
    print(f"\n[API] 🎵 收到查询网易云音乐请求, ID: {song_id}")

    # 命中缓存直接返回
    cached = _cache_get(f"detail:{song_id}")
    if cached:
        print(f"[API] ⚡ 命中缓存: {cached['name']}")
        return {"success": True, "data": cached}

    # 逐级回退：官方接口 → Meting 备用 → 手机UA官方接口
    for name, fn in (("官方接口", _query_official), ("Meting备用", _query_meting), ("手机UA官方", _query_official)):
        try:
            print(f"[API] 📡 尝试 {name}...")
            result = fn(song_id)
            if result:
                print(f"[API] ✅ {name}查询成功: {result['name']} - {result['artist']}")
                _cache_set(f"detail:{song_id}", result)
                return {"success": True, "data": result}
        except Exception as e:
            print(f"[API] ⚠️ {name}失败: {e}")

    print(f"[API] ❌ 所有接口都查询失败 (ID: {song_id})")
    return {"success": False, "message": "查询失败，可能是网络问题或歌曲无版权"}


@router.get("/lyric/{song_id}")
def get_netease_lyric(song_id: str):
    """获取网易云歌曲歌词（缓存 + 连接复用）"""
    print(f"\n[API] 📝 收到获取歌词请求, ID: {song_id}")

    cached = _cache_get(f"lyric:{song_id}")
    if cached is not None:
        return {"success": True, "data": {"lrc": cached}}

    try:
        api_url = f"https://music.163.com/api/song/lyric?id={song_id}&lv=-1&kv=-1&tv=-1"
        response = _session.get(api_url, timeout=(3, 4))
        data = response.json()

        lrc = data.get("lrc", {}).get("lyric", "")
        _cache_set(f"lyric:{song_id}", lrc)
        if lrc:
            print(f"[API] ✅ 歌词获取成功，共 {len(lrc)} 字符")
        else:
            print(f"[API] ⚠️ 该歌曲暂无歌词")
        return {"success": True, "data": {"lrc": lrc}}

    except Exception as e:
        print(f"[API] ❌ 歌词获取失败: {str(e)}")
        return {"success": False, "message": str(e)}


@router.get("/fill/{song_id}")
def fill_netease_music(song_id: str):
    """🌟 自动填充专用：并发获取歌曲详情 + 歌词，单次请求返回全部信息

    相比前端串行调用 /query + /lyric，这里节省一次 HTTP 往返，
    且详情与歌词在外部接口层面并行请求，总耗时 ≈ 较慢的那一个。
    """
    print(f"\n[API] 🎯 收到自动填充请求, ID: {song_id}")

    detail_cached = _cache_get(f"detail:{song_id}")
    lyric_cached = _cache_get(f"lyric:{song_id}")

    # 两侧都已缓存，无需外呼
    if detail_cached is not None and lyric_cached is not None:
        return {"success": True, "data": {"detail": detail_cached, "lrc": lyric_cached}}

    # 缺失的部分提交线程池并行请求
    futures = {}
    if detail_cached is None:
        futures["detail"] = _executor.submit(_fill_detail_worker, song_id)
    if lyric_cached is None:
        futures["lyric"] = _executor.submit(_fill_lyric_worker, song_id)

    detail = detail_cached
    if "detail" in futures:
        detail = futures["detail"].result()

    if not detail:
        return {"success": False, "message": "查询失败，可能是网络问题或歌曲无版权"}

    lrc = lyric_cached if lyric_cached is not None else ""
    if "lyric" in futures:
        lrc = futures["lyric"].result()

    return {"success": True, "data": {"detail": detail, "lrc": lrc or ""}}


def _fill_detail_worker(song_id: str):
    """填充任务 worker：查询详情并写入缓存（不抛异常，失败返回 None）"""
    for fn in (_query_official, _query_meting, _query_official):
        try:
            result = fn(song_id)
            if result:
                _cache_set(f"detail:{song_id}", result)
                return result
        except Exception:
            continue
    return None


def _fill_lyric_worker(song_id: str):
    """填充任务 worker：获取歌词并写入缓存（失败返回空串）"""
    try:
        api_url = f"https://music.163.com/api/song/lyric?id={song_id}&lv=-1&kv=-1&tv=-1"
        response = _session.get(api_url, timeout=(3, 4))
        data = response.json()
        lrc = data.get("lrc", {}).get("lyric", "")
        _cache_set(f"lyric:{song_id}", lrc)
        return lrc
    except Exception:
        return ""
