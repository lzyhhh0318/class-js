import { create } from 'zustand'

// 从 localStorage 恢复 currentUser
function getSavedUser(): UserInfo | null {
  try {
    const saved = localStorage.getItem('course-currentUser')
    return saved ? JSON.parse(saved) : null
  } catch { return null }
}

export type UserRole = 'teacher' | 'student' | 'admin'

export interface UserInfo {
  id: string
  name: string
  role: UserRole
  courseIds: string[]
}

export interface Course {
  id: string
  name: string
  semester: string
  teacherId: string
  chapters: Chapter[]
  createdAt: string
}

export interface Chapter {
  id: string
  name: string
  order: number
}

export type MaterialType = 'ppt' | 'pdf' | 'word' | 'video' | 'image' | 'archive'
export type MaterialCategory = 'courseware' | 'recording'
export type MaterialVisibility = 'public' | 'course' | 'private'

export interface MaterialVersion {
  id: string
  materialId: string
  version: number
  fileName: string
  filePath: string
  fileSize: number
  uploadedAt: string
  uploadedBy: string
  md5: string
}

export interface KnowledgePoint {
  id: string
  title: string
  content: string
  importance: 'high' | 'medium' | 'low'
}

export interface ParsedContent {
  materialId: string
  rawText: string
  knowledgePoints: KnowledgePoint[]
  summary: string
  parsedAt: string
}

export interface Material {
  id: string
  courseId: string
  chapterId: string
  title: string
  type: MaterialType
  category: MaterialCategory
  description: string
  visibility: MaterialVisibility
  currentVersion: number
  versions: MaterialVersion[]
  parsedContent: ParsedContent | null
  createdAt: string
  updatedAt: string
  createdBy: string
}

export type AssignmentStatus = 'active' | 'closed' | 'graded'
export type SubmissionMode = 'individual' | 'group'
export type SubmissionStatus = 'submitted' | 'resubmitted' | 'overdue' | 'graded'

export interface StudentGroup {
  id: string
  name: string
  courseId: string
  memberIds: string[]
  memberNames: string[]
  createdAt: string
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  groupId: string | null
  groupName: string | null
  groupMembers: string[]
  fileName: string
  filePath: string
  fileSize: number
  status: SubmissionStatus
  score: number | null
  feedback: string | null
  submittedAt: string
}

export interface Assignment {
  id: string
  courseId: string
  chapterId: string
  title: string
  description: string
  deadline: string
  allowedFormats: string[]
  maxFileSize: number
  submissionMode: SubmissionMode
  maxGroupSize: number
  status: AssignmentStatus
  createdBy: string
  createdAt: string
  submissions: Submission[]
}

export interface CountdownInfo {
  assignmentId: string
  deadline: string
  isExpired: boolean
  remainingMs: number
  remainingDays: number
  remainingHours: number
  remainingMinutes: number
}

// OSS服务基础地址（通过Vite代理）
const OSS_BASE_URL = '/oss-api'

interface CourseStore {
  currentUser: UserInfo | null
  courses: Course[]
  materials: Material[]
  assignments: Assignment[]
  groups: StudentGroup[]
  students: UserInfo[]
  selectedCourseId: string | null
  selectedChapterId: string | null
  materialCategory: MaterialCategory
  isLoading: boolean
  error: string | null

  login: (userId: string) => Promise<void>
  logout: () => void
  fetchCourses: () => Promise<void>
  fetchMaterials: (courseId?: string, chapterId?: string, category?: string) => Promise<void>
  fetchAssignments: (courseId?: string) => Promise<void>
  fetchGroups: (courseId?: string) => Promise<void>
  fetchStudents: () => Promise<void>
  setSelectedCourse: (courseId: string | null) => void
  setSelectedChapter: (chapterId: string | null) => void
  uploadMaterial: (formData: FormData) => Promise<Material | null>
  updateMaterial: (id: string, formData: FormData) => Promise<Material | null>
  deleteMaterial: (id: string) => Promise<boolean>
  revertVersion: (materialId: string, version: number) => Promise<boolean>
  downloadMaterial: (materialId: string, version?: number) => Promise<void>
  parseMaterial: (materialId: string) => Promise<ParsedContent | null>
  createAssignment: (data: Partial<Assignment>) => Promise<Assignment | null>
  submitAssignment: (assignmentId: string, formData: FormData) => Promise<Submission | null>
  gradeSubmission: (assignmentId: string, submissionId: string, score: number, feedback: string) => Promise<boolean>
  batchGrade: (assignmentId: string, grades: { submissionId: string; score: number; feedback: string }[]) => Promise<boolean>
  getAssignmentCountdown: (assignmentId: string) => Promise<CountdownInfo | null>
  createGroup: (name: string, courseId: string, memberIds: string[], memberNames: string[]) => Promise<StudentGroup | null>
  joinGroup: (groupId: string, studentId: string, studentName: string) => Promise<boolean>
  askQuestion: (question: string, courseId?: string, materialId?: string) => Promise<string | null>
  clearError: () => void
}

export const useCourseStore = create<CourseStore>()(
    (set, get) => ({
  currentUser: getSavedUser(),
  courses: [],
  materials: [],
  assignments: [],
  groups: [],
  students: [],
  selectedCourseId: null,
  selectedChapterId: null,
  materialCategory: 'courseware' as MaterialCategory,
  isLoading: false,
  error: null,

  login: async (userId: string) => {
    try {
      const res = await fetch('/api/permissions/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('course-currentUser', JSON.stringify(data.data))
        set({ currentUser: data.data })
      }
      else set({ error: data.error })
    } catch { set({ error: '登录失败' }) }
  },

  logout: () => {
    localStorage.removeItem('course-currentUser')
    set({ currentUser: null, selectedCourseId: null, selectedChapterId: null })
  },

  fetchCourses: async () => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/materials/courses')
      const data = await res.json()
      if (data.success) {
        set({ courses: data.data, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch { set({ error: '获取课程列表失败', isLoading: false }) }
  },

  fetchMaterials: async (courseId?: string, chapterId?: string, category?: string) => {
    set({ isLoading: true })
    try {
      const params = new URLSearchParams()
      if (courseId) params.set('courseId', courseId)
      if (chapterId) params.set('chapterId', chapterId)
      if (category) params.set('category', category)
      const user = get().currentUser
      if (user) params.set('userId', user.id)
      const res = await fetch(`/api/materials/materials?${params}`)
      const data = await res.json()
      if (data.success) {
        set({ materials: data.data, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch { set({ error: '获取资料列表失败', isLoading: false }) }
  },

  fetchAssignments: async (courseId?: string) => {
    set({ isLoading: true })
    try {
      const params = new URLSearchParams()
      if (courseId) params.set('courseId', courseId)
      const res = await fetch(`/api/assignments?${params}`)
      const data = await res.json()
      if (data.success) set({ assignments: data.data, isLoading: false })
    } catch { set({ error: '获取作业列表失败', isLoading: false }) }
  },

  fetchGroups: async (courseId?: string) => {
    try {
      const params = new URLSearchParams()
      if (courseId) params.set('courseId', courseId)
      const res = await fetch(`/api/assignments/groups/list?${params}`)
      const data = await res.json()
      if (data.success) set({ groups: data.data })
    } catch { /* ignore */ }
  },

  fetchStudents: async () => {
    try {
      const res = await fetch('/api/permissions/users')
      const data = await res.json()
      if (data.success) set({ students: data.data })
    } catch { /* ignore */ }
  },

  setSelectedCourse: (courseId) => set({ selectedCourseId: courseId, selectedChapterId: null }),
  setSelectedChapter: (chapterId) => set({ selectedChapterId: chapterId }),

  uploadMaterial: async (formData: FormData) => {
    try {
      const file = formData.get('file') as File | null
      if (!file) { set({ error: '请选择文件' }); return null }

      const cloudFormData = new FormData()
      cloudFormData.append('file', file)
      
      // 按OSS目录规范：protected/{course_id}/courseware/{chapter_id}/{file_id}_v1.{ext}
      const courseId = formData.get('courseId') as string || get().selectedCourseId || 'default'
      const chapterId = formData.get('chapterId') as string || get().selectedChapterId || 'general'
      const userId = formData.get('userId') as string || get().currentUser?.id || 'teacher-1'
      const fileId = Date.now()
      const ext = file.name.split('.').pop() || 'pdf'
      const ossPath = `protected/${courseId}/courseware/${chapterId}/${fileId}_v1.${ext}`
      cloudFormData.append('path', ossPath)
      cloudFormData.append('userId', userId)

      console.log('正在上传文件到OSS...')
      console.log('fileType:', cloudFormData.get('fileType'))
      console.log('userId:', cloudFormData.get('userId'))
      
      const res = await fetch(`${OSS_BASE_URL}/oss/upload`, { method: 'POST', body: cloudFormData })
      const cloudUrl = await res.text()
      console.log('OSS返回状态:', res.status)
      console.log('OSS返回的URL:', cloudUrl)

      if (cloudUrl && cloudUrl.startsWith('http')) {
        const { courseId, chapterId, title, description, visibility, userId, category } = Object.fromEntries(formData.entries()) as Record<string, string>
        const fallbackCourseId = courseId || get().selectedCourseId || ''
        const fallbackChapterId = chapterId || get().selectedChapterId || ''

        const detectedType: Material['type'] = (() => {
          const ext = file.name.split('.').pop()?.toLowerCase() || ''
          if (['pdf'].includes(ext)) return 'pdf'
          if (['ppt', 'pptx'].includes(ext)) return 'ppt'
          if (['doc', 'docx'].includes(ext)) return 'word'
          if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) return 'video'
          if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image'
          if (['zip', 'rar', '7z'].includes(ext)) return 'archive'
          return 'pdf'
        })()

        // 保存到后端数据库
        const saveRes = await fetch('/api/materials/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: fallbackCourseId,
            chapterId: fallbackChapterId,
            title: title || file.name,
            description: description || '',
            visibility: visibility || 'course',
            userId: userId || get().currentUser?.id || 'teacher-1',
            category: category || (detectedType === 'video' ? 'recording' : 'courseware'),
            ossUrl: cloudUrl,
            fileName: file.name,
            fileSize: file.size,
          }),
        })
        const saveData = await saveRes.json()
        console.log('保存到后端结果:', saveData)

        if (saveData.success && saveData.data) {
          // 使用后端返回的数据
          const { materials } = get()
          set({ materials: [saveData.data, ...materials] })
          return saveData.data
        } else {
          // 如果后端保存失败，仍然保存在前端
          const material: Material = {
            id: `mat-${Date.now()}`,
            courseId: fallbackCourseId,
            chapterId: fallbackChapterId,
            title: title || file.name,
            type: detectedType,
            category: (category as MaterialCategory) || (detectedType === 'video' ? 'recording' : 'courseware'),
            description: description || '',
            visibility: (visibility as MaterialVisibility) || 'course',
            currentVersion: 1,
            versions: [{
              id: `ver-${Date.now()}`,
              materialId: `mat-${Date.now()}`,
              version: 1,
              fileName: file.name,
              filePath: cloudUrl,
              fileSize: file.size,
              uploadedAt: new Date().toISOString(),
              uploadedBy: userId || get().currentUser?.id || 'teacher-1',
              md5: '',
            }],
            parsedContent: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: userId || get().currentUser?.id || 'teacher-1',
          }
          const { materials } = get()
          set({ materials: [material, ...materials] })
          return material
        }
      }

      set({ error: cloudUrl || '云端上传失败' }); return null
    } catch (err) {
      console.error('上传失败:', err)
      set({ error: '上传失败：' + (err as Error).message }); return null
    }
  },

  updateMaterial: async (id, formData) => {
    try {
      const res = await fetch(`/api/materials/materials/${id}`, { method: 'PUT', body: formData })
      const data = await res.json()
      if (data.success) { const { materials } = get(); set({ materials: materials.map(m => m.id === id ? data.data : m) }); return data.data }
      set({ error: data.error }); return null
    } catch { set({ error: '更新失败' }); return null }
  },

  deleteMaterial: async (id) => {
    // 简单直接：只从前端移除，不调API不回滚
    set((state) => ({ materials: state.materials.filter(m => m.id !== id) }))
    // 异步通知后端（不等待结果，不影响前端状态）
    fetch(`/api/materials/materials/${id}`, { method: 'DELETE' }).catch(() => {})
    return true
  },

  revertVersion: async (materialId, version) => {
    try {
      const res = await fetch(`/api/materials/materials/${materialId}/revert/${version}`, { method: 'POST' })
      const data = await res.json()
      if (data.success) { const { materials } = get(); set({ materials: materials.map(m => m.id === materialId ? data.data : m) }); return true }
      return false
    } catch { return false }
  },

  downloadMaterial: async (materialId, version) => {
    try {
      const { materials } = get()
      const material = materials.find(m => m.id === materialId)
      if (!material) { set({ error: '资料不存在' }); return }
      
      const targetVersion = version ? material.versions.find(v => v.version === version) : material.versions[0]
      if (!targetVersion) { set({ error: '版本不存在' }); return }
      
      // 直接使用OSS返回的URL下载
      const filePath = targetVersion.filePath
      if (filePath && filePath.startsWith('http')) {
        window.open(filePath, '_blank')
      } else {
        // 如果是本地路径，使用代理下载
        const fileName = targetVersion.fileName
        const downloadUrl = `${OSS_BASE_URL}/oss/download/${encodeURIComponent(fileName)}`
        window.open(downloadUrl, '_blank')
      }
    } catch { set({ error: '下载失败' }) }
  },

  parseMaterial: async (materialId) => {
    try {
      const res = await fetch(`/api/ai/materials/${materialId}/parse`, { method: 'POST' })
      const data = await res.json()
      if (data.success) { const { materials } = get(); set({ materials: materials.map(m => m.id === materialId ? { ...m, parsedContent: data.data } : m) }); return data.data }
      set({ error: data.error }); return null
    } catch { set({ error: '解析失败' }); return null }
  },

  createAssignment: async (assignmentData) => {
    try {
      const user = get().currentUser
      const res = await fetch('/api/assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...assignmentData, userId: user?.id }),
      })
      const data = await res.json()
      if (data.success) { const { assignments } = get(); set({ assignments: [data.data, ...assignments] }); return data.data }
      set({ error: data.error }); return null
    } catch { set({ error: '创建作业失败' }); return null }
  },

  submitAssignment: async (assignmentId, formData) => {
    try {
      const file = formData.get('file') as File | null
      if (!file) { set({ error: '请选择文件' }); return null }

      const cloudFormData = new FormData()
      cloudFormData.append('file', file)
      
      // 按OSS目录规范：submissions/{course_id}/{assignment_id}/{student_id}/{timestamp}_{filename}
      const studentId = formData.get('studentId') as string || get().currentUser?.id || 'student-1'
      const userId = studentId
      const timestamp = Date.now()
      const fileName = file.name
      const ossPath = `submissions/${assignmentId}/${studentId}/${timestamp}_${fileName}`
      cloudFormData.append('path', ossPath)
      cloudFormData.append('userId', userId)

      console.log('正在上传文件到OSS...')
      console.log('fileType:', cloudFormData.get('fileType'))
      console.log('userId:', cloudFormData.get('userId'))
      
      const res = await fetch(`${OSS_BASE_URL}/oss/upload`, { method: 'POST', body: cloudFormData })
      const cloudUrl = await res.text()
      console.log('OSS返回状态:', res.status)
      console.log('OSS返回的URL:', cloudUrl)

      if (cloudUrl && cloudUrl.startsWith('http')) {
        // 现在调用后端API来保存提交记录
        const backendFormData = new FormData()
        
        const studentId = formData.get('studentId') as string || get().currentUser?.id || ''
        const studentName = formData.get('studentName') as string || get().currentUser?.name || ''
        const groupId = formData.get('groupId') as string || ''
        const groupName = formData.get('groupName') as string || ''
        const groupMembersStr = formData.get('groupMembers') as string || '[]'
        
        // 传递OSS URL和相关信息
        backendFormData.append('studentId', studentId)
        backendFormData.append('studentName', studentName)
        backendFormData.append('ossUrl', cloudUrl)
        backendFormData.append('fileName', file.name)
        backendFormData.append('fileSize', file.size.toString())
        if (groupId) backendFormData.append('groupId', groupId)
        if (groupName) backendFormData.append('groupName', groupName)
        if (groupMembersStr) backendFormData.append('groupMembers', groupMembersStr)

        const backendRes = await fetch(`/api/assignments/${assignmentId}/submit`, { 
          method: 'POST', 
          body: backendFormData 
        })
        const backendData = await backendRes.json()

        if (backendData.success) {
          // 更新本地状态，使用后端返回的数据
          const { assignments } = get()
          const updatedSubmission = {
            ...backendData.data,
            filePath: cloudUrl // 使用OSS的URL而不是本地路径
          }
          
          set({
            assignments: assignments.map(a => {
              if (a.id !== assignmentId) return a
              const existingIdx = a.submissions.findIndex(s => s.id === updatedSubmission.id)
              const newSubs = [...a.submissions]
              if (existingIdx >= 0) newSubs[existingIdx] = updatedSubmission
              else newSubs.push(updatedSubmission)
              return { ...a, submissions: newSubs }
            }),
          })
          return updatedSubmission
        } else {
          set({ error: backendData.error || '保存提交记录失败' })
          return null
        }
      }

      set({ error: cloudUrl || '云端上传失败' }); return null
    } catch (err) {
      set({ error: '提交失败：' + (err as Error).message }); return null
    }
  },

  gradeSubmission: async (assignmentId, submissionId, score, feedback) => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submissions/${submissionId}/grade`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, feedback }),
      })
      const data = await res.json()
      if (data.success) {
        const { assignments } = get()
        set({ assignments: assignments.map(a => a.id !== assignmentId ? a : { ...a, submissions: a.submissions.map(s => s.id === submissionId ? data.data : s) }) })
        return true
      }
      return false
    } catch { return false }
  },

  batchGrade: async (assignmentId, grades) => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/batch-grade`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades }),
      })
      const data = await res.json()
      if (data.success) {
        await get().fetchAssignments(get().selectedCourseId || undefined)
        return true
      }
      return false
    } catch { return false }
  },

  getAssignmentCountdown: async (assignmentId) => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/countdown`)
      const data = await res.json()
      return data.success ? data.data : null
    } catch { return null }
  },

  createGroup: async (name, courseId, memberIds, memberNames) => {
    try {
      const res = await fetch('/api/assignments/groups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, courseId, memberIds, memberNames }),
      })
      const data = await res.json()
      if (data.success) { const { groups } = get(); set({ groups: [...groups, data.data] }); return data.data }
      set({ error: data.error }); return null
    } catch { set({ error: '创建小组失败' }); return null }
  },

  joinGroup: async (groupId, studentId, studentName) => {
    const { groups } = get()
    const group = groups.find(g => g.id === groupId)
    if (!group) return false
    if (group.memberIds.includes(studentId)) return false
    set({
      groups: groups.map(g =>
        g.id === groupId
          ? { ...g, memberIds: [...g.memberIds, studentId], memberNames: [...g.memberNames, studentName] }
          : g
      ),
    })
    return true
  },

  askQuestion: async (question, courseId, materialId) => {
    try {
      const res = await fetch('/api/ai/qa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, courseId, materialId }),
      })
      const data = await res.json()
      return data.success ? data.data.answer : null
    } catch { return null }
  },

  clearError: () => set({ error: null }),
})
)
