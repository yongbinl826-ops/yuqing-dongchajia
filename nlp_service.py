"""
中文舆情分析 NLP 服务
使用 BERT 进行情感分析，Jieba 进行关键词提取
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import json
import os
from pathlib import Path

# 导入 NLP 模块
import sys
sys.path.insert(0, str(Path(__file__).parent / "server" / "nlp"))

try:
    from sentiment_analyzer import SentimentAnalyzer
except ImportError:
    print("Warning: Could not import SentimentAnalyzer")

app = FastAPI(title="舆情分析 NLP 服务", version="1.0.0")

# 初始化分析器
try:
    analyzer = SentimentAnalyzer()
except Exception as e:
    print(f"Warning: Failed to initialize SentimentAnalyzer: {e}")
    analyzer = None


class TextInput(BaseModel):
    """文本输入模型"""
    text: str
    language: str = "zh"


class SentimentResult(BaseModel):
    """情感分析结果"""
    sentiment: str  # positive, negative, neutral
    score: float
    confidence: float


class KeywordResult(BaseModel):
    """关键词提取结果"""
    word: str
    frequency: int
    tfidf: float


class BatchAnalysisInput(BaseModel):
    """批量分析输入"""
    texts: List[str]
    language: str = "zh"


class BatchAnalysisResult(BaseModel):
    """批量分析结果"""
    sentiment_results: List[SentimentResult]
    keywords: List[KeywordResult]


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "NLP Analysis Service",
        "version": "1.0.0"
    }


@app.post("/sentiment", response_model=SentimentResult)
async def analyze_sentiment(input_data: TextInput):
    """
    分析单个文本的情感
    
    Args:
        input_data: 包含文本的输入数据
        
    Returns:
        SentimentResult: 情感分析结果
    """
    if not analyzer:
        raise HTTPException(status_code=503, detail="NLP service not initialized")
    
    if not input_data.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    try:
        result = analyzer.analyze_sentiment(input_data.text)
        return SentimentResult(
            sentiment=result["sentiment"],
            score=result["score"],
            confidence=result["confidence"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/keywords", response_model=List[KeywordResult])
async def extract_keywords(input_data: TextInput, top_k: int = 20):
    """
    提取文本中的关键词
    
    Args:
        input_data: 包含文本的输入数据
        top_k: 返回的关键词数量
        
    Returns:
        List[KeywordResult]: 关键词列表
    """
    if not analyzer:
        raise HTTPException(status_code=503, detail="NLP service not initialized")
    
    if not input_data.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    try:
        keywords = analyzer.extract_keywords(input_data.text, top_k=top_k)
        return [
            KeywordResult(
                word=kw["word"],
                frequency=kw["frequency"],
                tfidf=kw["tfidf"]
            )
            for kw in keywords
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Keyword extraction failed: {str(e)}")


@app.post("/batch-analyze", response_model=BatchAnalysisResult)
async def batch_analyze(input_data: BatchAnalysisInput):
    """
    批量分析文本的情感和关键词
    
    Args:
        input_data: 包含文本列表的输入数据
        
    Returns:
        BatchAnalysisResult: 批量分析结果
    """
    if not analyzer:
        raise HTTPException(status_code=503, detail="NLP service not initialized")
    
    if not input_data.texts:
        raise HTTPException(status_code=400, detail="Texts list cannot be empty")
    
    try:
        # 分析情感
        sentiment_results = []
        all_texts = " ".join(input_data.texts)
        
        for text in input_data.texts:
            if text.strip():
                result = analyzer.analyze_sentiment(text)
                sentiment_results.append(SentimentResult(
                    sentiment=result["sentiment"],
                    score=result["score"],
                    confidence=result["confidence"]
                ))
        
        # 提取关键词
        keywords_data = analyzer.extract_keywords(all_texts, top_k=30)
        keywords = [
            KeywordResult(
                word=kw["word"],
                frequency=kw["frequency"],
                tfidf=kw["tfidf"]
            )
            for kw in keywords_data
        ]
        
        return BatchAnalysisResult(
            sentiment_results=sentiment_results,
            keywords=keywords
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch analysis failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
