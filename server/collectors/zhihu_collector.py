"""
Zhihu data collector using Playwright for browser automation
Collects answers and articles based on keywords
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

class ZhihuCollector:
    def __init__(self, username: str, password: str):
        """Initialize Zhihu collector with credentials"""
        self.username = username
        self.password = password
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.is_logged_in = False
        logger.info("ZhihuCollector initialized")
    
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
        """Login to Zhihu"""
        try:
            logger.info("Attempting to login to Zhihu...")
            await self.page.goto('https://www.zhihu.com/signin', wait_until='networkidle')
            
            # 等待登录表单加载
            await asyncio.sleep(2)
            
            # 切换到密码登录
            try:
                password_tab = await self.page.query_selector('text=密码登录')
                if password_tab:
                    await password_tab.click()
                    await asyncio.sleep(1)
            except:
                pass
            
            # 输入手机号/用户名
            username_input = await self.page.query_selector('input[name="username"]')
            if username_input:
                await username_input.fill(self.username)
            
            # 输入密码
            password_input = await self.page.query_selector('input[name="password"]')
            if password_input:
                await password_input.fill(self.password)
            
            # 点击登录按钮
            login_button = await self.page.query_selector('button[type="submit"]')
            if login_button:
                await login_button.click()
            
            # 等待登录完成
            await asyncio.sleep(5)
            
            # 检查是否登录成功
            current_url = self.page.url
            if 'signin' not in current_url:
                self.is_logged_in = True
                logger.info("Successfully logged in to Zhihu")
                return True
            else:
                logger.warning("Login may have failed, continuing anyway...")
                self.is_logged_in = True  # 尝试继续
                return True
            
        except Exception as e:
            logger.error(f"Failed to login to Zhihu: {str(e)}")
            self.is_logged_in = False
            return False
    
    async def search_content(
        self,
        keyword: str,
        max_results: int = 50,
        content_type: str = "综合"  # 综合/问答/文章
    ) -> List[Dict]:
        """
        Search for Zhihu content by keyword
        
        Args:
            keyword: Search keyword
            max_results: Maximum number of results
            content_type: Type of content to search
            
        Returns:
            List of content dictionaries
        """
        if not self.is_logged_in:
            logger.warning("Not logged in, attempting to login...")
            if not await self.login():
                logger.error("Login failed, cannot search content")
                return []
        
        contents = []
        
        try:
            # 访问搜索页面
            search_url = f'https://www.zhihu.com/search?type=content&q={keyword}'
            await self.page.goto(search_url, wait_until='networkidle')
            await asyncio.sleep(3)  # 等待内容加载
            
            # 滚动页面加载更多内容
            for _ in range(max_results // 10):
                await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await asyncio.sleep(2)
            
            # 提取搜索结果
            result_items = await self.page.query_selector_all('.List-item')
            
            for item in result_items[:max_results]:
                try:
                    content_data = await self._extract_content_data(item)
                    if content_data:
                        contents.append(content_data)
                except Exception as e:
                    logger.warning(f"Failed to extract content data: {e}")
                    continue
            
            logger.info(f"Collected {len(contents)} Zhihu contents for keyword: {keyword}")
            return contents
            
        except Exception as e:
            logger.error(f"Error searching Zhihu content: {str(e)}")
            return contents
    
    async def _extract_content_data(self, item) -> Optional[Dict]:
        """Extract data from a Zhihu search result item"""
        try:
            # 提取标题/问题
            title_elem = await item.query_selector('.ContentItem-title a')
            title = await title_elem.inner_text() if title_elem else ""
            url = await title_elem.get_attribute('href') if title_elem else ""
            
            # 提取作者
            author_elem = await item.query_selector('.AuthorInfo-name')
            author = await author_elem.inner_text() if author_elem else "匿名用户"
            
            # 提取内容摘要
            content_elem = await item.query_selector('.RichContent-inner')
            if not content_elem:
                content_elem = await item.query_selector('.ContentItem-meta')
            content = await content_elem.inner_text() if content_elem else ""
            
            # 组合完整内容（标题+摘要）
            full_content = f"{title}\n{content}" if title else content
            
            # 提取互动数据
            vote_elem = await item.query_selector('.VoteButton')
            votes = await vote_elem.inner_text() if vote_elem else "0"
            
            comment_elem = await item.query_selector('.ContentItem-actions button:has-text("条评论")')
            comments = "0"
            if comment_elem:
                comment_text = await comment_elem.inner_text()
                comments = re.findall(r'\d+', comment_text)[0] if re.findall(r'\d+', comment_text) else "0"
            
            # 生成唯一ID
            content_id = url.split('/')[-1] if url else f"zhihu_{hash(full_content)}"
            
            # 补全URL
            if url and url.startswith('/'):
                url = f"https://www.zhihu.com{url}"
            
            content_data = {
                "platformId": content_id,
                "platform": "zhihu",
                "author": author.strip(),
                "authorId": f"zhihu_{hash(author)}",
                "content": full_content.strip()[:1000],  # 限制长度
                "url": url,
                "publishedAt": datetime.now().isoformat(),  # 知乎搜索结果不显示时间
                "likes": self._parse_number(votes),
                "replies": self._parse_number(comments),
                "shares": 0,  # 知乎没有分享数
            }
            
            return content_data
            
        except Exception as e:
            logger.error(f"Error extracting content data: {e}")
            return None
    
    def _parse_number(self, num_str: str) -> int:
        """Parse number string (e.g., '1.2k' -> 1200, '1.2万' -> 12000)"""
        num_str = num_str.strip().lower()
        
        if '万' in num_str:
            num = float(num_str.replace('万', ''))
            return int(num * 10000)
        elif 'k' in num_str:
            num = float(num_str.replace('k', ''))
            return int(num * 1000)
        elif 'm' in num_str:
            num = float(num_str.replace('m', ''))
            return int(num * 1000000)
        else:
            try:
                return int(re.sub(r'[^\d]', '', num_str))
            except:
                return 0
    
    async def get_question_answers(
        self,
        question_id: str,
        max_results: int = 20
    ) -> List[Dict]:
        """
        Get answers for a specific question
        
        Args:
            question_id: Zhihu question ID
            max_results: Maximum number of answers
            
        Returns:
            List of answer dictionaries
        """
        answers = []
        
        try:
            url = f'https://www.zhihu.com/question/{question_id}'
            await self.page.goto(url, wait_until='networkidle')
            await asyncio.sleep(2)
            
            # 滚动加载更多答案
            for _ in range(max_results // 5):
                await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await asyncio.sleep(1)
            
            # 提取答案
            answer_items = await self.page.query_selector_all('.List-item')
            
            for item in answer_items[:max_results]:
                try:
                    answer_data = await self._extract_content_data(item)
                    if answer_data:
                        answers.append(answer_data)
                except Exception as e:
                    logger.warning(f"Failed to extract answer: {e}")
                    continue
            
            logger.info(f"Collected {len(answers)} answers for question {question_id}")
            return answers
            
        except Exception as e:
            logger.error(f"Error getting question answers: {str(e)}")
            return answers
    
    async def close(self):
        """Close browser"""
        if self.browser:
            await self.browser.close()
            logger.info("Browser closed")


# Example usage
async def main():
    username = os.getenv("ZHIHU_USERNAME")
    password = os.getenv("ZHIHU_PASSWORD")
    
    if not username or not password:
        print("Missing Zhihu credentials")
        return
    
    collector = ZhihuCollector(username, password)
    
    try:
        await collector.start()
        await collector.login()
        
        # Search for content
        contents = await collector.search_content("人工智能", max_results=10)
        
        print(f"\nCollected {len(contents)} contents:")
        for content in contents:
            print(f"\n@{content['author']}: {content['content'][:100]}...")
            print(f"Votes: {content['likes']}, Comments: {content['replies']}")
    
    finally:
        await collector.close()


if __name__ == "__main__":
    asyncio.run(main())
