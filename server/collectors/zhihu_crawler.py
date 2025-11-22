"""
Zhihu web scraper using Playwright
Collects questions, answers, and comments from Zhihu using browser automation
"""

import asyncio
import logging
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Page, Browser
import time
from datetime import datetime
from urllib.parse import urlencode
import re
import json

logger = logging.getLogger(__name__)

class ZhihuCrawler:
    def __init__(self, username: str, password: str, headless: bool = True):
        """
        Initialize Zhihu crawler
        
        Args:
            username: Zhihu account username/phone/email
            password: Zhihu account password
            headless: Run browser in headless mode
        """
        self.username = username
        self.password = password
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.base_url = "https://www.zhihu.com"
        logger.info("ZhihuCrawler initialized")

    async def login(self) -> bool:
        """
        Login to Zhihu account
        
        Returns:
            True if login successful, False otherwise
        """
        try:
            # Navigate to login page
            await self.page.goto(f"{self.base_url}/signin", wait_until="networkidle")
            
            # Wait for login form
            await self.page.wait_for_selector("input[placeholder*='邮箱']", timeout=10000)
            
            # Fill in credentials
            username_input = await self.page.query_selector("input[placeholder*='邮箱']")
            if username_input:
                await username_input.fill(self.username)
            
            password_input = await self.page.query_selector("input[type='password']")
            if password_input:
                await password_input.fill(self.password)
            
            # Click login button
            login_button = await self.page.query_selector("button[type='submit']")
            if login_button:
                await login_button.click()
            
            # Wait for redirect after login
            await self.page.wait_for_url(f"{self.base_url}/**", timeout=15000)
            
            logger.info("Successfully logged in to Zhihu")
            return True
            
        except Exception as e:
            logger.error(f"Login failed: {str(e)}")
            return False

    async def search_questions(
        self,
        keyword: str,
        max_results: int = 50,
        sort: str = "relevance"
    ) -> List[Dict]:
        """
        Search for questions on Zhihu
        
        Args:
            keyword: Search keyword
            max_results: Maximum number of questions to collect
            sort: Sort order ("relevance", "newest", "most_viewed")
            
        Returns:
            List of question dictionaries with answers
        """
        try:
            # Build search URL
            params = {
                "q": keyword,
                "t": "question"
            }
            search_url = f"{self.base_url}/search?{urlencode(params)}"
            
            await self.page.goto(search_url, wait_until="networkidle")
            
            questions = []
            page_num = 1
            
            while len(questions) < max_results and page_num <= 5:
                # Wait for questions to load
                await self.page.wait_for_selector(".SearchResult-item", timeout=10000)
                
                # Extract questions from current page
                question_elements = await self.page.query_selector_all(".SearchResult-item")
                
                for element in question_elements:
                    if len(questions) >= max_results:
                        break
                    
                    try:
                        question_data = await self._extract_question_data(element)
                        if question_data:
                            questions.append(question_data)
                    except Exception as e:
                        logger.warning(f"Error extracting question: {str(e)}")
                        continue
                
                # Go to next page
                if len(questions) < max_results:
                    next_button = await self.page.query_selector("a[rel='next']")
                    if next_button:
                        await next_button.click()
                        await self.page.wait_for_load_state("networkidle")
                        page_num += 1
                    else:
                        break
            
            logger.info(f"Collected {len(questions)} questions for keyword: {keyword}")
            return questions[:max_results]
            
        except Exception as e:
            logger.error(f"Error searching questions: {str(e)}")
            return []

    async def get_question_answers(
        self,
        question_url: str,
        max_answers: int = 10
    ) -> List[Dict]:
        """
        Get answers and comments for a specific question
        
        Args:
            question_url: URL of the question
            max_answers: Maximum number of answers to collect
            
        Returns:
            List of answer dictionaries with comments
        """
        try:
            await self.page.goto(question_url, wait_until="networkidle")
            
            answers = []
            
            # Scroll to load more answers
            for _ in range(max_answers // 5):
                await self.page.evaluate("window.scrollBy(0, window.innerHeight)")
                await asyncio.sleep(1)
                
                answer_elements = await self.page.query_selector_all(".Answer")
                
                for element in answer_elements:
                    if len(answers) >= max_answers:
                        break
                    
                    try:
                        answer_data = await self._extract_answer_data(element)
                        if answer_data:
                            answers.append(answer_data)
                    except Exception as e:
                        logger.warning(f"Error extracting answer: {str(e)}")
                        continue
            
            logger.info(f"Collected {len(answers)} answers from question")
            return answers[:max_answers]
            
        except Exception as e:
            logger.error(f"Error getting question answers: {str(e)}")
            return []

    async def _extract_question_data(self, element) -> Optional[Dict]:
        """
        Extract question data from a search result element
        
        Args:
            element: Playwright element handle
            
        Returns:
            Question dictionary or None if extraction fails
        """
        try:
            # Extract question title and URL
            title_elem = await element.query_selector("a.SearchResult-item-title")
            if not title_elem:
                return None
            
            title = await title_elem.text_content()
            url = await title_elem.get_attribute("href")
            
            # Extract question ID from URL
            question_id = url.split("/")[-1] if url else None
            
            # Extract description/excerpt
            excerpt_elem = await element.query_selector(".SearchResult-item-excerpt")
            excerpt = await excerpt_elem.text_content() if excerpt_elem else ""
            
            # Extract metadata
            meta_elem = await element.query_selector(".SearchResult-item-meta")
            meta_text = await meta_elem.text_content() if meta_elem else ""
            
            # Extract answer count
            answer_count = 0
            if "个回答" in meta_text:
                match = re.search(r"(\d+)个回答", meta_text)
                if match:
                    answer_count = int(match.group(1))
            
            question_data = {
                "platformId": f"zhihu_q_{question_id}",
                "platform": "zhihu",
                "title": title.strip(),
                "content": excerpt.strip(),
                "url": f"{self.base_url}{url}" if url else None,
                "answerCount": answer_count,
                "type": "question",
            }
            
            return question_data
            
        except Exception as e:
            logger.warning(f"Error extracting question data: {str(e)}")
            return None

    async def _extract_answer_data(self, element) -> Optional[Dict]:
        """
        Extract answer data from an answer element
        
        Args:
            element: Playwright element handle
            
        Returns:
            Answer dictionary or None if extraction fails
        """
        try:
            # Extract author
            author_elem = await element.query_selector(".AuthorInfo-name")
            author = await author_elem.text_content() if author_elem else "unknown"
            
            # Extract answer content
            content_elem = await element.query_selector(".RichContent-inner")
            content = await content_elem.text_content() if content_elem else ""
            
            # Extract timestamp
            time_elem = await element.query_selector(".ContentItem-time")
            time_text = await time_elem.text_content() if time_elem else ""
            
            # Extract engagement metrics
            likes = await self._extract_metric(element, ".VoteButton--up")
            comments = await self._extract_metric(element, ".Comments-count")
            
            # Extract answer ID
            answer_id_elem = await element.query_selector("a[href*='/answer/']")
            answer_id = None
            if answer_id_elem:
                href = await answer_id_elem.get_attribute("href")
                answer_id = href.split("/")[-1] if href else None
            
            answer_data = {
                "platformId": f"zhihu_a_{answer_id}",
                "platform": "zhihu",
                "author": author.strip(),
                "authorId": f"zhihu_{author.strip()}",
                "content": content.strip(),
                "likes": likes,
                "replies": comments,
                "shares": 0,
                "publishedAt": time_text,
                "type": "answer",
            }
            
            return answer_data
            
        except Exception as e:
            logger.warning(f"Error extracting answer data: {str(e)}")
            return None

    async def _extract_metric(self, element, selector: str) -> int:
        """Extract numeric metric from element"""
        try:
            metric_elem = await element.query_selector(selector)
            if metric_elem:
                text = await metric_elem.text_content()
                # Extract number from text
                match = re.search(r"(\d+\.?\d*)", text)
                if match:
                    num = float(match.group(1))
                    if "万" in text:
                        num *= 10000
                    return int(num)
            return 0
        except Exception:
            return 0

    async def get_user_answers(
        self,
        user_url: str,
        max_results: int = 50
    ) -> List[Dict]:
        """
        Get answers from a specific user
        
        Args:
            user_url: Zhihu user profile URL
            max_results: Maximum number of answers
            
        Returns:
            List of answer dictionaries
        """
        try:
            await self.page.goto(user_url, wait_until="networkidle")
            
            answers = []
            
            # Scroll to load more answers
            for _ in range(max_results // 10):
                await self.page.evaluate("window.scrollBy(0, window.innerHeight)")
                await asyncio.sleep(1)
                
                answer_elements = await self.page.query_selector_all(".Answer")
                
                for element in answer_elements:
                    if len(answers) >= max_results:
                        break
                    
                    try:
                        answer_data = await self._extract_answer_data(element)
                        if answer_data:
                            answers.append(answer_data)
                    except Exception as e:
                        logger.warning(f"Error extracting answer: {str(e)}")
                        continue
            
            logger.info(f"Collected {len(answers)} answers from user")
            return answers[:max_results]
            
        except Exception as e:
            logger.error(f"Error getting user answers: {str(e)}")
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
    username = "your_zhihu_email"
    password = "your_zhihu_password"
    
    async with ZhihuCrawler(username, password) as crawler:
        if await crawler.login():
            questions = await crawler.search_questions("Python", max_results=5)
            for question in questions:
                print(f"Q: {question['title']}")
                answers = await crawler.get_question_answers(question['url'], max_answers=3)
                for answer in answers:
                    print(f"  A by @{answer['author']}: {answer['content'][:100]}")


if __name__ == "__main__":
    asyncio.run(main())
