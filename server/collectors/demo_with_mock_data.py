"""
Demo script using mock data to showcase the complete system workflow
"""

import sys
import os
import argparse
import logging
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pymysql
from dotenv import load_dotenv
import requests

from mock_data_generator import MockDataGenerator

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseManager:
    """数据库管理器"""
    
    def __init__(self, db_url: str):
        """初始化数据库连接"""
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
    
    def insert_comment(self, task_id: int, comment_data: dict) -> int:
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
            # 查询已存在的ID
            with self.connection.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM comments WHERE platformId = %s",
                    (comment_data.get('platformId'),)
                )
                result = cursor.fetchone()
                return result['id'] if result else None
        except Exception as e:
            logger.error(f"Error inserting comment: {e}")
            self.connection.rollback()
            return None
    
    def insert_sentiment_analysis(self, comment_id: int, sentiment_data: dict) -> bool:
        """插入情感分析结果"""
        try:
            with self.connection.cursor() as cursor:
                sql = """
                INSERT INTO sentiment_analysis (
                    commentId, sentiment, score, confidence, keywords, analyzedAt
                ) VALUES (%s, %s, %s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE
                    sentiment = VALUES(sentiment),
                    score = VALUES(score),
                    confidence = VALUES(confidence),
                    keywords = VALUES(keywords)
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
                        total_collected: int, new_comments: int):
        """更新爬虫任务状态"""
        try:
            with self.connection.cursor() as cursor:
                sql = """
                INSERT INTO crawl_jobs (
                    taskId, platform, totalCollected, newComments, status,
                    startedAt, completedAt, createdAt
                ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW(), NOW())
                """
                cursor.execute(sql, (task_id, platform, total_collected, new_comments, status))
                self.connection.commit()
        except Exception as e:
            logger.error(f"Error updating crawl job: {e}")
    
    def close(self):
        """关闭数据库连接"""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")


def main():
    parser = argparse.ArgumentParser(description="Demo with mock data")
    parser.add_argument("--task-id", type=int, required=True, help="Monitoring task ID")
    parser.add_argument("--keyword", type=str, required=True, help="Search keyword")
    parser.add_argument("--count", type=int, default=15, help="Number of posts per platform")
    parser.add_argument("--skip-nlp", action="store_true", help="Skip NLP analysis")
    
    args = parser.parse_args()
    
    # 连接数据库
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL not set")
        return
    
    db = DatabaseManager(db_url)
    
    # 生成模拟数据
    generator = MockDataGenerator()
    all_data = generator.generate_all_platforms(args.keyword, args.count)
    
    # NLP服务URL
    nlp_url = None if args.skip_nlp else os.getenv("NLP_SERVICE_URL", "http://localhost:8000")
    
    results = []
    
    for platform, posts in all_data.items():
        logger.info(f"Processing {len(posts)} posts from {platform}")
        
        collected_count = len(posts)
        new_comments = 0
        
        for post in posts:
            comment_id = db.insert_comment(args.task_id, post)
            if comment_id:
                new_comments += 1
                
                # 情感分析
                if nlp_url:
                    try:
                        response = requests.post(
                            f"{nlp_url}/sentiment",
                            json={"text": post['content']},
                            timeout=5
                        )
                        if response.status_code == 200:
                            sentiment_data = response.json()
                            db.insert_sentiment_analysis(comment_id, sentiment_data)
                            logger.info(f"Analyzed: {sentiment_data['sentiment']} ({sentiment_data['score']:.2f})")
                    except Exception as e:
                        logger.warning(f"NLP analysis failed: {e}")
        
        # 更新任务状态
        db.update_crawl_job(args.task_id, platform, 'completed', collected_count, new_comments)
        
        results.append({
            "platform": platform,
            "collected": collected_count,
            "new": new_comments
        })
        
        logger.info(f"Completed {platform}: {collected_count} collected, {new_comments} new")
    
    # 输出结果
    print(json.dumps({
        "task_id": args.task_id,
        "keyword": args.keyword,
        "mode": "mock_data_demo",
        "results": results
    }, ensure_ascii=False, indent=2))
    
    db.close()


if __name__ == "__main__":
    main()
