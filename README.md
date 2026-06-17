<div align="center">
  <img src="./public/jptv.png" alt="JPTV" width="128" style="border-radius: 16px;" />
</div>

<h2 align="center">JPTV Logo Directory</h2>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Vercel-000000?logo=vercel&logoColor=white" alt="Vercel">
  <img src="https://img.shields.io/badge/Runtime-Node.js-339933?logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/UI-Responsive-blue" alt="Responsive UI">
</p>

JPTV Logo Directory 是一个基于 Vercel Serverless 的频道 Logo 展示与频道源管理工具。

当前版本的设计目标很明确：

- 只读界面只展示频道 Logo 网格。
- 点击任意 Logo 会在新标签页打开 Logo 图片。
- 订阅列表只通过独立的 `TOKEN` 访问。
- 管理员界面只通过 `ADMIN_TOKEN` 进入。
- 导入、编辑、导出全部使用直接 URL。
- 不提供播放源代理、站内跳转、测速或测试卡功能。

---

## 功能特性

### 只读界面

- 首页只展示分组频道 Logo 网格。
- 不展示 M3U/TXT 订阅入口。
- 不展示频道链接、复制链接或播放跳转。
- 点击 Logo 只会打开 Logo 图片。
- 支持浅色/夜间模式。
- 支持安卓端和桌面端响应式布局。

### 管理员界面

- 使用 `ADMIN_TOKEN` 进入管理员界面。
- 支持分组新增、删除、排序。
- 支持频道新增、删除、编辑。
- 支持频道 Logo 预览。
- 每个频道支持多条源 URL。
- 每条源 URL 都可以单独填写备注。
- 备注为空时，导出内容不会追加任何备注分隔符。
- 支持拖拽调整频道顺序。
- 支持保存并自动触发 Vercel 部署。

### 源码编辑器

管理员界面中，每个分组都可以打开源码编辑器。

- 源码编辑器直接覆盖原频道卡片区域。
- 支持 `JSON`、`M3U`、`TXT` 三种格式切换。
- 支持在当前格式下直接编辑并应用。
- 编辑器为类 VSCode 风格。
- 代码内容在编辑器内部滚动。
- 夜间模式下源码编辑器与整体磨砂玻璃背景保持统一风格。

### 导入功能

导入功能支持两种方式：

- 本地文件选择。
- 粘贴代码。

支持格式：

- JSON
- M3U
- TXT
- 自动识别格式

### 导出功能

导出功能通过界面选择格式。

支持格式：

- JSON 备份
- M3U 订阅
- TXT 订阅

所有导出内容均使用频道源直接 URL。

---

## 访问地址

假设你的 Vercel 域名为：

```text
https://your-app.vercel.app
```

### 只读界面

```text
https://your-app.vercel.app/
```

只读界面仅展示 Logo 网格。

### 管理员界面

```text
https://your-app.vercel.app/你的_ADMIN_TOKEN
```

示例：

```text
https://your-app.vercel.app/9321
```

`ADMIN_TOKEN` 只用于进入管理员页面、保存频道数据和触发部署。

### M3U 订阅

```text
https://your-app.vercel.app/你的_TOKEN/ipv6.m3u
```

示例：

```text
https://your-app.vercel.app/9527/ipv6.m3u
```

### TXT 订阅

```text
https://your-app.vercel.app/你的_TOKEN/ipv6.txt
```

示例：

```text
https://your-app.vercel.app/9527/ipv6.txt
```

`TOKEN` 只用于访问 M3U/TXT 订阅列表。

---

## 环境变量

请在 Vercel 项目的 `Settings -> Environment Variables` 中配置以下变量。

| 变量名 | 必填 | 用途 |
| :--- | :---: | :--- |
| `ADMIN_TOKEN` | 是 | 管理员后台入口 Token，用于进入管理界面、保存和部署 |
| `TOKEN` | 是 | 订阅列表 Token，只用于访问 M3U/TXT |
| `DEPLOY_PLATFROM_PROJECT` | 是 | Vercel Project ID，用于保存后自动更新环境变量 |
| `DEPLOY_PLATFROM_TOKEN` | 是 | Vercel API Token，用于调用 Vercel API |
| `CHANNELS_DATA` | 否 | 频道数据缓存，由后台保存时自动写入 |

> 注意：变量名 `DEPLOY_PLATFROM_PROJECT` 和 `DEPLOY_PLATFROM_TOKEN` 保持当前代码中的拼写，请按这里的名称配置。

---

## 获取 Vercel Project ID

1. 登录 Vercel Dashboard。
2. 进入你的项目。
3. 打开 `Settings`。
4. 进入 `General`。
5. 找到 `Project ID`。
6. 复制类似 `prj_xxxxxxxxxxxx` 的值。
7. 填入环境变量 `DEPLOY_PLATFROM_PROJECT`。

---

## 获取 Vercel API Token

1. 打开 Vercel Account Settings。
2. 进入 `Tokens`。
3. 点击创建新 Token。
4. 建议选择当前项目相关的权限范围。
5. 创建后立即复制 Token。
6. 填入环境变量 `DEPLOY_PLATFROM_TOKEN`。

---

## 数据格式

频道数据使用分组结构。

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

说明：

- `group` 是分组名称。
- `channels` 是频道列表。
- `name` 是频道名称。
- `id` 是频道标识。
- `logo` 可以填写完整图片 URL，也可以填写 fanmingming/live 图标名称。
- `sources` 是推荐的新链接结构。
- `sources[].url` 是直接播放源 URL。
- `sources[].note` 是备注，可留空。
- `url` 用于兼容旧数据结构。

---

## M3U 备注输出规则

当某条链接有备注时：

```text
CCTV1 综合 | 主线路
```

当备注为空时：

```text
CCTV1 综合
```

不会输出多余的 `|` 或空备注。

---

## TXT 备注输出规则

当某条链接有备注时：

```text
CCTV1 综合 | 主线路,https://example.com/live/cctv1.m3u8
```

当备注为空时：

```text
CCTV1 综合,https://example.com/live/cctv1.m3u8
```

---

## 部署方式

### 方式一：Vercel 导入项目

1. 将项目上传到 GitHub。
2. 登录 Vercel。
3. 点击 `Add New... -> Project`。
4. 选择该仓库。
5. 配置环境变量。
6. 点击 `Deploy`。

### 方式二：本地推送后部署

1. 修改代码。
2. 推送到 GitHub。
3. Vercel 自动构建。
4. 配置完成后，通过管理员后台维护频道数据。

---

## 保存并部署

管理员后台点击 `保存并部署` 后，系统会：

1. 校验管理员 Token。
2. 清洗频道数据。
3. 删除旧的 `CHANNELS_DATA` 环境变量。
4. 写入新的 `CHANNELS_DATA`。
5. 调用 Vercel API 触发新部署。
6. 前端显示同步保存状态和结果。

如果任一步失败，界面会显示错误信息。

---

## 项目结构

```text
.
├── api/
│   ├── manage.js   # 管理界面、只读界面、保存部署、JSON 输出
│   ├── m3u.js      # M3U 订阅输出，仅 TOKEN 可访问
│   └── txt.js      # TXT 订阅输出，仅 TOKEN 可访问
├── public/
│   ├── channels.json
│   └── jptv.png
├── utils/
│   ├── config.js   # 环境变量和项目配置
│   └── helpers.js  # 数据读取、规范化和格式工具
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

## 注意事项

- 请不要把真实的 `ADMIN_TOKEN` 和 `TOKEN` 公开到仓库。
- `ADMIN_TOKEN` 和 `TOKEN` 建议设置为不同值。
- `TOKEN` 泄露后，别人只能读取 M3U/TXT 订阅列表，不能进入后台。
- `ADMIN_TOKEN` 泄露后，别人可以进入后台并修改数据，请妥善保管。
- 项目不内置任何视频内容，频道源需要自行合法配置。

---

## 免责声明

本项目仅用于个人频道数据管理和格式转换。

项目不提供、不存储、不分发任何视频媒体内容。频道名称、Logo 和示例 URL 仅用于数据格式说明。使用者应自行确保频道源和相关内容的合法性，由使用本项目产生的后果由使用者自行承担。
