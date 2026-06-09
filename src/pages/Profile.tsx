import { useState } from "react"
import { useStore } from "@/store"
import { useCourseStore } from "@/store/course"
import { Settings2, LogOut, GraduationCap, BookOpen, Shield, Bell } from "lucide-react"
import type { UserRole } from "@/store/course"

const ROLE_LABELS: Record<UserRole, string> = {
  teacher: '教师',
  student: '学生',
  admin: '管理员',
}

export default function Profile() {
  const { preferences, updatePreferences } = useStore()
  const currentUser = useCourseStore((state) => state.currentUser)
  const logout = useCourseStore.getState().logout

  const roleColor = currentUser?.role === 'teacher' ? 'text-orange-400' : currentUser?.role === 'admin' ? 'text-red-400' : 'text-blue-400'
  const roleBg = currentUser?.role === 'teacher' ? 'bg-orange-500/20' : currentUser?.role === 'admin' ? 'bg-red-500/20' : 'bg-blue-500/20'

  return (
    <div className="p-4 h-full flex flex-col overflow-y-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">我的</h1>
        <button className="p-2 bg-surface rounded-full text-gray-500 hover:text-gray-900">
          <Settings2 size={18} />
        </button>
      </div>

      <div className="bg-surface rounded-2xl p-4 border border-gray-200">
        {currentUser ? (
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${roleBg} flex items-center justify-center ${roleColor}`}>
              {currentUser.role === 'teacher' ? <GraduationCap size={24} /> :
               currentUser.role === 'admin' ? <Shield size={24} /> : <BookOpen size={24} />}
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-gray-900">{currentUser.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${roleBg} ${roleColor}`}>
                  {ROLE_LABELS[currentUser.role]}
                </span>
                <span className="text-[10px] text-gray-500">{currentUser.courseIds.length} 门课程</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-red-500 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">未登录</p>
            <p className="text-[10px] text-gray-400 mt-0.5">返回首页选择角色登录</p>
          </div>
        )}
      </div>

      {currentUser && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1.5">
            <Bell size={14} className="text-yellow-400" />
            通知设置
          </h2>
          <div className="bg-surface rounded-2xl border border-gray-200 divide-y divide-gray-200/50">
            <ToggleItem label="资料更新通知" defaultChecked={true} />
            <ToggleItem label="作业截止提醒" defaultChecked={true} />
            <ToggleItem label="作业批改通知" defaultChecked={true} />
          </div>
        </section>
      )}
    </div>
  )
}

function ToggleItem({ label, defaultChecked }: { label: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked)
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-gray-700">{label}</span>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${checked ? 'bg-theme' : 'bg-gray-300'}`}
      >
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}
