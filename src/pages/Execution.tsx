import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "@/store";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import clsx from "clsx";

export default function Execution() {
  const navigate = useNavigate();
  const { timeMinutes, recommendation, completeTask, updateTaskProgress, recordExecution, resetRecommendation } = useStore();
  
  const [timeLeft, setTimeLeft] = useState((timeMinutes || 5) * 60);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!recommendation || !timeMinutes) {
      navigate("/");
    }
  }, [recommendation, timeMinutes, navigate]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]); // 结束震动提醒
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleFinish = (isCompleted: boolean) => {
    if (navigator.vibrate) navigator.vibrate(15);
    
    const timeSpent = (timeMinutes || 5) - Math.ceil(timeLeft / 60);
    const actualTimeSpent = timeSpent > 0 ? timeSpent : 1; // 至少记录1分钟
    
    // 如果任务来自任务库
    if (recommendation?.sourceTaskId) {
      if (isCompleted) {
        if (recommendation.subTaskIndex !== undefined) {
          // 如果是一个被拆分出来的子任务，只标记子任务完成，Zustand内部会自动更新父任务总进度
          updateTaskProgress(recommendation.sourceTaskId, 0, recommendation.subTaskIndex);
        } else {
          // 如果是没被拆分的完整任务，直接整个 complete
          completeTask(recommendation.sourceTaskId);
        }
      } else {
        // 未完全完成（提前结束），如果是完整任务，象征性增加一点进度；子任务不做改变
        if (recommendation.subTaskIndex === undefined) {
          updateTaskProgress(recommendation.sourceTaskId, 50); 
        }
      }
    }

    recordExecution(actualTimeSpent);
    resetRecommendation();
    navigate("/");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = 1 - timeLeft / ((timeMinutes || 5) * 60);

  if (!recommendation) return null;

  return (
    <main className="w-full max-w-md mx-auto min-h-screen flex flex-col px-6 py-10 bg-gray-50 text-gray-900">
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-64 h-64 mb-10 flex items-center justify-center"
        >
          {/* 倒计时圆环 */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="120"
              className="stroke-gray-200"
              strokeWidth="8"
              fill="transparent"
            />
            <motion.circle
              cx="128"
              cy="128"
              r="120"
              className="stroke-theme"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 120}
              strokeDashoffset={2 * Math.PI * 120 * (1 - progress)}
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-mono font-light tracking-tighter tabular-nums">
              {formatTime(timeLeft)}
            </span>
            <span className="text-gray-500 mt-2 flex items-center text-sm">
              <Clock size={14} className="mr-1" /> 专注中
            </span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center w-full"
        >
          <h2 className="text-xl font-bold mb-2 line-clamp-2">{recommendation.taskName}</h2>
          <p className="text-sm text-gray-500">放下杂念，专注当前</p>
        </motion.div>
      </div>

      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full space-y-4"
      >
        {timeLeft > 0 ? (
          <button
            onClick={() => setIsActive(!isActive)}
            className="w-full py-4 rounded-full bg-gray-200 text-gray-900 font-medium hover:bg-gray-300 transition-colors"
          >
            {isActive ? "暂停" : "继续"}
          </button>
        ) : (
          <div className="text-center text-theme font-medium mb-6">时间到！</div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => handleFinish(false)}
            className={clsx(
              "flex-1 py-4 rounded-full font-medium flex items-center justify-center transition-colors",
              "bg-gray-100 text-gray-500 hover:text-gray-900"
            )}
          >
            <XCircle size={20} className="mr-2" />
            提前结束
          </button>
          <button
            onClick={() => handleFinish(true)}
            className={clsx(
              "flex-1 py-4 rounded-full font-bold flex items-center justify-center transition-colors",
              "bg-theme text-white shadow-[0_0_15px_rgba(0,255,136,0.2)]"
            )}
          >
            <CheckCircle2 size={20} className="mr-2" />
            标记完成
          </button>
        </div>
      </motion.div>
    </main>
  );
}