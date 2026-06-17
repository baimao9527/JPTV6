<div align="center">
  <img src="./public/jptv.png" alt="JPTV Logo" width="120" style="border-radius: 20px;" />

  <h1>JPTV Logo Directory</h1>

  <p>基于 Vercel 的轻量频道 Logo 展示与频道源管理工具。</p>
</div>

---

## 简介

JPTV Logo Directory 提供一个只读 Logo 展示页和一个管理员后台。

- 只读页仅展示频道 Logo 网格。
- 管理后台用于维护频道分组、Logo、URL 和备注。
- 订阅输出支持 M3U/TXT。
- 导入导出支持 JSON、M3U、TXT。
- 不提供代理、重定向、测速、测试卡或视频托管。

---

## 环境变量

请在 Vercel 项目的 `Settings -> Environment Variables` 中配置：

| 变量名 | 必填 | 说明 |
| :--- | :---: | :--- |
| `ADMIN_TOKEN` | 是 | 管理员后台入口 Token |
| `TOKEN` | 是 | M3U/TXT 订阅访问 Token |
| `DEPLOY_PLATFROM_PROJECT` | 是 | Vercel Project ID |
| `DEPLOY_PLATFROM_TOKEN` | 是 | Vercel API Token |
| `CHANNELS_DATA` | 否 | 频道数据缓存，后台保存时自动写入 |

> `DEPLOY_PLATFROM_PROJECT` 和 `DEPLOY_PLATFROM_TOKEN` 请保持当前拼写。

---

## 访问方式

假设部署域名为：

```text
https://your-app.vercel.app
```

| 地址 | 说明 |
| :--- | :--- |
| `/` | 只读 Logo 展示页 |
| `/:ADMIN_TOKEN` | 管理员后台 |
| `/:TOKEN/ipv6.m3u` | M3U 订阅 |
| `/:TOKEN/ipv6.txt` | TXT 订阅 |
| `/ipv6.json` | JSON 数据 |

请将路径中的 `:ADMIN_TOKEN` 和 `:TOKEN` 替换为你在 Vercel 中配置的环境变量值。

---

## 部署

1. 将项目上传到 GitHub。
2. 在 Vercel 中导入项目。
3. 配置环境变量。
4. 完成部署。
5. 进入管理员后台维护频道数据。

后台点击 `保存并部署` 后，会写入新的频道数据并触发 Vercel 部署。

---

## 数据格式

推荐使用 `sources` 结构保存多线路和备注。

```json
[
  {
    "group": "频道分组",
    "channels": [
      {
        "name": "频道名称",
        "id": "channel-id",
        "logo": "logo-name-or-url",
        "sources": [
          {
            "url": "https://example.com/live.m3u8",
            "note": "备注"
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

说明：

- `logo` 可填写完整图片 URL，也可填写图标名称。
- `sources[].url` 为直接 URL。
- `sources[].note` 可留空。
- `url` 用于兼容旧数据。

---

## 项目结构

```text
.
├── api/
│   ├── manage.js
│   ├── m3u.js
│   └── txt.js
├── public/
│   ├── channels.json
│   └── jptv.png
├── utils/
│   ├── config.js
│   └── helpers.js
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

- `ADMIN_TOKEN` 和 `TOKEN` 建议设置为不同值。
- 不要将真实 Token 提交到公开仓库。
- `ADMIN_TOKEN` 用于后台管理。
- `TOKEN` 用于订阅访问。
- 频道源需自行合法配置。

---

## 免责声明

本项目仅用于个人频道数据管理和格式转换，不提供、不存储、不分发任何视频媒体内容。使用者应自行确保频道源和相关内容的合法性。
