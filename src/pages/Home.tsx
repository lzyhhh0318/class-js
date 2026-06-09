import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCourseStore, type UserRole } from '@/store/course'
import { useStore } from '@/store'
import {
  BookOpen, ClipboardList, FileText, Video,
  Clock, Users, GraduationCap, Shield,
  Radio, Compass, MessageCircle, Send, Loader2
} from 'lucide-react'

const ROLE_LABELS: Record<UserRole, string> = {
  teacher: '教师',
  student: '学生',
  admin: '管理员',
}

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  teacher: <GraduationCap size={16} />,
  student: <BookOpen size={16} />,
  admin: <Shield size={16} />,
}

export default function Home() {
  const { preferences } = useStore()
  const navigate = useNavigate()
  const currentUser = useCourseStore((state) => state.currentUser)
  const courses = useCourseStore((state) => state.courses)
  const materials = useCourseStore((state) => state.materials)
  const assignments = useCourseStore((state) => state.assignments)
  const fetchCourses = useCourseStore((state) => state.fetchCourses)
  const fetchMaterials = useCourseStore((state) => state.fetchMaterials)
  const fetchAssignments = useCourseStore((state) => state.fetchAssignments)
  const login = useCourseStore((state) => state.login)
  const askQuestion = useCourseStore((state) => state.askQuestion)

  const [showLogin, setShowLogin] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [isAsking, setIsAsking] = useState(false)

  useEffect(() => {
    fetchCourses()
    fetchMaterials()
    fetchAssignments()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const coursewareCount = materials.filter(m => m.category === 'courseware').length
  const recordingCount = materials.filter(m => m.category === 'recording').length
  const totalAssignments = assignments.length
  const activeAssignments = assignments.filter(a => a.status === 'active').length
  const parsedCount = materials.filter(m => m.parsedContent).length
  const recentCourseware = materials.filter(m => m.category === 'courseware').slice(0, 2)
  const recentAssignments = assignments.filter(a => a.status === 'active').slice(0, 2)

  const goToLiveRoom = (courseId: string) => {
    const path = currentUser?.role === 'teacher' ? '/teacher-live' : '/live'
    navigate(`${path}?courseId=${courseId}`)
  }

  const quickStats = [
    { label: '课程数', value: courses.length, icon: <BookOpen size={18} />, color: 'bg-blue-50 text-blue-500' },
    { label: '课件数', value: coursewareCount, icon: <FileText size={18} />, color: 'bg-orange-50 text-orange-500' },
    { label: '录像数', value: recordingCount, icon: <Video size={18} />, color: 'bg-purple-50 text-purple-500' },
    { label: '进行中作业', value: activeAssignments, icon: <ClipboardList size={18} />, color: 'bg-green-50 text-green-500' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-surface border-b border-zinc-200 px-6 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-100 rounded-lg">
              <Compass size={16} className="text-zinc-600" />
            </div>
            <span className="text-sm font-medium text-main">平台主界面 - 智能软工课程平台</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-md text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              {currentUser ? (
                <>
                  <span className="flex items-center gap-1">
                    {ROLE_ICONS[currentUser.role]}
                    <span>{currentUser.name}</span>
                  </span>
                </>
              ) : (
                <>
                  <Users size={14} className="text-zinc-600" />
                  <span>切换角色</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-zinc-900 leading-tight">
                    欢迎回来,<br />
                    <span className="text-theme">
                      {currentUser ? currentUser.name : '访客'}.
                    </span>
                  </h1>
                  <p className="text-sm text-zinc-500 mt-2">准备好掌握AI驱动的架构了吗？</p>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded border border-blue-100">课程信息</div>
                  <div className="px-3 py-1.5 bg-green-50 text-green-600 text-xs font-medium rounded border border-green-100">直播状态</div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-900">我的课程</h2>
                <a href="/materials" className="text-xs text-theme hover:underline">课程资料 →</a>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {courses.length > 0 ? courses.map((course, idx) => {
                  const gradients = [
                    'from-blue-50 to-indigo-50',
                    'from-green-50 to-emerald-50',
                    'from-purple-50 to-violet-50',
                    'from-orange-50 to-amber-50',
                    'from-rose-50 to-pink-50',
                    'from-cyan-50 to-teal-50',
                  ]
                  const borderColors = [
                    'border-blue-100',
                    'border-green-100',
                    'border-purple-100',
                    'border-orange-100',
                    'border-rose-100',
                    'border-cyan-100',
                  ]
                  const dotColors = [
                    'bg-blue-400',
                    'bg-green-400',
                    'bg-purple-400',
                    'bg-orange-400',
                    'bg-rose-400',
                    'bg-cyan-400',
                  ]
                  const textColors = [
                    'text-blue-500',
                    'text-green-500',
                    'text-purple-500',
                    'text-orange-500',
                    'text-rose-500',
                    'text-cyan-500',
                  ]
                  const icons = ['📊', '💻', '🌐', '🔧', '📐', '🧪']
                  const courseMaterials = materials.filter(m => m.courseId === course.id && m.category === 'courseware')
                  const teacher = course.teacherId

                  return (
                    <div
                      key={course.id}
                      onClick={() => goToLiveRoom(course.id)}
                      className={`bg-gradient-to-br ${gradients[idx % gradients.length]} rounded-xl p-4 border ${borderColors[idx % borderColors.length]} cursor-pointer hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${dotColors[idx % dotColors.length]} animate-pulse`}></span>
                          <span className={`text-[10px] uppercase tracking-wide ${textColors[idx % textColors.length]} font-medium`}>{course.semester}</span>
                        </div>
                        <span className="text-2xl">{icons[idx % icons.length]}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-900 mb-1">{course.name}</h3>
                      <p className="text-xs text-zinc-500 mb-3">{course.chapters?.length || 0} 个章节 · {courseMaterials.length} 个课件</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">{teacher === 'teacher-1' ? '张教授' : teacher === 'teacher-2' ? '李教授' : ''}</span>
                        <span className="text-xs text-theme font-medium">
                          {currentUser?.role === 'teacher' ? '开启直播' : '进入课堂'}
                        </span>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="col-span-3 text-center py-10 text-zinc-400">
                    <BookOpen size={40} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">暂无课程</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    <Compass size={12} className="text-white" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-800">AI教学助手</span>
                </div>
                <div className="text-zinc-400">
                  <span className="text-[10px]">⋮</span>
                </div>
              </div>
              {answer ? (
                <div className="mb-3 bg-theme/10 rounded-lg p-3 border border-theme/20">
                  <p className="text-xs text-gray-700 leading-relaxed">{answer}</p>
                </div>
              ) : (
                <div className="bg-zinc-100 rounded-lg p-3 mb-3">
                  <p className="text-[11px] text-zinc-600">你好！我注意到你正在学习第4模块。需要我帮你理解LangChain代理吗？</p>
                </div>
              )}
              {!answer && (
                <button
                  onClick={async () => {
                    setIsAsking(true)
                    const result = await askQuestion('好的，能解释一下代理中的记忆是如何工作的吗？', null, null)
                    setAnswer(result || '抱歉，AI答疑服务暂时不可用。')
                    setIsAsking(false)
                  }}
                  disabled={isAsking}
                  className="w-full bg-theme text-white text-xs font-medium py-2 rounded-md mb-3"
                >
                  {isAsking ? <Loader2 size={14} className="animate-spin mx-auto" /> : '好的，能解释一下代理中的记忆是如何工作的吗？'}
                </button>
              )}
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && question.trim()) {
                      setIsAsking(true)
                      const result = await askQuestion(question, null, null)
                      setAnswer(result || '抱歉，AI答疑服务暂时不可用。')
                      setQuestion('')
                      setIsAsking(false)
                    }
                  }}
                  placeholder="输入问题..."
                  className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-theme"
                />
                <button
                  onClick={async () => {
                    if (!question.trim()) return
                    setIsAsking(true)
                    const result = await askQuestion(question, null, null)
                    setAnswer(result || '抱歉，AI答疑服务暂时不可用。')
                    setQuestion('')
                    setIsAsking(false)
                  }}
                  disabled={isAsking || !question.trim()}
                  className="shrink-0 px-3 py-2 bg-theme text-white rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  {isAsking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">快捷操作</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate(currentUser?.role === 'teacher' ? '/teacher-live' : '/live')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 text-sm text-blue-700 hover:bg-blue-100 font-medium"
                >
                  <Radio size={14} /> 直播课堂
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-50 text-sm text-zinc-700 hover:bg-zinc-100">
                  <Clock size={14} /> 日程安排
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-50 text-sm text-zinc-700 hover:bg-zinc-100">
                  <FileText size={14} /> 学习资源
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-50 text-sm text-zinc-700 hover:bg-zinc-100">
                  <Users size={14} /> 协作学习
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLogin && (
        <div className="fixed inset-0 z-50 bg-gray-500/40 flex items-center justify-center p-4" onClick={() => setShowLogin(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-white rounded-2xl p-6 border border-zinc-200 shadow-lg max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-zinc-900 mb-1">选择角色登录</h2>
            <p className="text-xs text-zinc-500 mb-4">不同角色拥有不同的操作权限</p>
            <div className="space-y-2">
              {[
                { id: 'teacher-1', name: '张教授', role: 'teacher' as UserRole, desc: '数据结构与算法 / 操作系统原理' },
                { id: 'teacher-2', name: '李教授', role: 'teacher' as UserRole, desc: '计算机网络' },
                { id: 'student-1', name: '王同学', role: 'student' as UserRole, desc: '数据结构与算法 / 操作系统原理 · 算法先锋队' },
                { id: 'student-2', name: '赵同学', role: 'student' as UserRole, desc: '数据结构与算法 / 计算机网络 · 算法先锋队' },
                { id: 'student-3', name: '刘同学', role: 'student' as UserRole, desc: '数据结构与算法 · 代码工匠组' },
                { id: 'student-4', name: '陈同学', role: 'student' as UserRole, desc: '数据结构与算法 · 代码工匠组' },
                { id: 'admin-1', name: '系统管理员', role: 'admin' as UserRole, desc: '全局管理权限' },
              ].map(u => (
                <button
                  key={u.id}
                  onClick={async () => {
                    await login(u.id)
                    setShowLogin(false)
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    currentUser?.id === u.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <span className={`${
                    u.role === 'teacher' ? 'text-orange-500' :
                    u.role === 'admin' ? 'text-red-500' :
                    'text-blue-500'
                  }`}>
                    {ROLE_ICONS[u.role]}
                  </span>
                  <div className="text-left flex-1">
                    <p className="text-sm text-zinc-900 font-medium">{u.name}</p>
                    <p className="text-xs text-zinc-500">{u.desc}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    u.role === 'teacher' ? 'bg-orange-100 text-orange-700' :
                    u.role === 'admin' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}