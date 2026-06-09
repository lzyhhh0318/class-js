import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/access-logs', (req: Request, res: Response) => {
  const { userId, resourceType, action, startDate, endDate } = req.query

  let logs = [...db.accessLogs]

  if (userId) logs = logs.filter(l => l.userId === userId)
  if (resourceType) logs = logs.filter(l => l.resourceType === resourceType)
  if (action) logs = logs.filter(l => l.action === action)
  if (startDate) logs = logs.filter(l => l.timestamp >= (startDate as string))
  if (endDate) logs = logs.filter(l => l.timestamp <= (endDate as string))

  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  res.json({ success: true, data: logs })
})

router.get('/stats/overview', (_req: Request, res: Response) => {
  const totalMaterials = db.materials.size
  const totalAssignments = db.assignments.size
  const totalSubmissions = Array.from(db.assignments.values())
    .reduce((sum, a) => sum + a.submissions.length, 0)
  const totalAccessLogs = db.accessLogs.length

  const materialsByType: Record<string, number> = {}
  Array.from(db.materials.values()).forEach(m => {
    materialsByType[m.type] = (materialsByType[m.type] || 0) + 1
  })

  const actionCounts: Record<string, number> = {}
  db.accessLogs.forEach(l => {
    actionCounts[l.action] = (actionCounts[l.action] || 0) + 1
  })

  const dailyStats: Record<string, { views: number; downloads: number; uploads: number; submissions: number }> = {}
  db.accessLogs.forEach(l => {
    const day = l.timestamp.split('T')[0]
    if (!dailyStats[day]) dailyStats[day] = { views: 0, downloads: 0, uploads: 0, submissions: 0 }
    if (l.action === 'view') dailyStats[day].views++
    if (l.action === 'download') dailyStats[day].downloads++
    if (l.action === 'upload') dailyStats[day].uploads++
    if (l.action === 'submit') dailyStats[day].submissions++
  })

  res.json({
    success: true,
    data: {
      totalMaterials,
      totalAssignments,
      totalSubmissions,
      totalAccessLogs,
      materialsByType,
      actionCounts,
      dailyStats,
    },
  })
})

router.get('/stats/material/:materialId', (req: Request, res: Response) => {
  const material = db.materials.get(req.params.materialId)
  if (!material) {
    res.status(404).json({ success: false, error: '资料不存在' })
    return
  }

  const logs = db.accessLogs.filter(l => l.resourceId === material.id)
  const viewCount = logs.filter(l => l.action === 'view').length
  const downloadCount = logs.filter(l => l.action === 'download').length

  res.json({
    success: true,
    data: {
      materialId: material.id,
      title: material.title,
      viewCount,
      downloadCount,
      versionCount: material.versions.length,
      hasParsedContent: !!material.parsedContent,
    },
  })
})

router.get('/stats/assignment/:assignmentId', (req: Request, res: Response) => {
  const assignment = db.assignments.get(req.params.assignmentId)
  if (!assignment) {
    res.status(404).json({ success: false, error: '作业不存在' })
    return
  }

  const totalStudents = Array.from(db.users.values()).filter(u => u.role === 'student' && u.courseIds.includes(assignment.courseId)).length
  const submittedCount = assignment.submissions.length
  const gradedCount = assignment.submissions.filter(s => s.status === 'graded').length
  const avgScore = assignment.submissions
    .filter(s => s.score !== null)
    .reduce((sum, s) => sum + (s.score || 0), 0) / (gradedCount || 1)

  res.json({
    success: true,
    data: {
      assignmentId: assignment.id,
      title: assignment.title,
      totalStudents,
      submittedCount,
      gradedCount,
      avgScore: Math.round(avgScore * 10) / 10,
      submissionRate: totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0,
    },
  })
})

export default router
