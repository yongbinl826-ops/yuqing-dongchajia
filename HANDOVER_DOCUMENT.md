# 舆情洞察家项目交接文档

## 📋 项目概述

**项目名称：** 舆情洞察家 (Yuqing Dongchajia)  
**项目类型：** 中文舆情监控与情感分析系统  
**技术栈：** React 19 + Express + Python + MySQL  
**交接日期：** 2025-11-22  
**当前版本：** 1.0.0

## 🎯 项目功能

### 已完成功能

1. **多平台数据采集**
   - ✅ Twitter数据采集（已适配Free API）
   - ✅ 微博爬虫（基于Playwright）
   - ✅ 知乎爬虫（基于Playwright）
   - ✅ 模拟数据生成器（用于演示）

2. **NLP情感分析**
   - ✅ FastAPI服务（端口8000）
   - ✅ 基于规则的中文情感分析
   - ✅ Jieba分词和关键词提取
   - ✅ 批量处理支持

3. **数据可视化**
   - ✅ 情感趋势图表（Plotly）
   - ✅ 情感分布饼图
   - ✅ 时间范围切换（7天/30天）
   - ✅ 实时进度显示

4. **任务管理**
   - ✅ 创建监控任务
   - ✅ 启动/停止采集
   - ✅ 查看任务详情
   - ✅ 数据导出（CSV）

### 待完善功能

1. **OAuth用户认证**
   - ⏳ 需要配置真实OAuth服务器
   - 💡 当前使用默认用户（游客模式）

2. **微博/知乎登录**
   - ⏳ 需要处理验证码
   - ⏳ 需要优化反爬虫策略

3. **Twitter API升级**
   - ⏳ 当前使用Free计划（限制100条/月）
   - 💡 建议升级到Basic计划（$200/月）

4. **BERT模型集成**
   - ⏳ 当前使用规则分析
   - 💡 可集成预训练BERT模型提升准确度

## 🏗️ 项目架构

```
yuqing_dongchajia/
├── client/                    # React前端
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   ├── components/       # UI组件
│   │   ├── lib/              # 工具库
│   │   └── _core/            # 核心功能
│   └── public/               # 静态资源
├── server/                    # Express后端
│   ├── _core/                # 核心功能
│   ├── routers/              # API路由
│   ├── collectors/           # 数据采集器
│   └── db.ts                 # 数据库操作
├── drizzle/                   # 数据库Schema
├── nlp_service.py            # NLP服务
├── requirements.txt          # Python依赖
├── package.json              # Node.js依赖
├── .env                      # 环境变量
└── database_backup.sql       # 数据库备份

```

## 🗄️ 数据库设计

### 核心表结构

1. **monitoring_tasks** - 监控任务
   - id, userId, keyword, description, platforms, status
   - createdAt, updatedAt

2. **comments** - 采集的评论数据
   - id, taskId, platform, content, author, url
   - publishedAt, createdAt

3. **sentiment_analysis** - 情感分析结果
   - id, commentId, taskId, sentiment, confidence, keywords
   - createdAt

4. **sentiment_stats** - 情感统计（按天聚合）
   - id, taskId, date, positiveCount, negativeCount, neutralCount

5. **crawl_jobs** - 采集任务记录
   - id, taskId, status, totalItems, processedItems, errorMessage
   - startedAt, completedAt

6. **users** - 用户表
   - id, openId, name, email, role, lastSignedIn

## 🚀 快速启动

### 1. 环境准备

```bash
# 安装Node.js依赖
cd yuqing_dongchajia
pnpm install

# 安装Python依赖
pip3 install -r requirements.txt

# 安装Playwright浏览器
sudo playwright install chromium

# 安装MySQL
sudo apt-get install mysql-server
```

### 2. 数据库配置

```bash
# 启动MySQL
sudo service mysql start

# 恢复数据库备份
mysql -u root -p < database_backup.sql

# 或创建新数据库
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS yuqing_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'yuqing_user'@'localhost' IDENTIFIED BY 'yuqing_pass_2024';
GRANT ALL PRIVILEGES ON yuqing_db.* TO 'yuqing_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# 推送Schema
export DATABASE_URL="mysql://yuqing_user:yuqing_pass_2024@localhost:3306/yuqing_db"
pnpm db:push
```

### 3. 配置环境变量

编辑 `.env` 文件：

```bash
# 数据库配置
DATABASE_URL=mysql://yuqing_user:yuqing_pass_2024@localhost:3306/yuqing_db

# Twitter API（需要自行申请）
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret

# OAuth配置（可选）
OAUTH_SERVER_URL=http://localhost:9999
VITE_OAUTH_PORTAL_URL=http://localhost:9999
VITE_APP_ID=yuqing_dongchajia
JWT_SECRET=your-jwt-secret-key

# NLP服务
NLP_SERVICE_URL=http://localhost:8000
```

### 4. 启动服务

```bash
# 方式1：使用一键启动脚本
./start_all.sh

# 方式2：手动启动各服务
# 启动MySQL
sudo service mysql start

# 启动NLP服务
python3 nlp_service.py > nlp_service.log 2>&1 &

# 启动Web应用
export $(cat .env | grep -v '^#' | xargs)
pnpm dev
```

访问：http://localhost:3000

## 📊 演示数据

数据库备份中包含45条模拟数据（任务ID=1，关键词"AI"）：
- Twitter：15条
- 微博：15条
- 知乎：15条

可以直接查看演示效果。

## 🔧 开发指南

### 添加新的数据源

1. 在 `server/collectors/` 创建新的采集器
2. 继承基础采集器类或参考现有实现
3. 在 `run_collector.py` 中注册新平台
4. 更新前端平台选择器

### 修改情感分析逻辑

编辑 `server/nlp/sentiment_analyzer.py`：

```python
def analyze_sentiment(self, text: str) -> dict:
    # 自定义分析逻辑
    # 可以集成BERT、LSTM等模型
    pass
```

### 添加新的API端点

在 `server/routers.ts` 中添加：

```typescript
export const appRouter = router({
  // 添加新的路由
  myNewRoute: router({
    myMethod: publicProcedure
      .input(z.object({ ... }))
      .query(async ({ input }) => {
        // 实现逻辑
      }),
  }),
});
```

## 🐛 已知问题

### 1. OAuth未配置
**现象：** 用户认证功能不可用  
**影响：** 不影响核心功能，当前使用游客模式  
**解决：** 配置真实OAuth服务器或集成第三方登录

### 2. Twitter API限制
**现象：** Free计划每月只能采集100条  
**影响：** 无法大规模采集Twitter数据  
**解决：** 升级到Basic计划（$200/月）或使用其他数据源

### 3. 微博/知乎验证码
**现象：** 登录时可能遇到验证码  
**影响：** 自动化采集可能失败  
**解决：** 
- 使用稳定的小号
- 降低采集频率
- 考虑使用代理IP

### 4. TaskDetail页面加载问题
**现象：** 有时显示"任务不存在"  
**影响：** 需要刷新页面  
**解决：** 已修复isActive初始化问题，但API连接仍需优化

## 📝 维护建议

### 日常维护

1. **数据库备份**
   ```bash
   mysqldump -u yuqing_user -pyuqing_pass_2024 yuqing_db > backup_$(date +%Y%m%d).sql
   ```

2. **日志监控**
   ```bash
   tail -f nlp_service.log
   tail -f /tmp/yuqing_server.log
   ```

3. **清理旧数据**
   ```sql
   DELETE FROM comments WHERE createdAt < DATE_SUB(NOW(), INTERVAL 90 DAY);
   ```

### 性能优化

1. **数据库索引**
   - 已在taskId、platform、createdAt上建立索引
   - 可根据查询模式添加组合索引

2. **缓存策略**
   - 可使用Redis缓存热点数据
   - 情感统计可以预计算

3. **并发采集**
   - 当前串行采集
   - 可改为多线程/多进程并发

## 🔐 安全注意事项

1. **API密钥管理**
   - ⚠️ 不要将`.env`文件提交到Git
   - ⚠️ 生产环境使用环境变量或密钥管理服务

2. **数据库安全**
   - ⚠️ 修改默认数据库密码
   - ⚠️ 限制数据库访问IP

3. **用户认证**
   - ⚠️ 当前无认证，所有用户共享数据
   - ⚠️ 生产环境必须启用OAuth

## 📞 技术支持

### 相关文档

- `README.md` - 项目说明
- `QUICK_START.md` - 快速启动指南
- `CRAWLER_GUIDE.md` - 爬虫开发指南
- `todo.md` - 待办事项清单

### 常见命令

```bash
# 查看服务状态
ps aux | grep -E "(python3|node|pnpm)"

# 重启所有服务
./start_all.sh

# 查看数据库状态
mysql -u yuqing_user -pyuqing_pass_2024 yuqing_db -e "SHOW TABLES;"

# 测试NLP服务
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"这个产品真不错！"}'
```

## 🎓 学习资源

- **React 19**: https://react.dev/
- **tRPC**: https://trpc.io/
- **Drizzle ORM**: https://orm.drizzle.team/
- **Playwright**: https://playwright.dev/
- **Jieba分词**: https://github.com/fxsjy/jieba
- **Twitter API**: https://developer.twitter.com/

## 📦 交接清单

- ✅ 完整源代码
- ✅ 数据库备份（含演示数据）
- ✅ 环境配置文件
- ✅ Python依赖列表
- ✅ Node.js依赖列表
- ✅ 项目文档
- ✅ 快速启动脚本
- ✅ 已知问题列表
- ✅ 开发建议

## 🚀 后续开发建议

### 短期（1-2周）

1. 修复TaskDetail页面API连接问题
2. 优化微博/知乎登录流程
3. 添加数据导出功能（Excel）
4. 完善错误处理和日志

### 中期（1-2月）

1. 集成BERT情感分析模型
2. 添加热点话题发现
3. 实现舆情预警功能
4. 多用户权限管理

### 长期（3-6月）

1. 添加更多平台（抖音、小红书、B站）
2. GPT集成（摘要生成、报告撰写）
3. Docker容器化部署
4. 分布式采集架构

---

**祝开发顺利！如有问题，请参考文档或联系前任开发者。**
