# 智能缓存清理 (Smart Cache Cleaner) - Chrome 扩展程序 (Manifest V3)

![Manifest V3](https://img.shields.io/badge/Manifest-V3-2563eb.svg)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-34d399.svg)
![License](https://img.shields.io/badge/License-MIT-0284c7.svg)

**智能缓存清理 (Smart Cache Cleaner)** 是一款遵循 **Google Chrome Manifest V3** 最新规范开发的浏览器扩展程序。它基于 **GA 级会话断定算法 (Session Timeout)**，智能追踪并统计全网域名的真实访问频次，协助用户快速筛选并一键清理偶发、低频访问网站产生的无用页面缓存、Cookie 凭证与本地存储空间，同时提供强效白名单防护，让浏览器始终保持轻盈高效。

---

## 🏗️ 系统设计架构 (System Architecture)

本项目采用 **“Web 模拟仿真 + Manifest V3 原生插件生成器”** 架构设计：

### 1. 双引擎架构逻辑拓扑图 (Architecture Topology)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           用户浏览器环境 (User Browser)                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────┐                     ┌───────────────────────────────┐
│   Web 交互模拟器 (Simulator)   │                     │   Manifest V3 生产环境扩展     │
├───────────────────────────────┤                     ├───────────────────────────────┤
│ • React + Vite 实时组件        │                     │ • Service Worker (background) │
│ • Chrome API 内存沙盒 (Mock)  │                     │ • Chrome browsingData 原生API │
│ • 智能统计/快速清理模拟        │                     │ • chrome.storage.local 持久化  │
│ • JSZip 纯前端打包 (.zip)      │                     │ • 原生 Popup / Options 页面    │
└───────────────┬───────────────┘                     └───────────────┬───────────────┘
                │                                                     │
                └──────────────────────────┬──────────────────────────┘
                                           ▼
                       ┌──────────────────────────────────────┐
                       │    GA 级会话去重算法 (Session Engine)  │
                       ├──────────────────────────────────────┤
                       │ • 默认 30 分钟超时窗口 (Timeout)     │
                       │ • 相同会话去重 / 跨窗口自动递增频次     │
                       │ • 网站分类映射 / 存储占用预估        │
                       │ • 智能白名单比对防护                 │
                       └──────────────────────────────────────┘
```

### 2. 核心组件与 API 映射

| 组件 / 模块 | 文件路径 | 核心 API / 职责 |
| :--- | :--- | :--- |
| **Manifest V3 描述符** | `manifest.json` | 声明权限 `tabs`, `browsingData`, `storage`, `history` 与 `assets/icons/icon*.png` 图标 |
| **Service Worker** | `background.js` | 监听 `chrome.tabs.onUpdated`、时间戳计算与 `chrome.browsingData.remove` 清理 |
| **悬浮控制弹窗** | `popup.html` / `.js` | 当前页面域名识别、阈值滑块调整与快速清理 |
| **明细管理控制台** | `options.html` / `.js` | 全维频次报表、分类检索过滤与白名单规则配置 |
| **模板构建脚本** | `scripts/build-extension.ts` | Node.js 物理编译，输出 `./dist-extension` 目录 |

---

## 🌟 核心算法详解：GA 级会话断定 (Session Timeout)

普通计数器在多次刷页或打开多个子页面时会导致访问频次虚高。本插件引入 **Google Analytics 标准会话划分规则**：

```text
 用户打开网页 ──► 检查上次访问时间戳 T_last
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
 (现时间 - T_last) < 30分钟       (现时间 - T_last) ≥ 30分钟
         │                               │
         ▼                               ▼
 [保持当前会话]                  [新会话开启]
  访问频次 Count 不变              访问频次 Count + 1
  更新时间戳 T_last                更新时间戳 T_last
```

---

## 📸 交互功能演示 (Visual Walkthrough)

### 1. 极简悬浮弹窗模式 (Popup Window)
能够在任意网页上一键唤起悬浮小窗，直观查看当前记录域名数、待清理低频域名数以及可释放空间，并提供滑动阈值调节与一键定向清理。

![Demo 1: 极简悬浮弹窗模式](https://raw.githubusercontent.com/jimcary/Smart-Cache-Cleaner/main/assets/demo/demo1-popup.jpg)

---

### 2. 域名频次监控与分析控制台 (Analytics Dashboard)
提供多维度筛选（按访问频次分类、保护白名单状态、域名检索等）与自定义排序功能，深度调阅网站历史访问与预估占用的存储空间。

![Demo 2: 域名频次监控与分析控制台](https://raw.githubusercontent.com/jimcary/Smart-Cache-Cleaner/main/assets/demo/demo2-dashboard.jpg)

---

### 3. 会话规则与受保护白名单配置 (Settings & Whitelist)
灵活调整会话判定超时时间（默认 GA 算法建议 30 分钟），支持通过英文逗号、中文逗号、分号或换行**批量导入**受保护白名单域名，避免重要网站被意外误清理。

![Demo 3: 会话规则与受保护白名单配置](https://raw.githubusercontent.com/jimcary/Smart-Cache-Cleaner/main/assets/demo/demo3-settings.jpg)

---

### 4. 一键定向安全清理 (Targeted Data Cleanup)
勾选目标域名或批量选择低频站点，安全清理页面 Cache、Cookies 凭证与 LocalStorage 本地存储，实时展示释放空间反馈与进度更新。

![Demo 4: 一键定向安全清理](https://raw.githubusercontent.com/jimcary/Smart-Cache-Cleaner/main/assets/demo/demo4-cleaning.jpg)

---

## 🛠️ 构建与安装步骤 (Step-by-Step Guide)

### 步骤一：通过命令行编译插件 (CLI Command)

在项目根目录运行编译脚本：

```bash
npm run build:extension
```

编译完成后将在根目录下生成符合 Chrome MV3 标准的 `./dist-extension` 产物文件夹。

---

### 步骤二：在 Chrome / Edge 浏览器中安装加载 (Load Unpacked)

```text
步骤 1: 打开浏览器扩展页面           步骤 2: 开启开发者模式         步骤 3: 选择 dist-extension 目录
┌───────────────────────────┐      ┌─────────────────────┐      ┌────────────────────────────┐
│ 网址栏输入:                │      │ 右上角开关:         │      │ 点击按钮:                  │
│ chrome://extensions       │ ───► │ [x] 开发者模式      │ ───► │ [加载已解压的扩展程序]      │
└───────────────────────────┘      └─────────────────────┘      └─────────────┬──────────────┘
                                                                              │
                                                                              ▼
                                                                  成功载入 [智能缓存清理] 插件！
```

---

## 📁 目录架构与文件说明

```text
smart-cache-cleaner/
├── manifest.json              # Manifest V3 扩展配置文件 (图标指向 assets/icons/icon*.png)
├── background.js              # 后台 Service Worker (会话去重算法与缓存清理 API)
├── popup.html / popup.js      # 极简悬浮弹窗 UI 与阈值调控逻辑
├── options.html / options.js  # 完整频次面板与白名单管理配置
├── assets/
│   ├── icon.png               # 插件全局主图标 (PNG 格式)
│   ├── icons/                 # 各尺寸标准 16/32/48/128 原生 PNG 图标
│   └── demo/                  # SVG/PNG 交互示意图
├── scripts/
│   └── build-extension.ts     # 物理编译输出脚本
└── README.md                  # 图文架构与使用教程说明文档
```

---

## 🔒 隐私与安全性保障

- **纯本地运算**：本扩展程序所有域名访问统计、会话记录及白名单数据均使用 `chrome.storage.local` 存储在用户本地设备中，**绝不会向任何第三方服务器上传或传输任何网络请求与个人隐私数据**。
- **透明权限调配**：仅请求必要的 `tabs`、`browsingData`、`history` 和 `storage` 权限，用于精准识别域名与清除无用缓存。
