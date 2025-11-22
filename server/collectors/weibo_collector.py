"""
Weibo data collector using Playwright for browser automation
Collects weibo posts based on keywords
"""

import asyncio
import logging
from typing import List, Dict, Optional
from datetime import datetime
import re
from playwright.async_api import async_playwright, Page, Browser
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class WeiboCollector:
    def __init__(self, username: str, password: str):
        """Initialize Weibo collector with credentials"""
        self.username = username
        self.password = password
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.is_logged_in = False
        logger.info("WeiboCollector initialized")
    
    async def start(self):
        """Start browser and initialize page"""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        self.page = await self.browser.new_page()
        logger.info("Browser started")
    
    async def login(self) -> bool:
        """Login to Weibo"""
        try:
            logger.info("Attempting to login to Weibo...")
            await self.page.goto('https://weibo.com/', wait_until='networkidle')
            
            # 等待登录按钮出现
            await self.page.wait_for_selector('text=登录', timeout=10000)
            await self.page.click('text=登录')
            
            # 等待登录表单
            await self.page.wait_for_selector('input[name="username"]', timeout=10000)
            
            # 输入用户名和密码
            await self.page.fill('input[name="username"]', self.username)
            await self.page.fill('input[name="password"]', self.password)
            
            # 点击登录按钮
            await self.page.click('button:has-text("登录")')
            
            # 等待登录完成（检查是否跳转到首页）
            await self.page.wait_for_url('**/home**', timeout=30000)
            
            self.is_logged_in = True
            logger.info("Successfully logged in to Weibo")
            return True
            
        except Exception as e:
            logger.error(f"Failed to login to Weibo: {str(e)}")
            self.is_logged_in = False
            return False
    
    async def search_posts(
        self,
        keyword: str,
        max_results: int = 50
    ) -> List[Dict]:
        """
        Search for Weibo posts by keyword
        
        Args:
            keyword: Search keyword
            max_results: Maximum number of results
            
        Returns:
            List of post dictionaries
        """
        if not self.is_logged_in:
            logger.warning("Not logged in, attempting to login...")
            if not await self.login():
                logger.error("Login failed, cannot search posts")
                return []
        
        posts = []
        
        try:
            # 访问搜索页面
            search_url = f'https://s.weibo.com/weibo?q={keyword}'
            await self.page.goto(search_url, wait_until='networkidle')
            await asyncio.sleep(2)  # 等待内容加载
            
            # 滚动页面加载更多内容
            for _ in range(max_results // 10):
                await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await asyncio.sleep(1)
            
            # 提取微博卡片
            cards = await self.page.query_selector_all('.card-wrap')
            
            for card in cards[:max_results]:
                try:
                    post_data = await self._extract_post_data(card)
                    if post_data:
                        posts.append(post_data)
                except Exception as e:
                    logger.warning(f"Failed to extract post data: {e}")
                    continue
            
            logger.info(f"Collected {len(posts)} Weibo posts for keyword: {keyword}")
            return posts
            
        except Exception as e:
            logger.error(f"Error searching Weibo posts: {str(e)}")
            return posts
    
    async def _extract_post_data(self, card) -> Optional[Dict]:
        """Extract data from a Weibo post card"""
        try:
            # 提取作者
            author_elem = await card.query_selector('.name')
            author = await author_elem.inner_text() if author_elem else "unknown"
            
            # 提取内容
            content_elem = await card.query_selector('.txt')
            content = await content_elem.inner_text() if content_elem else ""
            
            # 提取时间
            time_elem = await card.query_selector('.from time')
            time_str = await time_elem.get_attribute('title') if time_elem else None
            
            # 提取互动数据
            likes_elem = await card.query_selector('.card-act .woo-like-count')
            likes = await likes_elem.inner_text() if likes_elem else "0"
            
            comments_elem = await card.query_selector('.card-act .woo-box-flex:has-text("评论")')
            comments = await comments_elem.inner_text() if comments_elem else "0"
            
            shares_elem = await card.query_selector('.card-act .woo-box-flex:has-text("转发")')
            shares = await shares_elem.inner_text() if shares_elem else "0"
            
            # 提取微博ID和URL
            mid_elem = await card.query_selector('[mid]')
            mid = await mid_elem.get_attribute('mid') if mid_elem else None
            
            post_data = {
                "platformId": mid or f"weibo_{hash(content)}",
                "platform": "weibo",
                "author": author.strip(),
                "authorId": f"weibo_{hash(author)}",
                "content": content.strip(),
                "url": f"https://weibo.com/{mid}" if mid else "",
                "publishedAt": self._parse_weibo_time(time_str),
                "likes": self._parse_number(likes),
                "replies": self._parse_number(comments),
                "shares": self._parse_number(shares),
            }
            
            return post_data
            
        except Exception as e:
            logger.error(f"Error extracting post data: {e}")
            return None
    
    def _parse_weibo_time(self, time_str: Optional[str]) -> Optional[str]:
        """Parse Weibo time string to ISO format"""
        if not time_str:
            return datetime.now().isoformat()
        
        try:
            # 尝试解析完整时间格式
            dt = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
            return dt.isoformat()
        except:
            # 如果解析失败，返回当前时间
            return datetime.now().isoformat()
    
    def _parse_number(self, num_str: str) -> int:
        """Parse number string (e.g., '1.2万' -> 12000)"""
        num_str = num_str.strip()
        
        if '万' in num_str:
            num = float(num_str.replace('万', ''))
            return int(num * 10000)
        elif '亿' in num_str:
            num = float(num_str.replace('亿', ''))
            return int(num * 100000000)
        else:
            try:
                return int(re.sub(r'[^\d]', '', num_str))
            except:
                return 0
    
    async def close(self):
        """Close browser"""
        if self.browser:
            await self.browser.close()
            logger.info("Browser closed")


# Example usage
async def main():
    username = os.getenv("WEIBO_USERNAME")
    password = os.getenv("WEIBO_PASSWORD")
    
    if not username or not password:
        print("Missing Weibo credentials")
        return
    
    collector = WeiboCollector(username, password)
    
    try:
        await collector.start()
        await collector.login()
        
        # Search for posts
        posts = await collector.search_posts("人工智能", max_results=10)
        
        print(f"\nCollected {len(posts)} posts:")
        for post in posts:
            print(f"\n@{post['author']}: {post['content'][:100]}...")
            print(f"Likes: {post['likes']}, Comments: {post['replies']}, Shares: {post['shares']}")
    
    finally:
        await collector.close()


if __name__ == "__main__":
    asyncio.run(main())
