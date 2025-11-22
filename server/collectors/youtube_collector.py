"""
YouTube data collector using Manus Data API
Collects videos and comments based on keywords
"""

import sys
import logging
from typing import List, Dict, Optional
from datetime import datetime

sys.path.append('/opt/.manus/.sandbox-runtime')
from data_api import ApiClient

logger = logging.getLogger(__name__)

class YouTubeCollector:
    def __init__(self):
        """Initialize YouTube API client"""
        self.client = ApiClient()
        logger.info("YouTube API client initialized")

    def search_videos(
        self,
        keyword: str,
        max_results: int = 100,
        language: str = "zh",
    ) -> List[Dict]:
        """
        Search for YouTube videos based on keyword
        
        Args:
            keyword: Search keyword
            max_results: Maximum number of results to return
            language: Language code (default: "zh" for Chinese)
            
        Returns:
            List of video dictionaries with metadata
        """
        try:
            query_params = {
                'q': keyword,
                'hl': language,
                'gl': 'CN' if language == 'zh' else 'US'
            }
            
            response = self.client.call_api('Youtube/search', query=query_params)
            
            if not response:
                logger.warning(f"Failed to search YouTube for keyword: {keyword}")
                return []
            
            videos = []
            contents = response.get('contents', [])
            
            for content in contents[:max_results]:
                if content.get('type') == 'video':
                    video_data = content.get('video', {})
                    
                    # Convert YouTube video to our format (treating as a "comment/post")
                    converted_video = {
                        "platformId": video_data.get('videoId', ''),
                        "platform": "youtube",
                        "author": video_data.get('channelTitle', 'unknown'),
                        "authorId": video_data.get('channelId', ''),
                        "title": video_data.get('title', ''),
                        "content": video_data.get('descriptionSnippet', '') or video_data.get('title', ''),
                        "url": f"https://www.youtube.com/watch?v={video_data.get('videoId', '')}",
                        "publishedAt": video_data.get('publishedTimeText', ''),
                        "likes": self._parse_view_count(video_data.get('viewCountText', '0')),
                        "replies": 0,  # Would need separate API call to get comment count
                        "shares": 0,
                        "duration": video_data.get('lengthText', ''),
                    }
                    videos.append(converted_video)
            
            logger.info(f"Collected {len(videos)} YouTube videos for keyword: {keyword}")
            return videos
            
        except Exception as e:
            logger.error(f"Error searching YouTube for keyword {keyword}: {str(e)}")
            raise

    def get_channel_videos(
        self,
        channel_id: str,
        max_results: int = 100,
    ) -> List[Dict]:
        """
        Get videos from a specific YouTube channel
        
        Args:
            channel_id: YouTube channel ID or URL
            max_results: Maximum number of videos
            
        Returns:
            List of video dictionaries
        """
        try:
            query_params = {
                'id': channel_id,
                'filter': 'videos_latest',
                'hl': 'en',
                'gl': 'US'
            }
            
            response = self.client.call_api('Youtube/get_channel_videos', query=query_params)
            
            if not response:
                logger.warning(f"Failed to fetch videos from channel: {channel_id}")
                return []
            
            videos = []
            contents = response.get('contents', [])
            
            for content in contents[:max_results]:
                if content.get('type') == 'video':
                    video_data = content.get('video', {})
                    
                    converted_video = {
                        "platformId": video_data.get('videoId', ''),
                        "platform": "youtube",
                        "author": video_data.get('channelTitle', 'unknown'),
                        "authorId": channel_id,
                        "title": video_data.get('title', ''),
                        "content": video_data.get('title', ''),
                        "url": f"https://www.youtube.com/watch?v={video_data.get('videoId', '')}",
                        "publishedAt": video_data.get('publishedTimeText', ''),
                        "likes": video_data.get('stats', {}).get('views', 0),
                        "replies": 0,
                        "shares": 0,
                        "duration": f"{video_data.get('lengthSeconds', 0)} seconds",
                    }
                    videos.append(converted_video)
            
            logger.info(f"Collected {len(videos)} videos from channel: {channel_id}")
            return videos
            
        except Exception as e:
            logger.error(f"Error collecting videos from channel {channel_id}: {str(e)}")
            raise

    def _parse_view_count(self, view_text: str) -> int:
        """Parse view count text like '1.2M views' to integer"""
        try:
            if not view_text:
                return 0
            
            # Remove 'views' and whitespace
            view_text = view_text.lower().replace('views', '').replace('view', '').strip()
            
            # Handle K, M, B suffixes
            multipliers = {'k': 1000, 'm': 1000000, 'b': 1000000000}
            
            for suffix, multiplier in multipliers.items():
                if suffix in view_text:
                    number = float(view_text.replace(suffix, '').strip())
                    return int(number * multiplier)
            
            # Try to parse as integer
            return int(float(view_text.replace(',', '')))
        except:
            return 0


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    collector = YouTubeCollector()
    
    # Example: Search for videos
    videos = collector.search_videos("AI", max_results=5)
    for video in videos:
        print(f"{video['author']}: {video['title'][:50]}")
