import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WordCloud, KeywordRanking } from "@/components/KeywordAnalysis";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Keyword {
  word: string;
  frequency: number;
  tfidf: number;
}

export default function KeywordAnalysisPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 获取任务信息
  const { data: task } = trpc.tasks.get.useQuery(
    { taskId: parseInt(taskId || "0") },
    { enabled: !!taskId }
  );

  // 获取评论数据用于关键词分析
  const { data: comments } = trpc.comments.listByTask.useQuery(
    { taskId: parseInt(taskId || "0"), limit: 1000 },
    { enabled: !!taskId }
  );

  // 处理关键词数据
  const processedKeywords = useMemo(() => {
    if (!comments || comments.length === 0) return [];

    // 这里应该调用 Python NLP 服务进行关键词提取
    // 临时使用模拟数据
    const mockKeywords: Keyword[] = [
      { word: "产品", frequency: 245, tfidf: 0.85 },
      { word: "服务", frequency: 198, tfidf: 0.78 },
      { word: "用户", frequency: 156, tfidf: 0.72 },
      { word: "体验", frequency: 142, tfidf: 0.68 },
      { word: "功能", frequency: 128, tfidf: 0.65 },
      { word: "价格", frequency: 115, tfidf: 0.62 },
      { word: "质量", frequency: 98, tfidf: 0.58 },
      { word: "支持", frequency: 87, tfidf: 0.55 },
      { word: "问题", frequency: 76, tfidf: 0.52 },
      { word: "改进", frequency: 65, tfidf: 0.48 },
      { word: "推荐", frequency: 54, tfidf: 0.45 },
      { word: "效率", frequency: 48, tfidf: 0.42 },
      { word: "安全", frequency: 42, tfidf: 0.38 },
      { word: "稳定", frequency: 38, tfidf: 0.35 },
      { word: "便捷", frequency: 32, tfidf: 0.32 },
    ];

    return mockKeywords;
  }, [comments]);

  const handleRefreshKeywords = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      setKeywords(processedKeywords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提取关键词失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportKeywords = () => {
    const csv = [
      ["关键词", "频率", "TF-IDF"],
      ...processedKeywords.map(k => [k.word, k.frequency, k.tfidf.toFixed(4)]),
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `keywords-${taskId}-${new Date().getTime()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 返回按钮 */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <h1 className="text-3xl font-bold gradient-text">关键词分析</h1>
        </div>

        {/* 任务信息卡片 */}
        {task && (
          <Card className="tech-card border-cyan-400/20 mb-6">
            <CardHeader>
              <CardTitle className="text-cyan-300">{task.keyword}</CardTitle>
              <CardDescription>
                监控平台：{JSON.parse(task.platforms).join("、")} | 评论总数：{comments?.length || 0}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* 错误提示 */}
        {error && (
          <Card className="tech-card border-red-400/20 mb-6 bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-red-300">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={handleRefreshKeywords}
            disabled={isLoading}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "分析中..." : "重新分析"}
          </Button>
          <Button
            onClick={handleExportKeywords}
            variant="outline"
            className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10"
          >
            <Download className="w-4 h-4 mr-2" />
            导出数据
          </Button>
        </div>

        {/* 关键词分析内容 */}
        <Tabs defaultValue="wordcloud" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-cyan-400/20">
            <TabsTrigger
              value="wordcloud"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
            >
              词云图
            </TabsTrigger>
            <TabsTrigger
              value="ranking"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
            >
              排行榜
            </TabsTrigger>
            <TabsTrigger
              value="statistics"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
            >
              统计信息
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wordcloud" className="mt-6">
            <WordCloud keywords={processedKeywords} maxWords={50} />
          </TabsContent>

          <TabsContent value="ranking" className="mt-6">
            <KeywordRanking keywords={processedKeywords} maxItems={30} />
          </TabsContent>

          <TabsContent value="statistics" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="tech-card border-cyan-400/20">
                <CardHeader>
                  <CardTitle className="text-sm text-cyan-300">总关键词数</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold gradient-text">{processedKeywords.length}</p>
                </CardContent>
              </Card>

              <Card className="tech-card border-cyan-400/20">
                <CardHeader>
                  <CardTitle className="text-sm text-cyan-300">最高频率</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-cyan-400">
                    {Math.max(...processedKeywords.map(k => k.frequency), 0)}
                  </p>
                </CardContent>
              </Card>

              <Card className="tech-card border-cyan-400/20">
                <CardHeader>
                  <CardTitle className="text-sm text-cyan-300">平均 TF-IDF</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-cyan-400">
                    {(
                      processedKeywords.reduce((sum, k) => sum + k.tfidf, 0) /
                      Math.max(processedKeywords.length, 1)
                    ).toFixed(3)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 详细统计表格 */}
            <Card className="tech-card border-cyan-400/20 mt-6">
              <CardHeader>
                <CardTitle className="text-cyan-300">关键词详细统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-cyan-400/20">
                        <th className="text-left py-2 px-3 text-cyan-300">排名</th>
                        <th className="text-left py-2 px-3 text-cyan-300">关键词</th>
                        <th className="text-right py-2 px-3 text-cyan-300">频率</th>
                        <th className="text-right py-2 px-3 text-cyan-300">TF-IDF</th>
                        <th className="text-right py-2 px-3 text-cyan-300">占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedKeywords.slice(0, 20).map((k, idx) => (
                        <tr key={idx} className="border-b border-cyan-400/10 hover:bg-cyan-400/5">
                          <td className="py-2 px-3 text-cyan-400">{idx + 1}</td>
                          <td className="py-2 px-3 text-white">{k.word}</td>
                          <td className="py-2 px-3 text-right text-slate-300">{k.frequency}</td>
                          <td className="py-2 px-3 text-right text-slate-300">{k.tfidf.toFixed(4)}</td>
                          <td className="py-2 px-3 text-right text-slate-300">
                            {(
                              (k.frequency /
                                Math.max(...processedKeywords.map(x => x.frequency), 1)) *
                              100
                            ).toFixed(1)}
                            %
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
