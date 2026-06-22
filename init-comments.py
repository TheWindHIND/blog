#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动初始化 Gitalk 评论区脚本
扫描所有页面，自动为新页面创建 GitHub Issue
"""

import os
import re
import requests
import json
from pathlib import Path

# ========== 配置 ==========
# 从 comment-config.json 读取配置
CONFIG_FILE = Path(__file__).parent / "comment-config.json"

def load_config():
    """加载配置文件"""
    if not CONFIG_FILE.exists():
        print(f"❌ 配置文件 {CONFIG_FILE} 不存在！")
        print("   请复制 comment-config.example.json 为 comment-config.json，并填写你的配置")
        exit(1)
    
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

config = load_config()
GITHUB_TOKEN = config["github_token"]
COMMENT_REPO = config["comment_repo"]
BLOG_BASE_URL = config["blog_base_url"]
BLOG_BASE_PATH = config["blog_base_path"]  # Gitalk 的 id 前缀

# 项目路径
PROJECT_ROOT = Path(__file__).parent
XHBLOGS_DIR = PROJECT_ROOT / "XHBlogs"

# ========== 函数 ==========

def get_all_pages():
    """扫描所有有评论区的页面"""
    pages = []
    
    # 1. 固定页面
    fixed_pages = [
        "/about",
        "/friends",
        "/music",
        "/moments",
        "/tree",
        "/projects",
        "/timeline",
        "/photowall",
    ]
    pages.extend(fixed_pages)
    
    # 2. 文章页面（posts 目录下的 md 文件）
    posts_dir = XHBLOGS_DIR / "posts"
    if posts_dir.exists():
        for md_file in posts_dir.glob("*.md"):
            slug = md_file.stem
            pages.append(f"/posts/{slug}")
    
    # 3. 杂谈页面（chatters 目录下的 md 文件）
    chatters_dir = XHBLOGS_DIR / "chatters"
    if chatters_dir.exists():
        for md_file in chatters_dir.glob("*.md"):
            slug = md_file.stem
            pages.append(f"/chatter/{slug}")
    
    # 4. 说说页面（moments 目录下的 md 文件）
    # 注意：说说可能是统一一个评论区，也可能每个说说单独一个
    # 暂时先加统一的 /moments
    # 如果每个说说单独有评论区，需要再调整
    
    return sorted(list(set(pages)))  # 去重并排序


def get_existing_issues():
    """获取评论仓库中已有的 Gitalk Issue"""
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    issues = []
    page = 1
    
    while True:
        response = requests.get(
            f"https://api.github.com/repos/{COMMENT_REPO}/issues",
            headers=headers,
            params={
                "state": "all",
                "labels": "Gitalk",
                "per_page": 100,
                "page": page
            }
        )
        
        if response.status_code != 200:
            print(f"❌ 获取 Issue 列表失败: {response.status_code}")
            break
        
        data = response.json()
        if not data:
            break
        
        issues.extend(data)
        page += 1
    
    # 提取 Issue 标题（也就是 Gitalk 的 id）
    existing_titles = set(issue["title"] for issue in issues)
    return existing_titles


def create_issue(page_path):
    """为单个页面创建评论 Issue"""
    title = f"{BLOG_BASE_PATH}{page_path}"
    body = f"Gitalk: {BLOG_BASE_URL}{page_path}/"
    
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    data = {
        "title": title,
        "body": body,
        "labels": ["Gitalk"]
    }
    
    response = requests.post(
        f"https://api.github.com/repos/{COMMENT_REPO}/issues",
        headers=headers,
        json=data
    )
    
    if response.status_code == 201:
        return True, response.json()["html_url"]
    else:
        return False, response.text[:200]


def main():
    print("=" * 50)
    print("🎵 Gitalk 评论区自动初始化脚本")
    print("=" * 50)
    print()
    
    # 1. 扫描所有页面
    print("📋 扫描页面中...")
    all_pages = get_all_pages()
    print(f"   找到 {len(all_pages)} 个页面")
    for page in all_pages:
        print(f"   - {BLOG_BASE_PATH}{page}")
    print()
    
    # 2. 获取已有的 Issue
    print("🔍 检查已有的评论区...")
    try:
        existing_titles = get_existing_issues()
        print(f"   已有 {len(existing_titles)} 个评论区")
    except Exception as e:
        print(f"❌ 获取已有 Issue 失败: {e}")
        print("   继续执行，将尝试创建所有页面（已存在的会报错但不影响）")
        existing_titles = set()
    print()
    
    # 3. 创建新的 Issue
    print("🚀 开始创建新评论区...")
    print()
    
    success_count = 0
    skip_count = 0
    fail_count = 0
    failed_pages = []
    
    for page in all_pages:
        title = f"{BLOG_BASE_PATH}{page}"
        
        if title in existing_titles:
            print(f"⏭️  跳过（已存在）: {page}")
            skip_count += 1
            continue
        
        success, result = create_issue(page)
        
        if success:
            print(f"✅ 创建成功: {page}")
            success_count += 1
        else:
            print(f"❌ 创建失败: {page}")
            print(f"   错误: {result}")
            fail_count += 1
            failed_pages.append(page)
    
    # 4. 统计结果
    print()
    print("=" * 50)
    print("📊 完成！")
    print(f"   总计: {len(all_pages)} 个页面")
    print(f"   成功: {success_count} 个")
    print(f"   跳过: {skip_count} 个（已存在）")
    print(f"   失败: {fail_count} 个")
    
    if failed_pages:
        print()
        print("❌ 失败的页面:")
        for page in failed_pages:
            print(f"   - {page}")
    
    print("=" * 50)


if __name__ == "__main__":
    main()
