import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import AgoraRTC, {
  type IAgoraRTCClient,
  type ILocalAudioTrack,
  type ILocalVideoTrack,
  type ICameraVideoTrack,
} from 'agora-rtc-sdk-ng'
import AgoraRTM from 'agora-rtm-sdk'
import { useCourseStore } from '@/store/course'
import {
  Video,
  Monitor,
  MonitorOff,
  Camera,
  CameraOff,
  Circle,
  Square,
  Film,
  MessageCircle,
  MessageCircleOff,
  Ban,
  Home,
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  Upload,
  Trash2,
  ExternalLink,
  X,
} from 'lucide-react'

// ─── 类型 ───────────────────────────────────────────────
interface DanmakuItem {
  timestamp: number
  content: string
}

interface FloatingDanmaku {
  id: number
  text: string
  top: number
}

interface ResourceItem {
  id: string
  name: string
  videoUrl?: string
  startAt?: string
  createdAt?: string
  source?: 'prerecord' | 'recording'
  type?: 'VIDEO' | 'PPT' | 'PDF'
  filePath?: string
  materialType?: string
}

// ─── 常量 ───────────────────────────────────────────────
const APP_ID = 'ef5c5abed935411c8366d07d8af1d3ef'
const TOKEN: string | null = null
const UPLOAD_ENDPOINT = '/api/video/upload'
const STREAM_BASE_URL = '/api/video/stream'

// ─── 组件 ───────────────────────────────────────────────
export default function TeacherLive() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const currentUser = useCourseStore((s) => s.currentUser)

  const courseId = searchParams.get('courseId') || 'default'
  const CHANNEL = `course_room_${courseId}`

  const CAMERA_UID = useRef(Math.floor(Math.random() * 10000))
  const SCREEN_UID = CAMERA_UID.current + 10000
  const sessionIdRef = useRef(`live_${courseId}_${Date.now()}`)
  const localDanmakuRef = useRef<{ userId: string; userName: string; content: string; timestamp: string }[]>([])

  // ── 状态 ──
  const [isClassStarted, setIsClassStarted] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isScreenOn, setIsScreenOn] = useState(false)
  const [showDanmaku, setShowDanmaku] = useState(true)
  const [showFloatingDanmaku, setShowFloatingDanmaku] = useState(true)
  const [danmakuList, setDanmakuList] = useState<DanmakuItem[]>([])
  const danmakuListRef = useRef<HTMLDivElement>(null)
  const [floatingDanmakus, setFloatingDanmakus] = useState<FloatingDanmaku[]>([])
  const [showResourcePanel, setShowResourcePanel] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSideNavCollapsed, setIsSideNavCollapsed] = useState(false)

  // ── 资源表单 ──
  const [resourceTitle, setResourceTitle] = useState('')
  const [resourceStartAt, setResourceStartAt] = useState('')
  const [resourceFile, setResourceFile] = useState<File | null>(null)
  const [resourceItems, setResourceItems] = useState<ResourceItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')

  const resourceFileInputRef = useRef<HTMLInputElement>(null)

  // ── Agora 引用 ──
  const rtcClientRef = useRef<IAgoraRTCClient | null>(null)
  const screenClientRef = useRef<IAgoraRTCClient | null>(null)
  const rtmClientRef = useRef<InstanceType<typeof AgoraRTM.RTM> | null>(null)
  const localAudioTrackRef = useRef<ILocalAudioTrack | null>(null)
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null)
  const screenVideoTrackRef = useRef<ILocalVideoTrack | null>(null)

  // ── 录制引用 ──
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  // ── 弹幕动画 key ──
  const danmakuIdRef = useRef(0)

  // ── 拖拽引用 ──
  const dragRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 })

  // ── 清理标记 ──
  const unmountedRef = useRef(false)

  // ────────────────────────────────────────────────────────
  // 工具函数
  // ────────────────────────────────────────────────────────
  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
  }

  const formatStartAt = (value: string) => {
    if (!value) return '未设置'
    const date = new Date(value)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const getFileExtension = (name: string) => {
    const dotIndex = name.lastIndexOf('.')
    return dotIndex >= 0 ? name.slice(dotIndex) : ''
  }

  const normalizeTitle = (title: string) => {
    const safe = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]+/g, '-').replace(/^-+|-+$/g, '')
    return safe || `recording_${Date.now()}`
  }

  // ────────────────────────────────────────────────────────
  // 弹幕飞屏
  // ────────────────────────────────────────────────────────
  const showFly = useCallback((text: string) => {
    const id = ++danmakuIdRef.current
    const top = Math.random() * 400 + 20
    setFloatingDanmakus((prev) => [...prev, { id, text, top }])
    setTimeout(() => {
      if (unmountedRef.current) return
      setFloatingDanmakus((prev) => prev.filter((d) => d.id !== id))
    }, 5000)
  }, [])

  useEffect(() => {
    if (danmakuListRef.current) {
      danmakuListRef.current.scrollTop = danmakuListRef.current.scrollHeight
    }
  }, [danmakuList])

  // ────────────────────────────────────────────────────────
  // 资源管理
  // ────────────────────────────────────────────────────────
  const loadResourceItems = useCallback(async () => {
    try {
      const [videoRes, materialRes] = await Promise.all([
        fetch(`/api/video/resources?courseId=${courseId}`),
        fetch(`/api/materials/materials?courseId=${courseId}&category=courseware`),
      ])

      const videoData = await videoRes.json()
      const materialData = await materialRes.json()

      const videos: ResourceItem[] = []
      if (videoData.success) {
        const records: any[] = videoData.data || []
        records.forEach((item: any) => {
          videos.push({
            id: item.id,
            name: item.name,
            videoUrl: item.videoUrl,
            startAt: item.startAt,
            createdAt: item.createdAt,
            source: item.source,
            type: 'VIDEO',
          })
        })
      }

      const courseware: ResourceItem[] = []
      if (materialData.success) {
        const mats: any[] = materialData.data || []
        mats.forEach((mat: any) => {
          const latestVersion = mat.versions?.[mat.versions.length - 1]
          const filePath = latestVersion?.filePath || ''
          courseware.push({
            id: mat.id,
            name: mat.title,
            type: mat.type === 'pdf' ? 'PDF' : 'PPT',
            filePath,
            materialType: mat.type,
          })
        })
      }

      setResourceItems([...courseware, ...videos])
    } catch {
      // 静默失败
    }
  }, [courseId])

  const persistResourceItems = useCallback(
    (_items: ResourceItem[]) => {
      // 不再需要手动持久化，后端已保存
    },
    [],
  )

  const handleResourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    setResourceFile(file || null)
  }

  const extractVideoUrl = (result: any, fallbackPath: string): string => {
    if (!result) {
      const fileName = fallbackPath.split('/').pop() || 'unknown.mp4'
      return `${STREAM_BASE_URL}/${courseId}/${encodeURIComponent(fileName)}`
    }
    const fileNameFields = ['fileName', 'name', 'data.fileName', 'data.name', 'result.fileName', 'result.name']
    for (const field of fileNameFields) {
      const path = field.split('.')
      let val: any = result
      for (const key of path) {
        val = val && typeof val === 'object' ? val[key] : undefined
      }
      if (val && typeof val === 'string') {
        return `${STREAM_BASE_URL}/${courseId}/${encodeURIComponent(val)}`
      }
    }
    const fileName = fallbackPath.split('/').pop() || 'unknown.mp4'
    return `${STREAM_BASE_URL}/${courseId}/${encodeURIComponent(fileName)}`
  }

  const addResource = useCallback(
    async (source: 'prerecord' | 'recording') => {
      if (!resourceTitle.trim()) {
        setUploadError('请输入资源名称')
        return
      }
      if (!resourceStartAt) {
        setUploadError('请选择可观看时间')
        return
      }
      if (!resourceFile) {
        setUploadError('请选择要上传的文件')
        return
      }

      setIsUploading(true)
      setUploadProgress(0)
      setUploadError('')

      try {
        const extension = getFileExtension(resourceFile.name)
        const baseName = normalizeTitle(resourceTitle.trim())
        const fileId = Date.now()
        const ossPath = `protected/${courseId}/recordings/${fileId}/${fileId}${extension}`

        const formData = new FormData()
        formData.append('file', resourceFile)
        formData.append('course_id', String(courseId))
        formData.append('start_at', new Date(resourceStartAt).toISOString())
        formData.append('title', resourceTitle.trim())
        formData.append('path', ossPath)

        const xhr = new XMLHttpRequest()
        const uploadDone = new Promise<{ ok: boolean; status: number; body: string }>((resolve, reject) => {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100))
            }
          }
          xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body: xhr.responseText })
          xhr.onerror = () => reject(new Error('网络错误'))
          xhr.open('POST', UPLOAD_ENDPOINT)
          xhr.send(formData)
        })

        const response = await uploadDone

        if (!response.ok) {
          throw new Error(`上传失败 [${response.status}]: ${response.body}`)
        }

        let result: any = null
        try {
          result = JSON.parse(response.body)
        } catch {
          result = { raw: response.body }
        }

        const videoUrl = extractVideoUrl(result, ossPath)

        // 上传成功后从后端重新加载资源列表
        await loadResourceItems()

        setResourceTitle('')
        setResourceStartAt('')
        setResourceFile(null)
        setUploadProgress(0)
        if (resourceFileInputRef.current) {
          resourceFileInputRef.current.value = ''
        }

        alert('上传成功！')
      } catch (error) {
        const msg = (error as Error).message || '上传失败，请检查上传接口或网络'
        setUploadError(msg)
        alert(msg)
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [resourceTitle, resourceStartAt, resourceFile, courseId, loadResourceItems],
  )

  const openVideoLink = (url: string) => {
    if (!url) return
    window.open(url, '_blank')
  }

  const deleteResource = async (item: ResourceItem) => {
    if (!confirm(`确定要删除视频 "${item.name}" 吗？此操作无法撤销。`)) return

    try {
      const response = await fetch('/api/video/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })

      if (!response.ok) throw new Error('删除失败')

      const result = await response.json()
      if (result.success) {
        await loadResourceItems()
        alert('删除成功！')
      } else {
        throw new Error(result.message || '删除失败')
      }
    } catch (error) {
      alert('删除失败：' + (error as Error).message)
    }
  }

  // ────────────────────────────────────────────────────────
  // 开始上课
  // ────────────────────────────────────────────────────────
  const startClass = async () => {
    try {
      // RTC 主客户端（摄像头+麦克风）
      const rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
      rtcClientRef.current = rtcClient
      await rtcClient.join(APP_ID, CHANNEL, TOKEN, CAMERA_UID.current)

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
      localAudioTrackRef.current = audioTrack
      await rtcClient.publish([audioTrack])

      // 屏幕共享客户端
      const screenClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
      screenClientRef.current = screenClient
      await screenClient.join(APP_ID, CHANNEL, TOKEN, SCREEN_UID)

      // RTM v2
      const rtmClient = new AgoraRTM.RTM(APP_ID, String(CAMERA_UID.current))
      rtmClientRef.current = rtmClient
      await rtmClient.login()
      await rtmClient.subscribe(CHANNEL)
      rtmClient.addEventListener('message', (event: any) => {
        if (unmountedRef.current) return
        const publisherId = String(event.publisher || event.userId || event.from || '')
        const text = event.message || event.payload || event.data || ''
        const msgStr = typeof text === 'string' ? text : (text ? JSON.stringify(text) : '')
        if (msgStr) {
          setDanmakuList((prev) => [...prev, { timestamp: Date.now(), content: msgStr }])
          showFly(msgStr)
          localDanmakuRef.current.push({
            userId: publisherId,
            userName: '学生',
            content: msgStr,
            timestamp: new Date().toISOString(),
          })
        }
      })

      setIsClassStarted(true)
      localStorage.setItem('liveCourseId', String(courseId))

      // 自动开启摄像头
      await toggleCamera()
    } catch {
      alert('开启失败，请检查设备权限！')
    }
  }

  // ────────────────────────────────────────────────────────
  // 摄像头开关
  // ────────────────────────────────────────────────────────
  const toggleCamera = async () => {
    const client = rtcClientRef.current
    if (!client) return

    if (isCameraOn) {
      const track = localVideoTrackRef.current
      if (track) {
        await client.unpublish(track)
        track.close()
        localVideoTrackRef.current = null
      }
      setIsCameraOn(false)
    } else {
      const videoTrack = await AgoraRTC.createCameraVideoTrack()
      localVideoTrackRef.current = videoTrack
      videoTrack.play('camera-video')
      await client.publish(videoTrack)
      setIsCameraOn(true)
    }
  }

  // ────────────────────────────────────────────────────────
  // 屏幕共享开关
  // ────────────────────────────────────────────────────────
  const toggleScreen = async () => {
    const client = screenClientRef.current
    if (!client) return

    if (isScreenOn) {
      const track = screenVideoTrackRef.current
      if (track) {
        await client.unpublish(track)
        track.close()
        screenVideoTrackRef.current = null
      }
      setIsScreenOn(false)
      const pip = document.getElementById('camera-video')
      if (pip) {
        pip.style.top = ''
        pip.style.left = ''
      }
    } else {
      const screenTrackResult = await AgoraRTC.createScreenVideoTrack(
        { encoderConfig: '1080p_1' },
        'auto',
      )
      // createScreenVideoTrack with "auto" returns ILocalVideoTrack | [ILocalVideoTrack, ILocalAudioTrack]
      const screenTrack = Array.isArray(screenTrackResult) ? screenTrackResult[0] : screenTrackResult
      screenVideoTrackRef.current = screenTrack
      screenTrack.play('screen-video')
      await client.publish(screenTrack)
      setIsScreenOn(true)

      screenTrack.on('track-ended', async () => {
        if (unmountedRef.current) return
        const t = screenVideoTrackRef.current
        if (t) {
          await client.unpublish(t)
          t.close()
          screenVideoTrackRef.current = null
        }
        setIsScreenOn(false)
        const pip = document.getElementById('camera-video')
        if (pip) {
          pip.style.top = ''
          pip.style.left = ''
        }
      })
    }
  }

  // ────────────────────────────────────────────────────────
  // 画中画拖拽
  // ────────────────────────────────────────────────────────
  const startDrag = (e: React.MouseEvent) => {
    if (!isScreenOn) return
    const pip = document.getElementById('camera-video')
    if (!pip) return
    const rect = pip.getBoundingClientRect()
    if (e.clientX > rect.right - 25 && e.clientY > rect.bottom - 25) return

    dragRef.current = {
      dragging: true,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    }
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current.dragging) return
      const container = pip.parentElement?.getBoundingClientRect()
      if (!container) return
      const newLeft = ev.clientX - container.left - dragRef.current.offsetX
      const newTop = ev.clientY - container.top - dragRef.current.offsetY
      pip.style.left = `${newLeft}px`
      pip.style.top = `${newTop}px`
      pip.style.right = 'auto'
      pip.style.bottom = 'auto'
    }
    const onMouseUp = () => {
      dragRef.current.dragging = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // ────────────────────────────────────────────────────────
  // 录制
  // ────────────────────────────────────────────────────────
  const getRecordFileName = () => {
    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    return `live_${courseId}_${stamp}.webm`
  }

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      return
    }

    if (!isClassStarted) {
      alert('请先开始上课后再录制。')
      return
    }

    const tracks: MediaStreamTrack[] = []
    if (localAudioTrackRef.current) tracks.push(localAudioTrackRef.current.getMediaStreamTrack())
    if (isScreenOn && screenVideoTrackRef.current) {
      tracks.push(screenVideoTrackRef.current.getMediaStreamTrack())
    } else if (localVideoTrackRef.current) {
      tracks.push(localVideoTrackRef.current.getMediaStreamTrack())
    }

    if (tracks.length === 0) {
      alert('当前没有可录制的视频流。')
      return
    }

    const stream = new MediaStream(tracks)
    const options: MediaRecorderOptions = {}
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      options.mimeType = 'video/webm;codecs=vp9,opus'
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      options.mimeType = 'video/webm;codecs=vp8,opus'
    }

    recordedChunksRef.current = []
    const recorder = new MediaRecorder(stream, options)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }

    recorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: options.mimeType || 'video/webm' })
      const file = new File([blob], getRecordFileName(), { type: blob.type })
      setResourceFile(file)
      setResourceTitle(`直播录制_${new Date().toLocaleString('zh-CN')}`)
      setResourceStartAt(new Date().toISOString().slice(0, 16))
      setShowResourcePanel(true)
      // 自动上传
      setIsRecording(false)
      // 延迟执行上传，等 state 更新
      setTimeout(() => {
        // addResource will read state at call time; we need to use refs or direct values
        // Since state updates are async, we'll handle upload inline
        uploadRecordingFile(file)
      }, 100)
    }

    recorder.start()
    setIsRecording(true)
  }

  const uploadRecordingFile = async (file: File) => {
    const title = `直播录制_${new Date().toLocaleString('zh-CN')}`
    const startAt = new Date().toISOString().slice(0, 16)

    if (!title.trim()) return
    if (!startAt) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadError('')

    try {
      const extension = getFileExtension(file.name)
      const fileId = Date.now()
      const ossPath = `protected/${courseId}/recordings/${fileId}/${fileId}${extension}`

      const formData = new FormData()
      formData.append('file', file)
      formData.append('course_id', String(courseId))
      formData.append('start_at', new Date(startAt).toISOString())
      formData.append('title', title.trim())
      formData.append('path', ossPath)

      const xhr = new XMLHttpRequest()
      const uploadDone = new Promise<{ ok: boolean; status: number; body: string }>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
        xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body: xhr.responseText })
        xhr.onerror = () => reject(new Error('网络错误'))
        xhr.open('POST', UPLOAD_ENDPOINT)
        xhr.send(formData)
      })

      const response = await uploadDone

      if (!response.ok) {
        throw new Error(`上传失败 [${response.status}]: ${response.body}`)
      }

      let result: any = null
      try {
        result = JSON.parse(response.body)
      } catch {
        result = { raw: response.body }
      }

      const videoUrl = extractVideoUrl(result, ossPath)

      // 上传成功后从后端重新加载资源列表
      await loadResourceItems()

      setResourceTitle('')
      setResourceStartAt('')
      setResourceFile(null)
      setUploadProgress(0)
      if (resourceFileInputRef.current) {
        resourceFileInputRef.current.value = ''
      }

      alert('录制上传成功！')
    } catch (error) {
      const msg = (error as Error).message || '上传失败'
      setUploadError(msg)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // ────────────────────────────────────────────────────────
  // 结束直播
  // ────────────────────────────────────────────────────────
  const stopLive = async () => {
    if (localDanmakuRef.current.length > 0) {
      const exportData = localDanmakuRef.current.map((d) => ({
        type: 'danmaku',
        course_id: courseId,
        user: d.userName,
        text: d.content,
        ts: new Date(d.timestamp).getTime(),
      }))
      const jsonStr = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `danmaku_${courseId}_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    if (localAudioTrackRef.current) localAudioTrackRef.current.close()
    if (localVideoTrackRef.current) localVideoTrackRef.current.close()
    if (screenVideoTrackRef.current) screenVideoTrackRef.current.close()
    if (rtcClientRef.current) await rtcClientRef.current.leave()
    if (screenClientRef.current) await screenClientRef.current.leave()
    if (rtmClientRef.current) {
      await rtmClientRef.current.unsubscribe(CHANNEL).catch(() => {})
      await rtmClientRef.current.logout()
    }

    rtcClientRef.current = null
    screenClientRef.current = null
    rtmClientRef.current = null
    localAudioTrackRef.current = null
    localVideoTrackRef.current = null
    screenVideoTrackRef.current = null

    setIsClassStarted(false)
    setIsCameraOn(false)
    setIsScreenOn(false)

    if (localStorage.getItem('liveCourseId') === String(courseId)) {
      localStorage.removeItem('liveCourseId')
    }
    navigate('/')
  }

  // ────────────────────────────────────────────────────────
  // 生命周期
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    unmountedRef.current = false
    loadResourceItems()
    // 定期刷新资源列表（替代 storage 事件）
    const refreshTimer = setInterval(loadResourceItems, 2000)
    return () => {
      unmountedRef.current = true
      clearInterval(refreshTimer)
      // 清理 Agora 资源
      if (localAudioTrackRef.current) localAudioTrackRef.current.close()
      if (localVideoTrackRef.current) localVideoTrackRef.current.close()
      if (screenVideoTrackRef.current) screenVideoTrackRef.current.close()
      rtcClientRef.current?.leave().catch(() => {})
      screenClientRef.current?.leave().catch(() => {})
      rtmClientRef.current?.unsubscribe(CHANNEL).catch(() => {})
      rtmClientRef.current?.logout().catch(() => {})
      if (localStorage.getItem('liveCourseId') === String(courseId)) {
        localStorage.removeItem('liveCourseId')
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ────────────────────────────────────────────────────────
  // 渲染
  // ────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex bg-[#F8F9FA] text-slate-800 font-sans">
      {/* ═══ 侧边导航 ═══ */}
      <aside
        className={`${
          isSideNavCollapsed ? 'w-16 px-2' : 'w-60 px-4'
        } bg-[#F8F9FA] py-6 flex flex-col gap-6 border-r border-slate-200 transition-all duration-300 relative`}
      >
        {/* 品牌 */}
        <div className={`flex flex-col gap-1.5 pb-5 border-b border-slate-200 ${isSideNavCollapsed ? 'items-center' : ''}`}>
          <div className="text-xl font-bold tracking-wide text-slate-900">
            {isSideNavCollapsed ? 'SE' : 'SE大师'}
          </div>
          {!isSideNavCollapsed && (
            <div className="text-[11px] text-slate-400">智能软件工程平台</div>
          )}
        </div>

        {/* 导航列表 */}
        <nav className="flex flex-col gap-1">
          <button className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] bg-sky-50 text-sky-700 font-medium">
            <Video size={16} />
            {!isSideNavCollapsed && '直播授课'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <Home size={16} />
            {!isSideNavCollapsed && '返回主页'}
          </button>
          <button className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
            <BookOpen size={16} />
            {!isSideNavCollapsed && '课程大纲'}
          </button>
          <button className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
            <FileText size={16} />
            {!isSideNavCollapsed && '作业管理'}
          </button>
        </nav>

        {/* 课程信息 */}
        <div className={`mt-auto bg-white rounded-lg border border-slate-200 flex flex-col gap-1.5 ${isSideNavCollapsed ? 'p-2 items-center' : 'p-4'}`}>
          {!isSideNavCollapsed && <div className="text-[11px] text-slate-500">当前课程</div>}
          {!isSideNavCollapsed && <div className="text-sm font-semibold text-slate-900">课程 {courseId}</div>}
          <div
            className={`text-xs px-2.5 py-1 rounded-full w-fit ${
              isClassStarted ? 'bg-emerald-200 text-green-800' : 'bg-amber-200 text-amber-800'
            }`}
          >
            {isClassStarted ? '🟢 直播中' : '⏳ 未开始'}
          </div>
        </div>

        {/* 折叠按钮 */}
        <button
          onClick={() => setIsSideNavCollapsed((v) => !v)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-slate-200 bg-white text-slate-500 text-[10px] flex items-center justify-center shadow hover:bg-slate-50 hover:text-slate-700 transition-colors z-10"
        >
          {isSideNavCollapsed ? '▶' : '◀'}
        </button>
      </aside>

      {/* ═══ 主内容 ═══ */}
      <div className="flex-1 flex gap-5 p-5 overflow-hidden">
        {/* ── 左侧视频区 ── */}
        <section className="flex-1 flex flex-col gap-4">
          {/* 视频容器 */}
          <div className="flex-1 bg-slate-900 relative rounded-2xl overflow-hidden border border-slate-200">
            {/* 弹幕飞屏层 */}
            {showFloatingDanmaku && (
              <div className="absolute inset-0 z-[100] pointer-events-none overflow-hidden">
                {floatingDanmakus.map((dm) => (
                  <div
                    key={dm.id}
                    className="absolute whitespace-nowrap text-xl font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                    style={{ top: dm.top, animation: 'flyLeft 6s linear forwards' }}
                  >
                    {dm.text}
                  </div>
                ))}
              </div>
            )}

            {/* 屏幕共享 */}
            <div
              id="screen-video"
              className={`w-full h-full absolute top-0 left-0 z-[1] ${isScreenOn ? '' : 'hidden'}`}
            />

            {/* 摄像头 */}
            <div
              id="camera-video"
              className={`${
                isScreenOn
                  ? 'absolute top-4 left-4 w-[200px] h-[140px] bg-slate-800 border-2 border-slate-700 rounded-xl z-10 cursor-move min-w-[120px] min-h-[80px]'
                  : 'w-full h-full absolute top-0 left-0 z-[1]'
              } ${isCameraOn ? '' : 'hidden'}`}
              onMouseDown={startDrag}
            />

            {/* 课前遮罩 */}
            {!isClassStarted && (
              <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-50 gap-4">
                <button
                  onClick={startClass}
                  className="px-10 py-4 text-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none rounded-full cursor-pointer font-semibold shadow-[0_12px_30px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(59,130,246,0.5)] transition-all duration-200"
                >
                  🎬 开始上课
                </button>
                <button
                  onClick={() => setShowResourcePanel(true)}
                  className="flex items-center gap-2 px-6 py-3 text-sm bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-full cursor-pointer hover:bg-white/20 transition-all duration-200"
                >
                  <Upload size={16} />
                  上传录播视频
                </button>
              </div>
            )}
          </div>

          {/* 控制面板 */}
          {isClassStarted && (
            <div className="bg-white px-5 py-3.5 rounded-lg flex justify-between items-center shadow-sm">
              <div className="flex gap-3">
                <button
                  onClick={toggleCamera}
                  className={`px-4 py-2.5 rounded-full border text-[13px] font-semibold transition-colors ${
                    isCameraOn
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  {isCameraOn ? <Camera size={14} className="inline mr-1.5" /> : <CameraOff size={14} className="inline mr-1.5" />}
                  {isCameraOn ? '摄像头' : '开启摄像头'}
                </button>
                <button
                  onClick={toggleScreen}
                  className={`px-4 py-2.5 rounded-full border text-[13px] font-semibold transition-colors ${
                    isScreenOn
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-slate-50 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  {isScreenOn ? <Monitor size={14} className="inline mr-1.5" /> : <MonitorOff size={14} className="inline mr-1.5" />}
                  {isScreenOn ? '屏幕共享中' : '共享屏幕'}
                </button>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={toggleRecording}
                  disabled={isUploading}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-[13px] font-semibold transition-colors ${
                    isRecording
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:text-blue-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="录制"
                >
                  {isRecording ? <Square size={14} /> : <Circle size={14} />}
                  <span className="text-xs">{isRecording ? '录制中' : '录制'}</span>
                </button>
                <button
                  onClick={() => setShowResourcePanel((v) => !v)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 text-[13px] font-semibold hover:border-blue-400 hover:text-blue-500 transition-colors"
                  title="录播管理"
                >
                  <Film size={14} />
                  <span className="text-xs">录播</span>
                </button>
                <button
                  onClick={() => setShowDanmaku((v) => !v)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 text-[13px] font-semibold hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  {showDanmaku ? <MessageCircle size={14} /> : <MessageCircleOff size={14} />}
                  <span className="text-xs">{showDanmaku ? '弹幕' : '隐藏弹幕'}</span>
                </button>
                <button
                  onClick={() => setShowFloatingDanmaku((v) => !v)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 text-[13px] font-semibold hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  {showFloatingDanmaku ? <MessageCircle size={14} /> : <Ban size={14} />}
                  <span className="text-xs">{showFloatingDanmaku ? '飘屏' : '关闭飘屏'}</span>
                </button>
                <button
                  onClick={stopLive}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-red-500 text-white border-red-500 text-[13px] font-semibold hover:bg-red-600 transition-colors"
                >
                  <Square size={14} />
                  <span className="text-xs">结束直播</span>
                </button>
              </div>
            </div>
          )}

          {/* 资源面板 */}
          {showResourcePanel && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3.5 bg-slate-50 border-b border-slate-200">
                <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <Film size={14} /> 录播与资料管理
                </span>
                <button
                  onClick={() => setShowResourcePanel(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4">
                {/* 上传表单 */}
                <div className="flex flex-col gap-2.5 mb-4">
                  <input
                    type="text"
                    value={resourceTitle}
                    onChange={(e) => setResourceTitle(e.target.value)}
                    placeholder="资源名称（如：第4讲 录播）"
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <input
                    type="datetime-local"
                    value={resourceStartAt}
                    onChange={(e) => setResourceStartAt(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <input
                    ref={resourceFileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleResourceFileChange}
                    disabled={isUploading}
                    className="text-[13px] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:text-xs file:font-semibold file:cursor-pointer"
                  />
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => addResource('prerecord')}
                      disabled={isUploading}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-[13px] font-semibold disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                    >
                      <Upload size={14} className="inline mr-1.5" />
                      上传预录视频
                    </button>
                    <button
                      onClick={() => addResource('recording')}
                      disabled={isUploading}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-[13px] font-semibold disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                    >
                      <Film size={14} className="inline mr-1.5" />
                      保存直播录像
                    </button>
                  </div>
                  {isUploading && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 text-center">上传中: {uploadProgress}%</div>
                    </div>
                  )}
                  {uploadError && (
                    <div className="text-xs text-red-600 p-2.5 bg-red-50 rounded-xl">{uploadError}</div>
                  )}
                  <div className="text-[11px] text-slate-400 p-2.5 bg-slate-50 rounded-xl">
                    说明：视频会上传到后端存储服务，并同步本地列表。
                  </div>
                </div>

                {/* 资源列表 */}
                <div className="flex flex-col gap-2.5">
                  {resourceItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="text-2xl">
                        {item.type === 'PPT' ? '📊' : item.type === 'PDF' ? '📄' : '🎬'}
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[13px] font-semibold text-slate-900">{item.name}</span>
                        <span className="text-[11px] text-slate-500">
                          {item.type === 'VIDEO'
                            ? `可观看时间：${formatStartAt(item.startAt)}`
                            : `${item.type} 课件`}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {item.type === 'VIDEO' ? (
                          <button
                            onClick={() => openVideoLink(item.videoUrl)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-500 transition-colors"
                          >
                            <ExternalLink size={12} className="inline mr-1" />
                            打开
                          </button>
                        ) : item.filePath ? (
                          <button
                            onClick={() => window.open(`/api/materials/preview?url=${encodeURIComponent(item.filePath || '')}`, '_blank')}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-500 transition-colors"
                          >
                            <ExternalLink size={12} className="inline mr-1" />
                            预览
                          </button>
                        ) : null}
                        {item.type === 'VIDEO' && (
                          <button
                            onClick={() => deleteResource(item)}
                            className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={12} className="inline mr-1" />
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {resourceItems.length === 0 && (
                    <div className="text-[13px] text-slate-400 text-center py-5">暂无资源</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── 右侧弹幕面板 ── */}
        {isClassStarted && showDanmaku && (
          <aside className="w-[300px] bg-white rounded-lg shadow-sm flex flex-col">
            <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <MessageCircle size={14} /> 实时弹幕面板
              </span>
            </div>
            <div className="flex-1 px-3.5 py-3.5 overflow-y-auto flex flex-col gap-2.5" ref={danmakuListRef}>
              {danmakuList.map((dm, i) => (
                <div key={i} className="px-2.5 py-2 bg-slate-50 rounded-xl text-[13px]">
                  <span className="text-slate-500 text-[11px] mr-2">[{formatTime(dm.timestamp)}]</span>
                  <span className="text-slate-800">{dm.content}</span>
                </div>
              ))}
              {danmakuList.length === 0 && (
                <div className="text-[13px] text-slate-400 text-center py-5">暂无弹幕</div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ═══ 弹幕飞行动画样式 ═══ */}
      <style>{`
        @keyframes flyLeft {
          from { left: 100%; }
          to { left: -320px; }
        }
      `}</style>
    </div>
  )
}