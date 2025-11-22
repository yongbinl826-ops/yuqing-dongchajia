# 舆情洞察家项目交接文档

## 项目概述

**项目名称：** 舆情洞察家（yuqing_dongchajia）

**项目描述：** 一个中文舆情监控系统，支持 Twitter/微博/知乎数据采集、BERT 情感分析、关键词提取和交互式可视化。

**技术栈：**
- 前端：React 19 + Tailwind CSS 4 + tRPC 11 + Plotly.js
- 后端：Express 4 + tRPC 11 + Node.js
- 数据库：MySQL/TiDB (Drizzle ORM)
- NLP：Python 3 + BERT + Jieba + Playwright
- 认证：Manus OAuth

**项目版本：** 5ce8f725

**在线预览：** https://3000-i2y1mhmy1d0aq8kh4n112-d718492a.manus-asia.computer

---

## 已完成功能

### 1. 完整的全栈架构 ✅
- React 前端 + Express 后端
- tRPC 类型安全 API
- MySQL 数据库连接
- Manus OAuth 用户认证
- 22 个单元测试全部通过

### 2. 数据库设计 ✅
- `users` - 用户表
- `monitoring_tasks` - 监控任务表
- `comments` - 评论数据表
- `sentiment_analysis` - 情感分析结果表
- `sentiment_stats` - 情感统计数据表（时间序列）
- `crawl_jobs` - 爬虫任务表

### 3. 后端 API ✅
- **任务管理**：创建、列表、获取、更新状态
- **评论查询**：按任务列表、计数统计
- **情感分析**：列表、统计数据、时间范围查询
- **数据导出**：CSV 格式导出评论和情感分析结果
- **数据采集**：开始采集、停止采集、查询进度

### 4. 前端界面 ✅
- **主页**：现代化着陆页，展示平台特性
- **仪表板**：统计卡片、任务列表、状态标签
- **新建任务**：关键词输入、平台选择（Twitter/微博/知乎）
- **任务详情**：
  - 情感分布进度条
  - Plotly 饼图和折线图
  - 评论列表
  - 数据导出按钮
  - 开始采集按钮
- **关键词分析页面**：词云图、排行榜、统计信息

### 5. 科技风格设计 ✅
- 深蓝/紫色主题
- 玻璃态卡片设计
- 霓虹青色高亮
- 发光边框和动画效果

### 6. Python 模块（已创建但未集成）✅
- `server/collectors/twitter_collector.py` - Twitter API 采集器
- `server/collectors/weibo_crawler.py` - 微博 Playwright 爬虫
- `server/collectors/zhihu_crawler.py` - 知乎 Playwright 爬虫
- `server/nlp/sentiment_analyzer.py` - BERT 情感分析 + Jieba 关键词提取
- `server/collectors/coordinator.py` - 数据采集协调器
- `nlp_service.py` - FastAPI NLP 服务

---

## 待开发功能

### 1. 实时进度显示 ⚠️ 高优先级

**目标：** 在任务详情页面显示实时采集进度

**实现步骤：**
1. 在 `TaskDetail.tsx` 中添加 `useEffect` 轮询机制
2. 每 5 秒调用 `trpc.collector.getProgress` 查询进度
3. 更新进度条组件显示：
   - 已采集评论数 / 目标评论数
   - 采集速率（评论/分钟）
   - 预计剩余时间
4. 添加暂停/继续按钮控制采集

**相关文件：**
- `client/src/pages/TaskDetail.tsx`
- `server/routers/collector.ts` (getProgress 需要实现真实逻辑)

---

### 2. 连接真实情感趋势数据 ⚠️ 高优先级

**目标：** 将 Plotly 折线图连接到真实的时间序列数据

**实现步骤：**
1. 在 `TaskDetail.tsx` 中调用 `trpc.sentiment.stats` 查询
2. 传递查询结果到 `SentimentTrendChart` 组件
3. 格式化数据为 Plotly 所需格式：
   ```typescript
   {
     dates: ['2024-01-01', '2024-01-02', ...],
     positive: [10, 15, ...],
     neutral: [5, 8, ...],
     negative: [3, 2, ...]
   }
   ```
4. 添加日期范围选择器（7天/30天/自定义）

**相关文件：**
- `client/src/pages/TaskDetail.tsx`
- `client/src/components/SentimentTrendChart.tsx`
- `server/routers.ts` (sentiment.stats 路由)

---

### 3. 完善 Python 爬虫脚本 ⚠️ 高优先级

**目标：** 实现真实的数据采集和存储逻辑

**Twitter 采集器 (`server/collectors/twitter_collector.py`)：**
1. 添加命令行参数解析（argparse）
2. 使用提供的 Twitter API 密钥连接 API
3. 搜索关键词相关的推文
4. 将推文存储到 `comments` 表
5. 调用 FastAPI NLP 服务进行情感分析
6. 将分析结果存储到 `sentiment_analysis` 表

**微博爬虫 (`server/collectors/weibo_crawler.py`)：**
1. 使用 Playwright 自动化登录微博
2. 搜索关键词
3. 滚动加载评论
4. 提取评论文本、作者、时间戳
5. 存储到数据库并调用 NLP 服务

**知乎爬虫 (`server/collectors/zhihu_crawler.py`)：**
1. 使用 Playwright 自动化登录知乎
2. 搜索关键词相关的问题和回答
3. 提取回答和评论
4. 存储到数据库并调用 NLP 服务

**数据库连接：**
- 使用 `pymysql` 或 `mysql-connector-python`
- 数据库连接字符串从环境变量 `DATABASE_URL` 读取

**NLP 服务调用：**
- 启动 FastAPI 服务：`python nlp_service.py`
- 调用 `http://localhost:8000/analyze/sentiment` 进行情感分析
- 调用 `http://localhost:8000/analyze/keywords` 进行关键词提取

**相关文件：**
- `server/collectors/twitter_collector.py`
- `server/collectors/weibo_crawler.py`
- `server/collectors/zhihu_crawler.py`
- `nlp_service.py`

---

### 4. 安装 Python 依赖 ⚠️ 必需

**目标：** 安装所有 Python 依赖包

**步骤：**
```bash
cd /home/ubuntu/yuqing_dongchajia
pip3 install -r requirements.txt
playwright install chromium
```

**依赖列表（`requirements.txt`）：**
- `transformers` - BERT 模型
- `torch` - PyTorch
- `jieba` - 中文分词
- `scikit-learn` - TF-IDF
- `playwright` - 浏览器自动化
- `fastapi` - NLP 服务
- `uvicorn` - FastAPI 服务器
- `tweepy` - Twitter API
- `pymysql` - MySQL 连接
- `python-dotenv` - 环境变量

---

### 5. 实现情感统计数据聚合 ⚠️ 中优先级

**目标：** 自动生成时间序列的情感统计数据

**实现步骤：**
1. 在 `server/db.ts` 中添加 `aggregateSentimentStats` 函数
2. 按日期分组统计情感分析结果
3. 插入到 `sentiment_stats` 表
4. 在采集完成后自动调用聚合函数

**SQL 示例：**
```sql
INSERT INTO sentiment_stats (task_id, date, positive_count, neutral_count, negative_count)
SELECT 
  task_id,
  DATE(created_at) as date,
  SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END),
  SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END),
  SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END)
FROM sentiment_analysis
WHERE task_id = ?
GROUP BY task_id, DATE(created_at);
```

**相关文件：**
- `server/db.ts`
- `server/routers/collector.ts` (在采集完成后调用)

---

### 6. 添加错误处理和重试机制 ⚠️ 中优先级

**目标：** 提高爬虫的稳定性和容错能力

**实现步骤：**
1. 在 Python 爬虫中添加 `try-except` 错误处理
2. 实现指数退避重试机制（最多重试 3 次）
3. 记录错误日志到文件
4. 更新 `crawl_jobs` 表的错误信息字段

**相关文件：**
- 所有 Python 爬虫脚本

---

### 7. 优化界面和用户体验 ⚠️ 低优先级

**建议改进：**
1. 添加加载骨架屏（Skeleton）
2. 优化移动端响应式布局
3. 添加空状态提示（无任务、无评论）
4. 添加帮助文档和使用指南
5. 优化图表交互（缩放、筛选）

---

## 环境变量配置

**必需的环境变量：**
- `DATABASE_URL` - MySQL 连接字符串（已配置）
- `JWT_SECRET` - JWT 签名密钥（已配置）
- `OAUTH_SERVER_URL` - Manus OAuth 服务器（已配置）

**需要添加的环境变量：**
- `TWITTER_API_KEY` - Twitter API Key
- `TWITTER_API_SECRET` - Twitter API Secret
- `TWITTER_ACCESS_TOKEN` - Twitter Access Token
- `TWITTER_ACCESS_SECRET` - Twitter Access Token Secret
- `WEIBO_USERNAME` - 微博账号
- `WEIBO_PASSWORD` - 微博密码
- `ZHIHU_USERNAME` - 知乎账号
- `ZHIHU_PASSWORD` - 知乎密码

**添加方式：**
使用 `webdev_request_secrets` 工具请求用户提供这些凭证。

---

## 项目结构

```
yuqing_dongchajia/
├── client/                    # 前端代码
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   │   ├── Home.tsx      # 主页
│   │   │   ├── Dashboard.tsx # 仪表板
│   │   │   ├── CreateTask.tsx # 新建任务
│   │   │   ├── TaskDetail.tsx # 任务详情
│   │   │   └── KeywordAnalysisPage.tsx # 关键词分析
│   │   ├── components/       # 可复用组件
│   │   │   ├── SentimentPieChart.tsx # 饼图
│   │   │   ├── SentimentTrendChart.tsx # 折线图
│   │   │   └── KeywordAnalysis.tsx # 词云图
│   │   ├── lib/              # 工具函数
│   │   │   ├── trpc.ts       # tRPC 客户端
│   │   │   └── export.ts     # 数据导出
│   │   └── index.css         # 全局样式
│   └── public/               # 静态资源
├── server/                   # 后端代码
│   ├── routers/              # tRPC 路由
│   │   ├── collector.ts      # 数据采集路由
│   │   ├── analysis.ts       # NLP 分析路由
│   │   └── export.ts         # 数据导出路由
│   ├── collectors/           # Python 爬虫
│   │   ├── twitter_collector.py
│   │   ├── weibo_crawler.py
│   │   ├── zhihu_crawler.py
│   │   └── coordinator.py
│   ├── nlp/                  # NLP 模块
│   │   └── sentiment_analyzer.py
│   ├── db.ts                 # 数据库查询
│   ├── routers.ts            # 主路由文件
│   └── *.test.ts             # 单元测试
├── drizzle/                  # 数据库 Schema
│   └── schema.ts
├── nlp_service.py            # FastAPI NLP 服务
├── requirements.txt          # Python 依赖
├── package.json              # Node.js 依赖
├── todo.md                   # 任务列表
└── HANDOVER.md               # 本文档
```

---

## 运行项目

### 1. 安装依赖
```bash
# Node.js 依赖
pnpm install

# Python 依赖
pip3 install -r requirements.txt
playwright install chromium
```

### 2. 配置环境变量
在 Manus 管理界面的 Settings → Secrets 中添加所需的环境变量。

### 3. 推送数据库 Schema
```bash
pnpm db:push
```

### 4. 启动开发服务器
```bash
# Node.js 后端和前端
pnpm dev

# Python NLP 服务（另一个终端）
python3 nlp_service.py
```

### 5. 运行测试
```bash
pnpm test
```

---

## 测试账号信息

**Twitter API 密钥：**
- API Key: `YAGAd9DhnPe6zJY5GBZzT5YYy`
- API Secret: `f0pHQpjURC8cUTSOwRLAhuoTvPlisb28c07AMSs4DpMTjCJ74p`
- Access Token: `1978857524700037120-hb7CUdAEVXyzxedsuMolH9pet6rGqO`
- Access Secret: `OSNprAMGHyRjLBwG6ViClDQfp76snh93fG7ursrOy4Y2w`

**微博账号：**
- 用户名: `19973128978`
- 密码: `lyb517827`

**知乎账号：**
- 用户名: `19973128978`
- 密码: `lyb517827`

---

## 已知问题

1. **Python 爬虫未实现真实逻辑** - 当前只是框架代码，需要补充完整的采集和存储逻辑
2. **情感趋势图无数据** - 需要连接到真实的 `sentiment_stats` 查询
3. **进度查询返回固定值** - `getProgress` 需要实现真实的进度计算
4. **无实时更新** - 需要添加轮询或 WebSocket 机制

---

## 联系信息

**项目交接时间：** 2024-11-22

**原开发者：** Manus AI

**项目版本：** 5ce8f725

**在线预览：** https://3000-i2y1mhmy1d0aq8kh4n112-d718492a.manus-asia.computer

---

## 附录：关键代码片段

### 启动 Python 爬虫（Node.js）
```typescript
import { spawn } from "child_process";

const pythonProcess = spawn("python3", [
  "server/collectors/twitter_collector.py",
  "--task-id", taskId.toString(),
  "--keyword", keyword,
]);

pythonProcess.stdout.on("data", (data) => {
  console.log(`[Twitter] ${data.toString()}`);
});
```

### 调用 NLP 服务（Python）
```python
import requests

response = requests.post(
    "http://localhost:8000/analyze/sentiment",
    json={"texts": ["这是一条评论"]}
)
result = response.json()
```

### 数据库插入评论（Python）
```python
import pymysql

conn = pymysql.connect(host='...', user='...', password='...', db='...')
cursor = conn.cursor()
cursor.execute(
    "INSERT INTO comments (task_id, content, author, platform, created_at) VALUES (%s, %s, %s, %s, %s)",
    (task_id, content, author, platform, created_at)
)
conn.commit()
```

---

**祝开发顺利！如有问题，请参考项目代码和单元测试。**
