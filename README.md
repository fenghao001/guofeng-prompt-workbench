# 国风提示词工作台 · Node.js 版

把「天宫」「鎏金水墨」两套国风 Skill 配方做成一个网页工作台：选风格分支 → 填创作需求 → 一键生成四段提示词（画面设计 / ImageGen / Midjourney / 可调选项），并可直接预览发给大模型的完整请求与等价调用代码。

后端 Node.js + Express + OpenAI SDK，前端 Vue3 + Element Plus（已 vendor 化，无需联网 CDN）。

---

## 功能

| 能力 | 说明 |
|---|---|
| **11 个风格分支** | 天宫系 6 个（巨物天宫中式美学）+ 鎏金系 5 个（鎏金水墨幻想），配方原文内置于 `skills/`，不走人工提炼 |
| **四段输出** | 画面设计 → ImageGen 提示词 → Midjourney 提示词（以 `--v 8.2` 结尾、含 `--ar`）→ 可调选项 |
| **资产四段结构** | 人物资产 / 场景资产 / 道具资产 / 色板资产 |
| **请求预览** | 弹窗展示真实 system + user、调用参数，以及本次请求的等价代码 |
| **双形态调用代码** | OpenAI SDK（Node.js）版 + 原生 HTTP（axios）版，均可复制运行 |
| **多端点兼容** | 任何 OpenAI 兼容端点（NVIDIA / 豆包方舟 / DeepSeek / OpenAI / vLLM 等），面板可随时切换 |
| **NVIDIA 单消息模式** | 自动识别 NVIDIA 端点，把 system 合并进单条 user，规避 400 错误 |
| **MOCK 模式** | 没配 Key 也能先看界面效果 |

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

然后编辑 `.env`，至少填好这三项：

```env
LLM_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_API_KEY=你的密钥
LLM_MODEL=nvidia/nemotron-3-ultra-550b-a55b
```

> 也可以在网页右上角的配置面板里临时填写，面板值优先于 `.env`，不用重启服务。

### 3. 启动

```bash
npm start
```

浏览器打开 <http://127.0.0.1:3000>

---

## 使用说明

1. **选分支**：左侧选择天宫系或鎏金系的风格分支。
2. **填需求**：填写主体、场景、材质、光影、氛围等字段。
3. **预览**（可选）：点「预览」查看本次会发出的完整 system / user、调用参数，以及 SDK / axios 两段等价代码。
4. **生成**：点「生成」，等待模型返回四段提示词。
5. **复制**：各段结果都有独立复制按钮。

> 前端是静态文件，改动后按 **Ctrl + F5** 强制刷新即可生效，无需重启服务。
> 改 `.env` 后需要**重启服务**才生效。

---

## 目录结构

```
web-app-node/
├── server.js              # Express 服务：11 分支路由、配方拼装、LLM 调用、代码生成
├── package.json
├── .env.example           # 配置模板（不含真实密钥）
├── public/
│   ├── index.html         # 单页前端（Vue3 + Element Plus）
│   └── vendor/            # vue / element-plus 本地化，无外网依赖
├── skills/                # Skill 配方原文
│   ├── giant/             # 天宫系
│   └── gilded/            # 鎏金系
├── sdk-call.mjs           # 诊断脚本：OpenAI SDK 直连（独立可跑）
├── axios-call.mjs         # 诊断脚本：原生 axios 直连（独立可跑）
└── README.md
```

---

## 两个诊断脚本

`sdk-call.mjs` / `axios-call.mjs` 是**独立于网页应用的调试工具**，用来在出问题时快速定位：到底是上游端点/模型的问题，还是应用代码的问题。

```bash
node sdk-call.mjs      # OpenAI SDK 版
node axios-call.mjs    # 原生 axios 版（会打印完整请求体）
```

两个脚本顶部都有 `↓↓↓ 可手动修改区 ↓↓↓`，可直接改 `SYSTEM_PROMPT` / `USER_PROMPT` / `MODEL_OVERRIDE` / `MAX_TOKENS`，改完保存再跑即可。密钥等仍从 `.env` 读取，无需手填。

**什么时候用它们：**

| 场景 | 用网页应用 | 用脚本 |
|---|---|---|
| 日常生成提示词 | ✅ | — |
| 报 400 / 404 / 429，想确认是上游还是代码问题 | — | ✅ |
| 换模型或端点，想先验证能不能通 | — | ✅ |
| 想看真实请求体长什么样 | — | ✅ |

---

## 部署

### ⚠️ 为什么不能只托管静态页面

本项目**必须有 Node 后端**，GitHub Pages / 纯静态托管跑不起来。原因不是架构偷懒，而是 **CORS 限制**：

| 端点 | 浏览器直连 | 实测结果 |
|---|---|---|
| DeepSeek | ✅ | 返回 `access-control-allow-origin`，可从浏览器直连 |
| **NVIDIA** | ❌ | **完全不返回 CORS 头**，浏览器请求会被直接拦截 |

浏览器直接调 NVIDIA 会被同源策略拦死，所以必须有后端转发。

### 一键部署（推荐：Railway）

本项目已实测部署于 **Railway**，线上实例：<https://guofeng-prompt-workbench-production.up.railway.app>

部署步骤：

1. 打开 <https://railway.app>，用 **GitHub 登录**
2. **New Project → Deploy from GitHub repo**，选本仓库
3. 首次会提示 **Configure GitHub App**，授权后仓库才会出现在列表里
4. 选中仓库后 Railway 自动识别为 Node 项目并构建（`npm install` + `npm start`）
5. 构建成功后进服务 → **Settings → Networking → Generate Domain**，拿到公网网址

**部署后需手动添加环境变量**（服务 → Variables）：

| Key | Value |
|---|---|
| `LLM_BASE_URL` | `https://integrate.api.nvidia.com/v1` |
| `LLM_MODEL` | `nvidia/nemotron-3-ultra-550b-a55b` |
| `MAX_TOKENS` | `16000` |
| `MOCK` | `0` |

> ⚠️ **不要设置 `LLM_API_KEY`**，让每位使用者在网页配置面板填自己的密钥，避免你的额度被他人消耗。

> 注：Railway 为 30 天 / $5 试用额度（试用期无需绑卡），小应用消耗极低。

### 其他平台

任何能跑 Node.js 的地方都可以，仓库已附带 `Procfile`（Fly.io / Heroku 等通用）：

```bash
npm install --production
npm start
```

注意：

- 端口由环境变量 `PORT` 控制（未设置时为 3001），平台会自动注入，无需手动配置。
- **不要把 `.env` 提交到仓库**，生产环境请用平台的环境变量功能注入 `LLM_API_KEY`。
- 对外开放时**建议不预置** `LLM_API_KEY`，让每位使用者在网页配置面板填自己的密钥，避免你的额度被他人消耗。

---

## 常见问题

**Q：测试连接报 404？**
A：多数是模型名在当前 Key / 区域下不可用。NVIDIA 曾出现某些模型在官方 Playground 也 404 的情况，换一个模型即可。可用 `node axios-call.mjs` 快速验证。

**Q：NVIDIA 端点报 400？**
A：NVIDIA 不支持 `system` 角色。本项目已内置自动合并（检测端点含 `nvidia` 时把 system 合并进单条 user），若仍报错请确认服务端已重启。

**Q：改了前端没变化？**
A：浏览器缓存，按 **Ctrl + F5** 强制刷新。

**Q：改了 `.env` 没生效？**
A：`.env` 只在服务启动时读取，改完需重启服务。

---

## 安全提醒

- `.env` 已在 `.gitignore` 中排除，**切勿**把真实 API Key 提交到仓库或分享给他人。
- 分享项目时只给仓库链接，让使用者各自配置自己的密钥。

---

## 技术栈

Node.js · Express · OpenAI SDK · Vue 3 · Element Plus
