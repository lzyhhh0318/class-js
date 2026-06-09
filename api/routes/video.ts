import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'

const router = Router()

const videoDir = path.join(process.cwd(), 'uploads', 'videos')
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true })
}

// 资源元数据存储文件
const metaFile = path.join(process.cwd(), 'uploads', 'video-resources.json')

interface ResourceMeta {
  id: string
  name: string
  videoUrl: string
  fileName: string
  courseId: string
  startAt: string
  createdAt: string
  source: 'prerecord' | 'recording'
}

function loadResources(): ResourceMeta[] {
  if (!fs.existsSync(metaFile)) return []
  try {
    return JSON.parse(fs.readFileSync(metaFile, 'utf-8'))
  } catch {
    return []
  }
}

function saveResources(resources: ResourceMeta[]) {
  fs.writeFileSync(metaFile, JSON.stringify(resources, null, 2), 'utf-8')
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

// 上传视频 + 保存资源元数据
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  const file = req.file
  if (!file) {
    res.status(400).json({ success: false, message: '请选择要上传的文件' })
    return
  }

  const courseId = req.body.course_id || 'default'
  const title = req.body.title || file.originalname
  const startAt = req.body.start_at || new Date().toISOString()
  const source = req.body.source || 'prerecord'

  const fileName = path.basename(file.path)
  const videoUrl = `/uploads/videos/${fileName}`

  const resource: ResourceMeta = {
    id: `res_${Date.now()}_${uuidv4().slice(0, 8)}`,
    name: title,
    videoUrl,
    fileName,
    courseId,
    startAt,
    createdAt: new Date().toISOString(),
    source,
  }

  const resources = loadResources()
  resources.unshift(resource)
  saveResources(resources)

  res.status(200).json({
    success: true,
    videoUrl,
    fileName,
    courseId,
    title,
    startAt,
    id: resource.id,
  })
})

// 获取某课程的视频资源列表
router.get('/resources', (req: Request, res: Response) => {
  const { courseId } = req.query
  if (!courseId) {
    res.status(400).json({ success: false, message: '缺少 courseId 参数' })
    return
  }

  const resources = loadResources().filter(r => r.courseId === courseId)
  res.status(200).json({ success: true, data: resources })
})

// 获取视频文件列表（兼容旧接口）
router.get('/list', (req: Request, res: Response) => {
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

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const contentTypes: Record<string, string> = {
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
  }
  return contentTypes[ext] || 'video/mp4'
}

// 视频流代理（支持Range请求）
router.get('/stream/:courseId/:fileName', (req: Request, res: Response) => {
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
  const contentType = getContentType(filePath)

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
      'Content-Type': contentType,
    }

    res.writeHead(206, head)
    fileStream.pipe(res)
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    }
    res.writeHead(200, head)
    fs.createReadStream(filePath).pipe(res)
  }
})

// 删除视频资源（同时删除元数据和文件）
router.delete('/delete', (req: Request, res: Response) => {
  const { id, ossPath } = req.body

  let resources = loadResources()

  // 优先按id删除
  if (id) {
    const target = resources.find(r => r.id === id)
    if (target) {
      // 删除文件
      const filePath = path.join(videoDir, target.fileName)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      resources = resources.filter(r => r.id !== id)
      saveResources(resources)
      res.status(200).json({ success: true, message: '删除成功' })
      return
    }
  }

  // 兼容按ossPath删除
  if (ossPath) {
    const fileName = ossPath.split('/').pop()
    if (fileName) {
      const filePath = path.join(videoDir, decodeURIComponent(fileName))
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      resources = resources.filter(r => r.fileName !== decodeURIComponent(fileName))
      saveResources(resources)
    }
    res.status(200).json({ success: true, message: '删除成功' })
    return
  }

  res.status(400).json({ success: false, message: '缺少资源ID或文件路径' })
})

export default router