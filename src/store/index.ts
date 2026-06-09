import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SubTask {
  title: string;
  estimatedTime: number;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  estimatedTime: number;
  priority: number;
  deadline?: string;
  status: 'pending' | 'completed';
  progress: number;
  createdAt: string;
  subtasks?: SubTask[];
}

export interface TaskRecommendation {
  sourceTaskId?: string;
  subTaskIndex?: number;
  taskName: string;
  reason: string;
  steps: string[];
}

export interface UserPreferences {
  preferShortTasks: boolean;
  preferHighPriority: boolean;
  preferNearCompletion: boolean;
  theme: 'dark' | 'light' | 'cyber';
}

export interface DailyStats {
  date: string;
  completedTasksCount: number;
  totalTimeSpent: number;
}

interface AppState {
  timeMinutes: number | null;
  scene: string;
  recommendation: TaskRecommendation | null;
  isLoading: boolean;
  abortController: AbortController | null;
  lastRecommendedTaskIds: string[];

  tasks: Task[];
  preferences: UserPreferences;
  stats: DailyStats[];

  setTimeMinutes: (time: number | null) => void;
  setScene: (scene: string) => void;
  fetchRecommendation: (time: number, scene: string) => Promise<void>;
  resetRecommendation: () => void;

  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'status' | 'progress'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  updateTaskProgress: (id: string, progress: number, subTaskIndex?: number) => void;
  cacheSubtasks: (id: string, subtasks: SubTask[]) => void;

  updatePreferences: (updates: Partial<UserPreferences>) => void;
  recordExecution: (timeSpent: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      timeMinutes: null,
      scene: '休息',
      recommendation: null,
      isLoading: false,
      tasks: [],
      abortController: null as AbortController | null,
      lastRecommendedTaskIds: [] as string[],
      preferences: {
        preferShortTasks: true,
        preferHighPriority: true,
        preferNearCompletion: true,
        theme: 'light',
      },
      stats: [],

      setTimeMinutes: (time) => set({ timeMinutes: time }),
      setScene: (scene) => set({ scene }),
      fetchRecommendation: async (time, scene) => {
    const state = get();
    
    if (state.abortController) {
      state.abortController.abort();
    }
    
    const abortController = new AbortController();
    set({ isLoading: true, recommendation: null, abortController });
    
    try {
      const pendingTasks = state.tasks.filter((t) => t.status === 'pending');

      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          timeMinutes: time, 
          scene,
          pendingTasks,
          preferences: state.preferences,
          lastRecommendedTaskIds: state.lastRecommendedTaskIds,
        }),
        signal: abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      if (data.sourceTaskId && data.newSubtasksToCache) {
        get().cacheSubtasks(data.sourceTaskId, data.newSubtasksToCache);
      }

      const updatedLastIds = data.sourceTaskId
        ? [...state.lastRecommendedTaskIds.filter(id => id !== data.sourceTaskId), data.sourceTaskId].slice(-5)
        : state.lastRecommendedTaskIds;

      set({ recommendation: data, isLoading: false, abortController: null, lastRecommendedTaskIds: updatedLastIds });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      
      console.error('Failed to fetch recommendation:', error);
      set({
        recommendation: {
          taskName: "闭目养神，深呼吸",
          reason: "系统异常，先放松一下吧",
          steps: ["1. 放下手机", "2. 闭上眼睛", "3. 深呼吸10次"]
        },
        isLoading: false,
        abortController: null
      });
    }
  },
      resetRecommendation: () => {
        const state = get();
        if (state.abortController) {
          state.abortController.abort();
        }
        set({ timeMinutes: null, recommendation: null, isLoading: false, abortController: null });
      },

      addTask: (taskData) => set((state) => ({
        tasks: [
          {
            ...taskData,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            status: 'pending',
            progress: 0,
          },
          ...state.tasks
        ]
      })),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t))
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id)
      })),
      completeTask: (id) => set((state) => ({
        tasks: state.tasks.map((t) => 
          t.id === id ? { ...t, status: 'completed', progress: 100 } : t
        )
      })),
      updateTaskProgress: (id, progress, subTaskIndex) => set((state) => {
        return {
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;

            let newProgress = Math.max(0, Math.min(100, progress));
            let newSubtasks = t.subtasks;

            if (subTaskIndex !== undefined && t.subtasks) {
              newSubtasks = [...t.subtasks];
              newSubtasks[subTaskIndex] = { ...newSubtasks[subTaskIndex], completed: true };
              
              const completedCount = newSubtasks.filter(st => st.completed).length;
              newProgress = Math.round((completedCount / newSubtasks.length) * 100);
            }

            return { 
              ...t, 
              progress: newProgress, 
              status: newProgress === 100 ? 'completed' : t.status,
              subtasks: newSubtasks
            };
          })
        };
      }),
      cacheSubtasks: (id, subtasks) => set((state) => ({
        tasks: state.tasks.map((t) => t.id === id ? { ...t, subtasks } : t)
      })),

      updatePreferences: (updates) => set((state) => ({
        preferences: { ...state.preferences, ...updates }
      })),
      recordExecution: (timeSpent) => set((state) => {
        const today = new Date().toISOString().split('T')[0];
        const existingStatIndex = state.stats.findIndex(s => s.date === today);
        
        const newStats = [...state.stats];
        if (existingStatIndex >= 0) {
          newStats[existingStatIndex] = {
            ...newStats[existingStatIndex],
            completedTasksCount: newStats[existingStatIndex].completedTasksCount + 1,
            totalTimeSpent: newStats[existingStatIndex].totalTimeSpent + timeSpent,
          };
        } else {
          newStats.push({
            date: today,
            completedTasksCount: 1,
            totalTimeSpent: timeSpent,
          });
        }
        return { stats: newStats };
      }),
    }),
    {
      name: 'ai-time-scheduler-storage',
      partialize: (state) => ({ 
        tasks: state.tasks, 
        preferences: state.preferences, 
        stats: state.stats 
      }),
    }
  )
);
