import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCourseStore, type Assignment, type Submission, type SubmissionMode, type UserInfo } from '@/store/course'
import {
  ClipboardList, Clock, Upload, X, CheckCircle, AlertCircle,
  ChevronRight, Send, Users, User, Star, MessageSquare, FileCheck, XCircle, Eye, File
} from 'lucide-react'

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function CountdownTimer({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState('')
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) { setIsExpired(true); setRemaining('已截止'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setRemaining(d > 0 ? `${d}天${h}时${m}分` : h > 0 ? `${h}时${m}分` : `${m}分钟`)
    }
    update()
    const t = setInterval(update, 60000)
    return () => clearInterval(t)
  }, [deadline])

  return (
    <span className={`text-[10px] font-medium ${isExpired ? 'text-red-500' : remaining.includes('分钟') ? 'text-yellow-600' : 'text-theme'}`}>
      {isExpired ? '已截止' : `${remaining}后截止`}
    </span>
  )
}

export default function Assignments() {
  const currentUser = useCourseStore((state) => state.currentUser)
  const courses = useCourseStore((state) => state.courses)
  const assignments = useCourseStore((state) => state.assignments)
  const groups = useCourseStore((state) => state.groups)
  const students = useCourseStore((state) => state.students)
  const selectedCourseId = useCourseStore((state) => state.selectedCourseId)
  const isLoading = useCourseStore((state) => state.isLoading)
  
  const storeActions = useCourseStore.getState()
  const fetchCourses = storeActions.fetchCourses
  const fetchAssignments = storeActions.fetchAssignments
  const fetchGroups = storeActions.fetchGroups
  const fetchStudents = storeActions.fetchStudents
  const setSelectedCourse = storeActions.setSelectedCourse
  const createAssignment = storeActions.createAssignment
  const submitAssignment = storeActions.submitAssignment
  const gradeSubmission = storeActions.gradeSubmission
  const batchGrade = storeActions.batchGrade
  const createGroup = storeActions.createGroup
  const joinGroup = storeActions.joinGroup

  const [showCreate, setShowCreate] = useState(false)
  const [submitAssignmentId, setSubmitAssignmentId] = useState<string | null>(null)
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null)
  const [submissionStatusAssignment, setSubmissionStatusAssignment] = useState<Assignment | null>(null)
  const [gradeScores, setGradeScores] = useState<Record<string, { score: string; feedback: string }>>({})
  const [newGroupName, setNewGroupName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchCourses(); fetchGroups(); fetchStudents() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAssignments(selectedCourseId || undefined) }, [selectedCourseId]) // eslint-disable-line react-hooks/exhaustive-deps

  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'admin'
  const isStudent = currentUser?.role === 'student'

  const handleSubmitClick = async (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId)
    if (!assignment || !currentUser) return

    const fileInput = fileInputRef.current
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      setSubmitError('请选择文件')
      return
    }

    const file = fileInput.files[0]
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (assignment.allowedFormats.length > 0 && !assignment.allowedFormats.includes(ext)) {
      setSubmitError(`不支持的文件格式: ${ext}，允许格式: ${assignment.allowedFormats.join(', ')}`)
      return
    }
    if (file.size > assignment.maxFileSize) {
      setSubmitError(`文件大小超过限制（最大 ${formatSize(assignment.maxFileSize)}）`)
      return
    }

    setSubmitting(true)
    setSubmitError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('studentId', currentUser.id)
    formData.append('studentName', currentUser.name)

    if (assignment.submissionMode === 'group') {
      const groupSelect = document.querySelector('[name="groupId"]') as HTMLSelectElement | null
      const groupId = groupSelect?.value
      const group = groups.find(g => g.id === groupId)
      if (group) {
        formData.append('groupId', group.id)
        formData.append('groupName', group.name)
        formData.append('groupMembers', JSON.stringify(group.memberNames))
      }
    }

    try {
      const result = await submitAssignment(assignmentId, formData)
      if (result) {
        setSubmitAssignmentId(null)
        setSubmitError('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        const storeError = useCourseStore.getState().error
        setSubmitError(storeError || '提交失败，请重试')
      }
    } catch {
      setSubmitError('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data: Partial<Assignment> = {
      courseId: fd.get('courseId') as string || selectedCourseId || '',
      chapterId: fd.get('chapterId') as string || '',
      title: fd.get('title') as string,
      description: fd.get('description') as string,
      deadline: fd.get('deadline') as string,
      allowedFormats: (fd.get('allowedFormats') as string || '.pdf,.doc,.docx,.zip').split(',').map(s => s.trim()),
      maxFileSize: parseInt(fd.get('maxFileSize') as string) || 10485760,
      submissionMode: fd.get('submissionMode') as SubmissionMode || 'individual',
      maxGroupSize: parseInt(fd.get('maxGroupSize') as string) || 4,
    }
    const result = await createAssignment(data)
    if (result) setShowCreate(false)
  }

  const openGrading = (assignment: Assignment) => {
    setGradingAssignment(assignment)
    const scores: Record<string, { score: string; feedback: string }> = {}
    assignment.submissions.forEach(s => {
      scores[s.id] = { score: s.score?.toString() || '', feedback: s.feedback || '' }
    })
    setGradeScores(scores)
  }

  const handleBatchGrade = async () => {
    if (!gradingAssignment) return
    const grades = Object.entries(gradeScores)
      .filter(([, v]) => v.score)
      .map(([id, v]) => ({ submissionId: id, score: parseInt(v.score), feedback: v.feedback }))
    if (grades.length === 0) return
    const ok = await batchGrade(gradingAssignment.id, grades)
    if (ok) setGradingAssignment(null)
  }

  const myGroups = groups.filter(g => currentUser && g.memberIds.includes(currentUser.id))

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-bold text-main">作业管理</h1>
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setSelectedCourse(null)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!selectedCourseId ? 'bg-theme text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>全部</button>
          {courses.map(c => (
            <button key={c.id} onClick={() => setSelectedCourse(c.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCourseId === c.id ? 'bg-theme text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c.name}</button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500">{assignments.length} 个作业</span>
          {isTeacher && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-3 py-1.5 bg-theme text-white rounded-full text-xs font-medium">
              <ClipboardList size={14} /> 发布作业
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-theme border-t-transparent rounded-full animate-spin" /></div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-20 text-gray-500"><ClipboardList size={48} className="mx-auto mb-3 opacity-30" /><p className="text-sm">暂无作业</p></div>
        ) : (
          <div className="space-y-2">
            {assignments.map(assign => {
              const isExpired = new Date(assign.deadline) < new Date()
              const mySubmission = currentUser ? assign.submissions.find(s =>
                s.studentId === currentUser.id || s.groupMembers?.includes(currentUser.name)
              ) : null

              return (
                <motion.div key={assign.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface rounded-xl p-3 border border-gray-200 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-medium text-main truncate">{assign.title}</h3>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${assign.status === 'active' ? 'bg-blue-100 text-theme' : assign.status === 'closed' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                          {assign.status === 'active' ? '进行中' : assign.status === 'closed' ? '已截止' : '已批改'}
                        </span>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${assign.submissionMode === 'group' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                          {assign.submissionMode === 'group' ? <span className="flex items-center gap-0.5"><Users size={10} /> 分组</span> : <span className="flex items-center gap-0.5"><User size={10} /> 个人</span>}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{assign.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1"><Clock size={10} />{formatDeadline(assign.deadline)}</span>
                        <span>{assign.allowedFormats.join(', ')}</span>
                        <span>最大{formatSize(assign.maxFileSize)}</span>
                        {assign.submissionMode === 'group' && <span>每组≤{assign.maxGroupSize}人</span>}
                      </div>
                      <div className="mt-1"><CountdownTimer deadline={assign.deadline} /></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 flex-wrap">
                    {isStudent && assign.status === 'active' && !isExpired && (
                      <button onClick={() => { setSubmitAssignmentId(assign.id); setSubmitError('') }} className="flex items-center gap-1 px-3 py-1.5 bg-theme text-white rounded-lg text-xs font-medium">
                        <Upload size={12} />{mySubmission ? '重新提交' : assign.submissionMode === 'group' ? '小组提交' : '提交作业'}
                      </button>
                    )}
                    {mySubmission && (
                      <span className={`flex items-center gap-1 text-xs ${mySubmission.status === 'graded' ? 'text-blue-500' : mySubmission.status === 'resubmitted' ? 'text-yellow-600' : 'text-theme'}`}>
                        {mySubmission.status === 'graded' ? <><CheckCircle size={12} /> 已批改 {mySubmission.score}分</> :
                         mySubmission.status === 'resubmitted' ? <><AlertCircle size={12} /> 已重交</> :
                         <><CheckCircle size={12} /> 已提交</>}
                      </span>
                    )}
                    {isTeacher && (
                      <>
                        <button onClick={() => setSubmissionStatusAssignment(assign)} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-700 hover:bg-gray-200 transition-colors">
                          <FileCheck size={12} /> 提交情况
                        </button>
                        <button onClick={() => openGrading(assign)} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-700 hover:bg-gray-200 transition-colors">
                          <Star size={12} /> 批改({assign.submissions.filter(s => s.status === 'graded').length}/{assign.submissions.length})
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-gray-500/50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-white rounded-2xl p-5 border border-gray-200 shadow-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-main">发布作业</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-3">
                <div><label className="block text-xs text-gray-500 mb-1">作业标题 *</label><input name="title" required className="w-full bg-white rounded-lg px-3 py-2 text-sm text-main border border-gray-300 focus:border-theme focus:ring-1 focus:ring-theme outline-none" /></div>
                {!selectedCourseId && <div><label className="block text-xs text-gray-500 mb-1">课程 *</label><select name="courseId" required className="w-full bg-white rounded-lg px-3 py-2 text-sm text-main border border-gray-300 focus:border-theme focus:ring-1 focus:ring-theme outline-none"><option value="">选择课程</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
                <div><label className="block text-xs text-gray-500 mb-1">作业描述</label><textarea name="description" rows={3} className="w-full bg-white rounded-lg px-3 py-2 text-sm text-main border border-gray-300 focus:border-theme focus:ring-1 focus:ring-theme outline-none resize-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">截止时间 *</label><input name="deadline" type="datetime-local" required className="w-full bg-white rounded-lg px-3 py-2 text-sm text-main border border-gray-300 focus:border-theme focus:ring-1 focus:ring-theme outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">提交方式</label>
                  <select name="submissionMode" className="w-full bg-white rounded-lg px-3 py-2 text-sm text-main border border-gray-300 focus:border-theme focus:ring-1 focus:ring-theme outline-none">
                    <option value="individual">个人提交</option>
                    <option value="group">分组提交</option>
                  </select>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">每组最大人数</label><input name="maxGroupSize" type="number" defaultValue={4} className="w-full bg-white rounded-lg px-3 py-2 text-sm text-main border border-gray-300 focus:border-theme focus:ring-1 focus:ring-theme outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">允许格式</label><input name="allowedFormats" defaultValue=".pdf,.doc,.docx,.zip" className="w-full bg-white rounded-lg px-3 py-2 text-sm text-main border border-gray-300 focus:border-theme focus:ring-1 focus:ring-theme outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">最大文件大小(MB)</label><input name="maxFileSize" type="number" defaultValue={10} className="w-full bg-white rounded-lg px-3 py-2 text-sm text-main border border-gray-300 focus:border-theme focus:ring-1 focus:ring-theme outline-none" /></div>
                <button type="submit" className="w-full py-2.5 bg-theme text-white rounded-xl text-sm font-bold">发布</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {submitAssignmentId && (() => {
          const assignment = assignments.find(a => a.id === submitAssignmentId)
          if (!assignment) return null
          const isGroup = assignment.submissionMode === 'group'
          const showFileInput = !isGroup || myGroups.filter(g => g.courseId === assignment.courseId).length > 0
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-gray-500/50 flex items-center justify-center p-4" onClick={() => setSubmitAssignmentId(null)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-white rounded-2xl p-5 border border-gray-200 shadow-lg max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-main">{isGroup ? '小组提交' : '提交作业'}</h2>
                  <button onClick={() => setSubmitAssignmentId(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
                </div>
                {isGroup && (
                  <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-xs text-purple-600 flex items-center gap-1"><Users size={12} /> 分组作业 - 选择你的小组</p>
                  </div>
                )}

                {isGroup && (() => {
                  const courseGroups = myGroups.filter(g => g.courseId === assignment.courseId)
                  const availableGroups = groups.filter(g =>
                    g.courseId === assignment.courseId && g.memberIds.length < assignment.maxGroupSize
                  )
                  if (courseGroups.length > 0) {
                    return (
                      <div className="mb-3">
                        <label className="block text-xs text-gray-500 mb-1">我的小组</label>
                        <select name="groupId" className="w-full bg-white rounded-lg px-3 py-2 text-sm text-main border border-gray-300 focus:border-theme focus:ring-1 focus:ring-theme outline-none">
                          {courseGroups.map(g => (
                            <option key={g.id} value={g.id}>{g.name} ({g.memberNames.join(', ')})</option>
                          ))}
                        </select>
                      </div>
                    )
                  }
                  return (
                    <div className="mb-3 space-y-3">
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                        <p className="text-xs text-yellow-700">请先创建或加入小组，再提交作业</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-700 font-medium mb-2">创建小组</p>
                        <div className="flex gap-2">
                          <input
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            placeholder="输入小组名称"
                            className="flex-1 bg-white rounded-lg px-3 py-2 text-xs text-main border border-gray-300 focus:border-theme focus:ring-1 focus:ring-theme outline-none"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!newGroupName.trim() || !currentUser) return
                              const group = await createGroup(newGroupName.trim(), assignment.courseId, [currentUser.id], [currentUser.name])
                              if (group) setNewGroupName('')
                            }}
                            className="shrink-0 px-3 py-2 bg-theme text-white rounded-lg text-xs font-medium"
                          >创建小组</button>
                        </div>
                      </div>
                      {availableGroups.length > 0 && (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-700 font-medium mb-2">加入已有小组</p>
                          <div className="space-y-2">
                            {availableGroups.map(g => (
                              <div key={g.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-main font-medium truncate">{g.name}</p>
                                  <p className="text-[10px] text-gray-500 truncate">{g.memberNames.join(', ')} ({g.memberIds.length}/{assignment.maxGroupSize})</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!currentUser) return
                                    await joinGroup(g.id, currentUser.id, currentUser.name)
                                  }}
                                  className="shrink-0 ml-2 px-2.5 py-1 bg-purple-100 text-purple-600 rounded-lg text-[10px] font-medium hover:bg-purple-200 transition-colors"
                                >加入</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {showFileInput && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">选择文件</label>
                      <input
                        ref={fileInputRef}
                        name="file"
                        type="file"
                        accept={assignment.allowedFormats.join(',')}
                        className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-theme file:text-white"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">允许格式: {assignment.allowedFormats.join(', ')} · 最大 {formatSize(assignment.maxFileSize)}</p>
                    </div>
                    {submitError && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} /> {submitError}</p>
                      </div>
                    )}
                    <button
                      onClick={() => handleSubmitClick(assignment.id)}
                      disabled={submitting}
                      className="w-full py-2.5 bg-theme text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 提交中...</>
                      ) : (
                        <><Send size={14} /> 提交</>
                      )}
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {gradingAssignment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-gray-500/50 flex items-center justify-center p-4" onClick={() => setGradingAssignment(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-5xl bg-white rounded-2xl border border-gray-200 shadow-lg max-h-[95vh] overflow-y-auto">
              <div className="sticky top-0 bg-white/95 backdrop-blur-md p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-main">批改作业</h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">{gradingAssignment.title} · {gradingAssignment.submissions.length} 份提交</p>
                </div>
                <button onClick={() => setGradingAssignment(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
              </div>
              <div className="p-4 space-y-3">
                {gradingAssignment.submissions.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-8">暂无提交</p>
                ) : (
                  <>
                    {gradingAssignment.submissions.map(sub => (
                      <div key={sub.id} className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                        <div className="p-3 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {sub.groupName ? (
                                <span className="flex items-center gap-1 text-xs text-purple-600"><Users size={12} />{sub.groupName}</span>
                              ) : (
                                <span className="text-xs text-main">{sub.studentName}</span>
                              )}
                              <span className="text-[10px] text-gray-500">{sub.fileName} · {formatSize(sub.fileSize)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {sub.status === 'graded' && <span className="text-xs text-blue-500 font-medium">{sub.score}分</span>}
                            </div>
                          </div>
                          {sub.groupMembers?.length > 0 && (
                            <p className="text-[10px] text-gray-500 mt-1">成员: {sub.groupMembers.join(', ')}</p>
                          )}
                        </div>

                        {sub.filePath && (
                          <div className="p-3 bg-gray-100 border-b border-gray-200">
                            {sub.fileName.toLowerCase().endsWith('.pdf') ? (
                              <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                  <span className="text-xs text-gray-600">预览中...</span>
                                  <button
                                    onClick={() => window.open(sub.filePath, '_blank')}
                                    className="text-xs text-theme hover:underline"
                                  >
                                    下载
                                  </button>
                                </div>
                                <iframe
                                  src={`/api/materials/preview?url=${encodeURIComponent(sub.filePath)}`}
                                  className="w-full h-[500px]"
                                  title={sub.fileName}
                                  onLoad={() => console.log('PDF加载成功:', sub.fileName)}
                                  onError={(e) => console.error('PDF加载失败:', e, sub.filePath)}
                                />
                              </div>
                            ) : (
                              <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
                                <File size={48} className="mx-auto text-gray-400 mb-3" />
                                <p className="text-sm text-gray-600 mb-3">该文件类型不支持预览，请下载查看</p>
                                <button
                                  onClick={() => window.open(sub.filePath, '_blank')}
                                  className="px-4 py-2 bg-theme text-white rounded-lg text-xs font-medium"
                                >
                                  下载文件
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="p-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">分数</label>
                              <input
                                type="number" min={0} max={100}
                                value={gradeScores[sub.id]?.score || ''}
                                onChange={e => setGradeScores(prev => ({ ...prev, [sub.id]: { ...prev[sub.id], score: e.target.value, feedback: prev[sub.id]?.feedback || '' } }))}
                                className="w-full bg-white rounded-lg px-3 py-2 text-sm text-main border border-gray-300 focus:border-theme focus:ring-1 focus:ring-theme outline-none"
                                placeholder="0-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">评语</label>
                              <input
                                value={gradeScores[sub.id]?.feedback || ''}
                                onChange={e => setGradeScores(prev => ({ ...prev, [sub.id]: { ...prev[sub.id], feedback: e.target.value, score: prev[sub.id]?.score || '' } }))}
                                className="w-full bg-white rounded-lg px-3 py-2 text-sm text-main border border-gray-300 focus:border-theme focus:ring-1 focus:ring-theme outline-none"
                                placeholder="输入评语"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={handleBatchGrade} className="w-full py-2.5 bg-theme text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1">
                      <Star size={14} /> 批量提交评分
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {submissionStatusAssignment && (() => {
          const assign = submissionStatusAssignment
          const courseStudents = students.filter(s => s.role === 'student' && s.courseIds?.includes(assign.courseId))
          const isGroup = assign.submissionMode === 'group'

          const submittedStudentIds = new Set<string>()
          const submittedGroupIds = new Set<string>()
          assign.submissions.forEach(sub => {
            if (sub.groupId) {
              submittedGroupIds.add(sub.groupId)
              sub.groupMembers?.forEach(name => {
                const student = courseStudents.find(s => s.name === name)
                if (student) submittedStudentIds.add(student.id)
              })
            } else {
              submittedStudentIds.add(sub.studentId)
            }
          })

          const submittedCount = courseStudents.filter(s => submittedStudentIds.has(s.id)).length
          const totalCount = courseStudents.length
          const progressPct = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0

          const courseGroups = groups.filter(g => g.courseId === assign.courseId)

          type GroupInfo = { id: string; name: string; members: UserInfo[]; submitted: boolean }
          const groupInfos: GroupInfo[] = courseGroups.map(g => ({
            id: g.id,
            name: g.name,
            members: g.memberIds.map(mid => courseStudents.find(s => s.id === mid)).filter(Boolean) as UserInfo[],
            submitted: submittedGroupIds.has(g.id),
          }))

          const ungroupedStudents = isGroup
            ? courseStudents.filter(s => !courseGroups.some(g => g.memberIds.includes(s.id)))
            : []

          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-gray-500/50 flex items-center justify-center" onClick={() => setSubmissionStatusAssignment(null)}>
              <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', damping: 25 }} onClick={e => e.stopPropagation()} className="w-full md:max-w-lg max-w-md bg-white md:rounded-2xl rounded-t-2xl border border-gray-200 shadow-lg max-h-[85vh] overflow-y-auto">
                <div className="sticky top-0 bg-white/95 backdrop-blur-md p-4 border-b border-gray-200 flex items-center justify-between z-10">
                  <div>
                    <h2 className="text-base font-bold text-main">提交情况</h2>
                    <p className="text-[10px] text-gray-500 mt-0.5">{assign.title}</p>
                  </div>
                  <button onClick={() => setSubmissionStatusAssignment(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600">已提交 <span className="text-theme font-bold">{submittedCount}</span> / 共 <span className="text-main font-bold">{totalCount}</span> 人</span>
                      <span className="text-xs text-gray-500">{progressPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-theme rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>

                  {isGroup ? (
                    <div className="space-y-3">
                      {groupInfos.map(gi => (
                        <div key={gi.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-1.5 text-xs text-purple-600 font-medium"><Users size={12} />{gi.name}</span>
                            {gi.submitted ? (
                              <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={12} />已提交</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-red-600"><XCircle size={12} />未提交</span>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            {gi.members.map(m => {
                              const hasSubmitted = submittedStudentIds.has(m.id)
                              return (
                                <div key={m.id} className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/60">
                                  <span className="text-xs text-gray-700">{m.name}</span>
                                  {hasSubmitted ? (
                                    <span className="flex items-center gap-1 text-[10px] text-green-600"><CheckCircle size={10} />已提交</span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[10px] text-red-600"><XCircle size={10} />未提交</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                      {ungroupedStudents.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-yellow-600 font-medium">未分组学生</span>
                          </div>
                          <div className="space-y-1.5">
                            {ungroupedStudents.map(m => (
                              <div key={m.id} className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/60">
                                <span className="text-xs text-gray-700">{m.name}</span>
                                <span className="flex items-center gap-1 text-[10px] text-red-600"><XCircle size={10} />未提交</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {courseStudents.map(m => {
                        const hasSubmitted = submittedStudentIds.has(m.id)
                        return (
                          <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 border border-gray-200">
                            <span className="text-xs text-gray-700">{m.name}</span>
                            {hasSubmitted ? (
                              <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={12} />已提交</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-red-600"><XCircle size={12} />未提交</span>
                            )}
                          </div>
                        )
                      })}
                      {courseStudents.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-6">该课程暂无学生</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
