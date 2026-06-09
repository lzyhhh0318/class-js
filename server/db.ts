import { v4 as uuidv4 } from 'uuid'

export type UserRole = 'teacher' | 'student' | 'admin'

export interface User {
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

export interface ParsedContent {
  materialId: string
  rawText: string
  knowledgePoints: KnowledgePoint[]
  summary: string
  parsedAt: string
}

export interface KnowledgePoint {
  id: string
  title: string
  content: string
  importance: 'high' | 'medium' | 'low'
}

export type AssignmentStatus = 'active' | 'closed' | 'graded'
export type SubmissionMode = 'individual' | 'group'

export interface StudentGroup {
  id: string
  name: string
  courseId: string
  memberIds: string[]
  memberNames: string[]
  createdAt: string
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

export type SubmissionStatus = 'submitted' | 'resubmitted' | 'overdue' | 'graded'

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

export interface AccessLog {
  id: string
  userId: string
  userName: string
  resourceType: 'material' | 'assignment'
  resourceId: string
  action: 'view' | 'download' | 'upload' | 'submit'
  timestamp: string
}

export interface NotificationEvent {
  type: 'material_upload' | 'material_update' | 'assignment_publish' | 'assignment_deadline_approaching'
  courseId: string
  resourceId: string
  message: string
  timestamp: string
}

export interface DanmakuRecord {
  id: string
  courseId: string
  sessionId: string
  userId: string
  userName: string
  content: string
  timestamp: string
}

class Database {
  users: Map<string, User> = new Map()
  courses: Map<string, Course> = new Map()
  materials: Map<string, Material> = new Map()
  assignments: Map<string, Assignment> = new Map()
  groups: Map<string, StudentGroup> = new Map()
  accessLogs: AccessLog[] = []
  notificationQueue: NotificationEvent[] = []
  danmakuRecords: DanmakuRecord[] = []

  constructor() {
    this.seed()
  }

  private seed() {
    const teacher1: User = { id: 'teacher-1', name: '张教授', role: 'teacher', courseIds: ['course-1', 'course-2'] }
    const teacher2: User = { id: 'teacher-2', name: '李教授', role: 'teacher', courseIds: ['course-3'] }
    const student1: User = { id: 'student-1', name: '王同学', role: 'student', courseIds: ['course-1', 'course-2'] }
    const student2: User = { id: 'student-2', name: '赵同学', role: 'student', courseIds: ['course-1', 'course-3'] }
    const student3: User = { id: 'student-3', name: '刘同学', role: 'student', courseIds: ['course-1'] }
    const student4: User = { id: 'student-4', name: '陈同学', role: 'student', courseIds: ['course-1'] }
    const admin1: User = { id: 'admin-1', name: '系统管理员', role: 'admin', courseIds: [] }

    this.users.set(teacher1.id, teacher1)
    this.users.set(teacher2.id, teacher2)
    this.users.set(student1.id, student1)
    this.users.set(student2.id, student2)
    this.users.set(student3.id, student3)
    this.users.set(student4.id, student4)
    this.users.set(admin1.id, admin1)

    const course1: Course = {
      id: 'course-1', name: '数据结构与算法', semester: '2025-2026-2', teacherId: 'teacher-1',
      chapters: [
        { id: 'ch-1-1', name: '第一章 绪论', order: 1 },
        { id: 'ch-1-2', name: '第二章 线性表', order: 2 },
        { id: 'ch-1-3', name: '第三章 栈与队列', order: 3 },
        { id: 'ch-1-4', name: '第四章 树与二叉树', order: 4 },
      ],
      createdAt: '2025-09-01T00:00:00Z',
    }
    const course2: Course = {
      id: 'course-2', name: '操作系统原理', semester: '2025-2026-2', teacherId: 'teacher-1',
      chapters: [
        { id: 'ch-2-1', name: '第一章 操作系统概述', order: 1 },
        { id: 'ch-2-2', name: '第二章 进程管理', order: 2 },
        { id: 'ch-2-3', name: '第三章 内存管理', order: 3 },
      ],
      createdAt: '2025-09-01T00:00:00Z',
    }
    const course3: Course = {
      id: 'course-3', name: '计算机网络', semester: '2025-2026-2', teacherId: 'teacher-2',
      chapters: [
        { id: 'ch-3-1', name: '第一章 网络体系结构', order: 1 },
        { id: 'ch-3-2', name: '第二章 物理层', order: 2 },
      ],
      createdAt: '2025-09-01T00:00:00Z',
    }
    this.courses.set(course1.id, course1)
    this.courses.set(course2.id, course2)
    this.courses.set(course3.id, course3)

    const mat1: Material = {
      id: 'mat-1', courseId: 'course-1', chapterId: 'ch-1-1', title: '数据结构绪论-课件',
      type: 'pdf', category: 'courseware', description: '数据结构基本概念、算法分析入门',
      visibility: 'course', currentVersion: 2,
      versions: [
        { id: uuidv4(), materialId: 'mat-1', version: 1, fileName: '数据结构绪论_v1.pdf', filePath: '/uploads/mat-1_v1.pdf', fileSize: 2048000, uploadedAt: '2025-09-05T08:00:00Z', uploadedBy: 'teacher-1', md5: 'abc123' },
        { id: uuidv4(), materialId: 'mat-1', version: 2, fileName: '数据结构绪论_v2.pdf', filePath: '/uploads/mat-1_v2.pdf', fileSize: 2150000, uploadedAt: '2025-09-15T10:00:00Z', uploadedBy: 'teacher-1', md5: 'def456' },
      ],
      parsedContent: {
        materialId: 'mat-1', rawText: '数据结构是计算机存储、组织数据的方式...',
        knowledgePoints: [
          { id: 'kp-1', title: '数据结构定义', content: '数据结构是相互之间存在一种或多种特定关系的数据元素的集合', importance: 'high' },
          { id: 'kp-2', title: '算法复杂度', content: '时间复杂度衡量算法执行时间随输入规模增长的趋势，用大O表示法', importance: 'high' },
          { id: 'kp-3', title: '逻辑结构与物理结构', content: '逻辑结构包括集合、线性、树形、图形结构；物理结构包括顺序存储和链式存储', importance: 'medium' },
        ],
        summary: '本章介绍数据结构的基本概念、算法的定义与特性、算法复杂度分析方法',
        parsedAt: '2025-09-15T10:30:00Z',
      },
      createdAt: '2025-09-05T08:00:00Z', updatedAt: '2025-09-15T10:00:00Z', createdBy: 'teacher-1',
    }
    const mat2: Material = {
      id: 'mat-2', courseId: 'course-1', chapterId: 'ch-1-2', title: '线性表-课件',
      type: 'ppt', category: 'courseware', description: '线性表的顺序存储与链式存储',
      visibility: 'course', currentVersion: 1,
      versions: [
        { id: uuidv4(), materialId: 'mat-2', version: 1, fileName: '线性表.pptx', filePath: '/uploads/线性表.pptx', fileSize: 5120000, uploadedAt: '2025-09-20T09:00:00Z', uploadedBy: 'teacher-1', md5: 'ghi789' },
      ],
      parsedContent: null, createdAt: '2025-09-20T09:00:00Z', updatedAt: '2025-09-20T09:00:00Z', createdBy: 'teacher-1',
    }
    const mat5: Material = {
      id: 'mat-5', courseId: 'course-1', chapterId: 'ch-1-1', title: '绪论-教师专属教案',
      type: 'pdf', category: 'courseware', description: '仅教师可见的教学参考教案',
      visibility: 'private', currentVersion: 1,
      versions: [
        { id: uuidv4(), materialId: 'mat-5', version: 1, fileName: '教师教案.pdf', filePath: '/uploads/教师教案.pdf', fileSize: 1024000, uploadedAt: '2025-09-05T08:00:00Z', uploadedBy: 'teacher-1', md5: 'pri001' },
      ],
      parsedContent: null, createdAt: '2025-09-05T08:00:00Z', updatedAt: '2025-09-05T08:00:00Z', createdBy: 'teacher-1',
    }
    const mat3: Material = {
      id: 'mat-3', courseId: 'course-1', chapterId: 'ch-1-1', title: '第一周课堂录像',
      type: 'video', category: 'recording', description: '数据结构绪论课堂直播录像',
      visibility: 'course', currentVersion: 1,
      versions: [
        { id: uuidv4(), materialId: 'mat-3', version: 1, fileName: '第一周录像.mp4', filePath: '/uploads/第一周录像.mp4', fileSize: 524288000, uploadedAt: '2025-09-06T18:00:00Z', uploadedBy: 'teacher-1', md5: 'jkl012' },
      ],
      parsedContent: null, createdAt: '2025-09-06T18:00:00Z', updatedAt: '2025-09-06T18:00:00Z', createdBy: 'teacher-1',
    }
    const mat4: Material = {
      id: 'mat-4', courseId: 'course-1', chapterId: 'ch-1-2', title: '第二周课堂录像',
      type: 'video', category: 'recording', description: '线性表课堂直播录像',
      visibility: 'course', currentVersion: 1,
      versions: [
        { id: uuidv4(), materialId: 'mat-4', version: 1, fileName: '第二周录像.mp4', filePath: '/uploads/第二周录像.mp4', fileSize: 486539264, uploadedAt: '2025-09-13T18:00:00Z', uploadedBy: 'teacher-1', md5: 'mno345' },
      ],
      parsedContent: null, createdAt: '2025-09-13T18:00:00Z', updatedAt: '2025-09-13T18:00:00Z', createdBy: 'teacher-1',
    }
    this.materials.set(mat1.id, mat1)
    this.materials.set(mat2.id, mat2)
    this.materials.set(mat3.id, mat3)
    this.materials.set(mat4.id, mat4)
    this.materials.set(mat5.id, mat5)

    const group1: StudentGroup = {
      id: 'group-1', name: '算法先锋队', courseId: 'course-1',
      memberIds: ['student-1', 'student-2'], memberNames: ['王同学', '赵同学'],
      createdAt: '2025-09-10T10:00:00Z',
    }
    const group2: StudentGroup = {
      id: 'group-2', name: '代码工匠组', courseId: 'course-1',
      memberIds: ['student-3', 'student-4'], memberNames: ['刘同学', '陈同学'],
      createdAt: '2025-09-10T10:00:00Z',
    }
    this.groups.set(group1.id, group1)
    this.groups.set(group2.id, group2)

    const now = new Date()
    const futureDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const pastDeadline = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()

    const assign1: Assignment = {
      id: 'assign-1', courseId: 'course-1', chapterId: 'ch-1-1',
      title: '算法复杂度分析练习', description: '完成课后习题1-5，分析给定算法的时间复杂度和空间复杂度',
      deadline: futureDeadline, allowedFormats: ['.pdf', '.doc', '.docx'], maxFileSize: 10485760,
      submissionMode: 'individual', maxGroupSize: 1,
      status: 'active', createdBy: 'teacher-1', createdAt: '2025-09-16T10:00:00Z',
      submissions: [],
    }
    const assign2: Assignment = {
      id: 'assign-2', courseId: 'course-1', chapterId: 'ch-1-2',
      title: '线性表编程实现', description: '用C/C++实现顺序表和链表的基本操作，包括插入、删除、查找',
      deadline: pastDeadline, allowedFormats: ['.zip', '.rar'], maxFileSize: 52428800,
      submissionMode: 'group', maxGroupSize: 4,
      status: 'closed', createdBy: 'teacher-1', createdAt: '2025-09-22T10:00:00Z',
      submissions: [
        { id: uuidv4(), assignmentId: 'assign-2', studentId: 'student-1', studentName: '王同学', groupId: 'group-1', groupName: '算法先锋队', groupMembers: ['王同学', '赵同学'], fileName: '算法先锋队_线性表.zip', filePath: '/uploads/submissions/assign-2/算法先锋队.zip', fileSize: 2048000, status: 'graded', score: 90, feedback: '实现完整，代码规范', submittedAt: '2025-09-25T16:00:00Z' },
        { id: uuidv4(), assignmentId: 'assign-2', studentId: 'student-3', studentName: '刘同学', groupId: 'group-2', groupName: '代码工匠组', groupMembers: ['刘同学', '陈同学'], fileName: '代码工匠组_线性表.zip', filePath: '/uploads/submissions/assign-2/代码工匠组.zip', fileSize: 1800000, status: 'graded', score: 85, feedback: '链表删除有边界问题', submittedAt: '2025-09-26T09:00:00Z' },
      ],
    }
    const assign3: Assignment = {
      id: 'assign-3', courseId: 'course-1', chapterId: 'ch-1-3',
      title: '栈与队列小组设计', description: '以小组为单位设计一个应用栈和队列的实际场景，编写实现代码',
      deadline: futureDeadline, allowedFormats: ['.zip', '.pdf'], maxFileSize: 52428800,
      submissionMode: 'group', maxGroupSize: 4,
      status: 'active', createdBy: 'teacher-1', createdAt: '2025-10-01T10:00:00Z',
      submissions: [],
    }
    this.assignments.set(assign1.id, assign1)
    this.assignments.set(assign2.id, assign2)
    this.assignments.set(assign3.id, assign3)
  }
}

export const db = new Database()