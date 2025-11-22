"""
Unified collector script for all platforms (Twitter, Weibo, Zhihu)
Supports command-line arguments and database storage
"""

import sys
import os
import argparse
import logging
import json
import asyncio
from typing import Dict, List, Optional
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pymysql
from dotenv import load_dotenv

# Import collectors
from twitter_collector import TwitterCollector
from weibo_collector import WeiboCollector
from zhihu_collector import ZhihuCollector

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseManager:
    """数据库管理器"""
    
    def __init__(self, db_url: str):
        """初始化数据库连接"""
        # 解析DATABASE_URL
        # 格式: mysql://username:password@host:port/database
        import re
        match = re.match(r'mysql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', db_url)
        if not match:
            raise ValueError("Invalid DATABASE_URL format")
        
        user, password, host, port, database = match.groups()
        
        self.connection = pymysql.connect(
            host=host,
            port=int(port),
            user=user,
            password=password,
            database=database,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        logger.info("Database connected successfully")
    
    def insert_comment(self, task_id: int, comment_data: Dict) -> Optional[int]:
        """插入评论数据"""
        try:
            with self.connection.cursor() as cursor:
                sql = """
                INSERT INTO comments (
                    taskId, platform, platformId, author, authorId,
                    content, url, publishedAt, likes, replies, shares, collectedAt
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """
                cursor.execute(sql, (
                    task_id,
                    comment_data.get('platform'),
                    comment_data.get('platformId'),
                    comment_data.get('author'),
                    comment_data.get('authorId'),
                    comment_data.get('content'),
                    comment_data.get('url'),
                    comment_data.get('publishedAt'),
                    comment_data.get('likes', 0),
                    comment_data.get('replies', 0),
                    comment_data.get('shares', 0)
                ))
                self.connection.commit()
                return cursor.lastrowid
        except pymysql.IntegrityError:
            logger.debug(f"Duplicate comment: {comment_data.get('platformId')}")
            return None
        except Exception as e:
            logger.error(f"Error inserting comment: {e}")
            self.connection.rollback()
            return None
    
    def insert_sentiment_analysis(self, comment_id: int, sentiment_data: Dict) -> bool:
        """插入情感分析结果"""
        try:
            with self.connection.cursor() as cursor:
                sql = """
                INSERT INTO sentiment_analysis (
                    commentId, sentiment, score, confidence, keywords, analyzedAt
                ) VALUES (%s, %s, %s, %s, %s, NOW())
                """
                keywords_json = json.dumps(sentiment_data.get('keywords', []), ensure_ascii=False)
                cursor.execute(sql, (
                    comment_id,
                    sentiment_data.get('sentiment'),
                    sentiment_data.get('score'),
                    sentiment_data.get('confidence'),
                    keywords_json
                ))
                self.connection.commit()
                return True
        except Exception as e:
            logger.error(f"Error inserting sentiment analysis: {e}")
            self.connection.rollback()
            return False
    
    def update_crawl_job(self, task_id: int, platform: str, status: str, 
                        total_collected: int, new_comments: int, error_msg: str = None):
        """更新爬虫任务状态"""
        try:
            with self.connection.cursor() as cursor:
                # 查找或创建crawl job
                sql_check = """
                SELECT id FROM crawl_jobs 
                WHERE taskId = %s AND platform = %s AND status = 'running'
                ORDER BY id DESC LIMIT 1
                """
                cursor.execute(sql_check, (task_id, platform))
                result = cursor.fetchone()
                
                if result:
                    # 更新现有记录
                    sql_update = """
                    UPDATE crawl_jobs 
                    SET totalCollected = %s, newComments = %s, status = %s,
                        errorMessage = %s, completedAt = NOW()
                    WHERE id = %s
                    """
                    cursor.execute(sql_update, (
                        total_collected, new_comments, status, error_msg, result['id']
                    ))
                else:
                    # 创建新记录
                    sql_insert = """
                    INSERT INTO crawl_jobs (
                        taskId, platform, totalCollected, newComments, status,
                        errorMessage, startedAt, completedAt, createdAt
                    ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW(), NOW())
                    """
                    cursor.execute(sql_insert, (
                        task_id, platform, total_collected, new_comments, status, error_msg
                    ))
                
                self.connection.commit()
        except Exception as e:
            logger.error(f"Error updating crawl job: {e}")
    
    def close(self):
        """关闭数据库连接"""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")


async def collect_from_platform(
    platform: str,
    keyword: str,
    max_results: int,
    task_id: int,
    db: DatabaseManager,
    nlp_url: str = None
) -> Dict:
    """从指定平台采集数据"""
    
    logger.info(f"Starting collection from {platform} for keyword: {keyword}")
    
    collected_count = 0
    new_comments = 0
    error_msg = None
    
    try:
        if platform == "twitter":
            # Twitter采集
            api_key = os.getenv("TWITTER_API_KEY")
            api_secret = os.getenv("TWITTER_API_SECRET")
            access_token = os.getenv("TWITTER_ACCESS_TOKEN")
            access_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
            
            collector = TwitterCollector(api_key, api_secret, access_token, access_secret)
            posts = collector.search_tweets(keyword, max_results)
            collected_count = len(posts)
            
        elif platform == "weibo":
            # 微博采集
            username = os.getenv("WEIBO_USERNAME")
            password = os.getenv("WEIBO_PASSWORD")
            
            collector = WeiboCollector(username, password)
            await collector.start()
            await collector.login()
            posts = await collector.search_posts(keyword, max_results)
            await collector.close()
            collected_count = len(posts)
            
        elif platform == "zhihu":
            # 知乎采集
            username = os.getenv("ZHIHU_USERNAME")
            password = os.getenv("ZHIHU_PASSWORD")
            
            collector = ZhihuCollector(username, password)
            await collector.start()
            await collector.login()
            posts = await collector.search_content(keyword, max_results)
            await collector.close()
            collected_count = len(posts)
            
        else:
            raise ValueError(f"Unknown platform: {platform}")
        
        # 存储到数据库
        for post in posts:
            comment_id = db.insert_comment(task_id, post)
            if comment_id:
                new_comments += 1
                
                # 如果提供了NLP服务URL，进行情感分析
                if nlp_url:
                    try:
                        import requests
                        response = requests.post(
                            f"{nlp_url}/sentiment",
                            json={"text": post['content']},
                            timeout=5
                        )
                        if response.status_code == 200:
                            sentiment_data = response.json()
                            db.insert_sentiment_analysis(comment_id, sentiment_data)
                    except Exception as e:
                        logger.warning(f"NLP analysis failed: {e}")
        
        # 更新任务状态
        db.update_crawl_job(task_id, platform, 'completed', collected_count, new_comments)
        
        logger.info(f"Completed {platform} collection: {collected_count} collected, {new_comments} new")
        
        return {
            "success": True,
            "platform": platform,
            "collected": collected_count,
            "new": new_comments
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error collecting from {platform}: {error_msg}")
        db.update_crawl_job(task_id, platform, 'failed', collected_count, new_comments, error_msg)
        
        return {
            "success": False,
            "platform": platform,
            "error": error_msg
        }


async def main():
    parser = argparse.ArgumentParser(description="Multi-platform data collector")
    parser.add_argument("--task-id", type=int, required=True, help="Monitoring task ID")
    parser.add_argument("--keyword", type=str, required=True, help="Search keyword")
    parser.add_argument("--platforms", type=str, default="twitter,weibo,zhihu", 
                       help="Platforms to collect from (comma-separated)")
    parser.add_argument("--max-results", type=int, default=50, 
                       help="Maximum results per platform")
    parser.add_argument("--skip-nlp", action="store_true", 
                       help="Skip NLP sentiment analysis")
    
    args = parser.parse_args()
    
    # 连接数据库
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL not set")
        return
    
    db = DatabaseManager(db_url)
    
    # NLP服务URL
    nlp_url = None if args.skip_nlp else os.getenv("NLP_SERVICE_URL", "http://localhost:8000")
    
    # 解析平台列表
    platforms = [p.strip() for p in args.platforms.split(',')]
    
    # 并发采集
    results = []
    for platform in platforms:
        result = await collect_from_platform(
            platform, args.keyword, args.max_results, 
            args.task_id, db, nlp_url
        )
        results.append(result)
    
    # 输出结果
    print(json.dumps({
        "task_id": args.task_id,
        "keyword": args.keyword,
        "results": results
    }, ensure_ascii=False, indent=2))
    
    db.close()


if __name__ == "__main__":
    asyncio.run(main())
