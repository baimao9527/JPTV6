# JPTV Logo Directory

基于 Vercel 的轻量频道 Logo 展示与频道源管理工具。

## 功能

- 首页展示频道 Logo 网格。
- 管理后台维护频道分组、频道 ID、Logo、播放源和备注。
- 订阅输出支持 M3U 和 TXT。
- 后台支持 JSON、M3U、TXT 导入导出。
- 默认 Logo 从 `data/logo` 读取，不再使用外部 Logo CDN 自动拼接。

## Logo 规则

- 内置 Logo 文件统一放在 `data/logo`。
- `channels.json` 中的 `logo` 可以填写文件名，例如 `CCTV1`、`CCTV1.png`、`凤凰卫视中文台.png`。
- 非 URL 的 Logo 会自动拼接为：

```text
https://你的域名/data/logo/频道Logo.png
```

- 中文 Logo 文件名会原样保留，例如：

```text
https://你的域名/data/logo/凤凰卫视中文台.png
```

- 如果 `logo` 填写完整 URL，例如 `https://example.com/logo.png`，系统会保留该 URL，不会改写。
- 空 Logo 会使用 `data/logo/jptv.png`。

## 数据文件

默认频道数据位于：

```text
data/channels.json
```

默认 Logo 目录位于：

```text
data/logo/
```

## 环境变量

请在 Vercel 项目的 `Settings -> Environment Variables` 中配置：

| 变量名 | 必填 | 说明 |
| :--- | :---: | :--- |
| `ADMIN_TOKEN` | 是 | 管理后台访问 Token |
| `TOKEN` | 是 | M3U/TXT 订阅访问 Token |
| `DEPLOY_PLATFROM_PROJECT` | 是 | Vercel Project ID |
| `DEPLOY_PLATFROM_TOKEN` | 是 | Vercel API Token |
| `CHANNELS_DATA` | 否 | 后台保存时写入的频道数据缓存 |

> `DEPLOY_PLATFROM_PROJECT` 和 `DEPLOY_PLATFROM_TOKEN` 沿用当前项目里的拼写。

## 访问路径

假设部署域名为：

```text
https://your-app.vercel.app
```

| 路径 | 说明 |
| :--- | :--- |
| `/` | 只读 Logo 展示页 |
| `/:ADMIN_TOKEN` | 管理后台 |
| `/:TOKEN/ipv6.m3u` | M3U 订阅 |
| `/:TOKEN/ipv6.txt` | TXT 订阅 |
| `/ipv6.json` | JSON 数据 |
| `/data/logo/文件名.png` | Logo 图片 |

## 数据格式

推荐使用 `sources` 保存多线路和备注：

```json
[
  {
    "group": "频道分组",
    "channels": [
      {
        "name": "CCTV1 综合",
        "id": "CCTV1",
        "logo": "CCTV1",
        "sources": [
          {
            "url": "https://example.com/live.m3u8",
            "note": "线路 1"
          }
        ],
        "url": [
          "https://example.com/live.m3u8"
        ]
      }
    ]
  }
]
```

字段说明：

- `logo`：可填写 `data/logo` 下的文件名，也可填写完整 URL。
- `sources[].url`：播放源地址。
- `sources[].note`：线路备注，可留空。
- `url`：兼容旧数据，系统会自动转换为 `sources`。

## 项目结构

```text
.
├── api/
│   ├── logo.js
│   ├── manage.js
│   ├── m3u.js
│   └── txt.js
├── data/
│   ├── channels.json
│   └── logo/
├── utils/
│   ├── config.js
│   └── helpers.js
├── package.json
├── vercel.json
└── README.md
```

## 本地检查

```bash
npm run check
```

等价于：

```bash
node --check api/manage.js
node --check api/m3u.js
node --check api/txt.js
node --check api/logo.js
node --check utils/config.js
node --check utils/helpers.js
```

## Vercel 部署注意事项

- `vercel.json` 已配置 `includeFiles: "data/**"`，确保 `data/channels.json` 和 `data/logo` 会被函数打包。
- `/data/logo/:file*` 会转发到 `api/logo.js` 读取本地文件。
- 如果通过 GitHub 自动部署，请确认 `data/` 和 `api/logo.js` 已提交到仓库。

## 免责声明

本项目仅用于个人频道数据管理和格式转换，不提供、不存储、不分发任何视频媒体内容。使用者应自行确保频道源和相关内容的合法性。
