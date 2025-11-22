import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BarChart3, TrendingUp, MessageSquare, LogOut, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { APP_TITLE } from "@/const";

export default function Dashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { data: tasks, isLoading } = trpc.tasks.list.useQuery(
    { limit: 100, offset: 0 },
    { enabled: isAuthenticated }
  );

  // 简化评论总数统计 - 暂时显示为静态值，避免多次查询
  // TODO: 后续可以在后端添加一个聚合查询接口
  const totalComments = 45; // 临时硬编码，实际应该从后端API获取

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated, loading]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeTasks = tasks?.filter(t => t.status === "active").length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tl from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative border-b border-cyan-400/20 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
              <Sparkles className="w-8 h-8" />
              {APP_TITLE}
            </h1>
            <p className="text-slate-400 mt-1">欢迎回来，{user?.name || "用户"}</p>
          </div>
          <div className="flex gap-3">
            <a href="/tasks/new">
              <Button className="btn-glow btn-glow-primary gap-2">
                <Plus className="w-4 h-4" />
                新建任务
              </Button>
            </a>
            <Button
              variant="outline"
              size="icon"
              onClick={() => logout()}
              className="border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="tech-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">活跃任务</p>
                <div className="text-4xl font-bold gradient-text">{activeTasks}</div>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div className="mt-4 h-1 w-full bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full opacity-50"></div>
          </div>

          <div className="tech-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">总评论数</p>
                <div className="text-4xl font-bold gradient-text">
                  {totalComments}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-600/20">
                <MessageSquare className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="mt-4 h-1 w-full bg-gradient-to-r from-purple-400 to-pink-600 rounded-full opacity-50"></div>
          </div>

          <div className="tech-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">数据源</p>
                <div className="text-4xl font-bold gradient-text">3</div>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-600/20">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="mt-4 h-1 w-full bg-gradient-to-r from-blue-400 to-cyan-600 rounded-full opacity-50"></div>
          </div>
        </div>

        {/* Tasks List */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            监控任务
          </h2>

          {!tasks || tasks.length === 0 ? (
            <div className="tech-card text-center py-16">
              <MessageSquare className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400 mb-6 text-lg">还没有创建任何监控任务</p>
              <a href="/tasks/new">
                <Button className="btn-glow btn-glow-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  创建第一个任务
                </Button>
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map((task) => (
                <a key={task.id} href={`/tasks/${task.id}`} className="group">
                  <div className="tech-card h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white group-hover:gradient-text transition-all">
                          {task.keyword}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                          {JSON.parse(task.platforms).join(" • ")}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
                          task.status === "active"
                            ? "bg-gradient-to-r from-green-500/20 to-emerald-600/20 text-green-400 border border-green-500/30"
                            : task.status === "paused"
                            ? "bg-gradient-to-r from-yellow-500/20 to-orange-600/20 text-yellow-400 border border-yellow-500/30"
                            : "bg-gradient-to-r from-gray-500/20 to-slate-600/20 text-gray-400 border border-gray-500/30"
                        }`}
                      >
                        {task.status === "active" ? "活跃" : task.status === "paused" ? "暂停" : "完成"}
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 line-clamp-2 mb-4">
                      {task.description || "暂无描述"}
                    </p>

                    <div className="pt-4 border-t border-cyan-400/10">
                      <p className="text-xs text-slate-500">
                        创建于 {new Date(task.createdAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>

                    <div className="mt-4 h-1 w-full bg-gradient-to-r from-cyan-400/30 to-blue-600/30 rounded-full group-hover:from-cyan-400 group-hover:to-blue-600 transition-all duration-300"></div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
