# WiseChoice

[English README](README.en.md)

智能商品采集与对比助手（Chrome 扩展 + 本地 AI 服务）。在亚马逊商品页一键收集候选商品，在侧边栏中选择多款后，由本地 AI 给出决策导向的对比报告，帮助你快速做出“就是它”的选择。

## 功能特性
- **一键采集**：在亚马逊商品详情页右下角出现“+”浮动按钮，点击即收集标题、价格、要点、技术参数、ASIN、图片等。
- **候选管理**：使用 `chrome.storage.local` 持久化保存，自动按 `id` 去重（优先 ASIN，缺失时使用 URL 指纹）。
- **侧边栏对比**：点击扩展图标打开侧边栏，勾选至少两款商品，获取对比报告。
- **AI 决策报告**：调用本地 `FastAPI` 服务（默认 `http://localhost:8765`）生成“TL;DR、策略、差异、理由”等部分的结构化报告。
- **稳健降级**：若本地 AI 服务不可用，自动回退到基础版对比（价格区间、品牌、共同要点等）。

## 架构总览
- 浏览器端（Manifest V3 扩展）
  - `manifest.json`：权限与入口；注册 `content.js`、`background.js`、`side_panel`。
  - `content.js`：注入亚马逊商品页，解析并采集商品信息，发送消息给后台保存。
  - `background.js`：接收并存储候选商品，点击扩展图标时打开侧边栏。
  - `sidebar.html`/`sidebar.js`/`sidebar.css`：侧边栏 UI，展示候选列表与 AI 对比结果。
  - `content.css`：浮动按钮与通知样式。
- 本地 AI 服务
  - `api_server.py`：`FastAPI` 应用，暴露 `POST /api/compare` 等接口，组织 Prompt 并调用代理。
  - `agent.py`：基于 `openai-agents` 的决策代理（输出 `title/tldr/strategy/analysis/reasons`）。
  - `requirements.txt`：服务依赖。
  - `start_ai_service.sh`：启动脚本与环境检查。

端口与跨域：扩展直接请求 `http://localhost:8765`，服务端已开启 CORS 允许所有来源（开发用）。

## 安装与启动
### 1) 加载 Chrome 扩展
1. 打开 Chrome 扩展管理页：`chrome://extensions/`
2. 开启“开发者模式”。
3. 选择“加载已解压的扩展程序”，指向本项目根目录 `WiseChoice-Release`。

### 2) 启动本地 AI 服务
建议 Python 3.11/3.12 及虚拟环境：

```bash
cd /Users/charles/Downloads/WiseChoice-Release
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 配置 OpenAI API Key（必须，否则服务会报错/降级）
export OPENAI_API_KEY="你的API Key"

# 启动服务（二选一）
python api_server.py
# 或
bash start_ai_service.sh
```

服务默认监听：`http://localhost:8765`，调试文档：`http://localhost:8765/docs`。

## 使用说明
1. 在亚马逊打开任意商品详情页（支持 `amazon.com/.co.uk/.de/.fr/.co.jp/.cn/.ca/.it/.es`）。
2. 页面右下角会出现 `+` 浮动按钮，点击采集当前商品。
3. 点击扩展图标，打开侧边栏，查看已收集的候选列表。
4. 勾选至少两款商品，点击“Compare”发起对比。
   - 若本地 AI 正常运行：展示结构化的决策报告。
   - 若不可用：展示基础版对比报告，并提示如何启动服务。

## API 说明（本地服务）
- `GET /`：健康信息与版本。
- `GET /api/health`：健康检查，返回 `{"status": "healthy"}`。
- `POST /api/compare`
  - 请求体：
    ```json
    {
      "products": [
        {
          "id": "amz:...",
          "source": "https://...",
          "title": "...",
          "brand": "...",
          "price": { "raw": "$999.00", "currency": "USD", "amount": 999.0 },
          "bullets": ["..."],
          "tech": {"Key": "Value"},
          "asin": "XXXXXXXXXX",
          "img": "https://..."
        }
      ]
    }
    ```
  - 响应体（成功）：
    ```json
    {
      "title": "...",
      "tldr": "...",
      "strategy": "...",
      "analysis": "...",
      "reasons": "...",
      "success": true
    }
    ```

## 数据与存储
- 本地存储：`chrome.storage.local`，键名 `wisechoice:candidates`。
- 去重策略：以 `product.id` 为唯一键（优先 `amz:ASIN`，否则 `url:<hash>`）。
- 删除/全选：在侧边栏中支持批量全选与单个删除。

## 权限与安全
- Chrome 权限：`storage`、`activeTab`、`scripting`、`sidePanel`。
- Host 权限：若干亚马逊域名与 `http://localhost:8765/*`（用于调用本地 API）。
- CORS：开发阶段放开为 `*`，生产环境请按需收紧。
- 秘钥：需设置 `OPENAI_API_KEY` 为你的有效 Key。请勿提交到版本库。

## 目录结构
```
WiseChoice-Release/
  ├── manifest.json          # 扩展清单（MV3）
  ├── content.js             # 内容脚本：在亚马逊页采集数据
  ├── content.css            # 内容脚本样式（浮动按钮/通知）
  ├── background.js          # 后台 Service Worker：存储、侧边栏打开
  ├── sidebar.html           # 侧边栏页面
  ├── sidebar.js             # 侧边栏逻辑与 AI 报告渲染
  ├── sidebar.css            # 侧边栏样式
  ├── api_server.py          # 本地 FastAPI 服务
  ├── agent.py               # 决策代理定义
  ├── requirements.txt       # Python 依赖
  ├── start_ai_service.sh    # 启动脚本
  ├── icon.png/svg           # 扩展图标
  └── (venv/)                # 虚拟环境（可选）
```

## 开发与调试建议
- 扩展端：
  - `chrome://extensions/` 中启用“开发者模式”，对代码修改后点击“重新加载”。
  - 使用开发者工具查看 `content.js` 与 `sidebar.js` 的 Console 输出。
- 服务端：
  - 运行 `python api_server.py`，观察终端日志与 `http://localhost:8765/docs`。
  - 若端口被占用，可修改 `api_server.py` 末尾的端口或释放 8765 端口。

## 常见问题（FAQ）
- 看不到 `+` 按钮？
  - 确认是否在亚马逊商品详情页（存在 `#productTitle`、URL 中含 `/dp/ASIN` 等）。
  - 若页面为 SPA 切换，等待 0.5s 自动检测或刷新页面。
- 点击对比报错“Service Temporarily Unavailable”？
  - 未启动本地服务或 `OPENAI_API_KEY` 未配置；按“安装与启动”步骤启动服务。
- 侧边栏没有显示候选商品？
  - 先在商品页点击 `+` 按钮采集；或在侧边栏删除后重新采集。
- 网络/CORS 问题？
  - 开发环境已允许 `*` 源；若自行调整请确保扩展可访问 `http://localhost:8765`。

## 许可证
当前仓库未包含明确的许可证文件。若用于分发或开源，请补充适当的 LICENSE（例如 MIT/Apache-2.0 等）。

## 致谢
感谢开源社区与浏览器扩展生态。欢迎提交 Issue/PR 以改进体验。


