import sys
import os

# 🌟 路径定位逻辑
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
    EXE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    EXE_DIR = BASE_DIR

import webview
import threading
import uvicorn
import time
import socket
import json
import subprocess
import traceback
import atexit
from cms_core.main import app

frontend_process = None
WINDOW_CONFIG_FILE = os.path.join(EXE_DIR, 'window_config.json')
LOCK_FILE = os.path.join(EXE_DIR, '.launcher.lock')


# ══════════════════════════════════════════════════
# 单实例保护：防止多个 launcher 同时运行
# ══════════════════════════════════════════════════

def is_process_alive(pid):
    """检查指定 PID 的进程是否存在"""
    try:
        if os.name == 'nt':
            result = subprocess.run(
                ['tasklist', '/FI', f'PID eq {pid}', '/NH'],
                capture_output=True, text=True
            )
            return str(pid) in result.stdout
        else:
            os.kill(pid, 0)
            return True
    except Exception:
        return False


def acquire_lock():
    """尝试获取单实例锁，若已有实例在运行则返回 False"""
    if os.path.exists(LOCK_FILE):
        try:
            with open(LOCK_FILE, 'r') as f:
                lock_data = json.load(f)
            old_pid = lock_data.get('pid')
            if old_pid and is_process_alive(old_pid):
                print(f"❌ 检测到另一个控制台正在运行 (PID: {old_pid})")
                print("   请先关闭已打开的控制台，或手动删除 .launcher.lock 文件")
                return False
            else:
                os.remove(LOCK_FILE)
        except Exception:
            try:
                os.remove(LOCK_FILE)
            except Exception:
                pass

    with open(LOCK_FILE, 'w') as f:
        json.dump({'pid': os.getpid()}, f)
    return True


def release_lock():
    """清理锁文件"""
    try:
        if os.path.exists(LOCK_FILE):
            os.remove(LOCK_FILE)
    except Exception:
        pass


atexit.register(release_lock)

def release_port(port):
    """释放指定端口上的所有 LISTENING 进程（精确匹配端口号）"""
    try:
        # 用空格限定端口边界，避免 :8080 误匹配 :80800
        command = f'netstat -ano | findstr ":{port} "'
        result = subprocess.check_output(command, shell=True).decode()
        for line in result.strip().split('\n'):
            parts = line.strip().split()
            if len(parts) >= 5 and parts[3] == 'LISTENING':
                pid = parts[-1]
                subprocess.run(
                    ['taskkill', '/PID', pid, '/F', '/T'],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                )
                time.sleep(0.5)
    except Exception:
        pass

def load_window_size():
    try:
        if os.path.exists(WINDOW_CONFIG_FILE):
            with open(WINDOW_CONFIG_FILE, 'r') as f:
                return json.load(f)
    except:
        pass
    return {"width": 1440, "height": 900}

def save_window_size(width, height):
    try:
        with open(WINDOW_CONFIG_FILE, 'w') as f:
            json.dump({"width": int(width), "height": int(height)}, f)
    except:
        pass

def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

def write_port_config(port):
    # 写入解压目录供前端读取
    public_dir = os.path.join(BASE_DIR, 'public')
    os.makedirs(public_dir, exist_ok=True)
    with open(os.path.join(public_dir, 'backend_config.json'), 'w', encoding='utf-8') as f:
        json.dump({"api_port": port}, f)

    standalone_public = os.path.join(BASE_DIR, '.next', 'standalone', 'public')
    if os.path.exists(os.path.join(BASE_DIR, '.next', 'standalone')):
        os.makedirs(standalone_public, exist_ok=True)
        with open(os.path.join(standalone_public, 'backend_config.json'), 'w', encoding='utf-8') as f:
            json.dump({"api_port": port}, f)

def wait_for_port(port, timeout=60):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=1):
                return True
        except (ConnectionRefusedError, socket.timeout, OSError):
            time.sleep(1)
    return False

class WindowAPI:
    def resize_window(self, width, height):
        save_window_size(width, height)
        webview.windows[0].resize(int(width), int(height))
        return True
    def minimize_window(self): webview.windows[0].minimize()
    def maximize_window(self): webview.windows[0].toggle_fullscreen()
    def close_window(self): on_closed()
    
    def select_audio_file(self):
        """选择音频文件，默认打开 music 目录"""
        try:
            music_dir = os.path.join(EXE_DIR, 'public', 'music')
            if not os.path.exists(music_dir):
                os.makedirs(music_dir, exist_ok=True)
            
            result = webview.windows[0].create_file_dialog(
                webview.OPEN_DIALOG,
                directory=music_dir,
                file_types=('音频文件 (*.mp3;*.wav;*.flac;*.m4a;*.ogg)', '所有文件 (*.*)')
            )
            
            if result and len(result) > 0:
                file_path = result[0]
                file_name = os.path.basename(file_path)
                
                # 如果文件不在 music 目录下，复制过去
                target_path = os.path.join(music_dir, file_name)
                if os.path.abspath(file_path) != os.path.abspath(target_path):
                    import shutil
                    shutil.copy2(file_path, target_path)
                
                return {"success": True, "filename": file_name}
            return {"success": False, "message": "未选择文件"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def select_cover_file(self):
        """选择封面图片，默认打开 music 目录"""
        try:
            music_dir = os.path.join(EXE_DIR, 'public', 'music')
            if not os.path.exists(music_dir):
                os.makedirs(music_dir, exist_ok=True)
            
            result = webview.windows[0].create_file_dialog(
                webview.OPEN_DIALOG,
                directory=music_dir,
                file_types=('图片文件 (*.jpg;*.jpeg;*.png;*.gif;*.webp)', '所有文件 (*.*)')
            )
            
            if result and len(result) > 0:
                file_path = result[0]
                file_name = os.path.basename(file_path)
                
                # 如果文件不在 music 目录下，复制过去
                target_path = os.path.join(music_dir, file_name)
                if os.path.abspath(file_path) != os.path.abspath(target_path):
                    import shutil
                    shutil.copy2(file_path, target_path)
                
                return {"success": True, "filename": file_name}
            return {"success": False, "message": "未选择文件"}
        except Exception as e:
            return {"success": False, "message": str(e)}

def run_api(port):
    # 🌟 强制后端在 EXE 所在的真实目录工作，确保能读取到旁边的 data/ 等数据
    os.chdir(EXE_DIR)
    print(f"🟢 [后端] 工作路径已锁定: {EXE_DIR}")
    try:
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
    except Exception as e:
        print("❌ [后端] 崩溃报错：")
        traceback.print_exc()

def on_closed():
    """窗口关闭时清理所有子进程和资源"""
    try:
        if frontend_process:
            subprocess.run(
                ['taskkill', '/F', '/T', '/PID', str(frontend_process.pid)],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
    except Exception:
        pass
    try:
        release_port(frontend_port)
        release_port(backend_port)
    except Exception:
        pass
    release_lock()
    os._exit(0)

def on_shown():
    win_size = load_window_size()
    webview.windows[0].resize(int(win_size["width"]), int(win_size["height"]))

if __name__ == "__main__":
    # ═══ 单实例保护 ═══
    if not acquire_lock():
        sys.exit(1)

    frontend_port = get_free_port()
    backend_port = get_free_port()

    env_vars = os.environ.copy()
    env_vars["PORT"] = str(frontend_port)

    standalone_dir = os.path.join(BASE_DIR, '.next', 'standalone')
    server_js = os.path.join(standalone_dir, 'server.js')

    # 🌟 核心自适应逻辑：判断是"打包运行"还是"开发运行"
    # 使用 CREATE_NEW_PROCESS_GROUP 便于整组清理，去掉 shell=True 避免多余 cmd.exe
    creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0

    if os.path.exists(server_js):
        print("🚀 [生产模式] 使用 127.0.0.1 强制同步...")
        env_vars["HOSTNAME"] = "127.0.0.1"
        # 确保 static 资源已复制到 standalone 目录
        static_src = os.path.join(BASE_DIR, '.next', 'static')
        static_dst = os.path.join(standalone_dir, '.next', 'static')
        if os.path.exists(static_src) and not os.path.exists(static_dst):
            import shutil
            shutil.copytree(static_src, static_dst)
            print("📦 已自动复制静态资源到 standalone 目录")
        # node.exe 是真正的可执行文件，不需要 shell
        frontend_process = subprocess.Popen(
            ["node", "server.js"], cwd=standalone_dir, env=env_vars,
            creationflags=creation_flags
        )
        window_url = f"http://127.0.0.1:{frontend_port}"
    else:
        print("🛠️ [开发模式] 使用 localhost 保持兼容...")
        # npm/npx 在 Windows 上是 .cmd 脚本，必须通过 shell 执行
        frontend_process = subprocess.Popen(
            "npm run dev", shell=True, cwd=BASE_DIR, env=env_vars,
            creationflags=creation_flags
        )
        window_url = f"http://localhost:{frontend_port}"

    write_port_config(backend_port)
    threading.Thread(target=run_api, args=(backend_port,), daemon=True).start()

    if not wait_for_port(backend_port) or not wait_for_port(frontend_port):
        print(">>> ❌ 前后端启动失败！")
        on_closed()
        sys.exit(1)

    time.sleep(1.5)

    api = WindowAPI()
    window = webview.create_window(
        title='星辉云端·控制台',
        url=window_url,
        width=1440, height=900, min_size=(1024, 768),
        background_color='#0f172a', resizable=True, frameless=True, easy_drag=False, js_api=api
    )

    window.events.shown += on_shown
    window.events.closed += on_closed

    try:
        webview.start(debug=False)
    except KeyboardInterrupt:
        pass
    finally:
        on_closed()