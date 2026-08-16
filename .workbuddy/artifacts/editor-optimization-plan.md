# 后端编辑器体验优化方案

## 一、现有架构分析

### 编辑器分层结构

```
┌─────────────────────────────────────────────────────┐
│                  各模块编辑页面                        │
│  说说(MomentList) │ 杂谈/文章(EditorClient) │ 照片墙 │ 项目 │
├─────────────────────────────────────────────────────┤
│              共享编辑器组件层                          │
│  RichTextEditor(Tiptap) │ FloatingImageTool │ MetaMatrix │
├─────────────────────────────────────────────────────┤
│              后端 API 层                              │
│  picbed.py(图床) │ drafts.py │ moments.py │ gallery.py │
└─────────────────────────────────────────────────────┘
```

### 各模块编辑器现状

| 模块 | 编辑器框架 | 图片上传 | 多图支持 | 拖拽排序 | 图片尺寸 | 预览 |
|------|-----------|---------|---------|---------|---------|------|
| **文章/杂谈** | Tiptap 富文本 | FloatingImageTool (单张) | ❌ | ❌ | ✅ 25/50/75/100% | ✅ WYSIWYG |
| **说说** | 原生 textarea | 拖拽上传+外链 (多张) | ✅ | ❌ | ❌ | ❌ 发布后可见 |
| **项目** | 原生表单 | ❌ 无图片 | — | — | — | ❌ |
| **照片墙** | 原生表单 | FloatingImageTool (单张) | ❌ 逐张添加 | ❌ | — | ✅ Lightbox |

### 当前 FloatingImageTool 的限制

- **单次只能处理 1 张图片**（`onInsert: (url: string) => void`）
- 外链模式为单行 textarea，只能粘贴 1 条 URL
- 上传后无队列管理，必须逐张插入
- 说说模块有独立的多图上传（拖拽 + `multiple` 属性），但与 FloatingImageTool 是两套独立实现

---

## 二、四项功能优化方案

### 功能 1：批量图片上传

#### 目标
FloatingImageTool 支持一次选择/粘贴多张图片，批量上传后统一插入。

#### 方案设计

**改动范围**：`FloatingImageTool.tsx` + 各消费方

**接口变更**：
```typescript
// 现有（单张）
interface FloatingImageToolProps {
  onInsert: (url: string) => void;
}

// 改为（批量）
interface FloatingImageToolProps {
  onInsert: (urls: string[]) => void;  // 支持批量
  maxImages?: number;                   // 可选：限制最大数量
}
```

**UI 变更**：

```
┌──────────────────────────────────┐
│  ☁️ 图床工作台                    │
├──────────────────────────────────┤
│  [云端上传] [外链插入]             │
│                                  │
│  ┌──────────────────────────┐   │
│  │  📥 点击或拖拽图片         │   │
│  │  支持多选，最多 20 张      │   │
│  └──────────────────────────┘   │
│                                  │
│  上传队列：                       │
│  ┌────┐ ┌────┐ ┌────┐         │
│  │ ✅ │ │ ⏳ │ │ ❌ │  ...     │
│  │ img1│ │ img2│ │ img3│         │
│  └────┘ └────┘ └────┘         │
│  3/5 已完成                      │
│                                  │
│  [全部重新上传]  [插入全部 ✨]    │
└──────────────────────────────────┘
```

**核心逻辑**：
1. `fileInput` 加 `multiple` 属性
2. 拖拽区支持 `e.dataTransfer.files` 多文件
3. 外链模式 textarea 支持多行 URL（每行一个）
4. 维护 `uploadQueue: { file, status, url }[]` 状态
5. 并发上传（`Promise.allSettled`，最多 3 并发）
6. 全部完成后点「插入全部」调用 `onInsert(urls)`

**说说模块适配**：
- MomentList 的图片区改为调用 FloatingImageTool，替换现有的独立上传逻辑
- 统一使用图床上传，不再走说说自己的 `/api/moments/upload`

---

### 功能 2：图片拖拽排序

#### 目标
多张图片上传后，支持拖拽调整显示顺序。

#### 方案设计

**依赖选择**：使用 `@dnd-kit/sortable`（轻量、无 jQuery、支持触摸）

> 替代方案：直接用 framer-motion 的 `Reorder` 组件（项目已有 framer-motion，零新增依赖）

**推荐方案：framer-motion Reorder**（零新增依赖）

```tsx
import { Reorder } from 'framer-motion';

<Reorder.Group axis="x" values={images} onReorder={setImages}>
  {images.map((img, idx) => (
    <Reorder.Item key={img} value={img}>
      <div className="relative aspect-square rounded-xl overflow-hidden">
        <img src={img} className="w-full h-full object-cover" />
        <button onClick={() => removeImage(idx)}>✕</button>
      </div>
    </Reorder.Item>
  ))}
</Reorder.Group>
```

**适用场景**：
- FloatingImageTool 批量上传后的预览排序
- 说说发布弹窗的图片网格排序
- 照片墙相册内的照片排序

**UI 效果**：
- 拖拽时图片放大 105% + 阴影加深
- 拖拽目标位置显示蓝色指示线
- 释放后平滑归位动画（spring 弹性）

---

### 功能 3：照片墙翻页动画

#### 目标
打开相册查看照片时，提供翻页/轮播动画效果。

#### 5 种动画方案

##### 方案 A：仿真翻页（Page Curl）
模拟真实书页翻动效果，带阴影和弯曲变形。

```
技术实现：CSS 3D transform + perspective
依赖：无（纯 CSS + JS 事件监听）
复杂度：⭐⭐⭐⭐
效果：左/右页翻转，带阴影渐变和纸张弯曲
适合：文艺/复古风格博客
```

```css
.page-curl {
  transform-style: preserve-3d;
  perspective: 1500px;
  transition: transform 0.8s cubic-bezier(0.645, 0.045, 0.355, 1);
}
.page-curl.turn {
  transform: rotateY(-180deg);
  box-shadow: -10px 0 30px rgba(0,0,0,0.3);
}
```

##### 方案 B：卡片翻转（Card Flip）
照片以卡片形式，点击后 3D 翻转到下一张。

```
技术实现：CSS 3D transform (rotateY)
依赖：无（纯 CSS）
复杂度：⭐⭐
效果：卡片沿 Y 轴翻转 180°，正面是当前照片，背面是下一张
适合：现代/科技风格博客
```

##### 方案 C：滑动切换（Slide）
类似手机相册的左右滑动切换。

```
技术实现：framer-motion drag + AnimatePresence
依赖：已有 framer-motion
复杂度：⭐⭐
效果：手指/鼠标拖拽滑动，带惯性回弹
适合：通用，移动端友好
```

##### 方案 D：淡入淡出 + 缩放（Fade & Zoom）
照片从中心放大淡入，切换时缩小淡出再放大淡入下一张。

```
技术实现：framer-motion AnimatePresence + scale/opacity
依赖：已有 framer-motion
复杂度：⭐
效果：照片居中放大出现，切换时优雅过渡
适合：摄影作品展示，突出照片本身
```

##### 方案 E：3D 相册走马灯（3D Carousel）
照片以环形排列在 3D 空间中旋转。

```
技术实现：CSS 3D transform (rotateY + translateZ)
依赖：无（纯 CSS）
复杂度：⭐⭐⭐
效果：照片环绕成圆柱体，左右旋转切换
适合：照片数量适中(5-15张)的精选展示
```

#### 推荐

| 方案 | 视觉效果 | 性能 | 实现难度 | 推荐度 |
|------|---------|------|---------|--------|
| A 仿真翻页 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 适合首次展示 |
| B 卡片翻转 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ✅ 推荐（简单高效） |
| C 滑动切换 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ✅ 推荐（移动端友好） |
| D 淡入缩放 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | ✅ 推荐（最简实现） |
| E 3D 走马灯 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 照片少时效果惊艳 |

**建议**：在后端设置页面新增「照片墙动画样式」配置项，提供 B/C/D 三种选择（A/E 可作为高级选项），用户选择后通过 `siteConfig.galleryAnimation` 指定。

---

### 功能 4：文章中间插入自定义大小图片 + 说说富文本模式

#### 目标
1. 项目页面的编辑器允许在文本任意位置插入自定义大小的图片
2. 说说切换到「富文本模式」后也有同样的能力

#### 4a. 项目编辑器升级

**现状**：项目编辑器是纯表单（icon/name/url/description/tags），无富文本能力。

**方案**：为项目编辑器的 `description` 字段增加一个「富文本编辑」入口。

```
当前：
┌─────────────────────────────┐
│ [emoji] [项目名称]           │
│ [GitHub URL]                │
│ [项目描述 textarea]          │
│ [技术栈]                    │
└─────────────────────────────┘

升级后：
┌─────────────────────────────┐
│ [emoji] [项目名称]           │
│ [GitHub URL]                │
│ [📝 切换富文本]              │  ← 新增
│ ┌─────────────────────────┐ │
│ │ Tiptap 工具栏            │ │  ← 展开后显示
│ │ [B][I][U][📷]...        │ │
│ │ 项目描述编辑区            │ │
│ │ 光标处可插入任意大小图片   │ │
│ └─────────────────────────┘ │
│ [技术栈]                    │
└─────────────────────────────┘
```

**实现方式**：
- 创建轻量版 `MiniRichTextEditor` 组件（复用 RichTextEditor 核心，精简工具栏）
- 工具栏只保留：加粗、斜体、链接、图片、代码、列表
- 图片插入支持 25%/50%/75%/100% 尺寸选择（复用现有 CustomImage 扩展）
- 项目描述存储格式从纯文本改为 HTML

**影响范围**：
- `ProjectsBoard.tsx` 的编辑弹窗
- `data/projects.ts` 的 description 字段格式（纯文本 → HTML）
- 前台 `XHBlogs` 的项目展示组件需支持渲染 HTML

#### 4b. 说说富文本模式

**现状**：说说用原生 textarea，只支持纯文本。

**方案**：在发布弹窗增加模式切换开关。

```
当前：
┌─────────────────────────────┐
│  记录新瞬间                  │
│  [textarea 纯文本]           │
│  [位置] [图片上传区]         │
└─────────────────────────────┘

升级后：
┌─────────────────────────────┐
│  记录新瞬间                  │
│  [纯文本 ●] [富文本 ○]      │  ← 模式切换
│                              │
│  纯文本模式：                 │
│  [textarea]                  │
│                              │
│  富文本模式：                 │
│  ┌─────────────────────────┐ │
│  │ [B][I][📷][代码][列表]   │ │
│  │ Tiptap 编辑区            │ │
│  │ 光标处可插入多张图片      │ │
│  │ 支持自定义尺寸 25/50/100%│ │
│  └─────────────────────────┘ │
│                              │
│  [图片上传区]（两种模式都有）  │
└─────────────────────────────┘
```

**实现方式**：
- 新增 `useRichText` 状态切换
- 富文本模式使用精简版 Tiptap 编辑器
- 图片插入通过工具栏的 📷 按钮（打开 FloatingImageTool）
- 说说的 content 字段根据模式存储为纯文本或 HTML
- 前台展示时根据内容格式自动判断渲染方式

**数据兼容**：
- 已有纯文本说说正常显示（`<p>` 包裹）
- 新建富文本说说存为 HTML
- 两种格式在前台统一用 `dangerouslySetInnerHTML` 或条件渲染

---

## 三、统一改进项

### 即时预览增强

| 模块 | 当前预览 | 改进方案 |
|------|---------|---------|
| 文章/杂谈 | ✅ WYSIWYG | 无需改动 |
| 说说 | ❌ 发布后才看到 | 增加「预览」按钮，弹窗内实时渲染最终效果 |
| 项目 | ❌ | 编辑弹窗下方增加卡片预览（模拟前台显示样式） |
| 照片墙 | 部分（图片 URL 预览） | 增加相册封面堆叠预览（模拟前台三卡片效果） |

### 风格统一

所有编辑弹窗统一采用：
- 圆角 `rounded-[40px]` + 毛玻璃 `backdrop-blur-2xl`
- Indigo 主题色
- 标准工具栏样式（从 RichTextEditor 提取共享样式变量）
- 统一的按钮层级：取消(灰) / 暂存(indigo) / 发布(渐变绿)

---

## 四、分阶段实施计划

### Phase 1：批量图片上传 + 拖拽排序（投入产出比最高）

**目标**：FloatingImageTool 支持多图，说说/照片墙统一接入

**改动文件**：
| 文件 | 改动 |
|------|------|
| `components/editor/FloatingImageTool.tsx` | 重写：多文件上传、上传队列、批量插入 |
| `app/moments/MomentList.tsx` | 图片区改用 FloatingImageTool，复用排序 |
| `app/photowall/page.tsx` | 照片添加支持批量（复用 FloatingImageTool） |
| `components/editor/RichTextEditor.tsx` | `insertImage` 改为 `insertImages(urls)` |
| `app/editor/page.tsx` | 适配新的批量插入接口 |
| `package.json` | 无需新增依赖（framer-motion Reorder） |

**预期效果**：
- 照片墙添加 20 张照片：从 20 次单张操作 → 1 次批量上传
- 说说发图：从逐张添加 → 批量选择 + 拖拽排序
- 总工时：约 4-6 小时

### Phase 2：照片墙翻页动画

**目标**：相册照片查看支持翻页动画

**改动文件**：
| 文件 | 改动 |
|------|------|
| `XHBlogs/app/photowall/PhotoWallClient.tsx` | 重写 Lightbox：加入翻页 + 动画切换 |
| `XHBlogs/siteConfig.ts` | 新增 `galleryAnimation: 'flip' | 'slide' | 'fade'` |
| `my-blog-manager/siteConfig.ts` | 同步新增字段 |
| `my-blog-manager/components/settings/` | 新增照片墙动画选择配置 |
| `my-blog-manager/cms_core/api/config.py` | 白名单加 `galleryAnimation` |

**预期效果**：
- 打开相册后左右键/滑动切换照片
- 支持 3 种动画效果可选
- 总工时：约 3-4 小时

### Phase 3：项目编辑器富文本 + 说说富文本模式

**目标**：项目描述支持富文本插入图片，说说支持富文本模式

**改动文件**：
| 文件 | 改动 |
|------|------|
| `components/editor/MiniRichTextEditor.tsx` | **新建**：精简版 Tiptap 编辑器 |
| `app/projects/ProjectsBoard.tsx` | 编辑弹窗集成 MiniRichTextEditor |
| `app/moments/MomentList.tsx` | 新增模式切换 + 富文本编辑区 |
| `XHBlogs/app/projects/` 系列 | 前台支持 HTML 渲染 |
| `XHBlogs/app/moments/` 系列 | 前台自适应纯文本/HTML |

**预期效果**：
- 项目描述可插入图片、代码块、链接
- 说说富文本模式支持图文混排
- 总工时：约 5-7 小时

### Phase 4：统一预览增强

**目标**：各模块增加即时预览

**改动文件**：
| 文件 | 改动 |
|------|------|
| `app/moments/MomentList.tsx` | 新增「预览」按钮 + 预览弹窗 |
| `app/projects/ProjectsBoard.tsx` | 编辑弹窗增加卡片预览 |
| `app/photowall/page.tsx` | 照片上传区增加封面堆叠预览 |

**总工时**：约 2-3 小时

---

## 五、依赖影响评估

| 操作 | 影响 |
|------|------|
| 新增 `@dnd-kit/sortable` | ❌ 不需要，用 framer-motion Reorder 替代 |
| 使用 `framer-motion Reorder` | ✅ 零新增依赖，已有 framer-motion |
| 使用 CSS 3D transform | ✅ 零依赖，纯 CSS |
| MiniRichTextEditor 复用 tiptap | ✅ 零新增依赖，已有全套 tiptap |

**结论**：全部四项优化均可基于现有依赖实现，无需新增 npm 包。

---

## 六、风险与注意事项

1. **数据格式兼容**：项目 description 从纯文本改 HTML 后，需确保前台兼容旧数据（纯文本自动包裹 `<p>`）
2. **说说 HTML 安全**：富文本模式的 HTML 需后端过滤 XSS（可用 DOMPurify 前端过滤）
3. **图片批量上传性能**：超过 10 张时建议显示进度条，避免用户以为卡死
4. **照片墙动画性能**：大图切换时预加载下一张，避免白屏闪烁
5. **移动端适配**：拖拽排序在触摸设备上需测试手感，framer-motion Reorder 原生支持触摸
