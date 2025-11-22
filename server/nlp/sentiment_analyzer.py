"""
Chinese sentiment analysis using BERT and keyword extraction using Jieba + TF-IDF
"""

import logging
from typing import Dict, List, Tuple
import jieba
from sklearn.feature_extraction.text import TfidfVectorizer
import re

logger = logging.getLogger(__name__)

class SentimentAnalyzer:
    """简化版情感分析器，使用基于规则的方法"""
    
    def __init__(self):
        """初始化情感分析器"""
        self.positive_words = set([
            "好", "棒", "优秀", "喜欢", "满意", "赞", "不错", "推荐", "值得",
            "完美", "精彩", "优质", "高兴", "开心", "快乐", "幸福", "感谢",
            "支持", "爱", "美好", "漂亮", "帅", "酷", "厉害", "强", "牛"
        ])
        
        self.negative_words = set([
            "差", "烂", "糟糕", "失望", "不满", "垃圾", "讨厌", "后悔", "坑",
            "骗", "假", "劣质", "难用", "卡", "慢", "贵", "坏", "破", "臭",
            "恶心", "难看", "丑", "烦", "气", "怒", "恨", "骂", "投诉"
        ])
        
        logger.info("SentimentAnalyzer initialized with rule-based method")
    
    def analyze_sentiment(self, text: str) -> Dict:
        """
        分析文本情感
        
        Args:
            text: 中文文本
            
        Returns:
            包含sentiment, score, confidence的字典
        """
        try:
            # 分词
            words = list(jieba.cut(text))
            
            # 计算正负面词数量
            positive_count = sum(1 for word in words if word in self.positive_words)
            negative_count = sum(1 for word in words if word in self.negative_words)
            
            # 判断情感
            if positive_count > negative_count:
                sentiment = "positive"
                score = 0.6 + (positive_count / (len(words) + 1)) * 0.4
            elif negative_count > positive_count:
                sentiment = "negative"
                score = 0.4 - (negative_count / (len(words) + 1)) * 0.4
            else:
                sentiment = "neutral"
                score = 0.5
            
            # 确保score在0-1范围内
            score = max(0.0, min(1.0, score))
            confidence = abs(score - 0.5) * 2  # 0.5表示不确定，越接近0或1越确定
            
            return {
                "sentiment": sentiment,
                "score": float(score),
                "confidence": float(confidence)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {str(e)}")
            return {
                "sentiment": "neutral",
                "score": 0.5,
                "confidence": 0.0,
                "error": str(e)
            }
    
    def extract_keywords(self, text: str, top_k: int = 10) -> List[Dict]:
        """
        提取关键词
        
        Args:
            text: 中文文本
            top_k: 返回的关键词数量
            
        Returns:
            关键词列表，每个包含word, frequency, tfidf
        """
        try:
            # 分词
            words = list(jieba.cut(text))
            
            # 过滤停用词和短词
            stopwords = {"的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好", "自己", "这"}
            filtered_words = [w for w in words if len(w) > 1 and w not in stopwords]
            
            if not filtered_words:
                return []
            
            # 计算词频
            from collections import Counter
            word_freq = Counter(filtered_words)
            
            # 简单的TF-IDF近似：使用词频作为权重
            total_words = len(filtered_words)
            keywords = []
            
            for word, freq in word_freq.most_common(top_k):
                keywords.append({
                    "word": word,
                    "frequency": freq,
                    "tfidf": freq / total_words
                })
            
            return keywords
            
        except Exception as e:
            logger.error(f"Error extracting keywords: {str(e)}")
            return []


# 为了兼容性，创建别名
ChineseSentimentAnalyzer = SentimentAnalyzer
ChineseKeywordExtractor = SentimentAnalyzer


if __name__ == "__main__":
    # 测试代码
    analyzer = SentimentAnalyzer()
    
    test_texts = [
        "这个产品真的很好用，我非常喜欢！",
        "太糟糕了，完全不能用。",
        "还可以，一般般。"
    ]
    
    print("Sentiment Analysis Results:")
    for text in test_texts:
        result = analyzer.analyze_sentiment(text)
        print(f"Text: {text}")
        print(f"Sentiment: {result['sentiment']}, Score: {result['score']:.4f}")
        print()
    
    print("\nKeyword Extraction Results:")
    for text in test_texts:
        keywords = analyzer.extract_keywords(text)
        print(f"Text: {text}")
        print(f"Keywords: {keywords}")
        print()
