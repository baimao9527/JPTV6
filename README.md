<div align="center">
  <img src="./public/jptv.png" alt="JPTV Logo" width="120" style="border-radius: 20px;" />

  <h1>JPTV Logo Directory</h1>

  <p>
    一个部署在 Vercel 上的轻量频道 Logo 展示与频道源管理系统。
  </p>

  <p>
    <img src="https://img.shields.io/badge/Platform-Vercel-000000?logo=vercel&logoColor=white" alt="Vercel">
    <img src="https://img.shields.io/badge/Runtime-Node.js-339933?logo=nodedotjs&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/Deploy-Serverless-blue" alt="Serverless">
    <img src="https://img.shields.io/badge/UI-Responsive-14b8a6" alt="Responsive UI">
  </p>
</div>

---

## 项目简介

JPTV Logo Directory 是一个面向个人使用的频道数据管理工具。

它提供两个完全分离的使用入口：

- **只读界面**：只展示频道 Logo 网格，点击 Logo 只打开 Logo 图片。
- **管理员界面**：维护频道分组、频道 Logo、多线路 URL、备注、源码数据和导入导出。

项目当前版本不包含任何播放源代理、站内跳转、重定向、测速、测试卡或视频兜底能力。所有订阅导出均使用频道源的直接 URL。

---

## 设计原则

- **只读界面保持克制**：不展示订阅链接，不暴露频道 URL，不提供跳转播放。
- **权限职责分离**：`ADMIN_TOKEN` 管理后台，`TOKEN` 订阅访问，互不混用。
- **数据可迁移**：支持 JSON、M3U、TXT 导入导出。
- **部署简单**：基于 Vercel Serverless，无需自建服务器。
- **移动端可用**：适配安卓端和桌面端，管理操作尽量保持可点、可读、可编辑。
- **直接 URL 输出**：导出的 M3U/TXT 不经过代理、重定向或测速选择。

---

## 功能总览

| 模块 | 功能 |
| :--- | :--- |
| 只读首页 | Logo 网格展示、分组展示、点击 Logo 新标签页打开图片 |
| 管理后台 | 分组管理、频道管理、频道排序、Logo 预览、多线路编辑 |
| 源码编辑 | 每个分组可切换 JSON / M3U / TXT 源码编辑 |
| 导入 | 支持本地文件、粘贴代码、自动识别格式 |
| 导出 | 支持 JSON 备份、M3U 订阅、TXT 订阅 |
| 权限 | `ADMIN_TOKEN` 与 `TOKEN` 独立 |
| 部署 | 保存后写入 Vercel 环境变量并触发部署 |
| UI | 磨砂玻璃背景、夜间模式、安卓端响应式 |

---

## 权限模型

### ADMIN_TOKEN

`ADMIN_TOKEN` 只用于管理员能力：

- 进入管理员界面。
- 编辑频道数据。
- 保存频道数据。
- 触发 Vercel 部署。

### TOKEN

`TOKEN` 只用于订阅列表访问：

- 访问 M3U 订阅。
- 访问 TXT 订阅。

`TOKEN` 不能进入管理员后台。  
`ADMIN_TOKEN` 不用于访问 M3U/TXT 订阅列表。

---

## 路由说明

假设你的 Vercel 域名是：

```text
https://your-app.vercel.app
```

| 地址 | 权限 | 说明 |
| :--- | :--- | :--- |
| `/` | 无 | 只读 Logo 网格界面 |
| `/:ADMIN_TOKEN` | `ADMIN_TOKEN` | 管理员界面 |
| `/:TOKEN/ipv6.m3u` | `TOKEN` | M3U 订阅 |
| `/:TOKEN/ipv6.txt` | `TOKEN` | TXT 订阅 |
| `/ipv6.json` | 无 | JSON 数据输出 |
| `/ipv6.m3u` | 需要 TOKEN | 未带 TOKEN 会返回 401 |
| `/ipv6.txt` | 需要 TOKEN | 未带 TOKEN 会返回 401 |

示例：

```text
https://your-app.vercel.app/9321
https://your-app.vercel.app/9527/ipv6.m3u
https://your-app.vercel.app/9527/ipv6.txt
```

---

## 界面说明

### 只读界面

只读界面只做一件事：展示频道 Logo。

它不会展示：

- M3U 入口。
- TXT 入口。
- 频道源 URL。
- 复制链接按钮。
- 播放跳转按钮。
- 代理、重定向、测速相关功能。

### 管理员界面

管理员界面用于维护频道数据。

支持：

- 新增分组。
- 删除分组。
- 调整分组顺序。
- 新增频道。
- 删除频道。
- 编辑频道名称、ID、Logo。
- 预览频道 Logo。
- 为一个频道添加多条 URL。
- 为每条 URL 添加独立备注。
- 拖拽频道排序。
- 导入/导出频道数据。
- 保存并触发 Vercel 部署。

### 源码编辑器

每个分组都可以打开源码编辑器。

特点：

- 直接覆盖当前分组的卡片区域。
- 支持 JSON、M3U、TXT 格式切换。
- 代码区域内部滚动。
- 应用后会把源码转换回频道数据。
- 夜间模式下和整体磨砂玻璃背景统一。

---

## 导入与导出

### 导入

导入入口支持：

- 本地文件。
- 粘贴代码。

导入格式支持：

- JSON
- M3U
- TXT
- 自动识别

### 导出

导出入口支持：

- JSON 备份
- M3U 订阅
- TXT 订阅

导出规则：

- 所有 URL 都是直接 URL。
- 不生成站内跳转链接。
- 不生成代理链接。
- 不进行测速选择。
- 备注为空时不追加 `|` 或空备注。

---

## 环境变量

在 Vercel 项目的 `Settings -> Environment Variables` 中配置：

| 变量名 | 必填 | 说明 |
| :--- | :---: | :--- |
| `ADMIN_TOKEN` | 是 | 管理员后台入口 Token |
| `TOKEN` | 是 | M3U/TXT 订阅访问 Token |
| `DEPLOY_PLATFROM_PROJECT` | 是 | Vercel Project ID |
| `DEPLOY_PLATFROM_TOKEN` | 是 | Vercel API Token |
| `CHANNELS_DATA` | 否 | 频道数据缓存，由后台保存时自动写入 |

> `DEPLOY_PLATFROM_PROJECT` 和 `DEPLOY_PLATFROM_TOKEN` 保持当前代码中的变量名拼写，请不要改成 `PLATFORM`，否则保存部署功能无法读取。

---

## 获取 DEPLOY_PLATFROM_PROJECT

1. 打开 Vercel Dashboard。
2. 进入当前项目。
3. 打开 `Settings`。
4. 进入 `General`。
5. 找到 `Project ID`。
6. 复制 `prj_...` 格式的 ID。
7. 写入环境变量 `DEPLOY_PLATFROM_PROJECT`。

---

## 获取 DEPLOY_PLATFROM_TOKEN

1. 打开 Vercel 账户设置。
2. 进入 `Tokens`。
3. 创建一个新的 API Token。
4. 建议将权限范围限制到当前项目或必要范围。
5. 创建后立即复制 Token。
6. 写入环境变量 `DEPLOY_PLATFROM_TOKEN`。

---

## 部署流程

### 1. 上传项目

将项目上传到 GitHub、GitLab 或其他 Vercel 支持的平台。

### 2. 导入 Vercel

在 Vercel 中选择：

```text
Add New... -> Project
```

选择你的仓库并导入。

### 3. 配置环境变量

至少配置：

```text
ADMIN_TOKEN
TOKEN
DEPLOY_PLATFROM_PROJECT
DEPLOY_PLATFROM_TOKEN
```

### 4. 部署

点击 `Deploy`。

### 5. 进入后台

```text
https://your-app.vercel.app/你的_ADMIN_TOKEN
```

### 6. 保存并部署

在后台修改数据后点击 `保存并部署`。

系统会：

1. 校验管理员 Token。
2. 清洗频道数据。
3. 删除旧的 `CHANNELS_DATA`。
4. 写入新的 `CHANNELS_DATA`。
5. 调用 Vercel API 触发部署。
6. 返回保存状态。

---

## 数据模型

推荐结构：

```json
[
  {
    "group": "央视频道",
    "channels": [
      {
        "name": "CCTV1 综合",
        "id": "CCTV1",
        "logo": "CCTV1",
        "sources": [
          {
            "url": "https://example.com/live/cctv1.m3u8",
            "note": "主线路"
          },
          {
            "url": "https://example.com/live/cctv1-backup.m3u8",
            "note": ""
          }
        ],
        "url": [
          "https://example.com/live/cctv1.m3u8",
          "https://example.com/live/cctv1-backup.m3u8"
        ]
      }
    ]
  }
]
```

字段说明：

| 字段 | 说明 |
| :--- | :--- |
| `group` | 分组名称 |
| `channels` | 当前分组下的频道列表 |
| `name` | 频道名称 |
| `id` | 频道 ID |
| `logo` | 完整 Logo URL 或 fanmingming/live 图标名称 |
| `sources` | 新版多线路结构 |
| `sources[].url` | 直接 URL |
| `sources[].note` | 当前 URL 的备注 |
| `url` | 旧版兼容字段 |

---

## 备注输出规则

### 有备注

```text
CCTV1 综合 | 主线路
```

### 无备注

```text
CCTV1 综合
```

不会输出：

```text
CCTV1 综合 |
```

也不会输出空备注。

---

## M3U 输出示例

```text
#EXTM3U
#EXTINF:-1 tvg-id="CCTV1" tvg-name="CCTV1 综合" tvg-logo="https://example.com/logo.png" group-title="央视频道",CCTV1 综合 | 主线路
https://example.com/live/cctv1.m3u8
```

---

## TXT 输出示例

```text
央视频道,#genre#
CCTV1 综合 | 主线路,https://example.com/live/cctv1.m3u8
```

---

## 目录结构

```text
.
├── api/
│   ├── manage.js   # 页面渲染、管理后台、只读首页、JSON 输出、保存部署
│   ├── m3u.js      # M3U 订阅输出，仅 TOKEN 可访问
│   └── txt.js      # TXT 订阅输出，仅 TOKEN 可访问
├── public/
│   ├── channels.json
│   └── jptv.png
├── utils/
│   ├── config.js   # 环境变量配置
│   └── helpers.js  # 数据读取、Logo 拼接、数据规范化
├── package.json
├── vercel.json
└── README.md
```

---

## 本地检查

```bash
node --check api/manage.js
node --check api/m3u.js
node --check api/txt.js
node --check utils/config.js
```

---

## 常见问题

### 访问 M3U/TXT 返回 401

请确认访问地址中使用的是 `TOKEN`，不是 `ADMIN_TOKEN`。

正确示例：

```text
https://your-app.vercel.app/你的_TOKEN/ipv6.m3u
```

### 能进入后台，但订阅地址不能访问

这是正常的权限设计。

后台使用 `ADMIN_TOKEN`。  
订阅使用 `TOKEN`。

请分别配置并使用不同 Token。

### 点击保存并部署失败

请检查：

- `DEPLOY_PLATFROM_PROJECT` 是否正确。
- `DEPLOY_PLATFROM_TOKEN` 是否正确。
- Vercel Token 是否有当前项目权限。
- 项目是否已关联 Git 仓库。

### Logo 不显示

Logo 字段支持两种写法：

```text
CCTV1
```

或：

```text
https://example.com/logo.png
```

如果填写短名称，系统会使用：

```text
https://gcore.jsdelivr.net/gh/fanmingming/live/tv/{logo}.png
```

---

## 安全建议

- `ADMIN_TOKEN` 和 `TOKEN` 必须设置为不同值。
- 不要将真实 Token 写入公开仓库。
- 不要把 Vercel API Token 发给他人。
- 如果怀疑 Token 泄露，请立即在 Vercel 中更换。
- 订阅地址只分发给可信客户端。

---

## 不包含的功能

本项目明确不包含：

- 播放源代理。
- 站内重定向。
- 跳转播放接口。
- 多线路测速。
- 测试卡视频。
- 视频内容托管。

---

## 免责声明

本项目仅用于个人频道数据管理和格式转换。

项目不提供、不存储、不分发任何视频媒体内容。频道名称、Logo 和示例 URL 仅用于数据格式说明。使用者应自行确保频道源和相关内容的合法性，由使用本项目产生的后果由使用者自行承担。

---

<p align="center">
  Built for clean personal channel management.
</p>
