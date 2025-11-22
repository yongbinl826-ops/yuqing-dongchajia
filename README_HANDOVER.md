# 舆情洞察家项目交接包

## 📦 包含内容

本压缩包包含舆情洞察家项目的完整交接文件：

### 1. 源代码
- ✅ 完整的前端代码（React 19 + Tailwind CSS 4）
- ✅ 完整的后端代码（Express + tRPC）
- ✅ Python爬虫和NLP服务
- ✅ 数据库Schema定义

### 2. 数据库备份
- ✅ `database_backup.sql` - 包含演示数据的完整备份
- ✅ 45条模拟数据（Twitter/微博/知乎各15条）

### 3. 配置文件
- ✅ `.env` - 环境变量配置（包含数据库连接、API密钥）
- ✅ `package.json` - Node.js依赖
- ✅ `requirements.txt` - Python依赖
- ✅ `drizzle.config.ts` - 数据库配置

### 4. 文档
- ✅ `HANDOVER_DOCUMENT.md` - 详细的项目交接文档
- ✅ `QUICK_START.md` - 快速启动指南
- ✅ `CRAWLER_GUIDE.md` - 爬虫开发指南
- ✅ `PROJECT_COMPLETION_REPORT.md` - 项目完成报告
- ✅ `todo.md` - 待办事项清单

### 5. 脚本
- ✅ `start_all.sh` - 一键启动脚本
- ✅ 各种采集脚本和工具

## 🚀 快速开始

### 1. 解压文件

```bash
tar -xzf yuqing_dongchajia_handover_20251122.tar.gz
cd yuqing_dongchajia
```

### 2. 安装依赖

```bash
# Node.js依赖
pnpm install

# Python依赖
pip3 install -r requirements.txt

# Playwright浏览器
sudo playwright install chromium
```

### 3. 配置数据库

```bash
# 启动MySQL
sudo service mysql start

# 创建数据库和用户
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS yuqing_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'yuqing_user'@'localhost' IDENTIFIED BY 'yuqing_pass_2024';
GRANT ALL PRIVILEGES ON yuqing_db.* TO 'yuqing_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# 恢复数据库备份
mysql -u yuqing_user -pyuqing_pass_2024 yuqing_db < database_backup.sql
```

### 4. 启动服务

```bash
# 使用一键启动脚本
chmod +x start_all.sh
./start_all.sh

# 或手动启动
python3 nlp_service.py > nlp_service.log 2>&1 &
export $(cat .env | grep -v '^#' | xargs)
pnpm dev
```

### 5. 访问应用

打开浏览器访问：http://localhost:3000

## 📋 系统要求

### 必需环境

- **操作系统**: Ubuntu 22.04 或更高版本
- **Node.js**: v22.13.0 或更高版本
- **Python**: 3.11 或更高版本
- **MySQL**: 8.0 或更高版本
- **内存**: 至少 4GB RAM
- **磁盘**: 至少 10GB 可用空间

### 可选工具

- **pnpm**: 包管理器（推荐）
- **Docker**: 容器化部署（可选）
- **Redis**: 缓存服务（可选）

## 🔑 重要配置

### Twitter API

需要自行申请Twitter Developer账号并获取API密钥：

1. 访问 https://developer.twitter.com/
2. 创建App并获取密钥
3. 更新 `.env` 文件中的配置

**注意**: 当前配置的Twitter API为Free计划，每月限制100条。建议升级到Basic计划（$200/月）。

### OAuth配置（可选）

如需启用用户认证功能，需要配置OAuth服务器：

```bash
OAUTH_SERVER_URL=your_oauth_server_url
VITE_OAUTH_PORTAL_URL=your_oauth_portal_url
VITE_APP_ID=your_app_id
JWT_SECRET=your_jwt_secret
```

当前系统使用游客模式，无需登录即可使用所有功能。

## 📊 演示数据

数据库备份包含一个完整的演示任务（ID=1，关键词"AI"）：

- **Twitter**: 15条推文
- **微博**: 15条微博
- **知乎**: 15条回答
- **情感分析**: 45条分析结果
- **统计数据**: 按天聚合的情感趋势

可以直接查看这些数据来了解系统功能。

## 🐛 已知问题

### 1. OAuth未配置
- **影响**: 用户认证功能不可用
- **解决**: 当前使用游客模式，不影响核心功能

### 2. Twitter API限制
- **影响**: Free计划每月只能采集100条
- **解决**: 升级到Basic计划或使用其他数据源

### 3. 微博/知乎验证码
- **影响**: 自动登录可能失败
- **解决**: 使用稳定账号，降低采集频率

### 4. TaskDetail页面
- **影响**: 有时需要刷新页面
- **解决**: 已修复部分问题，仍在优化中

## 📞 技术支持

### 文档位置

- **项目交接文档**: `HANDOVER_DOCUMENT.md`
- **快速启动指南**: `QUICK_START.md`
- **爬虫开发指南**: `CRAWLER_GUIDE.md`

### 常见问题

**Q: 如何重置数据库？**
```bash
mysql -u yuqing_user -pyuqing_pass_2024 yuqing_db < database_backup.sql
```

**Q: 如何查看服务状态？**
```bash
ps aux | grep -E "(python3|node|pnpm)"
```

**Q: 如何停止所有服务？**
```bash
pkill -f "pnpm dev"
pkill -f "python3 nlp_service.py"
```

**Q: 如何添加新的监控任务？**
1. 访问Dashboard
2. 点击"创建新任务"
3. 填写关键词和选择平台
4. 点击"创建任务"

## 🎯 下一步

1. **阅读交接文档** - 了解项目架构和功能
2. **启动服务** - 按照快速启动指南操作
3. **查看演示数据** - 熟悉系统功能
4. **创建测试任务** - 尝试采集真实数据
5. **参考开发指南** - 开始二次开发

## 📝 注意事项

⚠️ **安全提醒**:
- 不要将 `.env` 文件提交到公开仓库
- 修改默认数据库密码
- 生产环境必须启用HTTPS和认证

⚠️ **性能提醒**:
- 大规模采集前先测试
- 注意API调用频率限制
- 定期清理旧数据

⚠️ **法律提醒**:
- 遵守各平台的服务条款
- 尊重用户隐私
- 合理使用采集频率

---

**项目交接日期**: 2025-11-22  
**版本**: 1.0.0  
**联系方式**: 参考项目文档

祝开发顺利！🚀
