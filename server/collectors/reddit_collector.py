"""
Reddit data collector using Manus Data API
Collects posts from subreddits based on keywords
"""

import sys
import logging
from typing import List, Dict, Optional
from datetime import datetime

sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient

logger = logging.getLogger(__name__)

class RedditCollector:
    def __init__(self):
        """Initialize Reddit API client"""
        self.client = ApiClient()
        logger.info("Reddit API client initialized")

    def search_posts(
        self,
        keyword: str,
        max_results: int = 100,
    ) -> List[Dict]:
        """
        Search for Reddit posts based on keyword
        
        Args:
            keyword: Search keyword
            max_results: Maximum number of results to return
            
        Returns:
            List of post dictionaries with metadata
        """
        # Map keywords to relevant subreddits
        keyword_subreddit_map = {
            "AI": ["artificial", "MachineLearning", "ArtificialInteligence"],
            "人工智能": ["artificial", "MachineLearning"],
            "Uzi": ["leagueoflegends", "lol", "esports"],
            "Python": ["Python", "learnpython", "programming"],
            "科技": ["technology", "tech", "gadgets"],
        }
        
        # Select relevant subreddits
        subreddits = keyword_subreddit_map.get(keyword, ["all"])
        
        all_posts = []
        posts_per_subreddit = max(10, max_results // len(subreddits))
        
        for subreddit in subreddits:
            try:
                posts = self.get_subreddit_posts(subreddit, posts_per_subreddit)
                # Filter posts containing the keyword
                filtered_posts = [
                    p for p in posts 
                    if keyword.lower() in p['content'].lower() or 
                       keyword.lower() in p.get('title', '').lower()
                ]
                all_posts.extend(filtered_posts)
                
                if len(all_posts) >= max_results:
                    break
            except Exception as e:
                logger.warning(f"Failed to collect from r/{subreddit}: {e}")
                continue
        
        result = all_posts[:max_results]
        logger.info(f"Collected {len(result)} Reddit posts for keyword: {keyword}")
        return result

    def get_subreddit_posts(
        self,
        subreddit: str,
        limit: int = 100,
    ) -> List[Dict]:
        """
        Get hot posts from a specific subreddit
        
        Args:
            subreddit: Subreddit name
            limit: Maximum number of posts
            
        Returns:
            List of post dictionaries
        """
        try:
            query_params = {
                'subreddit': subreddit,
                'limit': str(min(limit, 100))
            }
            
            response = self.client.call_api('Reddit/AccessAPI', query=query_params)
            
            if not response or not response.get('success'):
                logger.warning(f"Failed to fetch posts from r/{subreddit}")
                return []
            
            posts = []
            raw_posts = response.get('posts', [])
            
            for post_wrapper in raw_posts:
                post_data = post_wrapper.get('data', {})
                
                # Convert Reddit post to our format
                converted_post = {
                    "platformId": post_data.get('id', ''),
                    "platform": "reddit",
                    "author": post_data.get('author', 'unknown'),
                    "authorId": post_data.get('author', 'unknown'),
                    "title": post_data.get('title', ''),
                    "content": post_data.get('selftext', '') or post_data.get('title', ''),
                    "url": f"https://reddit.com{post_data.get('permalink', '')}",
                    "publishedAt": datetime.fromtimestamp(
                        post_data.get('created_utc', 0)
                    ).isoformat() if post_data.get('created_utc') else None,
                    "likes": post_data.get('ups', 0),
                    "replies": post_data.get('num_comments', 0),
                    "shares": 0,  # Reddit doesn't have shares
                    "subreddit": post_data.get('subreddit', subreddit),
                }
                posts.append(converted_post)
            
            logger.info(f"Collected {len(posts)} posts from r/{subreddit}")
            return posts
            
        except Exception as e:
            logger.error(f"Error collecting posts from r/{subreddit}: {str(e)}")
            raise


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    collector = RedditCollector()
    
    # Example: Search for posts
    posts = collector.search_posts("AI", max_results=10)
    for post in posts:
        print(f"r/{post['subreddit']} - {post['author']}: {post['title'][:50]}")
