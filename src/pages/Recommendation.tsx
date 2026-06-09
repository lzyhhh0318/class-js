import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "@/store";
import { ArrowLeft, Play, Loader2, Target, Pin, ListTodo } from "lucide-react";

export default function Recommendation() {
  const navigate = useNavigate();
  const { timeMinutes, scene, recommendation, isLoading, resetRecommendation } = useStore();

  useEffect(() => {
    if (!timeMinutes) {
      navigate("/");
    }
  }, [timeMinutes, navigate]);

  const handleBack = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    resetRecommendation();
    navigate("/");
  };

  const handleStart = () => {
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    navigate("/execution");
  };

  if (isLoading || !recommendation) {
    return (
      <main className="w-full max-w-md mx-auto min-h-screen flex flex-col items-center justify-center px-6 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center"
        >
          <Loader2 className="w-12 h-12 text-theme animate-spin mb-6" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">正在为你调度...</h2>
          <p className="text-gray-500 text-sm">
            结合任务库 • {timeMinutes} 分钟 • {scene} 场景
          </p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-md mx-auto min-h-screen flex flex-col px-6 py-8 relative">
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={handleBack}
        className="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-8 w-fit"
      >
        <ArrowLeft size={20} className="mr-2" />
        返回重选
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="flex-1 flex flex-col"
      >
        <div className="bg-surface rounded-3xl p-8 shadow-2xl border border-gray-200/50 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-theme/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="mb-8">
            <div className="flex items-center text-theme mb-3">
              <Target size={20} className="mr-2" />
              <h3 className="font-bold tracking-wide uppercase text-sm">最优推荐</h3>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
              {recommendation.taskName}
            </h1>
            {recommendation.sourceTaskId && (
              <span className="inline-block mt-3 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                来自你的任务库
              </span>
            )}
          </div>

          <div className="mb-8">
            <div className="flex items-center text-gray-500 mb-3">
              <Pin size={18} className="mr-2" />
              <h3 className="font-semibold text-sm">推荐理由</h3>
            </div>
            <p className="text-gray-700 bg-gray-100 p-4 rounded-2xl border border-gray-200 leading-relaxed">
              {recommendation.reason}
            </p>
          </div>

          <div>
            <div className="flex items-center text-gray-500 mb-4">
              <ListTodo size={18} className="mr-2" />
              <h3 className="font-semibold text-sm">执行步骤 (3步)</h3>
            </div>
            <ul className="space-y-3">
              {recommendation.steps.map((step, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="flex items-start text-gray-700"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-theme flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleStart}
          className="w-full bg-theme text-white font-bold text-lg py-5 rounded-full shadow-[0_0_20px_rgba(0,255,136,0.3)] flex items-center justify-center mb-6 mt-auto"
        >
          <Play size={24} className="mr-2" fill="currentColor" />
          开始专注执行
        </motion.button>
      </motion.div>
    </main>
  );
}