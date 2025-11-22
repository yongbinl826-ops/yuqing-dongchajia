import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { APP_TITLE } from "@/const";

export default function CreateTask() {
  const { isAuthenticated, loading } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [description, setDescription] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["twitter"]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTaskMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
    onError: (error) => {
      alert(`创建失败: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated, loading]);

  const handlePlatformChange = (platform: string, checked: boolean) => {
    if (checked) {
      setPlatforms([...platforms, platform]);
    } else {
      setPlatforms(platforms.filter(p => p !== platform));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keyword.trim()) {
      alert("请输入监控关键词");
      return;
    }

    if (platforms.length === 0) {
      alert("请至少选择一个数据源");
      return;
    }

    setIsSubmitting(true);
    createTaskMutation.mutate({
      keyword: keyword.trim(),
      description: description.trim(),
      platforms: platforms as any,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tl from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative border-b border-cyan-400/20 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <a href="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            返回
          </a>
          <div>
            <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              新建监控任务
            </h1>
            <p className="text-slate-400 text-sm mt-1">开始监控您关心的话题和关键词</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="tech-card">
          <CardHeader>
            <CardTitle className="text-2xl">任务配置</CardTitle>
            <CardDescription>
              填写以下信息创建一个新的舆情监控任务
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Keyword Input */}
              <div className="space-y-3">
                <Label htmlFor="keyword" className="text-base font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  监控关键词 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="keyword"
                  placeholder="例如：人工智能、ChatGPT、舆情监控"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  disabled={isSubmitting}
                  className="h-11 bg-slate-800/50 border-cyan-400/30 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-cyan-400/20"
                />
                <p className="text-xs text-slate-400">
                  输入您想要监控的关键词，系统将从多个平台采集相关内容
                </p>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <Label htmlFor="description" className="text-base font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  任务描述
                </Label>
                <Textarea
                  id="description"
                  placeholder="例如：监控关于我们新产品发布的舆论反应"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  rows={4}
                  className="resize-none bg-slate-800/50 border-cyan-400/30 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-cyan-400/20"
                />
                <p className="text-xs text-slate-400">
                  可选项。添加描述以便日后查阅任务的目的
                </p>
              </div>

              {/* Platform Selection */}
              <div className="space-y-4">
                <Label className="text-base font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  监控数据源 <span className="text-red-400">*</span>
                </Label>
                <div className="space-y-3 bg-slate-800/30 p-6 rounded-xl border border-cyan-400/20">
                  <div className="flex items-center space-x-4 p-4 rounded-lg bg-slate-800/50 border border-cyan-400/10 hover:border-cyan-400/30 transition-all">
                    <Checkbox
                      id="twitter"
                      checked={platforms.includes("twitter")}
                      onCheckedChange={(checked) =>
                        handlePlatformChange("twitter", checked as boolean)
                      }
                      disabled={isSubmitting}
                      className="border-cyan-400/50"
                    />
                    <Label htmlFor="twitter" className="font-medium cursor-pointer flex-1">
                      <div className="text-white">Twitter</div>
                      <p className="text-xs text-slate-400 font-normal">
                        使用 Twitter API 采集英文和中文推文
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-4 p-4 rounded-lg bg-slate-800/50 border border-cyan-400/10 hover:border-cyan-400/30 transition-all">
                    <Checkbox
                      id="reddit"
                      checked={platforms.includes("reddit")}
                      onCheckedChange={(checked) =>
                        handlePlatformChange("reddit", checked as boolean)
                      }
                      disabled={isSubmitting}
                      className="border-cyan-400/50"
                    />
                    <Label htmlFor="reddit" className="font-medium cursor-pointer flex-1">
                      <div className="text-white">Reddit</div>
                      <p className="text-xs text-slate-400 font-normal">
                        采集Reddit热门帖子和讨论（推荐）
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-4 p-4 rounded-lg bg-slate-800/50 border border-cyan-400/10 hover:border-cyan-400/30 transition-all">
                    <Checkbox
                      id="youtube"
                      checked={platforms.includes("youtube")}
                      onCheckedChange={(checked) =>
                        handlePlatformChange("youtube", checked as boolean)
                      }
                      disabled={isSubmitting}
                      className="border-cyan-400/50"
                    />
                    <Label htmlFor="youtube" className="font-medium cursor-pointer flex-1">
                      <div className="text-white">YouTube</div>
                      <p className="text-xs text-slate-400 font-normal">
                        采集YouTube视频和评论（推荐）
                      </p>
                    </Label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-6 border-t border-cyan-400/10">
                <a href="/dashboard" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10"
                    disabled={isSubmitting}
                  >
                    取消
                  </Button>
                </a>
                <Button
                  type="submit"
                  className="flex-1 btn-glow btn-glow-primary gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? "创建中..." : "创建任务"}
                </Button>
              </div>
            </form>
          </CardContent>
        </div>
      </main>
    </div>
  );
}
