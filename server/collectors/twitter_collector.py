"""
Twitter API data collector using tweepy
Collects tweets based on keywords and stores them in the database
"""

import tweepy
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import asyncio
from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger(__name__)

class TwitterCollector:
    def __init__(
        self,
        api_key: str,
        api_secret: str,
        access_token: str,
        access_token_secret: str
    ):
        """Initialize Twitter API client with credentials"""
        self.auth = tweepy.OAuthHandler(api_key, api_secret)
        self.auth.set_access_token(access_token, access_token_secret)
        self.api = tweepy.API(self.auth, wait_on_rate_limit=True)
        self.client = tweepy.Client(
            consumer_key=api_key,
            consumer_secret=api_secret,
            access_token=access_token,
            access_token_secret=access_token_secret,
            wait_on_rate_limit=True
        )
        logger.info("Twitter API client initialized")

    def search_tweets(
        self,
        keyword: str,
        max_results: int = 100,
        lang: str = "zh",
        tweet_fields: Optional[List[str]] = None,
        expansions: Optional[List[str]] = None,
        user_fields: Optional[List[str]] = None,
    ) -> List[Dict]:
        """
        Search for tweets using Free plan compatible method
        
        Note: Free plan doesn't support search_recent_tweets.
        This method collects tweets from predefined users related to the keyword.
        
        Args:
            keyword: Search keyword (used to select relevant users)
            max_results: Maximum number of results to return
            lang: Language code (default: "zh" for Chinese)
            
        Returns:
            List of tweet dictionaries with metadata
        """
        logger.warning("Free plan limitation: Using user timeline instead of keyword search")
        
        # 预定义的相关用户列表（根据关键词选择）
        keyword_users_map = {
            "AI": ["OpenAI", "DeepMind", "AndrewYNg"],
            "人工智能": ["OpenAI", "DeepMind"],
            "Python": ["ThePSF", "realpython"],
            "科技": ["TechCrunch", "TheVerge"],
        }
        
        # 选择相关用户
        usernames = keyword_users_map.get(keyword, ["OpenAI"])  # 默认使用OpenAI
        
        all_tweets = []
        tweets_per_user = max(10, max_results // len(usernames))
        
        for username in usernames:
            try:
                user_tweets = self.search_tweets_by_user(username, tweets_per_user)
                # 过滤包含关键词的推文
                filtered_tweets = [
                    t for t in user_tweets 
                    if keyword.lower() in t['content'].lower()
                ]
                all_tweets.extend(filtered_tweets)
                
                if len(all_tweets) >= max_results:
                    break
            except Exception as e:
                logger.warning(f"Failed to collect from {username}: {e}")
                continue
        
        result = all_tweets[:max_results]
        logger.info(f"Collected {len(result)} tweets for keyword: {keyword} (Free plan mode)")
        return result

    def search_tweets_by_user(
        self,
        username: str,
        max_results: int = 100,
    ) -> List[Dict]:
        """
        Search for tweets from a specific user
        
        Args:
            username: Twitter username
            max_results: Maximum number of results
            
        Returns:
            List of tweet dictionaries
        """
        try:
            user = self.client.get_user(username=username)
            if not user.data:
                logger.warning(f"User {username} not found")
                return []
            
            user_id = user.data.id
            
            response = self.client.get_users_tweets(
                id=user_id,
                max_results=min(max_results, 100),
                tweet_fields=["created_at", "public_metrics"],
            )
            
            tweets = []
            if response.data:
                for tweet in response.data:
                    tweet_data = {
                        "platformId": str(tweet.id),
                        "platform": "twitter",
                        "author": username,
                        "authorId": str(user_id),
                        "content": tweet.text,
                        "url": f"https://twitter.com/i/web/status/{tweet.id}",
                        "publishedAt": tweet.created_at.isoformat() if tweet.created_at else None,
                        "likes": tweet.public_metrics["like_count"] if tweet.public_metrics else 0,
                        "replies": tweet.public_metrics["reply_count"] if tweet.public_metrics else 0,
                        "shares": tweet.public_metrics["retweet_count"] if tweet.public_metrics else 0,
                    }
                    tweets.append(tweet_data)
            
            logger.info(f"Collected {len(tweets)} tweets from user: {username}")
            return tweets
            
        except Exception as e:
            logger.error(f"Error collecting tweets from user {username}: {str(e)}")
            raise

    def get_trending_topics(self, woeid: int = 1) -> List[Dict]:
        """
        Get trending topics (requires API v1.1)
        
        Args:
            woeid: Where On Earth ID (1 for worldwide)
            
        Returns:
            List of trending topics
        """
        try:
            trends = self.api.get_place_trends(id=woeid)
            return trends
        except Exception as e:
            logger.error(f"Error getting trending topics: {str(e)}")
            raise


# Example usage
if __name__ == "__main__":
    # Load credentials from environment
    api_key = os.getenv("TWITTER_API_KEY")
    api_secret = os.getenv("TWITTER_API_SECRET")
    access_token = os.getenv("TWITTER_ACCESS_TOKEN")
    access_token_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
    
    if not all([api_key, api_secret, access_token, access_token_secret]):
        print("Missing Twitter API credentials")
        exit(1)
    
    collector = TwitterCollector(api_key, api_secret, access_token, access_token_secret)
    
    # Example: Search for tweets
    tweets = collector.search_tweets("Python", max_results=10)
    for tweet in tweets:
        print(f"@{tweet['author']}: {tweet['content'][:100]}")
