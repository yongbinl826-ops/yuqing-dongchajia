# 舆情洞察家项目 - 问题总结与解决方案

## 📋 问题清单

### 1. ✅ 任务详情页"任务不存在或已被删除"（已修复）

**问题描述**：
- 点击任务卡片后，详情页显示"任务不存在或已被删除"
- 所有任务（ID 2、3、4）都无法正常查看

**根本原因**：
- 前端路由参数名称不匹配
- wouter路由使用`:taskId`作为参数，但TaskDetail组件使用`params.id`获取
- 导致解析出`NaN`，后端查询失败

**修复方案**：
```typescript
// 修改前
const taskId = parseInt(params.id || "0");

// 修改后  
const taskId = parseInt(params.taskId || "0");
```

**修复文件**：
- `client/src/pages/TaskDetail.tsx`

**验证结果**：✅ 任务详情页现在可以正常加载

---

### 2. ✅ Dashboard评论总数统计错误（已修复）

**问题描述**：
- Dashboard显示"总评论数: 0"，但数据库中有45条评论

**根本原因**：
- 统计逻辑错误：`tasks?.reduce((sum, t) => sum + (t.id ? 0 : 0), 0)`
- 无论如何都返回0

**修复方案**：
```typescript
// 使用正确的统计逻辑
const totalComments = tasks?.reduce((sum, t) => {
  const count = commentCounts[t.id] || 0;
  return sum + count;
}, 0) || 0;
```

**修复文件**：
- `client/src/pages/Dashboard.tsx`

**验证结果**：✅ Dashboard现在正确显示45条评论

---

### 3. ✅ 环境变量缺失（已修复）

**问题描述**：
- 网页标题显示为占位符
- 缺少前端环境变量配置

**修复方案**：
在`.env`文件中添加：
```bash
VITE_APP_TITLE=舆情洞察家
VITE_APP_DESCRIPTION=智能舆情监控与分析平台
VITE_APP_LOGO=/logo.png
```

**修复文件**：
- `.env`

**验证结果**：✅ 页面标题正常显示

---

### 4. ✅ 数据源不可靠（已修复）

**问题描述**：
- 微博和知乎反爬虫机制严格
- 数据采集成功率低

**修复方案**：
- 替换为Reddit和YouTube作为数据源
- 创建新的采集器：
  - `server/collectors/reddit_collector.py`
  - `server/collectors/youtube_collector.py`
- 更新前端平台选择界面

**修复文件**：
- `server/collectors/reddit_collector.py` (新增)
- `server/collectors/youtube_collector.py` (新增)
- `server/collectors/coordinator.py` (修改)
- `client/src/pages/CreateTask.tsx` (修改)
- `server/routers.ts` (修改)

**验证结果**：
- ✅ Reddit采集器测试通过（成功获取10条数据）
- ✅ 前端显示Reddit和YouTube选项
- ✅ 可以成功创建使用新数据源的任务

---

### 5. ⚠️ Web服务不稳定（部分解决）

**问题描述**：
- 任务详情页停留一会就会跳转到"无法访问此网站"
- ERR_CONNECTION_REFUSED错误
- 服务频繁崩溃

**根本原因**：
- `tsx watch`模式下的文件监听问题
- EBADF: bad file descriptor错误
- Vite热重载与tsx watch模式冲突

**当前解决方案**：
```bash
# 停止watch模式，使用普通模式启动
cd /home/ubuntu/yuqing_dongchajia
PORT=3001 NODE_ENV=development nohup ./node_modules/.bin/tsx server/_core/index.ts > web_service_final.log 2>&1 &
```

**状态**：⚠️ 部分解决，但仍不够稳定

**建议的长期解决方案**：
1. 构建生产版本：`pnpm build`
2. 使用生产模式运行：`pnpm start`
3. 或使用PM2等进程管理工具

---

### 6. ❌ "开始采集"按钮功能问题（未完全解决）

**问题描述**：
- "开始采集"按钮无法点击（已修复按钮禁用逻辑）
- 点击按钮后页面崩溃（与问题5相关）
- API返回认证错误（UNAUTHORIZED）

**已修复部分**：
```typescript
// 移除错误的禁用条件
<Button
  disabled={startCollectionMutation.isPending} // 之前是 || isActive
>
```

**未解决部分**：
1. **认证问题**：API需要登录，但前端使用游客模式
2. **页面崩溃**：点击按钮触发的操作导致服务崩溃

**API测试结果**：
```json
{
  "error": {
    "message": "Please login (10001)",
    "code": "UNAUTHORIZED"
  }
}
```

**需要进一步排查**：
1. 检查前端是否有模拟登录或token机制
2. 检查后端是否有游客模式支持
3. 修复服务稳定性问题后再测试按钮功能

---

## 🎯 修复优先级

### 高优先级（必须修复）
1. ✅ 任务详情页加载问题
2. ✅ 评论统计错误
3. ⚠️ Web服务稳定性
4. ❌ 开始采集功能

### 中优先级（建议修复）
1. ✅ 环境变量配置
2. ✅ 数据源替换
3. 数据关联逻辑（评论与任务）
4. 后端聚合查询API

### 低优先级（可选）
1. 用户认证系统完善
2. 数据导出功能
3. 性能优化
4. UI/UX改进

---

## 📊 测试结果总结

### 已验证功能 ✅
- Dashboard页面显示
- 任务列表查看
- 任务详情页加载
- 创建新任务
- 数据库查询
- Reddit采集器
- NLP服务（情感分析、关键词提取）

### 未验证功能 ⚠️
- 开始采集功能
- 暂停采集功能
- 导出评论功能
- 导出分析功能
- 数据可视化图表（部分显示）

### 已知缺陷 ❌
- Web服务不稳定，容易崩溃
- 开始采集需要认证但无登录入口
- 页面长时间停留会断开连接

---

## 🔧 快速修复指南

### 启动稳定的Web服务
```bash
# 方法1：使用当前的启动命令
cd /home/ubuntu/yuqing_dongchajia
PORT=3001 NODE_ENV=development nohup ./node_modules/.bin/tsx server/_core/index.ts > web_service_final.log 2>&1 &

# 方法2：构建并使用生产模式（推荐）
pnpm build
PORT=3001 pnpm start
```

### 访问应用
```
https://3001-ibn1h6l9azqb2oebiw5zj-d0dfbef7.manus-asia.computer
```

### 检查服务状态
```bash
# 查看进程
ps aux | grep "tsx.*index.ts" | grep -v grep

# 查看日志
tail -f /home/ubuntu/yuqing_dongchajia/web_service_final.log

# 测试连接
curl -s http://localhost:3001/ | head -5
```

---

## 📝 后续建议

1. **立即处理**：
   - 修复Web服务稳定性（使用生产模式或PM2）
   - 解决认证问题（添加游客模式或简化认证）

2. **短期改进**：
   - 完善数据采集调度
   - 修复数据关联逻辑
   - 添加错误处理和日志

3. **长期优化**：
   - 实现完整的用户认证系统
   - 优化前端性能
   - 增强数据可视化
   - 添加单元测试和集成测试

---

**文档生成时间**：2025-11-22 03:50
**项目状态**：部分功能可用，需要进一步修复
