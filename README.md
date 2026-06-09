<div align="center">
  <img src="./public/jptv.png" alt="JPTV" width="128" style="border-radius: 16px;" />
</div>

<h2 align="center">JPTV — 直播频道导航与管理</h2>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Vercel-000000?logo=vercel&logoColor=white" alt="Vercel">
  <img src="https://img.shields.io/badge/Runtime-Node.js-339933?logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License">
</p>

> 基于 Vercel Serverless 的轻量级直播频道导航与管理面板。可视化频道 Logo 网格、源码编辑器、多格式导入导出，一切都在浏览器内完成。

---

## ✨ 核心特性

- **📺 频道导航网格**：以 Logo 卡片形式展示所有频道，点击直接打开直播流
- **🌓 主题切换**：支持白天/夜晚主题，自动保存偏好
- **🔐 双模式访问**：
  - **只读模式**（默认）：仅展示频道 Logo 网格，无订阅链接、无代理、无测速
  - **管理员模式**（`?token=xxx`）：源码编辑、频道增删改、导入导出、保存部署
- **⌨️ 源码编辑器**：每个分组可切换至 VS Code 风格的代码编辑器，支持 **JSON / M3U / TXT** 三种格式编辑与实时转换
- **✏️ 频道编辑器**：每条播放链接独立显示 URL 输入框 + 备注框，无备注时不输出额外符号
- **📂 导入功能**：支持 **M3U / TXT / JSON** 三种格式，提供粘贴代码或选择文件两种方式，自动识别格式
- **📤 导出功能**：JSON 备份、M3U 订阅、TXT 订阅，所有输出使用**直接 URL**，无代理重定向
- **🔄 自动持续集成**：在后台修改配置后，自动调用 Vercel API 保存数据并触发重新构建
- **☁️ Serverless 架构**：完全基于 Vercel 免费版构建，无需服务器

---

## 🚀 部署指南

### 方式一：一键部署（推荐）

<p align="">
  <a href="https://vercel.com/import/project?template=https://github.com/baimao9527/jptv_redirect">
    <img src="https://vercel.com/button" alt="Deploy with Vercel"/>
  </a>
</p>

1. 点击上方的 **Deploy** 按钮
2. 在 Vercel 页面中，创建一个 Git 仓库（Create Git Repository）
3. 在 **Configure Project** 步骤中，设置 `ADMIN_TOKEN`（管理密码）
4. 点击 **Deploy** 等待完成

### 方式二：手动部署

1. **Fork** 本仓库到您的 GitHub
2. 在 [Vercel Dashboard](https://vercel.com/) 点击 **Add New... → Project**
3. 导入您刚才 Fork 的仓库
4. 在 Environment Variables 中添加 `ADMIN_TOKEN`
5. 点击 **Deploy**

---

## 配置环境变量

| 变量名 | 描述 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `ADMIN_TOKEN` | 管理后台密码 | ✅ | 默认 `123456` |
| `DEPLOY_PLATFROM_PROJECT` | Vercel 项目 ID | ✅ | Settings → General → Project ID |
| `DEPLOY_PLATFROM_TOKEN` | Vercel API Token | ✅ | Account → Settings → Tokens |
| `CHANNELS_DATA` | 频道数据缓存 | ❌ | 系统自动管理，无需手动配置 |

### 获取 Project ID

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目 → **Settings → General**
3. 找到 **Project ID**（格式：`prj_xxxxxxxxxxxx`）

### 获取 API Token

1. 访问 [Vercel Tokens](https://vercel.com/account/settings/tokens)
2. 输入名称（如 `jptv-deploy`）
3. Scope 选择特定项目或 Full Account
4. 创建后**立即复制保存**（仅显示一次）

---

## 访问方式

| 模式 | 入口 | 说明 |
| :--- | :--- | :--- |
| **只读模式** | `https://your-app.vercel.app/` | Logo 网格，点击直接打开频道 |
| **管理员模式** | `https://your-app.vercel.app/?token=你的密码` | 源码编辑、频道管理、导入导出 |

---

## 导出订阅地址（管理员）

| 格式 | 地址 | 说明 |
| :--- | :--- | :--- |
| **JSON** | `/api/data?export=json` | 完整数据结构备份 |
| **M3U** | `/api/data?export=m3u` | 包含 Logo、ID、分组信息，**直接 URL** |
| **TXT** | `/api/data?export=txt` | 传统 `频道名,URL` 格式，**直接 URL** |

> 所有导出均使用频道内嵌的原始流地址，无代理重定向。

---

## 目录结构

```
.
├── index.html           # 主 SPA（只读 + 管理员双模式）
├── vercel.json          # Vercel 路由配置
├── package.json         # 项目配置
├── api/
│   └── data.js          # 统一数据 API（GET / POST / 导出）
├── utils/
│   ├── config.js        # 项目配置与版本管理
│   └── helpers.js       # 工具函数（数据读取、格式转换、解析）
└── public/
    ├── channels.json    # 默认频道数据（兜底）
    └── jptv.png         # 应用 Logo
```

---

## ⚖️ 免责声明

1. 本项目是一个技术研究项目，旨在探索 Serverless 架构在流媒体导航中的应用。
2. 本项目**不提供、不存储、不分发**任何视频流媒体文件。
3. 文档或代码演示中出现的频道仅作为格式参考，使用者需自行配置合法的直播源。
4. 使用者利用本项目产生的任何后果由使用者自行承担。

---

<p align="center">Generated with ❤️ for JPTV Enthusiasts</p>
