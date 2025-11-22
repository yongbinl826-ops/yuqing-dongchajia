"""
Weibo web scraper using Playwright
Collects posts and comments from Weibo using browser automation
"""

import asyncio
import logging
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Page, Browser
import time
from datetime import datetime
from urllib.parse import urlencode
import re

logger = logging.getLogger(__name__)

class WeiboCrawler:
    def __init__(self, username: str, password: str, headless: bool = True):
        """
        Initialize Weibo crawler
        
        Args:
            username: Weibo account username/phone
            password: Weibo account password
            headless: Run browser in headless mode
        """
        self.username = username
        self.password = password
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.base_url = "https://weibo.com"
        logger.info("WeiboCrawler initialized")

    async def login(self) -> bool:
        """
        Login to Weibo account
        
        Returns:
            True if login successful, False otherwise
        """
        try:
            # Navigate to login page
            await self.page.goto(f"{self.base_url}/login.php", wait_until="networkidle")
            
            # Wait for login form
            await self.page.wait_for_selector("input[name='username']", timeout=10000)
            
            # Fill in credentials
            await self.page.fill("input[name='username']", self.username)
            await self.page.fill("input[name='password']", self.password)
            
            # Click login button
            await self.page.click("input[value='登录']")
            
            # Wait for redirect after login
            await self.page.wait_for_url(f"{self.base_url}/**", timeout=15000)
            
            logger.info("Successfully logged in to Weibo")
            return True
            
        except Exception as e:
            logger.error(f"Login failed: {str(e)}")
            return False

    async def search_posts(
        self,
        keyword: str,
        max_results: int = 50,
        sort: str = "hot"
    ) -> List[Dict]:
        """
        Search for posts on Weibo
        
        Args:
            keyword: Search keyword
            max_results: Maximum number of posts to collect
            sort: Sort order ("hot", "time")
            
        Returns:
            List of post dictionaries
        """
        try:
            # Build search URL
            params = {
                "q": keyword,
                "xsort": sort,
                "page": 1
            }
            search_url = f"{self.base_url}/search/realtime?{urlencode(params)}"
            
            await self.page.goto(search_url, wait_until="networkidle")
            
            posts = []
            page_num = 1
            
            while len(posts) < max_results and page_num <= 5:
                # Wait for posts to load
                await self.page.wait_for_selector(".feed-item", timeout=10000)
                
                # Extract posts from current page
                post_elements = await self.page.query_selector_all(".feed-item")
                
                for element in post_elements:
                    if len(posts) >= max_results:
                        break
                    
                    try:
                        post_data = await self._extract_post_data(element)
                        if post_data:
                            posts.append(post_data)
                    except Exception as e:
                        logger.warning(f"Error extracting post: {str(e)}")
                        continue
                
                # Go to next page
                if len(posts) < max_results:
                    next_button = await self.page.query_selector("a.next")
                    if next_button:
                        await next_button.click()
                        await self.page.wait_for_load_state("networkidle")
                        page_num += 1
                    else:
                        break
            
            logger.info(f"Collected {len(posts)} posts for keyword: {keyword}")
            return posts[:max_results]
            
        except Exception as e:
            logger.error(f"Error searching posts: {str(e)}")
            return []

    async def _extract_post_data(self, element) -> Optional[Dict]:
        """
        Extract post data from a post element
        
        Args:
            element: Playwright element handle
            
        Returns:
            Post dictionary or None if extraction fails
        """
        try:
            # Extract post ID
            post_id_elem = await element.query_selector("a[href*='/status/']")
            if not post_id_elem:
                return None
            
            href = await post_id_elem.get_attribute("href")
            post_id = href.split("/")[-1] if href else None
            
            # Extract author
            author_elem = await element.query_selector(".name")
            author = await author_elem.text_content() if author_elem else "unknown"
            
            # Extract content
            content_elem = await element.query_selector(".txt")
            content = await content_elem.text_content() if content_elem else ""
            
            # Extract timestamp
            time_elem = await element.query_selector(".time")
            time_text = await time_elem.text_content() if time_elem else ""
            
            # Extract engagement metrics
            likes = await self._extract_metric(element, ".like_count")
            replies = await self._extract_metric(element, ".reply_count")
            shares = await self._extract_metric(element, ".retweet_count")
            
            post_data = {
                "platformId": f"weibo_{post_id}",
                "platform": "weibo",
                "author": author.strip(),
                "authorId": f"weibo_{author.strip()}",
                "content": content.strip(),
                "url": f"https://weibo.com/status/{post_id}" if post_id else None,
                "publishedAt": time_text,
                "likes": likes,
                "replies": replies,
                "shares": shares,
            }
            
            return post_data
            
        except Exception as e:
            logger.warning(f"Error extracting post data: {str(e)}")
            return None

    async def _extract_metric(self, element, selector: str) -> int:
        """Extract numeric metric from element"""
        try:
            metric_elem = await element.query_selector(selector)
            if metric_elem:
                text = await metric_elem.text_content()
                # Extract number from text like "123万" or "1.2万"
                match = re.search(r"(\d+\.?\d*)", text)
                if match:
                    num = float(match.group(1))
                    if "万" in text:
                        num *= 10000
                    return int(num)
            return 0
        except Exception:
            return 0

    async def get_user_posts(
        self,
        user_id: str,
        max_results: int = 50
    ) -> List[Dict]:
        """
        Get posts from a specific user
        
        Args:
            user_id: Weibo user ID
            max_results: Maximum number of posts
            
        Returns:
            List of post dictionaries
        """
        try:
            user_url = f"{self.base_url}/u/{user_id}"
            await self.page.goto(user_url, wait_until="networkidle")
            
            posts = []
            
            # Scroll to load more posts
            for _ in range(max_results // 10):
                await self.page.evaluate("window.scrollBy(0, window.innerHeight)")
                await asyncio.sleep(1)
                
                post_elements = await self.page.query_selector_all(".feed-item")
                
                for element in post_elements:
                    if len(posts) >= max_results:
                        break
                    
                    try:
                        post_data = await self._extract_post_data(element)
                        if post_data:
                            posts.append(post_data)
                    except Exception as e:
                        logger.warning(f"Error extracting post: {str(e)}")
                        continue
            
            logger.info(f"Collected {len(posts)} posts from user: {user_id}")
            return posts[:max_results]
            
        except Exception as e:
            logger.error(f"Error getting user posts: {str(e)}")
            return []

    async def start(self):
        """Start the browser and initialize page"""
        try:
            playwright = await async_playwright().start()
            self.browser = await playwright.chromium.launch(headless=self.headless)
            self.page = await self.browser.new_page()
            logger.info("Browser started successfully")
        except Exception as e:
            logger.error(f"Error starting browser: {str(e)}")
            raise

    async def close(self):
        """Close the browser"""
        try:
            if self.page:
                await self.page.close()
            if self.browser:
                await self.browser.close()
            logger.info("Browser closed")
        except Exception as e:
            logger.error(f"Error closing browser: {str(e)}")

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


# Example usage
async def main():
    username = "your_weibo_username"
    password = "your_weibo_password"
    
    async with WeiboCrawler(username, password) as crawler:
        if await crawler.login():
            posts = await crawler.search_posts("Python", max_results=10)
            for post in posts:
                print(f"@{post['author']}: {post['content'][:100]}")


if __name__ == "__main__":
    asyncio.run(main())
