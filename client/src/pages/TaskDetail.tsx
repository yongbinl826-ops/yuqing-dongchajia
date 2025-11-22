import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, BarChart3, TrendingUp, MessageSquare, Play, Pause, Sparkles, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { downloadCSV } from "@/lib/export";
import { APP_TITLE } from "@/const";
import { toast } from "sonner";
import { SentimentPieChart } from "@/components/SentimentPieChart";
import { SentimentTrendChart } from "@/components/SentimentTrendChart";

interface TaskDetailProps {
  params: { taskId: string };
}

export default function TaskDetail({ params }: TaskDetailProps) {
  const { isAuthenticated, loading } = useAuth();
  const taskId = parseInt(params.taskId);
  const [activeTab, setActiveTab] = useState("overview");
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState(7); // 7天、30天

  const { data: task, isLoading: taskLoading } = trpc.tasks.get.useQuery(
    { taskId },
    { enabled: isAuthenticated && !loading }
  );

  // 定义isActive，避免在使用前初始化错误
  const isActive = task?.status === "active";

  const { data: comments } = trpc.comments.listByTask.useQuery(
    { taskId, limit: 50, offset: 0 },
    { enabled: isAuthenticated && !loading && !!task }
  );

  const { data: sentimentData } = trpc.sentiment.listByTask.useQuery(
    { taskId, limit: 1000, offset: 0 },
    { enabled: isAuthenticated && !loading && !!task }
  );

  // 查询情感趋势数据
  const { data: sentimentTrendData } = trpc.sentiment.stats.useQuery(
    { taskId, days: dateRange },
    { enabled: isAuthenticated && !loading && !!task }
  );

  // 实时查询采集进度
  const { data: collectionProgress, refetch: refetchProgress } = trpc.collector.getProgress.useQuery(
    { taskId },
    { 
      enabled: isAuthenticated && !loading && !!task,
      refetchInterval: isActive ? 5000 : false // 活跃状态时每5秒轮询
    }
  );



  const { refetch: refetchCommentExport } = trpc.export.comments.useQuery(
    { taskId },
    { enabled: false }
  );

  const { refetch: refetchSentimentExport } = trpc.export.sentiment.useQuery(
    { taskId },
    { enabled: false }
  );

  const updateTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const startCollectionMutation = trpc.collector.startCollection.useMutation({
    onSuccess: () => {
      toast.success("数据采集已启动");
      window.location.reload();
    },
    onError: (error) => {
      toast.error(`启动失败: ${error.message}`);
    },
  });

  const stopCollectionMutation = trpc.collector.stopCollection.useMutation({
    onSuccess: () => {
      toast.success("数据采集已停止");
      window.location.reload();
    },
    onError: (error) => {
      toast.error(`停止失败: ${error.message}`);
    },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated, loading]);

  const handleExportComments = async () => {
    setIsExporting(true);
    try {
      const result = await refetchCommentExport();
      if (result.data?.csv) {
        downloadCSV(result.data.csv, result.data.filename);
        toast.success("评论数据导出成功");
      }
    } catch (error) {
      toast.error("导出失败，请重试");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSentiment = async () => {
    setIsExporting(true);
    try {
      const result = await refetchSentimentExport();
      if (result.data?.csv) {
        downloadCSV(result.data.csv, result.data.filename);
        toast.success("情感分析数据导出成功");
      }
    } catch (error) {
      toast.error("导出失败，请重试");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading || taskLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background">
        <header className="relative border-b border-cyan-400/20 bg-slate-900/50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <a href="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              返回
            </a>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="tech-card text-center py-12">
            <p className="text-slate-400">任务不存在或已被删除</p>
          </div>
        </main>
      </div>
    );
  }

  const platforms = JSON.parse(task.platforms);

  const sentimentCounts = sentimentData?.reduce(
    (acc, item) => {
      if (item.sentiment === "positive") acc.positive++;
      else if (item.sentiment === "negative") acc.negative++;
      else acc.neutral++;
      return acc;
    },
    { positive: 0, negative: 0, neutral: 0 }
  ) || { positive: 0, negative: 0, neutral: 0 };

  const totalSentiment = sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral;

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tl from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative border-b border-cyan-400/20 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <a href="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </a>
              <div>
                <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  {task.keyword}
                </h1>
                <p className="text-slate-400 text-sm mt-1">{platforms.join(" • ")}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => startCollectionMutation.mutate({ taskId })}
                disabled={startCollectionMutation.isPending}
                className="gap-2 btn-glow btn-glow-primary"
              >
                {startCollectionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                开始采集
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  isActive
                    ? stopCollectionMutation.mutate({ taskId })
                    : updateTaskMutation.mutate({ taskId, status: "active" })
                }
                disabled={stopCollectionMutation.isPending}
                className={`gap-2 ${!isActive ? "btn-glow btn-glow-primary" : ""}`}
              >
                {isActive ? (
                  <>
                    <Pause className="w-4 h-4" />
                    暂停
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    继续
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10"
                disabled={isExporting}
                onClick={handleExportComments}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                导出评论
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10"
                disabled={isExporting}
                onClick={handleExportSentiment}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                导出分析
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Collection Progress */}
        {collectionProgress && (collectionProgress.status === 'processing' || collectionProgress.status === 'running') && (
          <div className="tech-card mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold gradient-text">采集进度</h3>
                <p className="text-sm text-slate-400">
                  已采集 {collectionProgress.collectedCount} 条，已处理 {collectionProgress.processedComments} 条
                </p>
              </div>
              <div className="text-2xl font-bold gradient-text">
                {collectionProgress.progress}%
              </div>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-4 overflow-hidden border border-cyan-400/20">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-600 h-4 rounded-full shadow-lg shadow-cyan-500/50 transition-all duration-500"
                style={{ width: `${collectionProgress.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="tech-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">总评论数</p>
                <div className="text-3xl font-bold gradient-text">{comments?.length || 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
          </div>

          <div className="tech-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">正面评论</p>
                <div className="text-3xl font-bold text-green-400">{sentimentCounts.positive}</div>
                {totalSentiment > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    占比 {((sentimentCounts.positive / totalSentiment) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-600/20">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>

          <div className="tech-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">中性评论</p>
                <div className="text-3xl font-bold text-slate-400">{sentimentCounts.neutral}</div>
                {totalSentiment > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    占比 {((sentimentCounts.neutral / totalSentiment) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-slate-500/20 to-slate-600/20">
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="tech-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">负面评论</p>
                <div className="text-3xl font-bold text-red-400">{sentimentCounts.negative}</div>
                {totalSentiment > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    占比 {((sentimentCounts.negative / totalSentiment) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-red-500/20 to-pink-600/20">
                <TrendingUp className="w-5 h-5 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-cyan-400/20 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">
              概览
            </TabsTrigger>
            <TabsTrigger value="comments" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">
              评论
            </TabsTrigger>
            <TabsTrigger value="analysis" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">
              分析
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="tech-card">
                <CardHeader>
                  <CardTitle className="gradient-text">情感分布饼图</CardTitle>
                  <CardDescription>已分析评论的情感分布统计</CardDescription>
                </CardHeader>
                <CardContent>
                  <SentimentPieChart
                    positive={sentimentCounts.positive}
                    neutral={sentimentCounts.neutral}
                    negative={sentimentCounts.negative}
                  />
                </CardContent>
              </div>

              <div className="tech-card">
                <CardHeader>
                  <CardTitle className="gradient-text">情感分布进度条</CardTitle>
                  <CardDescription>各类情感的详细比例</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-3">
                    <span className="text-sm font-medium text-white">正面</span>
                    <span className="text-sm text-slate-400">
                      {sentimentCounts.positive} ({totalSentiment > 0 ? ((sentimentCounts.positive / totalSentiment) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden border border-cyan-400/20">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full shadow-lg shadow-green-500/50"
                      style={{
                        width: totalSentiment > 0 ? `${(sentimentCounts.positive / totalSentiment) * 100}%` : "0%",
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-3">
                    <span className="text-sm font-medium text-white">中性</span>
                    <span className="text-sm text-slate-400">
                      {sentimentCounts.neutral} ({totalSentiment > 0 ? ((sentimentCounts.neutral / totalSentiment) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden border border-cyan-400/20">
                    <div
                      className="bg-gradient-to-r from-slate-500 to-slate-600 h-3 rounded-full shadow-lg shadow-slate-500/50"
                      style={{
                        width: totalSentiment > 0 ? `${(sentimentCounts.neutral / totalSentiment) * 100}%` : "0%",
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-3">
                    <span className="text-sm font-medium text-white">负面</span>
                    <span className="text-sm text-slate-400">
                      {sentimentCounts.negative} ({totalSentiment > 0 ? ((sentimentCounts.negative / totalSentiment) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden border border-cyan-400/20">
                    <div
                      className="bg-gradient-to-r from-red-500 to-pink-600 h-3 rounded-full shadow-lg shadow-red-500/50"
                      style={{
                        width: totalSentiment > 0 ? `${(sentimentCounts.negative / totalSentiment) * 100}%` : "0%",
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </div>
            </div>

            <div className="tech-card">
              <CardHeader>
                <CardTitle className="gradient-text">情感趋势分析</CardTitle>
                <CardDescription>情感随时间变化趋势</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex justify-end gap-2">
                  <Button
                    variant={dateRange === 7 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange(7)}
                    className="text-xs"
                  >
                    7天
                  </Button>
                  <Button
                    variant={dateRange === 30 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange(30)}
                    className="text-xs"
                  >
                    30天
                  </Button>
                </div>
                <SentimentTrendChart
                  stats={sentimentTrendData || []}
                />
              </CardContent>
            </div>
          </TabsContent>

          <TabsContent value="comments" className="space-y-6">
            <div className="tech-card">
              <CardHeader>
                <CardTitle className="gradient-text">最新评论</CardTitle>
                <CardDescription>来自各平台的最新评论和帖子</CardDescription>
              </CardHeader>
              <CardContent>
                {!comments || comments.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">暂无评论数据</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border-b border-cyan-400/10 pb-4 last:border-0 hover:bg-slate-800/30 p-3 rounded-lg transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-white">@{comment.author}</p>
                            <p className="text-xs text-cyan-400">{comment.platform.toUpperCase()}</p>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(comment.publishedAt || comment.collectedAt).toLocaleDateString("zh-CN")}
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{comment.content}</p>
                        <div className="flex gap-4 text-xs text-slate-500">
                          <span>👍 {comment.likes}</span>
                          <span>💬 {comment.replies}</span>
                          <span>🔄 {comment.shares}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="tech-card">
              <CardHeader>
                <CardTitle className="gradient-text">关键词分析</CardTitle>
                <CardDescription>从评论中提取的高频关键词</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-slate-400 py-8">关键词分析功能即将上线</p>
              </CardContent>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
