#!/usr/bin/env python3
"""
Twitter数据采集脚本
支持命令行参数，连接数据库存储，调用NLP服务进行情感分析
"""

import argparse
import logging
import os
import sys
import json
import requests
import pymysql
from datetime import datetime
from typing import Dict, List, Optional
from dotenv import load_dotenv

# 导入Twitter采集器
from twitter_collector import TwitterCollector

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseManager:
    """数据库管理器"""
    
    def __init__(self, database_url: str):
        """初始化数据库连接"""
        self.database_url = database_url
        self.connection = None
        self._parse_database_url()
        self._connect()
    
    def _parse_database_url(self):
        """解析数据库连接字符串"""
        # 格式: mysql://user:password@host:port/database
        import re
        pattern = r'mysql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)'
        match = re.match(pattern, self.database_url)
        
        if match:
            self.user = match.group(1)
            self.password = match.group(2)
            self.host = match.group(3)
            self.port = int(match.group(4))
            self.database = match.group(5)
        else:
            raise ValueError(f"Invalid database URL format: {self.database_url}")
    
    def _connect(self):
        """连接数据库"""
        try:
            self.connection = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                charset='utf8mb4',
                cursorclass=pymysql.cursors.DictCursor
            )
            logger.info("Database connected successfully")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
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
                    comment_data.get('platform', 'twitter'),
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
            # 重复数据，跳过
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
    
    def update_task_status(self, task_id: int, status: str):
        """更新任务状态"""
        try:
            with self.connection.cursor() as cursor:
                sql = "UPDATE monitoring_tasks SET status = %s, updatedAt = NOW() WHERE id = %s"
                cursor.execute(sql, (status, task_id))
                self.connection.commit()
        except Exception as e:
            logger.error(f"Error updating task status: {e}")
    
    def update_crawl_job_progress(self, task_id: int, progress: Dict):
        """更新爬虫任务进度"""
        try:
            with self.connection.cursor() as cursor:
                # 检查是否存在记录
                sql_check = "SELECT id FROM crawl_jobs WHERE taskId = %s AND status = 'running' ORDER BY id DESC LIMIT 1"
                cursor.execute(sql_check, (task_id,))
                result = cursor.fetchone()
                
                if result:
                    # 更新现有记录
                    sql_update = """
                    UPDATE crawl_jobs 
                    SET totalCollected = %s, newComments = %s, 
                        status = %s
                    WHERE id = %s
                    """
                    cursor.execute(sql_update, (
                        progress.get('collected', 0),
                        progress.get('processed', 0),
                        progress.get('status', 'running'),
                        result['id']
                    ))
                else:
                    # 插入新记录
                    sql_insert = """
                    INSERT INTO crawl_jobs (
                        taskId, platform, totalCollected, newComments,
                        status, startedAt, createdAt
                    ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                    """
                    cursor.execute(sql_insert, (
                        task_id,
                        'twitter',
                        progress.get('collected', 0),
                        progress.get('processed', 0),
                        progress.get('status', 'running')
                    ))
                
                self.connection.commit()
        except Exception as e:
            logger.error(f"Error updating crawl job progress: {e}")
    
    def close(self):
        """关闭数据库连接"""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")


class NLPServiceClient:
    """NLP服务客户端"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
    
    def analyze_sentiment(self, text: str) -> Optional[Dict]:
        """调用情感分析服务"""
        try:
            response = requests.post(
                f"{self.base_url}/sentiment",
                json={"text": text, "language": "zh"},
                timeout=30
            )
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"NLP service error: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error calling NLP service: {e}")
            return None
    
    def extract_keywords(self, text: str, top_k: int = 10) -> Optional[List[Dict]]:
        """调用关键词提取服务"""
        try:
            response = requests.post(
                f"{self.base_url}/keywords",
                json={"text": text, "language": "zh"},
                params={"top_k": top_k},
                timeout=30
            )
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"NLP service error: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error calling NLP service: {e}")
            return None


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='Twitter数据采集脚本')
    parser.add_argument('--task-id', type=int, required=True, help='监控任务ID')
    parser.add_argument('--keyword', type=str, required=True, help='搜索关键词')
    parser.add_argument('--max-results', type=int, default=100, help='最大采集数量')
    parser.add_argument('--skip-nlp', action='store_true', help='跳过NLP分析')
    
    args = parser.parse_args()
    
    # 获取环境变量
    database_url = os.getenv('DATABASE_URL')
    api_key = os.getenv('TWITTER_API_KEY')
    api_secret = os.getenv('TWITTER_API_SECRET')
    access_token = os.getenv('TWITTER_ACCESS_TOKEN')
    access_token_secret = os.getenv('TWITTER_ACCESS_TOKEN_SECRET')
    
    # 验证必需的环境变量
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        sys.exit(1)
    
    if not all([api_key, api_secret, access_token, access_token_secret]):
        logger.error("Twitter API credentials not set")
        sys.exit(1)
    
    # 初始化组件
    db = DatabaseManager(database_url)
    collector = TwitterCollector(api_key, api_secret, access_token, access_token_secret)
    nlp_client = NLPServiceClient() if not args.skip_nlp else None
    
    try:
        # 更新任务状态为运行中
        db.update_task_status(args.task_id, 'running')
        
        logger.info(f"Starting Twitter collection for task {args.task_id}, keyword: {args.keyword}")
        
        # 采集推文
        tweets = collector.search_tweets(args.keyword, max_results=args.max_results)
        
        logger.info(f"Collected {len(tweets)} tweets")
        
        # 更新进度
        db.update_crawl_job_progress(args.task_id, {
            'collected': len(tweets),
            'processed': 0,
            'status': 'processing'
        })
        
        # 处理并存储推文
        processed_count = 0
        for i, tweet in enumerate(tweets):
            try:
                # 插入评论
                comment_id = db.insert_comment(args.task_id, tweet)
                
                if comment_id and nlp_client:
                    # 进行情感分析
                    sentiment_result = nlp_client.analyze_sentiment(tweet['content'])
                    
                    if sentiment_result:
                        # 提取关键词
                        keywords_result = nlp_client.extract_keywords(tweet['content'], top_k=5)
                        keywords = [kw['word'] for kw in keywords_result] if keywords_result else []
                        
                        # 存储情感分析结果
                        sentiment_data = {
                            'sentiment': sentiment_result['sentiment'],
                            'score': sentiment_result['score'],
                            'confidence': sentiment_result['confidence'],
                            'keywords': keywords
                        }
                        db.insert_sentiment_analysis(comment_id, sentiment_data)
                
                processed_count += 1
                
                # 每处理10条更新一次进度
                if (i + 1) % 10 == 0:
                    db.update_crawl_job_progress(args.task_id, {
                        'collected': len(tweets),
                        'processed': processed_count,
                        'status': 'processing'
                    })
                    logger.info(f"Processed {processed_count}/{len(tweets)} tweets")
                
            except Exception as e:
                logger.error(f"Error processing tweet {i}: {e}")
                continue
        
        # 更新最终状态
        db.update_crawl_job_progress(args.task_id, {
            'collected': len(tweets),
            'processed': processed_count,
            'status': 'completed'
        })
        db.update_task_status(args.task_id, 'completed')
        
        logger.info(f"Collection completed: {processed_count} tweets processed")
        
        # 输出结果JSON供Node.js读取
        result = {
            'success': True,
            'task_id': args.task_id,
            'keyword': args.keyword,
            'collected': len(tweets),
            'processed': processed_count,
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(result))
        
    except Exception as e:
        logger.error(f"Collection failed: {e}")
        db.update_task_status(args.task_id, 'failed')
        db.update_crawl_job_progress(args.task_id, {
            'collected': 0,
            'processed': 0,
            'status': 'failed'
        })
        
        result = {
            'success': False,
            'error': str(e),
            'task_id': args.task_id
        }
        print(json.dumps(result))
        sys.exit(1)
    
    finally:
        db.close()


if __name__ == '__main__':
    main()
