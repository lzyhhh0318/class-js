import { Router } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'

const router = Router()

const videoDir = path.join(process.cwd(), 'uploads', 'videos')
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, videoDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm'
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 },
})

router.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file
  if (!file) {
    res.status(400).json({ success: false, message: '请选择要上传的文件' })
    return
  }

  const courseId = req.body.course_id || 'default'
  const title = req.body.title || file.originalname
  const startAt = req.body.start_at || new Date().toISOString()

  const fileName = path.basename(file.path)
  const videoUrl = `/uploads/videos/${fileName}`

  res.status(200).json({
    success: true,
    videoUrl,
    fileName,
    courseId,
    title,
    startAt,
  })
})

router.get('/list', (req, res) => {
  const { courseId } = req.query
  if (!courseId) {
    res.status(400).json({ success: false, message: '缺少 courseId 参数' })
    return
  }

  try {
    const files = fs.readdirSync(videoDir)
    const videos = files
      .filter(f => !f.startsWith('.'))
      .map(f => ({
        name: f,
        url: `/uploads/videos/${f}`,
        size: fs.statSync(path.join(videoDir, f)).size,
        lastModified: fs.statSync(path.join(videoDir, f)).mtime.toISOString(),
      }))

    res.status(200).json({ success: true, data: videos })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取视频列表失败' })
  }
})

router.get('/stream/:courseId/:fileName', (req, res) => {
  const { fileName } = req.params
  const decodedName = decodeURIComponent(fileName)
  const filePath = path.join(videoDir, decodedName)

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, message: '视频不存在' })
    return
  }

  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunkSize = end - start + 1

    const fileStream = fs.createReadStream(filePath, { start, end })
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/webm',
    }

    res.writeHead(206, head)
    fileStream.pipe(res)
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/webm',
    }
    res.writeHead(200, head)
    fs.createReadStream(filePath).pipe(res)
  }
})

router.delete('/delete', (req, res) => {
  const { ossPath } = req.body
  if (!ossPath) {
    res.status(400).json({ success: false, message: '缺少文件路径' })
    return
  }

  const fileName = ossPath.split('/').pop()
  if (!fileName) {
    res.status(400).json({ success: false, message: '无效的文件路径' })
    return
  }

  const filePath = path.join(videoDir, decodeURIComponent(fileName))

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
    res.status(200).json({ success: true, message: '删除成功' })
  } else {
    res.status(200).json({ success: true, message: '文件不存在，已忽略' })
  }
})

export default router
