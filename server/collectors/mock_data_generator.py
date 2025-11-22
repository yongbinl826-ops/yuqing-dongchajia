"""
Mock data generator for demonstration purposes
Generates realistic-looking social media posts
"""

import random
from datetime import datetime, timedelta
from typing import List, Dict

class MockDataGenerator:
    """生成模拟社交媒体数据"""
    
    def __init__(self):
        self.twitter_users = [
            "TechGuru", "AIResearcher", "DataScientist", "MLEngineer", "DeepLearner"
        ]
        
        self.weibo_users = [
            "科技观察者", "AI前沿", "技术博主", "数据分析师", "机器学习爱好者"
        ]
        
        self.zhihu_users = [
            "人工智能研究员", "算法工程师", "技术专家", "数据科学家", "AI从业者"
        ]
        
        self.positive_templates = [
            "{keyword}技术真的太棒了！未来可期。",
            "刚体验了{keyword}相关产品，效果非常好！",
            "{keyword}的发展速度令人惊叹，期待更多应用。",
            "对{keyword}的未来充满信心，这将改变世界。",
            "{keyword}让我们的生活更加便利，点赞！",
        ]
        
        self.neutral_templates = [
            "关于{keyword}的讨论越来越多了。",
            "今天看到一篇关于{keyword}的文章。",
            "{keyword}领域最近有不少新进展。",
            "分享一些{keyword}的学习资料。",
            "{keyword}市场规模持续扩大。",
        ]
        
        self.negative_templates = [
            "{keyword}还有很多问题需要解决。",
            "对{keyword}的某些应用持保留态度。",
            "{keyword}的发展速度太快，需要更多监管。",
            "担心{keyword}可能带来的负面影响。",
            "{keyword}技术还不够成熟，需要改进。",
        ]
    
    def generate_twitter_posts(self, keyword: str, count: int = 10) -> List[Dict]:
        """生成Twitter模拟数据"""
        posts = []
        
        for i in range(count):
            sentiment_type = random.choices(
                ['positive', 'neutral', 'negative'],
                weights=[0.5, 0.3, 0.2]
            )[0]
            
            if sentiment_type == 'positive':
                content = random.choice(self.positive_templates).format(keyword=keyword)
            elif sentiment_type == 'neutral':
                content = random.choice(self.neutral_templates).format(keyword=keyword)
            else:
                content = random.choice(self.negative_templates).format(keyword=keyword)
            
            author = random.choice(self.twitter_users)
            published_at = datetime.now() - timedelta(hours=random.randint(1, 72))
            
            post = {
                "platformId": f"twitter_mock_{i}_{random.randint(1000, 9999)}",
                "platform": "twitter",
                "author": author,
                "authorId": f"twitter_{hash(author)}",
                "content": content,
                "url": f"https://twitter.com/mock/status/{random.randint(100000, 999999)}",
                "publishedAt": published_at.isoformat(),
                "likes": random.randint(10, 1000),
                "replies": random.randint(5, 200),
                "shares": random.randint(2, 100),
            }
            posts.append(post)
        
        return posts
    
    def generate_weibo_posts(self, keyword: str, count: int = 10) -> List[Dict]:
        """生成微博模拟数据"""
        posts = []
        
        for i in range(count):
            sentiment_type = random.choices(
                ['positive', 'neutral', 'negative'],
                weights=[0.5, 0.3, 0.2]
            )[0]
            
            if sentiment_type == 'positive':
                content = random.choice(self.positive_templates).format(keyword=keyword)
            elif sentiment_type == 'neutral':
                content = random.choice(self.neutral_templates).format(keyword=keyword)
            else:
                content = random.choice(self.negative_templates).format(keyword=keyword)
            
            author = random.choice(self.weibo_users)
            published_at = datetime.now() - timedelta(hours=random.randint(1, 72))
            
            post = {
                "platformId": f"weibo_mock_{i}_{random.randint(1000, 9999)}",
                "platform": "weibo",
                "author": author,
                "authorId": f"weibo_{hash(author)}",
                "content": content,
                "url": f"https://weibo.com/mock/{random.randint(100000, 999999)}",
                "publishedAt": published_at.isoformat(),
                "likes": random.randint(50, 5000),
                "replies": random.randint(10, 500),
                "shares": random.randint(5, 200),
            }
            posts.append(post)
        
        return posts
    
    def generate_zhihu_posts(self, keyword: str, count: int = 10) -> List[Dict]:
        """生成知乎模拟数据"""
        posts = []
        
        for i in range(count):
            sentiment_type = random.choices(
                ['positive', 'neutral', 'negative'],
                weights=[0.5, 0.3, 0.2]
            )[0]
            
            if sentiment_type == 'positive':
                content = random.choice(self.positive_templates).format(keyword=keyword)
            elif sentiment_type == 'neutral':
                content = random.choice(self.neutral_templates).format(keyword=keyword)
            else:
                content = random.choice(self.negative_templates).format(keyword=keyword)
            
            # 知乎内容通常更长
            content = f"如何看待{keyword}？\n\n{content} 这是我的一些思考和观察，欢迎讨论。"
            
            author = random.choice(self.zhihu_users)
            published_at = datetime.now() - timedelta(hours=random.randint(1, 72))
            
            post = {
                "platformId": f"zhihu_mock_{i}_{random.randint(1000, 9999)}",
                "platform": "zhihu",
                "author": author,
                "authorId": f"zhihu_{hash(author)}",
                "content": content,
                "url": f"https://www.zhihu.com/question/{random.randint(100000, 999999)}",
                "publishedAt": published_at.isoformat(),
                "likes": random.randint(100, 10000),
                "replies": random.randint(20, 1000),
                "shares": 0,
            }
            posts.append(post)
        
        return posts
    
    def generate_all_platforms(self, keyword: str, count_per_platform: int = 10) -> Dict[str, List[Dict]]:
        """生成所有平台的模拟数据"""
        return {
            "twitter": self.generate_twitter_posts(keyword, count_per_platform),
            "weibo": self.generate_weibo_posts(keyword, count_per_platform),
            "zhihu": self.generate_zhihu_posts(keyword, count_per_platform),
        }


if __name__ == "__main__":
    generator = MockDataGenerator()
    
    # 生成测试数据
    data = generator.generate_all_platforms("人工智能", 5)
    
    print("=== Twitter Posts ===")
    for post in data['twitter']:
        print(f"@{post['author']}: {post['content']}")
    
    print("\n=== Weibo Posts ===")
    for post in data['weibo']:
        print(f"@{post['author']}: {post['content']}")
    
    print("\n=== Zhihu Posts ===")
    for post in data['zhihu']:
        print(f"@{post['author']}: {post['content'][:100]}...")
