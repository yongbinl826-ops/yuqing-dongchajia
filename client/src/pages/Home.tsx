import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { APP_TITLE, getLoginUrl } from "@/const";
import { BarChart3, TrendingUp, MessageSquare, Zap, ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      window.location.href = "/dashboard";
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tl from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative border-b border-cyan-400/20 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">{APP_TITLE}</span>
          </div>
          <a href={getLoginUrl()}>
            <Button className="btn-glow btn-glow-primary">
              登录
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-400/10 border border-cyan-400/30 mb-6">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-400 font-semibold">AI 驱动的舆情监控平台</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">实时舆情</span>
            <br />
            <span className="text-white">监控与分析</span>
          </h1>

          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            一站式监控 Twitter、微博、知乎等平台的舆论动向。
            <br />
            使用 AI 技术进行精准情感分析和趋势预测
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/dashboard">
              <Button size="lg" className="btn-glow btn-glow-primary text-lg px-8 py-6">
                开始使用
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10">
              了解更多
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {/* Feature 1 */}
          <div className="tech-card group">
            <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 w-fit mb-4 group-hover:from-cyan-500/40 group-hover:to-blue-600/40 transition-all">
              <MessageSquare className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">多平台采集</h3>
            <p className="text-slate-300 leading-relaxed">
              支持从 Twitter、微博、知乎等主流平台实时采集评论和帖子，覆盖全网舆论
            </p>
            <div className="mt-4 h-1 w-12 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full group-hover:w-full transition-all duration-300"></div>
          </div>

          {/* Feature 2 */}
          <div className="tech-card group">
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-600/20 w-fit mb-4 group-hover:from-purple-500/40 group-hover:to-pink-600/40 transition-all">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">AI 情感分析</h3>
            <p className="text-slate-300 leading-relaxed">
              使用 BERT 深度学习模型对中文文本进行精准的情感分类和倾向分析
            </p>
            <div className="mt-4 h-1 w-12 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full group-hover:w-full transition-all duration-300"></div>
          </div>

          {/* Feature 3 */}
          <div className="tech-card group">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-600/20 w-fit mb-4 group-hover:from-blue-500/40 group-hover:to-cyan-600/40 transition-all">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">数据可视化</h3>
            <p className="text-slate-300 leading-relaxed">
              交互式图表展示情感分布、趋势变化和关键词分析，洞察舆论动向
            </p>
            <div className="mt-4 h-1 w-12 bg-gradient-to-r from-blue-400 to-cyan-600 rounded-full group-hover:w-full transition-all duration-300"></div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="tech-card text-center">
            <div className="text-4xl font-bold gradient-text mb-2">3</div>
            <p className="text-slate-300">支持平台</p>
          </div>
          <div className="tech-card text-center">
            <div className="text-4xl font-bold gradient-text mb-2">AI</div>
            <p className="text-slate-300">驱动分析</p>
          </div>
          <div className="tech-card text-center">
            <div className="text-4xl font-bold gradient-text mb-2">实时</div>
            <p className="text-slate-300">数据更新</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-purple-600/20"></div>
          <div className="absolute inset-0 border border-cyan-400/30 rounded-2xl"></div>
          <div className="relative p-12 text-center backdrop-blur-sm">
            <h2 className="text-4xl font-bold text-white mb-4">
              准备好深入舆情分析了吗？
            </h2>
            <p className="text-lg text-slate-300 mb-8">
              立即登录，创建您的第一个舆情监控任务，开始实时监控和分析
            </p>
            <a href="/dashboard">
              <Button size="lg" className="btn-glow btn-glow-primary text-lg px-8 py-6">
                立即开始
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-cyan-400/20 bg-slate-900/50 backdrop-blur-md mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400">
          <p>© 2024 {APP_TITLE}. 保留所有权利。</p>
        </div>
      </footer>
    </div>
  );
}
