from fastapi import APIRouter
import requests

router = APIRouter()

@router.get("/query/{song_id}")
def query_netease_music(song_id: str):
    """通过网易云公开接口查询歌曲详情（多接口备用）"""
    print(f"\n[API] 🎵 收到查询网易云音乐请求, ID: {song_id}")
    
    # 接口1：官方详情接口
    try:
        print(f"[API] 📡 尝试接口1: 官方详情接口...")
        api_url = f"https://music.163.com/api/song/detail/?id={song_id}&ids=[{song_id}]"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Referer": "https://music.163.com/",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }
        response = requests.get(api_url, headers=headers, timeout=5)
        print(f"[API] 📡 接口1响应状态码: {response.status_code}")
        data = response.json()
        if data.get("songs") and len(data["songs"]) > 0:
            song = data["songs"][0]
            print(f"[API] ✅ 接口1查询成功: {song['name']} - {song['artists'][0]['name']}")
            return {
                "success": True,
                "data": {
                    "id": song_id,
                    "name": song["name"],
                    "artist": song["artists"][0]["name"],
                    "album": song["album"]["name"],
                    "cover": song["album"]["picUrl"]
                }
            }
        print(f"[API] ⚠️  接口1返回数据异常")
    except Exception as e:
        print(f"[API] ⚠️  接口1失败: {str(e)}")
    
    # 接口2：Meting API 备用
    try:
        print(f"[API] 📡 尝试接口2: Meting API...")
        api_url = f"https://api.injahow.cn/meting/?server=netease&type=song&id={song_id}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Referer": "https://music.163.com/",
        }
        response = requests.get(api_url, headers=headers, timeout=8)
        print(f"[API] 📡 接口2响应状态码: {response.status_code}")
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            song = data[0]
            if song.get("name"):
                print(f"[API] ✅ 接口2查询成功: {song['name']} - {song.get('artist', '未知歌手')}")
                return {
                    "success": True,
                    "data": {
                        "id": song_id,
                        "name": song["name"],
                        "artist": song.get("artist", "未知歌手"),
                        "album": song.get("album", ""),
                        "cover": song.get("cover", "")
                    }
                }
        print(f"[API] ⚠️  接口2返回数据异常")
    except Exception as e:
        print(f"[API] ⚠️  接口2失败: {str(e)}")
    
    # 接口3：手机端 UA 的官方接口
    try:
        print(f"[API] 📡 尝试接口3: 手机端UA官方接口...")
        api_url = f"https://music.163.com/api/song/detail/?id={song_id}&ids=[{song_id}]"
        headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
            "Referer": "https://music.163.com/",
        }
        response = requests.get(api_url, headers=headers, timeout=5)
        print(f"[API] 📡 接口3响应状态码: {response.status_code}")
        data = response.json()
        if data.get("songs") and len(data["songs"]) > 0:
            song = data["songs"][0]
            print(f"[API] ✅ 接口3查询成功: {song['name']} - {song['artists'][0]['name']}")
            return {
                "success": True,
                "data": {
                    "id": song_id,
                    "name": song["name"],
                    "artist": song["artists"][0]["name"],
                    "album": song["album"]["name"],
                    "cover": song["album"]["picUrl"]
                }
            }
        print(f"[API] ⚠️  接口3返回数据异常")
    except Exception as e:
        print(f"[API] ⚠️  接口3失败: {str(e)}")
    
    # 所有接口都失败
    print(f"[API] ❌ 所有接口都查询失败 (ID: {song_id})")
    return {"success": False, "message": "查询失败，可能是网络问题或歌曲无版权"}


@router.get("/lyric/{song_id}")
def get_netease_lyric(song_id: str):
    """获取网易云歌曲歌词"""
    print(f"\n[API] 📝 收到获取歌词请求, ID: {song_id}")
    
    try:
        api_url = f"https://music.163.com/api/song/lyric?id={song_id}&lv=-1&kv=-1&tv=-1"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Referer": "https://music.163.com/",
        }
        response = requests.get(api_url, headers=headers, timeout=5)
        data = response.json()
        
        lrc = data.get("lrc", {}).get("lyric", "")
        if lrc:
            print(f"[API] ✅ 歌词获取成功，共 {len(lrc)} 字符")
            return {"success": True, "data": {"lrc": lrc}}
        else:
            print(f"[API] ⚠️  该歌曲暂无歌词")
            return {"success": True, "data": {"lrc": ""}}
            
    except Exception as e:
        print(f"[API] ❌ 歌词获取失败: {str(e)}")
        return {"success": False, "message": str(e)}
