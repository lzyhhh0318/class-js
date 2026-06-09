import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, type Task } from "@/store";
import { Plus, Trash2, CheckCircle2, Circle, Clock, Flame, CalendarClock, Mic, Send, Loader2 } from "lucide-react";
import clsx from "clsx";

export default function Tasks() {
  const { tasks, addTask, updateTask, deleteTask, completeTask } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending');

  const [smartInputText, setSmartInputText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<Partial<Task>[] | null>(null);

  const recognitionRef = useRef<any>(null);

  const handleStartRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("当前浏览器不支持语音输入");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setSmartInputText(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleParseText = async () => {
    if (!smartInputText.trim()) return;
    setIsParsing(true);
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: smartInputText }),
      });
      const data = await response.json();
      if (data.tasks && data.tasks.length > 0) {
        setParsedTasks(data.tasks);
      } else {
        alert("未识别到有效任务");
      }
    } catch (error) {
      console.error("Parse error", error);
      alert("解析失败，请重试");
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmParsedTasks = (confirmedTasks: Partial<Task>[]) => {
    confirmedTasks.forEach(t => {
      if (t.title) {
        addTask({
          title: t.title,
          description: t.description,
          estimatedTime: t.estimatedTime || 15,
          priority: t.priority || 3
        });
      }
    });
    setParsedTasks(null);
    setSmartInputText("");
    setIsAdding(false);
  };

  const filteredTasks = tasks.filter((t) => t.status === filter).sort((a, b) => {
    // 优先级数值越小优先级越高 (1为最高)
    if (b.priority !== a.priority) return a.priority - b.priority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="p-6 h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">任务库</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-theme text-white p-2 rounded-full shadow-lg"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setFilter('pending')}
          className={clsx("pb-2 text-sm font-medium transition-colors", filter === 'pending' ? "text-theme border-b-2 border-theme" : "text-gray-500")}
        >
          待完成
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={clsx("pb-2 text-sm font-medium transition-colors", filter === 'completed' ? "text-theme border-b-2 border-theme" : "text-gray-500")}
        >
          已完成
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        <AnimatePresence>
          {filteredTasks.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 text-gray-500 text-sm"
            >
              没有{filter === 'pending' ? '待处理' : '已完成'}的任务
            </motion.div>
          )}
          {filteredTasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onComplete={() => completeTask(task.id)}
              onDelete={() => deleteTask(task.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* 弹窗: 添加任务 */}
      <AnimatePresence>
        {isAdding && !parsedTasks && (
          <AddTaskModal 
            onClose={() => setIsAdding(false)} 
            onAdd={addTask} 
            smartInputText={smartInputText}
            setSmartInputText={setSmartInputText}
            isRecording={isRecording}
            isParsing={isParsing}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onParseText={handleParseText}
          />
        )}
        {parsedTasks && (
          <ConfirmParsedTasksModal 
            tasks={parsedTasks} 
            onClose={() => setParsedTasks(null)} 
            onConfirm={handleConfirmParsedTasks} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskItem({ task, onComplete, onDelete }: { task: Task; onComplete: () => void; onDelete: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={clsx(
        "p-4 rounded-2xl border transition-all relative overflow-hidden",
        task.status === 'completed' ? "bg-gray-50 border-gray-200/50" : "bg-white border-gray-200"
      )}
    >
      {/* 进度条背景 */}
      {task.status === 'pending' && task.progress > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 bg-theme/5 z-0" 
          style={{ width: `${task.progress}%` }}
        />
      )}

      <div className="relative z-10 flex items-start gap-3">
        <button 
          onClick={onComplete}
          disabled={task.status === 'completed'}
          className={clsx("mt-1 flex-shrink-0", task.status === 'completed' ? "text-theme" : "text-gray-400 hover:text-theme")}
        >
          {task.status === 'completed' ? <CheckCircle2 size={22} /> : <Circle size={22} />}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className={clsx("font-medium truncate", task.status === 'completed' && "text-gray-400 line-through")}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
          )}
          
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={12} /> {task.estimatedTime} 分钟
            </span>
            {task.priority > 0 && (
              <span className="flex items-center gap-1 text-orange-400/80">
                <Flame size={12} /> P{task.priority}
              </span>
            )}
            {task.deadline && (
              <span className="flex items-center gap-1 text-blue-400/80">
                <CalendarClock size={12} /> {new Date(task.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <button 
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-200 rounded-full"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function AddTaskModal({ 
  onClose, 
  onAdd, 
  smartInputText, 
  setSmartInputText, 
  isRecording, 
  isParsing, 
  onStartRecording, 
  onStopRecording, 
  onParseText 
}: any) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [time, setTime] = useState(15);
  const [priority, setPriority] = useState(3);
  const [mode, setMode] = useState<'smart' | 'manual'>('smart');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: desc.trim() || undefined,
      estimatedTime: time,
      priority,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-gray-500/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="w-full max-w-md bg-surface border border-surfaceHover rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">新建任务</h2>
          <div className="flex space-x-2 bg-background p-1 rounded-full border border-surfaceHover">
            <button
              onClick={() => setMode('smart')}
              className={clsx("px-3 py-1 text-xs font-medium rounded-full transition-colors", mode === 'smart' ? "bg-theme text-white" : "text-muted")}
            >
              智能识别
            </button>
            <button
              onClick={() => setMode('manual')}
              className={clsx("px-3 py-1 text-xs font-medium rounded-full transition-colors", mode === 'manual' ? "bg-theme text-white" : "text-muted")}
            >
              手动录入
            </button>
          </div>
        </div>

        {mode === 'smart' ? (
          <div className="space-y-4">
            <div className="relative">
              <textarea 
                value={smartInputText}
                onChange={(e) => setSmartInputText(e.target.value)}
                placeholder="在此输入一段话，比如：'今天要写实验报告，然后复习机器学习，再整理笔记。'"
                className="w-full bg-background border border-surfaceHover rounded-xl px-4 py-3 text-main focus:outline-none focus:border-theme transition-colors resize-none h-32 text-sm leading-relaxed"
              />
              <button 
                onClick={isRecording ? onStopRecording : onStartRecording}
                className={clsx(
                  "absolute right-3 bottom-3 p-2 rounded-full transition-all shadow-lg",
                  isRecording ? "bg-red-500 text-white animate-pulse" : "bg-surfaceHover text-theme"
                )}
              >
                <Mic size={18} />
              </button>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-medium text-muted bg-background hover:bg-surfaceHover border border-surfaceHover transition-colors"
              >
                取消
              </button>
              <button 
                onClick={onParseText}
                disabled={!smartInputText.trim() || isParsing}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-theme disabled:opacity-50 transition-colors flex justify-center items-center"
              >
                {isParsing ? <Loader2 size={20} className="animate-spin" /> : <><Send size={16} className="mr-2" /> 智能解析</>}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1 ml-1">任务名称</label>
              <input 
                autoFocus
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-background border border-surfaceHover rounded-xl px-4 py-3 text-main focus:outline-none focus:border-theme transition-colors"
                placeholder="例如: 看完一本电子书的一章"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1 ml-1">补充描述 (选填)</label>
              <textarea 
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full bg-background border border-surfaceHover rounded-xl px-4 py-3 text-main focus:outline-none focus:border-theme transition-colors resize-none h-20"
                placeholder="任务详情..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted mb-1 ml-1">预计耗时(分钟)</label>
                <input 
                  type="number" 
                  min="1"
                  value={time}
                  onChange={(e) => setTime(Number(e.target.value))}
                  className="w-full bg-background border border-surfaceHover rounded-xl px-4 py-3 text-main focus:outline-none focus:border-theme transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1 ml-1">优先级 (1-5)</label>
                <select 
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full bg-background border border-surfaceHover rounded-xl px-4 py-3 text-main focus:outline-none focus:border-theme transition-colors appearance-none"
                >
                  {[1,2,3,4,5].map(p => <option key={p} value={p}>P{p} {p===1?'(最高)':p===5?'(最低)':' '}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-medium text-muted bg-background hover:bg-surfaceHover border border-surfaceHover transition-colors"
              >
                取消
              </button>
              <button 
                type="submit" 
                disabled={!title.trim()}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-theme disabled:opacity-50 transition-colors"
              >
                保存
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

function ConfirmParsedTasksModal({ tasks, onClose, onConfirm }: any) {
  const [editingTasks, setEditingTasks] = useState<any[]>(tasks);

  const handleUpdate = (index: number, field: string, value: any) => {
    const updated = [...editingTasks];
    updated[index] = { ...updated[index], [field]: value };
    setEditingTasks(updated);
  };

  const handleDelete = (index: number) => {
    setEditingTasks(editingTasks.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-gray-500/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="w-full max-w-md bg-surface border border-surfaceHover rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]"
      >
        <h2 className="text-xl font-bold mb-2">确认识别结果</h2>
        <p className="text-xs text-muted mb-4">请核对或修改 AI 拆解的任务</p>

        <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
          {editingTasks.map((t, idx) => (
            <div key={idx} className="bg-background border border-surfaceHover p-4 rounded-2xl relative">
              <button onClick={() => handleDelete(idx)} className="absolute top-3 right-3 text-muted hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
              <div className="pr-6 mb-3">
                <input 
                  value={t.title} 
                  onChange={(e) => handleUpdate(idx, 'title', e.target.value)}
                  className="w-full bg-transparent font-medium text-main border-b border-transparent focus:border-theme outline-none"
                  placeholder="任务名称"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-muted mb-1 block">耗时(分)</label>
                  <input 
                    type="number" value={t.estimatedTime || 15}
                    onChange={(e) => handleUpdate(idx, 'estimatedTime', Number(e.target.value))}
                    className="w-full bg-surface border border-surfaceHover rounded-lg px-2 py-1.5 text-xs text-main focus:outline-none focus:border-theme"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-muted mb-1 block">优先级(1高-5低)</label>
                  <select 
                    value={t.priority || 3}
                    onChange={(e) => handleUpdate(idx, 'priority', Number(e.target.value))}
                    className="w-full bg-surface border border-surfaceHover rounded-lg px-2 py-1.5 text-xs text-main focus:outline-none focus:border-theme appearance-none"
                  >
                    {[1,2,3,4,5].map(p => <option key={p} value={p}>P{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
          {editingTasks.length === 0 && (
            <div className="text-center text-muted py-10 text-sm">所有任务已被删除</div>
          )}
        </div>

        <div className="flex gap-3 mt-auto pt-2 border-t border-surfaceHover">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-medium text-muted bg-background hover:bg-surfaceHover border border-surfaceHover transition-colors"
          >
            取消
          </button>
          <button 
            onClick={() => onConfirm(editingTasks)}
            disabled={editingTasks.length === 0}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-theme disabled:opacity-50 transition-colors"
          >
            确认导入 ({editingTasks.length})
          </button>
        </div>
      </motion.div>
    </div>
  );
}