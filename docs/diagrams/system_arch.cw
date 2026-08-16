# session_id: 499ab5ce-4c4c-4306-a26a-3852cc689d89
classes: {
  zone_1: {
    style: {
      fill: "#F0F5FE"
      stroke: "#467AEE"
      font-color: "#333333"
      border-radius: 8
    }
  }
  zone_2: {
    style: {
      fill: "#F3F6FE"
      stroke: "#467AEE"
      font-color: "#333333"
      border-radius: 8
    }
  }
  zone_3: {
    style: {
      fill: "#F6F8FE"
      stroke: "#467AEE"
      font-color: "#333333"
      border-radius: 8
    }
  }
  zone_4: {
    style: {
      fill: "#F9FBFE"
      stroke: "#467AEE"
      font-color: "#333333"
      border-radius: 8
    }
  }
  zone_5: {
    style: {
      fill: "#FCFDFF"
      stroke: "#467AEE"
      font-color: "#333333"
      border-radius: 8
    }
  }
  entity: {
    style: {
      fill: "#FFFFFF"
      stroke: "#1F2937"
      font-color: "#333333"
      border-radius: 6
      shadow: true
    }
  }
  signal: {
    style: {
      fill: transparent
      font-color: "#6B7280"
    }
  }
}

direction: right

# ============ Zone 1: 桌面壳层 ============
desktop_shell: Desktop Shell {
  class: zone_1
  direction: down

  launcher: launcher.py {
    class: entity
    shape: page
  }

  backend_config: backend_config.json {
    class: entity
    shape: queue
  }

  manager_frontend: my-blog-manager {
    class: entity
    shape: package
  }

  launcher -> backend_config: 随机端口写入
  launcher -> manager_frontend: 拉起
}

# ============ Zone 2: 管理前端 ============
admin_frontend: Admin Frontend (Next.js 15) {
  class: zone_2
  direction: down

  pages: {
    class: entity
    shape: package

    settings: settings 设置页
    editor: editor 编辑器
    drafts: drafts 草稿
    moments: moments 说说
    chatter: chatter 杂谈
    music: music 音乐
    grid-columns: 3
  }

  op_context: OperationContext {
    class: entity
    shape: queue
  }

  pages -> op_context: 修改暂存
}

# ============ Zone 3: 后端服务 ============
backend_service: cms_core (FastAPI) {
  class: zone_3
  direction: down

  routes: {
    class: entity
    shape: package
    grid-columns: 3

    config: config 站点配置
    drafts_api: drafts 文章发布
    sync: sync 内容同步
    deploy: deploy 构建部署
    moments_api: moments
    music_api: music
    picbed: picbed 图床上传
  }

  disk: 磁盘数据 {
    class: entity
    shape: cylinder
  }

  routes -> disk: 读写
}

# ============ Zone 4: 数据与部署层 ============
data_deploy: Data & Deployment {
  class: zone_4
  direction: down

  data_files: {
    class: entity
    shape: package

    site_config: siteConfig.ts
    posts: posts/moments/chatters Markdown
    data: data 数据文件
    public: public 静态资源
    grid-columns: 2
  }

  xhblogs: XHBlogs 博客前端源码 {
    class: entity
    shape: package
  }

  build: next build {
    class: entity
    shape: hexagon
  }

  gh_pages: gh-pages 分支 {
    class: entity
    shape: queue
  }

  main: main 分支 {
    class: entity
    shape: queue
  }

  github_pages: GitHub Pages {
    class: entity
    shape: cloud
  }

  data_files -> xhblogs: 同步链路复制
  xhblogs -> build: 构建
  build -> gh_pages: 静态站点推送
  build -> main: 源码推送
  gh_pages -> github_pages: 发布
}

# ============ 跨区缝合 ============
desktop_shell.backend_config -> admin_frontend.op_context: 端口发现
admin_frontend.op_context -> backend_service.routes: HTTP REST API
backend_service.routes.sync -> data_deploy.data_files: 同步过滤图床敏感行
backend_service.routes.deploy -> data_deploy.xhblogs: 触发构建