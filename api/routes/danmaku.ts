import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db'

const router = Router()

router.post('/save', (req: Request, res: Response) => {
  const { courseId, sessionId, userId, userName, content } = req.body
  if (!courseId || !content) {
    res.json({ success: false, message: '缺少必要参数' })
    return
  }
  const record = {
    id: uuidv4(),
    courseId,
    sessionId: sessionId || 'default',
    userId: userId || 'anonymous',
    userName: userName || '匿名',
    content,
    timestamp: new Date().toISOString(),
  }
  db.danmakuRecords.push(record)
  res.json({ success: true, data: record })
})

router.post('/batch-save', (req: Request, res: Response) => {
  const { courseId, sessionId, messages } = req.body
  if (!courseId || !Array.isArray(messages)) {
    res.json({ success: false, message: '缺少必要参数' })
    return
  }
  const records = messages.map((msg: any) => ({
    id: uuidv4(),
    courseId,
    sessionId: sessionId || 'default',
    userId: msg.userId || 'anonymous',
    userName: msg.userName || '匿名',
    content: msg.content,
    timestamp: msg.timestamp || new Date().toISOString(),
  }))
  db.danmakuRecords.push(...records)
  res.json({ success: true, count: records.length })
})

router.get('/list', (req: Request, res: Response) => {
  const { courseId, sessionId } = req.query
  let records = db.danmakuRecords
  if (courseId) {
    records = records.filter((r) => r.courseId === courseId)
  }
  if (sessionId) {
    records = records.filter((r) => r.sessionId === sessionId)
  }
  res.json({ success: true, data: records })
})

router.get('/sessions', (req: Request, res: Response) => {
  const { courseId } = req.query
  let records = db.danmakuRecords
  if (courseId) {
    records = records.filter((r) => r.courseId === String(courseId))
  }
  const sessionMap = new Map<string, { sessionId: string; count: number; startTime: string; lastTime: string }>()
  records.forEach((r) => {
    const existing = sessionMap.get(r.sessionId)
    if (existing) {
      existing.count++
      if (r.timestamp > existing.lastTime) existing.lastTime = r.timestamp
    } else {
      sessionMap.set(r.sessionId, { sessionId: r.sessionId, count: 1, startTime: r.timestamp, lastTime: r.timestamp })
    }
  })
  const sessions = Array.from(sessionMap.values()).sort((a, b) => b.startTime.localeCompare(a.startTime))
  res.json({ success: true, data: sessions })
})

export default router