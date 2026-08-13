# 智能缓存清理 (Smart Cache Cleaner) - Chrome 扩展程序 (Manifest V3)

![Manifest V3](https://img.shields.io/badge/Manifest-V3-2563eb.svg)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-34d399.svg)
![License](https://img.shields.io/badge/License-MIT-0284c7.svg)

**智能缓存清理 (Smart Cache Cleaner)** 是一款遵循 **Google Chrome Manifest V3** 最新规范开发的浏览器扩展程序。它基于 **GA 级会话断定算法 (Session Timeout)**，智能追踪并统计全网域名的真实访问频次，协助用户快速筛选并一键清理偶发、低频访问网站产生的无用页面缓存、Cookie 凭证与本地存储空间，同时提供强效白名单防护，让浏览器始终保持轻盈高效。

---

## 🌟 核心亮点与功能特性

### 1. ⏱️ 智能会话去重计数算法 (Session Timeout)
- **拒绝刷新误计**：借鉴 Google Analytics 标准会话分割规则（默认 **30 分钟** 窗口期）。在同一会话窗口期内，无论如何在当前网站刷新、打开多个子页面，均被计为 **1 次有效会话访问**。
- **动态超时更新**：当用户超过 30 分钟未访问该域名后再开启访问，系统将自动划分新会话并递增频次。
- **冷启动历史扫描**：首次安装扩展程序时，后台 Service Worker 会自动分析浏览器近 30 天的历史记录，反推初始化域名访问频次与时间戳，实现“即装即用”。

### 2. 📊 域名频次统计与可视化面板 (Options Dashboard)
- **多维数据统计卡片**：直观呈现全站监控域名总数、低频待清理目标数、预计可释放空间 (MB 及全站占比 %) 以及会话判定时间窗。
- **频次区间分布柱图**：将全网域名划分至 5 个频次区间（`1次(极低)`、`2次(低频)`、`3-5次(中频)`、`6-10次(常用)`、`>10次(高频)`），直观了解垃圾缓存分布。
- **多维度检索与高阶排序**：支持域名关键词模糊匹配，分类过滤（*在线工具/开发者/购物/社交/搜索引擎/其他*），白名单防护过滤，以及按访问频次、缓存体积、最近活跃时间多向排序。
- **批量管理与单项清理**：提供全选/反选勾选框、域名图标标识、相对活跃时间（如 `15 分钟前`）、缓存数据类别标签 (`Cache` / `Cookie` / `Storage`)，支持一键批量定向清理选中的低频数据。

### 3. 🛡️ 永久白名单保护机制
- **核心站点零误伤**：预设高频重要网站（如 `github.com`、`google.com`、`stackoverflow.com`）进入白名单。
- **自定义白名单**：用户可随时将工作后台、个人博客或常用平台加入白名单，白名单内的所有域名在手动或批量清理时**永久受保护，绝不删除**。

### 4. ⚡ 极简悬浮弹窗 (Popup Mode)
- **实时域名识别**：自动感知当前标签页域名及其白名单保护状态。
- **轻量级一键清理**：显示待清理低频域名汇总，支持在弹窗界面一键触发快速清理或切换当前域名白名单。

---

## 📁 目录架构与文件说明

```text
smart-cache-cleaner/
├── manifest.json              # Manifest V3 扩展配置文件 (权限/Service Worker/图标等)
├── background.js              # 后台 Service Worker (会话去重算法/历史记录分析/缓存清理 API)
├── popup.html                 # 极简悬浮弹窗 UI 界面
├── popup.js                   # 弹窗交互与逻辑控制
├── popup.css                  # 弹窗独立样式表
├── options.html               # 域名频次明细面板与高级参数配置中心
├── options.js                 # 完整面板交互、图表渲染与数据持久化逻辑
├── assets/
│   ├── icons/                 # 极简科技感设计风格图标包
│   │   ├── icon.svg           # 矢量源图标
│   │   ├── icon16.png         # 16x16 扩展小图标
│   │   ├── icon32.png         # 32x32 高清显示图标
│   │   ├── icon48.png         # 48x48 扩展管理页图标
│   │   └── icon128.png        # 128x128 商店与主图标
│   └── demo/                  # 插件功能使用效果示例图
│       ├── demo1-popup.png / demo1-popup.svg         # 演示一: 极简弹窗模式
│       ├── demo2-dashboard.png / demo2-dashboard.svg # 演示二: 域名频次面板
│       ├── demo3-settings.png / demo3-settings.svg   # 演示三: 规则与白名单配置
│       └── demo4-cleaning.png / demo4-cleaning.svg   # 演示四: 定向清理执行反馈
└── README.md                  # 插件使用与技术说明文档
```

---

## 🛠️ 安装与使用教程 (开发者模式)

1. **解压文件**：将下载的 `smart-cache-cleaner.zip` 文件解压到本地任意目录（例如 `D:\smart-cache-cleaner`）。
2. **打开扩展页面**：在 Chrome / Edge 浏览器地址栏输入：
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. **开启开发者模式**：点击页面右上角的 **“开发者模式” (Developer mode)** 开关。
4. **加载已解压的扩展程序**：
   - 点击左上角的 **“加载已解压的扩展程序” (Load unpacked)** 按钮。
   - 在弹出的文件选择框中，选中解压后的 `smart-cache-cleaner` 根目录并点击确定。
5. **开始使用**：
   - 点击浏览器右上角拼图图标，固定 **智能缓存清理** 插件。
   - 点击插件图标即可打开悬浮弹窗，或点击弹窗底部的 **“数据统计控制台”** 进入完整明细面板！

---

## 🔒 隐私与安全性保障

- **纯本地运算**：本扩展程序所有域名访问统计、会话记录及白名单数据均使用 `chrome.storage.local` 存储在用户本地设备中，**绝不会向任何第三方服务器上传或传输任何网络请求与个人隐私数据**。
- **透明权限调配**：仅请求必要的 `tabs`、`browsingData`、`history` 和 `storage` 权限，用于精准识别域名与清除无用缓存。

---

## 📄 开源许可

本项目遵循 [MIT License](LICENSE) 协议开源。
