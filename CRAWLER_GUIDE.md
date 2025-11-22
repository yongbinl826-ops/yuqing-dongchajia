# 爬虫开发指南

本文档详细说明如何使用和扩展舆情洞察家的数据采集器。

## 📚 目录

1. [采集器架构](#采集器架构)
2. [Twitter采集器](#twitter采集器)
3. [微博爬虫](#微博爬虫)
4. [知乎爬虫](#知乎爬虫)
5. [模拟数据生成器](#模拟数据生成器)
6. [如何添加新平台](#如何添加新平台)

## 采集器架构

### 文件结构

```
server/collectors/
├── twitter_collector.py      # Twitter API采集器
├── weibo_collector.py         # 微博Playwright爬虫
├── zhihu_collector.py         # 知乎Playwright爬虫
├── mock_data_generator.py     # 模拟数据生成器
├── run_collector.py           # 统一采集脚本
└── demo_with_mock_data.py     # 演示脚本
```

### 数据格式

所有采集器返回统一的数据格式：

```python
{
    "platformId": str,      # 平台唯一ID
    "platform": str,        # 平台名称 (twitter/weibo/zhihu)
    "author": str,          # 作者名称
    "authorId": str,        # 作者ID
    "content": str,         # 内容文本
    "url": str,             # 内容URL
    "publishedAt": str,     # 发布时间 (ISO格式)
    "likes": int,           # 点赞数
    "replies": int,         # 评论/回复数
    "shares": int,          # 分享/转发数
}
```

## Twitter采集器

### 使用方法

```python
from twitter_collector import TwitterCollector

# 初始化
collector = TwitterCollector(
    api_key="your_api_key",
    api_secret="your_api_secret",
    access_token="your_access_token",
    access_token_secret="your_access_token_secret"
)

# 搜索推文（Free计划限制）
tweets = collector.search_tweets("AI", max_results=10)

# 获取用户推文
tweets = collector.search_tweets_by_user("OpenAI", max_results=20)
```

### API限制

**Free计划：**
- ❌ 不支持 `search_recent_tweets`
- ✅ 支持 `get_users_tweets`（用户时间线）
- 📊 每月100条推文限制

**Basic计划 ($200/月)：**
- ✅ 支持 `search_recent_tweets`
- 📊 每月15,000条推文

**解决方案：**
当前代码已适配Free计划，通过预定义用户列表进行采集：

```python
keyword_users_map = {
    "AI": ["OpenAI", "DeepMind", "AndrewYNg"],
    "人工智能": ["OpenAI", "DeepMind"],
    "Python": ["ThePSF", "realpython"],
}
```

### 升级到真实API

如果升级到Basic计划，可以恢复原始搜索功能：

```python
# 在 twitter_collector.py 中
def search_tweets(self, keyword: str, max_results: int = 100):
    query = f"{keyword} lang:zh -is:retweet"
    response = self.client.search_recent_tweets(
        query=query,
        max_results=max_results,
        tweet_fields=["created_at", "public_metrics"],
        expansions=["author_id"],
        user_fields=["username"]
    )
    # ... 处理结果
```

## 微博爬虫

### 使用方法

```python
import asyncio
from weibo_collector import WeiboCollector

async def main():
    # 初始化
    collector = WeiboCollector(
        username="your_phone_number",
        password="your_password"
    )
    
    # 启动浏览器
    await collector.start()
    
    # 登录
    await collector.login()
    
    # 搜索微博
    posts = await collector.search_posts("人工智能", max_results=50)
    
    # 关闭浏览器
    await collector.close()

asyncio.run(main())
```

### 登录流程

1. 访问 https://weibo.com/
2. 点击登录按钮
3. 输入用户名和密码
4. 等待跳转到首页
5. 检查登录状态

### 反爬虫对策

**验证码处理：**
```python
# 检测验证码
if await page.query_selector('.captcha'):
    logger.warning("需要验证码，请手动处理")
    await asyncio.sleep(30)  # 等待手动输入
```

**Cookie持久化：**
```python
# 保存Cookie
cookies = await page.context.cookies()
with open('weibo_cookies.json', 'w') as f:
    json.dump(cookies, f)

# 加载Cookie
with open('weibo_cookies.json', 'r') as f:
    cookies = json.load(f)
await page.context.add_cookies(cookies)
```

**User-Agent轮换：**
```python
user_agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
]
await page.set_extra_http_headers({
    'User-Agent': random.choice(user_agents)
})
```

### 数据提取

微博卡片结构：
```html
<div class="card-wrap">
  <div class="name">作者名</div>
  <div class="txt">内容</div>
  <div class="from">
    <time title="2024-01-01 12:00:00"></time>
  </div>
  <div class="card-act">
    <span class="woo-like-count">123</span>
  </div>
</div>
```

## 知乎爬虫

### 使用方法

```python
import asyncio
from zhihu_collector import ZhihuCollector

async def main():
    # 初始化
    collector = ZhihuCollector(
        username="your_phone_number",
        password="your_password"
    )
    
    # 启动浏览器
    await collector.start()
    
    # 登录
    await collector.login()
    
    # 搜索内容
    contents = await collector.search_content("人工智能", max_results=50)
    
    # 获取问题答案
    answers = await collector.get_question_answers("123456", max_results=20)
    
    # 关闭浏览器
    await collector.close()

asyncio.run(main())
```

### 登录流程

1. 访问 https://www.zhihu.com/signin
2. 切换到密码登录
3. 输入手机号和密码
4. 点击登录按钮
5. 等待跳转

### 数据提取

知乎搜索结果结构：
```html
<div class="List-item">
  <h2 class="ContentItem-title">
    <a href="/question/123456">标题</a>
  </h2>
  <div class="AuthorInfo-name">作者</div>
  <div class="RichContent-inner">内容摘要</div>
  <button class="VoteButton">123</button>
</div>
```

## 模拟数据生成器

### 使用方法

```python
from mock_data_generator import MockDataGenerator

generator = MockDataGenerator()

# 生成Twitter数据
twitter_posts = generator.generate_twitter_posts("AI", count=10)

# 生成微博数据
weibo_posts = generator.generate_weibo_posts("人工智能", count=10)

# 生成知乎数据
zhihu_posts = generator.generate_zhihu_posts("机器学习", count=10)

# 生成所有平台数据
all_data = generator.generate_all_platforms("AI", count_per_platform=15)
```

### 自定义模板

```python
# 在 MockDataGenerator 类中添加新模板
self.custom_templates = [
    "{keyword}的应用场景非常广泛。",
    "我对{keyword}的看法是...",
]

# 使用自定义模板
content = random.choice(self.custom_templates).format(keyword=keyword)
```

## 如何添加新平台

### 步骤1：创建采集器类

```python
# server/collectors/new_platform_collector.py

import asyncio
from typing import List, Dict
from playwright.async_api import async_playwright

class NewPlatformCollector:
    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.browser = None
        self.page = None
    
    async def start(self):
        """启动浏览器"""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=True)
        self.page = await self.browser.new_page()
    
    async def login(self) -> bool:
        """登录平台"""
        # 实现登录逻辑
        pass
    
    async def search_posts(self, keyword: str, max_results: int) -> List[Dict]:
        """搜索内容"""
        posts = []
        
        # 1. 访问搜索页面
        # 2. 提取数据
        # 3. 格式化为统一格式
        
        return posts
    
    async def close(self):
        """关闭浏览器"""
        if self.browser:
            await self.browser.close()
```

### 步骤2：添加到统一采集脚本

```python
# 在 run_collector.py 中添加

from new_platform_collector import NewPlatformCollector

async def collect_from_platform(platform, keyword, max_results, task_id, db):
    if platform == "newplatform":
        username = os.getenv("NEWPLATFORM_USERNAME")
        password = os.getenv("NEWPLATFORM_PASSWORD")
        
        collector = NewPlatformCollector(username, password)
        await collector.start()
        await collector.login()
        posts = await collector.search_posts(keyword, max_results)
        await collector.close()
```

### 步骤3：更新数据库Schema

```typescript
// 在 server/db.ts 中添加平台支持
export const platformEnum = ["twitter", "weibo", "zhihu", "newplatform"] as const;
```

### 步骤4：更新前端UI

```typescript
// 在 client/src/pages/CreateTask.tsx 中添加选项
const platformOptions = [
  { value: "twitter", label: "Twitter" },
  { value: "weibo", label: "微博" },
  { value: "zhihu", label: "知乎" },
  { value: "newplatform", label: "新平台" },
];
```

## 🔧 调试技巧

### 查看浏览器操作

```python
# 关闭headless模式
self.browser = await playwright.chromium.launch(
    headless=False,  # 显示浏览器窗口
    slow_mo=1000     # 每步操作延迟1秒
)
```

### 截图调试

```python
# 在关键步骤截图
await page.screenshot(path="debug_login.png")
```

### 打印HTML结构

```python
# 查看页面HTML
html = await page.content()
print(html)

# 查看特定元素
element = await page.query_selector('.some-class')
html = await element.inner_html()
print(html)
```

### 日志记录

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.debug("调试信息")
logger.info("普通信息")
logger.warning("警告信息")
logger.error("错误信息")
```

## 🚀 性能优化

### 并发采集

```python
import asyncio

async def collect_all_platforms(keyword, max_results):
    tasks = [
        collect_twitter(keyword, max_results),
        collect_weibo(keyword, max_results),
        collect_zhihu(keyword, max_results),
    ]
    results = await asyncio.gather(*tasks)
    return results
```

### 连接池

```python
# 复用浏览器实例
class CollectorPool:
    def __init__(self, size=3):
        self.browsers = []
        self.size = size
    
    async def init(self):
        playwright = await async_playwright().start()
        for _ in range(self.size):
            browser = await playwright.chromium.launch()
            self.browsers.append(browser)
```

### 增量采集

```python
def get_last_collected_id(task_id, platform):
    """获取上次采集的最后一条ID"""
    with db.cursor() as cursor:
        cursor.execute(
            "SELECT platformId FROM comments "
            "WHERE taskId = %s AND platform = %s "
            "ORDER BY collectedAt DESC LIMIT 1",
            (task_id, platform)
        )
        result = cursor.fetchone()
        return result['platformId'] if result else None

# 只采集新数据
last_id = get_last_collected_id(task_id, platform)
new_posts = [p for p in posts if p['platformId'] > last_id]
```

## 📝 最佳实践

1. **错误处理**：所有网络请求都应有try-except
2. **超时设置**：避免无限等待
3. **重试机制**：临时失败应自动重试
4. **日志记录**：记录关键操作和错误
5. **数据验证**：确保数据格式正确
6. **去重处理**：避免重复采集
7. **速率限制**：避免被封禁
8. **Cookie管理**：保持登录状态

## 🔐 安全注意事项

1. **不要硬编码密码**：使用环境变量
2. **不要提交Cookie**：添加到.gitignore
3. **使用小号测试**：避免主账号被封
4. **遵守robots.txt**：尊重网站规则
5. **控制采集频率**：避免过度请求

---

**更新时间：** 2025-11-22  
**维护者：** 舆情洞察家团队
