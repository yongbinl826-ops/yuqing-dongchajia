# 舆情洞察家 - 快速启动指南

## 一键启动脚本

### 1. 启动所有服务

```bash
cd /home/ubuntu/yuqing_dongchajia

# 启动MySQL数据库
sudo service mysql start

# 启动NLP服务（后台运行）
python3 nlp_service.py > nlp_service.log 2>&1 &

# 启动Web应用
export $(cat .env | grep -v '^#' | xargs)
pnpm dev
```

### 2. 访问应用

- **Web界面**：https://3000-idvk9xns60jmuzyty6ewg-4fc8f874.manus-asia.computer
- **NLP API文档**：http://localhost:8000/docs
- **健康检查**：http://localhost:8000/health

## 使用流程

### 第一步：创建监控任务

1. 访问Web界面
2. 点击"新建任务"
3. 输入关键词（如"人工智能"）
4. 选择平台（Twitter/微博/知乎）
5. 点击"创建任务"

### 第二步：开始数据采集

1. 进入任务详情页
2. 点击"开始采集"按钮
3. 系统会自动：
   - 调用Python爬虫采集数据
   - 存储评论到数据库
   - 调用NLP服务分析情感
   - 提取关键词
   - 更新实时进度

### 第三步：查看分析结果

- **概览标签**：查看情感分布饼图和趋势折线图
- **评论标签**：浏览最新采集的评论
- **分析标签**：查看关键词分析（即将上线）

### 第四步：导出数据

- 点击"导出评论"按钮下载CSV格式的评论数据
- 点击"导出分析"按钮下载情感分析结果

## 命令行测试

### 测试Twitter采集器

```bash
cd /home/ubuntu/yuqing_dongchajia
export $(cat .env | grep -v '^#' | xargs)

# 基础测试（跳过NLP）
python3 server/collectors/run_twitter_collector.py \
  --task-id 1 \
  --keyword "AI" \
  --max-results 10 \
  --skip-nlp

# 完整测试（包含NLP分析）
python3 server/collectors/run_twitter_collector.py \
  --task-id 1 \
  --keyword "人工智能" \
  --max-results 20
```

### 测试NLP服务

```bash
# 情感分析
curl -X POST http://localhost:8000/sentiment \
  -H "Content-Type: application/json" \
  -d '{"text": "这个产品真的很好用！"}'

# 关键词提取
curl -X POST http://localhost:8000/keywords \
  -H "Content-Type: application/json" \
  -d '{"text": "人工智能技术正在改变世界"}'
```

## 常见问题

### Q1: Twitter API返回401错误

**原因**：Twitter API凭证已过期

**解决方案**：
1. 访问 https://developer.twitter.com/
2. 创建新的App并获取API密钥
3. 更新`.env`文件中的Twitter凭证
4. 重启服务

### Q2: NLP服务无法启动

**检查步骤**：
```bash
# 检查端口是否被占用
lsof -i :8000

# 查看日志
tail -f /home/ubuntu/yuqing_dongchajia/nlp_service.log

# 手动启动测试
python3 nlp_service.py
```

### Q3: 数据库连接失败

**检查步骤**：
```bash
# 检查MySQL服务状态
sudo service mysql status

# 测试数据库连接
mysql -u yuqing_user -pyuqing_pass_2024 yuqing_db -e "SHOW TABLES;"
```

### Q4: 前端无法访问

**检查步骤**：
```bash
# 确保环境变量已加载
export $(cat .env | grep -v '^#' | xargs)

# 检查端口是否被占用
lsof -i :3000

# 查看开发服务器日志
```

## 停止服务

```bash
# 停止NLP服务
pkill -f nlp_service.py

# 停止Web应用（Ctrl+C）

# 停止MySQL（可选）
sudo service mysql stop
```

## 数据库管理

### 查看数据

```bash
mysql -u yuqing_user -pyuqing_pass_2024 yuqing_db

# 查看任务列表
SELECT * FROM monitoring_tasks;

# 查看评论数据
SELECT * FROM comments LIMIT 10;

# 查看情感分析结果
SELECT * FROM sentiment_analysis LIMIT 10;
```

### 清空数据（慎用）

```bash
mysql -u yuqing_user -pyuqing_pass_2024 yuqing_db -e "
TRUNCATE TABLE comments;
TRUNCATE TABLE sentiment_analysis;
TRUNCATE TABLE sentiment_stats;
TRUNCATE TABLE crawl_jobs;
"
```

## 性能优化建议

1. **数据库索引**：为常用查询字段添加索引
2. **缓存策略**：使用Redis缓存热点数据
3. **异步处理**：使用消息队列处理大批量采集
4. **限流控制**：避免触发API速率限制

## 下一步

1. ✅ 更新Twitter API凭证
2. ✅ 配置OAuth服务器URL
3. ✅ 完善微博和知乎爬虫
4. ✅ 实现关键词分析页面
5. ✅ 部署到生产环境

---

**需要帮助？** 查看 `PROJECT_COMPLETION_REPORT.md` 获取详细文档
