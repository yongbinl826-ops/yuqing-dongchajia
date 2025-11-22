import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface Keyword {
  word: string;
  frequency: number;
  tfidf: number;
}

interface KeywordAnalysisProps {
  keywords: Keyword[];
  maxWords?: number;
  maxItems?: number;
}

export function WordCloud({ keywords, maxWords = 50 }: KeywordAnalysisProps) {
  const processedKeywords = useMemo(() => {
    const sorted = [...keywords]
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, maxWords);

    const maxFreq = Math.max(...sorted.map(k => k.frequency), 1);
    const minFreq = Math.min(...sorted.map(k => k.frequency), 1);

    return sorted.map(k => ({
      ...k,
      size: 12 + ((k.frequency - minFreq) / (maxFreq - minFreq)) * 28,
      opacity: 0.6 + ((k.frequency - minFreq) / (maxFreq - minFreq)) * 0.4,
    }));
  }, [keywords, maxWords]);

  return (
    <Card className="tech-card border-cyan-400/20">
      <CardHeader>
        <CardTitle className="gradient-text">词云分析</CardTitle>
        <CardDescription>关键词频率分布可视化</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 justify-center p-6 bg-slate-800/30 rounded-lg border border-cyan-400/10">
          {processedKeywords.length > 0 ? (
            processedKeywords.map((k, idx) => (
              <div
                key={idx}
                className="px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 hover:border-cyan-400/60 transition-all cursor-pointer group"
                style={{
                  fontSize: `${k.size}px`,
                  opacity: k.opacity,
                }}
                title={`频率: ${k.frequency}, TF-IDF: ${k.tfidf.toFixed(3)}`}
              >
                <span className="text-cyan-300 group-hover:text-cyan-200 transition-colors">
                  {k.word}
                </span>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-center py-8">暂无关键词数据</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function KeywordRanking({ keywords, maxItems = 20 }: KeywordAnalysisProps) {
  const topKeywords = useMemo(() => {
    return [...keywords]
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, maxItems);
  }, [keywords, maxItems]);

  return (
    <Card className="tech-card border-cyan-400/20">
      <CardHeader>
        <CardTitle className="gradient-text flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          高频关键词排行
        </CardTitle>
        <CardDescription>基于 TF-IDF 的关键词重要性排名</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topKeywords.length > 0 ? (
            topKeywords.map((k, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 transition-all">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{k.word}</p>
                  <div className="flex gap-4 text-xs text-slate-400 mt-1">
                    <span>频率: {k.frequency}</span>
                    <span>TF-IDF: {k.tfidf.toFixed(4)}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 w-24 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full shadow-lg shadow-cyan-500/50"
                    style={{ width: `${Math.min((k.tfidf / Math.max(...topKeywords.map(x => x.tfidf), 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-400 py-8">暂无关键词数据</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
