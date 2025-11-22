"""
Coordinator for managing data collection, NLP processing, and database storage\nHandles the orchestration of crawlers, sentiment analysis, and data persistence\n\"\"\"\n\nimport asyncio\nimport logging\nfrom typing import List, Dict, Optional\nfrom datetime import datetime\nimport sys\nimport os\n\n# Add parent directory to path for imports\nsys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))\n\nlogger = logging.getLogger(__name__)\n\nclass DataCollectionCoordinator:\n    def __init__(self, db_connection=None):\n        \"\"\"\n        Initialize the data collection coordinator\n        \n        Args:\n            db_connection: Database connection object (optional for testing)\n        \"\"\"\n            self.db = db_connection
        self.twitter_collector = None
        self.weibo_crawler = None
        self.zhihu_crawler = None
        self.reddit_collector = None
        self.youtube_collector = None
        self.sentiment_analyzer = None
        self.keyword_extractor = None
        logger.info("DataCollectionCoordinator initialized")d\")\n\n    async def collect_from_twitter(\n        self,\n        keyword: str,\n        max_results: int = 50,\n        task_id: Optional[int] = None\n    ) -> Dict:\n        \"\"\"\n        Collect tweets for a keyword\n        \n        Args:\n            keyword: Search keyword\n            max_results: Maximum tweets to collect\n            task_id: Associated monitoring task ID\n            \n        Returns:\n            Collection result with statistics\n        \"\"\"\n        try:\n            if not self.twitter_collector:\n                logger.error(\"Twitter collector not initialized\")\n                return {\"success\": False, \"error\": \"Twitter collector not initialized\"}\n            \n            logger.info(f\"Starting Twitter collection for keyword: {keyword}\")\n            \n            # Collect tweets\n            tweets = self.twitter_collector.search_tweets(keyword, max_results=max_results)\n            \n            # Process and store tweets\n            stored_count = 0\n            duplicate_count = 0\n            \n            for tweet in tweets:\n                try:\n                    # Check for duplicates\n                    if self.db:\n                        existing = await self._check_duplicate(tweet[\"platformId\"])\n                        if existing:\n                            duplicate_count += 1\n                            continue\n                    \n                    # Store tweet in database\n                    if self.db and task_id:\n                        tweet[\"taskId\"] = task_id\n                        await self._store_comment(tweet)\n                        stored_count += 1\n                    \n                except Exception as e:\n                    logger.warning(f\"Error storing tweet: {str(e)}\")\n                    continue\n            \n            result = {\n                \"success\": True,\n                \"platform\": \"twitter\",\n                \"keyword\": keyword,\n                \"collected\": len(tweets),\n                \"stored\": stored_count,\n                \"duplicates\": duplicate_count,\n                \"timestamp\": datetime.utcnow().isoformat()\n            }\n            \n            logger.info(f\"Twitter collection completed: {result}\")\n            return result\n            \n        except Exception as e:\n            logger.error(f\"Error in Twitter collection: {str(e)}\")\n            return {\"success\": False, \"error\": str(e), \"platform\": \"twitter\"}\n\n    async def collect_from_weibo(\n        self,\n        keyword: str,\n        username: str,\n        password: str,\n        max_results: int = 50,\n        task_id: Optional[int] = None\n    ) -> Dict:\n        \"\"\"\n        Collect posts from Weibo\n        \n        Args:\n            keyword: Search keyword\n            username: Weibo username\n            password: Weibo password\n            max_results: Maximum posts to collect\n            task_id: Associated monitoring task ID\n            \n        Returns:\n            Collection result with statistics\n        \"\"\"\n        try:\n            from weibo_crawler import WeiboCrawler\n            \n            logger.info(f\"Starting Weibo collection for keyword: {keyword}\")\n            \n            async with WeiboCrawler(username, password) as crawler:\n                # Login\n                if not await crawler.login():\n                    return {\"success\": False, \"error\": \"Failed to login to Weibo\", \"platform\": \"weibo\"}\n                \n                # Search posts\n                posts = await crawler.search_posts(keyword, max_results=max_results)\n                \n                # Process and store posts\n                stored_count = 0\n                duplicate_count = 0\n                \n                for post in posts:\n                    try:\n                        # Check for duplicates\n                        if self.db:\n                            existing = await self._check_duplicate(post[\"platformId\"])\n                            if existing:\n                                duplicate_count += 1\n                                continue\n                        \n                        # Store post in database\n                        if self.db and task_id:\n                            post[\"taskId\"] = task_id\n                            await self._store_comment(post)\n                            stored_count += 1\n                        \n                    except Exception as e:\n                        logger.warning(f\"Error storing post: {str(e)}\")\n                        continue\n                \n                result = {\n                    \"success\": True,\n                    \"platform\": \"weibo\",\n                    \"keyword\": keyword,\n                    \"collected\": len(posts),\n                    \"stored\": stored_count,\n                    \"duplicates\": duplicate_count,\n                    \"timestamp\": datetime.utcnow().isoformat()\n                }\n                \n                logger.info(f\"Weibo collection completed: {result}\")\n                return result\n                \n        except Exception as e:\n            logger.error(f\"Error in Weibo collection: {str(e)}\")\n            return {\"success\": False, \"error\": str(e), \"platform\": \"weibo\"}\n\n    async def collect_from_zhihu(\n        self,\n        keyword: str,\n        username: str,\n        password: str,\n        max_results: int = 50,\n        task_id: Optional[int] = None\n    ) -> Dict:\n        \"\"\"\n        Collect questions and answers from Zhihu\n        \n        Args:\n            keyword: Search keyword\n            username: Zhihu username\n            password: Zhihu password\n            max_results: Maximum questions to collect\n            task_id: Associated monitoring task ID\n            \n        Returns:\n            Collection result with statistics\n        \"\"\"\n        try:\n            from zhihu_crawler import ZhihuCrawler\n            \n            logger.info(f\"Starting Zhihu collection for keyword: {keyword}\")\n            \n            async with ZhihuCrawler(username, password) as crawler:\n                # Login\n                if not await crawler.login():\n                    return {\"success\": False, \"error\": \"Failed to login to Zhihu\", \"platform\": \"zhihu\"}\n                \n                # Search questions\n                questions = await crawler.search_questions(keyword, max_results=max_results)\n                \n                # Process and store questions + answers\n                stored_count = 0\n                duplicate_count = 0\n                \n                for question in questions:\n                    try:\n                        # Check for duplicate question\n                        if self.db:\n                            existing = await self._check_duplicate(question[\"platformId\"])\n                            if existing:\n                                duplicate_count += 1\n                                continue\n                        \n                        # Store question\n                        if self.db and task_id:\n                            question[\"taskId\"] = task_id\n                            await self._store_comment(question)\n                            stored_count += 1\n                        \n                        # Get and store answers\n                        answers = await crawler.get_question_answers(question[\"url\"], max_answers=5)\n                        for answer in answers:\n                            try:\n                                if self.db:\n                                    existing = await self._check_duplicate(answer[\"platformId\"])\n                                    if existing:\n                                        duplicate_count += 1\n                                        continue\n                                \n                                if self.db and task_id:\n                                    answer[\"taskId\"] = task_id\n                                    await self._store_comment(answer)\n                                    stored_count += 1\n                            except Exception as e:\n                                logger.warning(f\"Error storing answer: {str(e)}\")\n                                continue\n                        \n                    except Exception as e:\n                        logger.warning(f\"Error processing question: {str(e)}\")\n                        continue\n                \n                result = {\n                    \"success\": True,\n                    \"platform\": \"zhihu\",\n                    \"keyword\": keyword,\n                    \"collected\": len(questions),\n                    \"stored\": stored_count,\n                    \"duplicates\": duplicate_count,\n                    \"timestamp\": datetime.utcnow().isoformat()\n                }\n                \n                logger.info(f\"Zhihu collection completed: {result}\")\n                return result\n                \n        except Exception as e:\n            logger.error(f\"Error in Zhihu collection: {str(e)}\")\n            return {\"success\": False, \"error\": str(e), \"platform\": \"zhihu\"}\n\n    async def analyze_and_store_sentiment(\n        self,\n        comment_id: int,\n        content: str\n    ) -> Optional[Dict]:\n        \"\"\"\n        Analyze sentiment and extract keywords for a comment\n        \n        Args:\n            comment_id: Database comment ID\n            content: Comment content\n            \n        Returns:\n            Sentiment analysis result\n        \"\"\"\n        try:\n            if not self.sentiment_analyzer or not self.keyword_extractor:\n                logger.error(\"NLP analyzers not initialized\")\n                return None\n            \n            # Analyze sentiment\n            sentiment_result = self.sentiment_analyzer.analyze_sentiment(content)\n            \n            # Extract keywords\n            keywords = self.keyword_extractor.extract_keywords(content)\n            \n            # Prepare storage data\n            analysis_data = {\n                \"commentId\": comment_id,\n                \"sentiment\": sentiment_result[\"sentiment\"],\n                \"score\": sentiment_result[\"score\"],\n                \"confidence\": sentiment_result[\"confidence\"],\n                \"keywords\": [kw[0] for kw in keywords],\n                \"tfidfScores\": {kw[0]: kw[1] for kw in keywords},\n            }\n            \n            # Store in database\n            if self.db:\n                await self._store_sentiment_analysis(analysis_data)\n            \n            return analysis_data\n            \n        except Exception as e:\n            logger.error(f\"Error analyzing sentiment: {str(e)}\")\n            return None\n\n    async def _check_duplicate(self, platform_id: str) -> bool:\n        \"\"\"\n        Check if a comment already exists in database\n        \n        Args:\n            platform_id: Platform-specific comment ID\n            \n        Returns:\n            True if duplicate exists\n        \"\"\"\n        # This would call the database\n        # For now, return False (no duplicates)\n        return False\n\n    async def _store_comment(self, comment_data: Dict) -> bool:\n        \"\"\"\n        Store comment in database\n        \n        Args:\n            comment_data: Comment data dictionary\n            \n        Returns:\n            True if successful\n        \"\"\"\n        # This would call the database insert function\n        logger.debug(f\"Storing comment: {comment_data['platformId']}\")\n        return True\n\n    async def _store_sentiment_analysis(self, analysis_data: Dict) -> bool:\n        \"\"\"\n        Store sentiment analysis result in database\n        \n        Args:\n            analysis_data: Sentiment analysis data\n            \n        Returns:\n            True if successful\n        \"\"\"\n        # This would call the database insert function\n        logger.debug(f\"Storing sentiment analysis for comment: {analysis_data['commentId']}\")\n        return True\n\n\n# Example usage\nasync def main():\n    coordinator = DataCollectionCoordinator()\n    \n    # Example: Collect from Twitter\n    # result = await coordinator.collect_from_twitter(\"Python\", max_results=10)\n    # print(result)\n\n\nif __name__ == \"__main__\":\n    logging.basicConfig(level=logging.INFO)\n    asyncio.run(main())\n

    async def collect_from_reddit(
        self,
        keyword: str,
        max_results: int = 50,
        task_id: Optional[int] = None
    ) -> Dict:
        """
        Collect posts from Reddit
        
        Args:
            keyword: Search keyword
            max_results: Maximum posts to collect
            task_id: Associated monitoring task ID
            
        Returns:
            Collection result with statistics
        """
        try:
            from reddit_collector import RedditCollector
            
            if not self.reddit_collector:
                self.reddit_collector = RedditCollector()
            
            logger.info(f"Starting Reddit collection for keyword: {keyword}")
            
            # Collect posts
            posts = self.reddit_collector.search_posts(keyword, max_results=max_results)
            
            # Process and store posts
            stored_count = 0
            duplicate_count = 0
            
            for post in posts:
                try:
                    # Check for duplicates
                    if self.db:
                        existing = await self._check_duplicate(post["platformId"])
                        if existing:
                            duplicate_count += 1
                            continue
                    
                    # Store post in database
                    if self.db and task_id:
                        post["taskId"] = task_id
                        await self._store_comment(post)
                        stored_count += 1
                    
                except Exception as e:
                    logger.warning(f"Error storing Reddit post: {str(e)}")
                    continue
            
            result = {
                "success": True,
                "platform": "reddit",
                "keyword": keyword,
                "collected": len(posts),
                "stored": stored_count,
                "duplicates": duplicate_count,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Reddit collection completed: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error in Reddit collection: {str(e)}")
            return {"success": False, "error": str(e), "platform": "reddit"}

    async def collect_from_youtube(
        self,
        keyword: str,
        max_results: int = 50,
        task_id: Optional[int] = None
    ) -> Dict:
        """
        Collect videos from YouTube
        
        Args:
            keyword: Search keyword
            max_results: Maximum videos to collect
            task_id: Associated monitoring task ID
            
        Returns:
            Collection result with statistics
        """
        try:
            from youtube_collector import YouTubeCollector
            
            if not self.youtube_collector:
                self.youtube_collector = YouTubeCollector()
            
            logger.info(f"Starting YouTube collection for keyword: {keyword}")
            
            # Collect videos
            videos = self.youtube_collector.search_videos(keyword, max_results=max_results)
            
            # Process and store videos
            stored_count = 0
            duplicate_count = 0
            
            for video in videos:
                try:
                    # Check for duplicates
                    if self.db:
                        existing = await self._check_duplicate(video["platformId"])
                        if existing:
                            duplicate_count += 1
                            continue
                    
                    # Store video in database
                    if self.db and task_id:
                        video["taskId"] = task_id
                        await self._store_comment(video)
                        stored_count += 1
                    
                except Exception as e:
                    logger.warning(f"Error storing YouTube video: {str(e)}")
                    continue
            
            result = {
                "success": True,
                "platform": "youtube",
                "keyword": keyword,
                "collected": len(videos),
                "stored": stored_count,
                "duplicates": duplicate_count,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"YouTube collection completed: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error in YouTube collection: {str(e)}")
            return {"success": False, "error": str(e), "platform": "youtube"}
