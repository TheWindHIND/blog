import os
import json
import subprocess
import re
import getpass
import platform
import datetime
from fastapi import APIRouter, Request

from .sync import do_sync, is_safe_blog_dir

router = APIRouter()

CURRENT_API_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_API_DIR, "..", ".."))
CONFIG_FILE = os.path.join(PROJECT_ROOT, "data", "deploy_config.json")

# 🌟 与「一键部署网站.bat」对齐的默认部署目标（blog 根仓库 = XHBlogs 的上一级）
BLOG_REPO_ROOT = os.path.abspath(os.path.join(PROJECT_ROOT, ".."))
XHBLOGS_PATH = os.path.join(BLOG_REPO_ROOT, "XHBlogs")
DEFAULT_STATIC_REPO = "git@github.com:TheWindHIND/blog.git"


def _load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _save_config(cfg):
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


def _run(cmd, cwd, shell=False, timeout=600, env=None):
    """执行子进程并返回 (returncode, stdout+stderr 摘要)"""
    proc = subprocess.run(
        cmd, cwd=cwd, shell=shell, capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=timeout, env=env
    )
    output = ((proc.stdout or "") + (proc.stderr or "")).strip()
    return proc.returncode, output


def _ts():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M")


# =========================================================
# 🌟 以下三个端点与「一键部署网站.bat」的执行逻辑逐行对齐
# =========================================================

@router.get("/blog_info")
def get_blog_info():
    """自动探测 XHBlogs 路径与根仓库信息，供项目仓库设置页面展示"""
    cfg = _load_config()
    static_repo = cfg.get("staticRepoUrl") or DEFAULT_STATIC_REPO

    xhblogs_ok = os.path.exists(os.path.join(XHBLOGS_PATH, "package.json"))
    out_dir = os.path.join(XHBLOGS_PATH, "out")

    # 读取根仓库 (main 源码) 的 origin 地址
    main_remote = ""
    code, output = _run(["git", "remote", "get-url", "origin"], cwd=BLOG_REPO_ROOT)
    if code == 0:
        main_remote = output.strip().splitlines()[0] if output else ""

    return {
        "success": True,
        "data": {
            "xhblogsPath": XHBLOGS_PATH,
            "xhblogsOk": xhblogs_ok,
            "repoRoot": BLOG_REPO_ROOT,
            "mainRemote": main_remote or static_repo,
            "outDirExists": os.path.exists(out_dir),
            "staticRepoUrl": static_repo,
            "staticBranch": cfg.get("staticBranch") or "gh-pages",
            "sourceBranch": cfg.get("sourceBranch") or "main",
            "nodeOk": _run(["node", "-v"], cwd=BLOG_REPO_ROOT)[0] == 0,
            "gitOk": _run(["git", "--version"], cwd=BLOG_REPO_ROOT)[0] == 0,
        }
    }


@router.post("/sync_content")
def sync_content():
    """等价「一键同步内容.bat」：Manager 内容 → XHBlogs（含敏感信息过滤）"""
    if not is_safe_blog_dir(XHBLOGS_PATH):
        return {"success": False, "message": f"未找到有效的前端项目：{XHBLOGS_PATH}"}
    try:
        success, message = do_sync(XHBLOGS_PATH, full=True)
        return {"success": success, "message": message}
    except Exception as e:
        return {"success": False, "message": f"同步异常: {str(e)}"}


@router.post("/one_click")
def one_click_deploy():
    """🌟 等价「一键部署网站.bat」全流程：
    ① 同步内容 → ② next build → ③ out/ 推送 gh-pages → ④ 根仓库推送源码 main
    """
    steps = []

    def add_step(name, success, message):
        steps.append({"name": name, "success": success, "message": message[-500:]})
        return success

    cfg = _load_config()
    # 🌟 与 bat 一致：gh-pages 与源码 main 推同一个仓库（根仓库 origin），
    # 旧双轨配置里的 staticRepoUrl 仅作探测失败时的兜底
    code, output = _run(["git", "remote", "get-url", "origin"], cwd=BLOG_REPO_ROOT)
    detected_repo = output.strip().splitlines()[0] if code == 0 and output.strip() else ""
    static_repo = detected_repo or cfg.get("staticRepoUrl") or DEFAULT_STATIC_REPO
    static_branch = cfg.get("staticBranch") or "gh-pages"
    source_branch = cfg.get("sourceBranch") or "main"

    # ── 第 ① 步：同步内容（等价 bat [3/8]）──
    try:
        ok, msg = do_sync(XHBLOGS_PATH, full=True)
        add_step("同步内容到 XHBlogs", ok, msg)
        if not ok:
            return {"success": False, "message": "内容同步失败，已中止", "steps": steps}
    except Exception as e:
        add_step("同步内容到 XHBlogs", False, str(e))
        return {"success": False, "message": "内容同步异常，已中止", "steps": steps}

    # ── 第 ② 步：构建（等价 bat [5/8] npm run build）──
    if not os.path.exists(os.path.join(XHBLOGS_PATH, "node_modules")):
        code, output = _run("npm install", XHBLOGS_PATH, shell=True, timeout=900)
        add_step("安装依赖 (首次)", code == 0, output)
        if code != 0:
            return {"success": False, "message": "依赖安装失败，已中止", "steps": steps}

    code, output = _run("npm run build", XHBLOGS_PATH, shell=True, timeout=1200)
    add_step("构建静态站点 (next build)", code == 0, output)
    if code != 0:
        return {"success": False, "message": "构建失败，已中止", "steps": steps}

    out_dir = os.path.join(XHBLOGS_PATH, "out")

    # ── 第 ③ 步：部署 gh-pages（等价 bat [6/8]）──
    # 确保 GitHub 在 known_hosts 中
    try:
        ssh_dir = os.path.expanduser("~/.ssh")
        os.makedirs(ssh_dir, exist_ok=True)
        _run("ssh-keyscan github.com >> known_hosts", ssh_dir, shell=True, timeout=30)
    except Exception:
        pass  # 失败不阻塞，推送时会再报具体错误

    if not os.path.exists(os.path.join(out_dir, ".git")):
        _run(["git", "init"], cwd=out_dir)
        _run(["git", "config", "user.email", "blog@example.com"], cwd=out_dir)
        _run(["git", "config", "user.name", "Blog Owner"], cwd=out_dir)

    code, output = _run(["git", "remote", "get-url", "origin"], cwd=out_dir)
    if code != 0:
        _run(["git", "remote", "add", "origin", static_repo], cwd=out_dir)

    _run(["git", "add", "."], cwd=out_dir)
    _run(f'git commit -m "部署更新：{_ts()}"', out_dir, shell=True)
    _run(["git", "branch", "-M", static_branch], cwd=out_dir)
    code, output = _run(["git", "push", "-u", "origin", static_branch, "--force"], cwd=out_dir, timeout=300)
    add_step(f"推送 {static_branch} 到 GitHub Pages", code == 0, output)
    pages_ok = code == 0

    # ── 第 ④ 步：推送源码 main（等价 bat [7/8]）──
    code0, _ = _run(["git", "remote", "get-url", "origin"], cwd=BLOG_REPO_ROOT)
    if code0 == 0:
        _run(["git", "remote", "set-url", "origin", static_repo], cwd=BLOG_REPO_ROOT)

    _run(["git", "add", "-A"], cwd=BLOG_REPO_ROOT)
    _run(f'git commit -m "更新：{_ts()}"', BLOG_REPO_ROOT, shell=True)
    code, output = _run(["git", "push", "origin", source_branch], cwd=BLOG_REPO_ROOT, timeout=300)
    add_step(f"推送源码到 {source_branch}", code == 0, output)
    main_ok = code == 0

    overall = pages_ok  # 源码推送失败只警告，Pages 成功即视为部署成功
    summary = "🎉 部署成功！GitHub Pages 几分钟后生效。" if pages_ok else "❌ Pages 推送失败，请检查网络/SSH 密钥。"
    if pages_ok and not main_ok:
        summary += "（源码推送失败，可稍后手动 git push）"
    return {"success": overall, "message": summary, "steps": steps}


@router.get("/config")
async def get_deploy_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    # 🌟 默认返回双轨结构
    return {
        "blogPath": "",
        "staticRepoUrl": "",
        "staticBranch": "gh-pages",
        "sourceRepoUrl": "",
        "sourceBranch": "main"
    }


@router.post("/config")
async def save_deploy_config(request: Request):
    try:
        data = await request.json()
        os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return {"success": True, "message": "✅ 双轨部署配置已永久保存！"}
    except Exception as e:
        return {"success": False, "message": f"保存失败: {str(e)}"}


# 🔑 核心大升级：根据 type 动态获取/生成不同的 SSH 密匙，并自动配置路由！
@router.get("/ssh/key")
async def get_my_ssh_key(type: str = "static"):
    """获取或生成本地 SSH 公钥 (支持 A/B 双线隔离)"""
    try:
        ssh_dir = os.path.expanduser("~/.ssh")
        os.makedirs(ssh_dir, exist_ok=True)

        # 判断是为 A线(static) 还是 B线(source) 打钥匙
        if type == "source":
            key_name = "id_ed25519_source"
            user_tag = f"{getpass.getuser()}@{platform.node()}-Source"
        else:
            key_name = "id_ed25519"
            user_tag = f"{getpass.getuser()}@{platform.node()}-Static"

        pub_key_path = os.path.join(ssh_dir, f"{key_name}.pub")
        priv_key_path = os.path.join(ssh_dir, key_name)

        # 兼容老用户：如果是 A 线，优先看看有没有老的 id_rsa
        if type == "static" and not os.path.exists(pub_key_path):
            if os.path.exists(os.path.join(ssh_dir, "id_rsa.pub")):
                pub_key_path = os.path.join(ssh_dir, "id_rsa.pub")

        # 如果连指定的钥匙都没有，当场打一把新的！
        if not os.path.exists(pub_key_path):
            subprocess.run([
                "ssh-keygen", "-t", "ed25519",
                "-C", user_tag,
                "-N", "",
                "-f", priv_key_path
            ], check=True)
            pub_key_path = f"{priv_key_path}.pub"

        # 🌟 极客魔法：如果是 B 线(source)，自动在本地注入 SSH 路由分流规则！
        if type == "source":
            config_path = os.path.join(ssh_dir, "config")
            # 兼容 Windows 和 Mac 路径分隔符
            safe_priv_path = priv_key_path.replace('\\', '/')
            config_entry = f"\n# Auto-generated by Blog CMS for Vercel Source Sync\nHost github-source\n    HostName github.com\n    User git\n    IdentityFile {safe_priv_path}\n"

            config_exists = False
            if os.path.exists(config_path):
                with open(config_path, "r", encoding="utf-8") as f:
                    if "Host github-source" in f.read():
                        config_exists = True

            if not config_exists:
                with open(config_path, "a", encoding="utf-8") as f:
                    f.write(config_entry)

        # 读取公钥内容并返回给前端
        with open(pub_key_path, "r", encoding="utf-8") as f:
            key_content = f.read().strip()
            return {"success": True, "key": key_content}

    except Exception as e:
        return {"success": False, "message": f"获取 SSH 失败: {str(e)}"}


@router.post("/check")
async def check_git_env(request: Request):
    try:
        payload = await request.json()
        blog_path = payload.get("blogPath", "").strip()

        if not blog_path or not os.path.exists(blog_path):
            return {"success": False, "message": "本地物理路径不存在，请先检查路径！"}

        git_dir = os.path.join(blog_path, ".git")
        if not os.path.exists(git_dir):
            return {"success": False, "message": "该路径未初始化 Git 仓库，请点击下方【一键初始化】按钮。"}

        return {"success": True, "message": "✅ Git 环境正常！已准备就绪。"}
    except Exception as e:
        return {"success": False, "message": f"Git 检测失败: {str(e)}"}


@router.post("/init")
async def init_deploy_env(request: Request):
    """初始化双轨部署环境"""
    try:
        payload = await request.json()
        blog_path = payload.get("blogPath", "").strip()
        static_repo = payload.get("staticRepoUrl", "").strip()

        if not blog_path or not os.path.exists(blog_path):
            return {"success": False, "message": "目标博客路径不存在！"}

        # 1. 基础 Git 初始化
        subprocess.run(["git", "init"], cwd=blog_path, check=True)

        # 为了兼容老版的静态部署插件，我们把 origin 绑定给 A线 (静态仓库)
        if static_repo:
            subprocess.run(["git", "remote", "remove", "origin"], cwd=blog_path, stderr=subprocess.DEVNULL)
            subprocess.run(["git", "remote", "add", "origin", static_repo], cwd=blog_path, check=True)

        # 2. 修改 package.json 写入 scripts (专供 A 线静态发布)
        pkg_path = os.path.join(blog_path, "package.json")
        if os.path.exists(pkg_path):
            with open(pkg_path, "r", encoding="utf-8") as f:
                pkg_data = json.load(f)
            if "scripts" not in pkg_data:
                pkg_data["scripts"] = {}
            pkg_data["scripts"]["deploy"] = "next build && gh-pages -d out"
            with open(pkg_path, "w", encoding="utf-8") as f:
                json.dump(pkg_data, f, indent=2, ensure_ascii=False)

        # 3. 安装 gh-pages 插件
        process = subprocess.Popen(
            ["npm", "install", "gh-pages", "--save-dev"],
            cwd=blog_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            text=True,
            encoding='utf-8'
        )
        stdout, stderr = process.communicate()

        return {"success": True, "message": "✨ 太棒了！双轨部署底层依赖与配置初始化完成！"}
    except Exception as e:
        return {"success": False, "message": f"初始化发生异常: {str(e)}"}


# 🚀 A 线接口：打包静态文件并发布到 GitHub Pages
@router.post("/publish")
async def publish_to_github_pages(request: Request):
    try:
        payload = await request.json()
        blog_path = payload.get("blogPath", "").strip()

        process = subprocess.Popen(
            ["npm", "run", "deploy"],
            cwd=blog_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            text=True,
            encoding='utf-8'
        )
        stdout, stderr = process.communicate()
        if process.returncode == 0:
            return {"success": True, "message": "🎉 A线: 网页已成功编译并发布到静态仓库！"}
        else:
            return {"success": False, "message": f"发布失败，报错:\n{stderr}"}
    except Exception as e:
        return {"success": False, "message": f"静态发布引擎崩溃: {str(e)}"}


# ☁️ B 线接口：同步源代码到 Vercel 仓库 (全新核心功能)
# ☁️ B 线接口：同步源代码到 Vercel 仓库 (全新终极强绑定机制)
@router.post("/source")
async def sync_source_to_vercel(request: Request):
    try:
        payload = await request.json()
        blog_path = payload.get("blogPath", "").strip()

        # 读取配置
        if not os.path.exists(CONFIG_FILE):
            return {"success": False, "message": "未找到配置文件，请先点击保存！"}

        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            config = json.load(f)

        source_repo = config.get("sourceRepoUrl", "").strip()
        source_branch = config.get("sourceBranch", "main").strip()

        if not source_repo:
            return {"success": False, "message": "B 线源码仓库地址为空，无法同步！"}

        os.chdir(blog_path)

        # 1. 添加所有代码改动
        subprocess.run(["git", "add", "."], check=True)

        # 2. 提交代码 (这里加入容错)
        commit_cmd = 'git commit -m "Auto sync source code for Vercel 🚀" || echo "No changes to commit"'
        subprocess.run(commit_cmd, shell=True, capture_output=True)

        # 🌟 终极杀招：强行绑定 B 线专属私钥，无视 Windows 智障路由！
        ssh_dir = os.path.expanduser("~/.ssh")
        # 把 Windows 的反斜杠强制替换为正斜杠，防止 Git 识别错误
        priv_key_path = os.path.join(ssh_dir, "id_ed25519_source").replace("\\", "/")

        # 组装环境变量，用 GIT_SSH_COMMAND 强行逼迫 Git 使用这把钥匙
        custom_env = os.environ.copy()
        custom_env["GIT_SSH_COMMAND"] = f'ssh -i "{priv_key_path}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=no'

        # 3. 推送 (携带我们强行塞进去的钥匙环境变量)
        push_cmd = f'git push "{source_repo}" HEAD:{source_branch}'
        push_process = subprocess.run(
            push_cmd,
            shell=True,
            capture_output=True,
            text=True,
            encoding='utf-8',
            env=custom_env  # 👈 就是这里！把钥匙按在 Git 脸上！
        )

        # 判断是否成功
        if push_process.returncode != 0 and "Everything up-to-date" not in push_process.stderr:
            return {"success": False, "message": f"源码同步失败:\n{push_process.stderr}"}

        return {"success": True, "message": "☁️ B线: 源码已成功送达 GitHub，Vercel 构建已触发！"}

    except Exception as e:
        return {"success": False, "message": f"源码同步引擎异常: {str(e)}"}