import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { BookOpen, ClipboardList, Brain, Home, User, Compass, Radio } from "lucide-react";
import { useCourseStore } from "@/store/course";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useCourseStore((s) => s.currentUser);

  const livePath = currentUser?.role === 'teacher' ? '/teacher-live' : '/live';

  const NAV_ITEMS = [
    { path: "/", icon: <Home size={20} />, label: "首页" },
    { path: "/materials", icon: <BookOpen size={20} />, label: "课程资料" },
    { path: "/assignments", icon: <ClipboardList size={20} />, label: "作业管理" },
    { path: "/ai-parse", icon: <Brain size={20} />, label: "AI解析" },
    { path: livePath, icon: <Radio size={20} />, label: "直播课堂" },
    { path: "/profile", icon: <User size={20} />, label: "设置" },
  ];

  return (
    <div className="w-full min-h-screen flex flex-col relative bg-background">
      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-surface border-r border-zinc-200 z-50 shadow-sm">
        <div className="px-6 py-5 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Compass className="text-theme" size={24} />
            <div>
              <h1 className="text-lg font-bold text-main tracking-tight">智能软工平台</h1>
              <p className="text-[11px] text-zinc-500">AI驱动的工程教育</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all text-left ${
                  isActive
                    ? "bg-blue-50 text-theme font-medium"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                {item.icon}
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-zinc-100">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-3 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Compass size={16} />
                  <span className="text-xs font-medium">AI助教</span>
                </div>
              </div>
              <p className="text-[11px] opacity-90">获取学习帮助和答疑。</p>
            </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0 ml-0 md:ml-64">
        <Outlet />
      </div>

      {/* 移动端底部导航栏 */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-surface/95 backdrop-blur-md border-t border-zinc-200 pb-safe z-50">
        <div className="flex justify-around items-center h-16">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  navigate(item.path);
                }}
                className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 transition-colors ${
                  isActive ? "text-theme" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
