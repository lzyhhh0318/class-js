import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import recommendRoutes from './routes/recommend.js'
import parseRoutes from './routes/parse.js'
import materialsRoutes from './routes/materials.js'
import assignmentsRoutes from './routes/assignments.js'
import aiRoutes from './routes/ai.js'
import permissionsRoutes from './routes/permissions.js'
import notificationsRoutes from './routes/notifications.js'
import statsRoutes from './routes/stats.js'
import videoRoutes from './routes/video.js'
import danmakuRoutes from './routes/danmaku.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
app.use('/uploads/videos', express.static(path.join(process.cwd(), 'uploads', 'videos')))

app.use('/api/auth', authRoutes)
app.use('/api/recommend', recommendRoutes)
app.use('/api/parse', parseRoutes)
app.use('/api/materials', materialsRoutes)
app.use('/api/assignments', assignmentsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/permissions', permissionsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/video', videoRoutes)
app.use('/api/danmaku', danmakuRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app