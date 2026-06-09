import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import AgoraRTC, { type IAgoraRTCClient } from 'agora-rtc-sdk-ng'
import AgoraRTM from 'agora-rtm-sdk'
import { useCourseStore } from '@/store/course'
import {
  Video, MessageCircle, Send, X, BookOpen, FileText,
  Maximize, Minimize, Radio,
  Monitor, ArrowLeft, Bot, MessageSquare, Library,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

// ─── 类型 ───────────────────────────────────────────────
interface FloatingDanmaku {
  id: number
  text: string
  top: number
}

interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

interface BoardMessage {
  name: string
  text: string
}

interface ResourceItem {
  id: string
  name: string
  type: 'PPT' | 'PDF' | 'VIDEO'
  available: boolean
  startAt?: string
  url?: string
  pages?: number
  demo?: boolean
  filePath?: string
  materialType?: string
}

// ─── 常量 ───────────────────────────────────────────────
const APP_ID = 'ef5c5abed935411c8366d07d8af1d3ef'
const TOKEN: string | null = null
const DANMAKU_LIMIT_PER_MINUTE = 10

const DANMAKU_LIMIT_MAP: Record<string, number> = { high: 50, normal: 20, low: 5 }
const DANMAKU_POSITION_MAP: Record<string, { minTop: number; maxTop: number }> = {
  high: { minTop: 20, maxTop: 400 },
  normal: { minTop: 20, maxTop: 150 },
  low: { minTop: 20, maxTop: 40 },
}

const SLIDE_CONTENTS: Record<number, string> = {
  1: '课程介绍与教学目标',
  2: '软件工程概述与发展历程',
  3: '软件开发生命周期模型',
  4: '需求分析与需求工程',
  5: '系统设计与架构模式',
  6: '面向对象分析与设计',
  7: '数据库设计与数据建模',
  8: '软件测试与质量保证',
  9: '软件维护与演进',
  10: '项目管理与团队协作',
  11: '敏捷开发方法与实践',
  12: '课程总结与展望',
}

const RESOURCE_COLORS: Record<string, string> = {
  PPT: 'bg-blue-100',
  PDF: 'bg-amber-100',
  VIDEO: 'bg-green-100',
}

// ─── 组件 ───────────────────────────────────────────────
export default function LiveRoom() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const currentUser = useCourseStore((s) => s.currentUser)

  const courseId = searchParams.get('courseId') || 'default'
  const CHANNEL = `course_room_${courseId}`
  const UID = useRef(Math.floor(Math.random() * 10000))

  // ── 视频状态 ──
  const [isTeacherCameraOn, setIsTeacherCameraOn] = useState(false)
  const [isTeacherScreenOn, setIsTeacherScreenOn] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  // ── 弹幕状态 ──
  const [inputText, setInputText] = useState('')
  const [activeDanmakus, setActiveDanmakus] = useState<string[]>([])
  const danmakuPanelRef = useRef<HTMLDivElement>(null)
  const [showFloatingDanmaku, setShowFloatingDanmaku] = useState(true)
  const [floatingDanmakus, setFloatingDanmakus] = useState<FloatingDanmaku[]>([])
  const [showDanmakuPanel, setShowDanmakuPanel] = useState(true)
  const [danmakuDensity, setDanmakuDensity] = useState<'high' | 'normal' | 'low'>('normal')
  const userDanmakuTimestamps = useRef<Record<string, number[]>>({})

  // ── AI 助手 ──
  const [aiInput, setAiInput] = useState('')
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    { role: 'assistant', content: '你好，我是课堂 AI 助手，可以帮你整理知识点。' },
  ])
  const [showAiPanel, setShowAiPanel] = useState(true)

  // ── 留言板 ──
  const [boardInput, setBoardInput] = useState('')
  const [boardMessages, setBoardMessages] = useState<BoardMessage[]>([
    { name: '系统', text: '欢迎留言，老师下课后会集中回复。' },
  ])
  const [showBoardPanel, setShowBoardPanel] = useState(true)

  // ── 资源库 ──
  const [visibleResources, setVisibleResources] = useState<ResourceItem[]>([])
  const [showResourceListPanel, setShowResourceListPanel] = useState(true)
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null)
  const [showResourcePreview, setShowResourcePreview] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [playedVideoIds, setPlayedVideoIds] = useState<Set<string>>(new Set())

  // ── 浮动窗口 ──
  const [floatStyle, setFloatStyle] = useState({
    left: 50, top: 50, width: 500, height: 400,
  })

  // ── 侧边栏 ──
  const [isSideNavCollapsed, setIsSideNavCollapsed] = useState(false)

  // ── Agora 引用 ──
  const rtcClientRef = useRef<IAgoraRTCClient | null>(null)
  const rtmClientRef = useRef<InstanceType<typeof AgoraRTM.RTM> | null>(null)

  // ── 拖拽引用 ──
  const floatDragRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 })
  const resizeRef = useRef({ resizing: false, startX: 0, startY: 0, startW: 0, startH: 0 })

  // ── 录播检查 ──
  const videoCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resourceRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentPlayingVideoRef = useRef<ResourceItem | null>(null)

  // ── 弹幕动画 key ──
  const danmakuIdRef = useRef(0)

  // ── 计算 ──
  const isLive = isTeacherCameraOn || isTeacherScreenOn

  // ────────────────────────────────────────────────────────
  // 弹幕飞屏
  // ────────────────────────────────────────────────────────
  const showFly = useCallback((text: string) => {
    const id = ++danmakuIdRef.current
    const pos = DANMAKU_POSITION_MAP[danmakuDensity]
    const top = Math.random() * (pos.maxTop - pos.minTop) + pos.minTop

    setFloatingDanmakus((prev) => {
      const next = [...prev, { id, text, top }]
      return next.length > DANMAKU_LIMIT_MAP[danmakuDensity]
        ? next.slice(-DANMAKU_LIMIT_MAP[danmakuDensity])
        : next
    })

    setTimeout(() => {
      setFloatingDanmakus((prev) => prev.filter((d) => d.id !== id))
    }, 6000)
  }, [danmakuDensity])

  useEffect(() => {
    if (danmakuPanelRef.current) {
      danmakuPanelRef.current.scrollTop = danmakuPanelRef.current.scrollHeight
    }
  }, [activeDanmakus])

  // ────────────────────────────────────────────────────────
  // 弹幕限速
  // ────────────────────────────────────────────────────────
  const canSendDanmaku = useCallback((userId: string) => {
    const now = Date.now()
    if (!userDanmakuTimestamps.current[userId]) {
      userDanmakuTimestamps.current[userId] = []
    }
    userDanmakuTimestamps.current[userId] = userDanmakuTimestamps.current[userId].filter(
      (ts) => now - ts < 60000,
    )
    return userDanmakuTimestamps.current[userId].length < DANMAKU_LIMIT_PER_MINUTE
  }, [])

  // ────────────────────────────────────────────────────────
  // 发送弹幕
  // ────────────────────────────────────────────────────────
  const sendDanmaku = useCallback(async () => {
    if (!inputText.trim()) return
    const userId = String(UID.current)

    if (!canSendDanmaku(userId)) {
      alert('发送频率过高，请稍后再试')
      return
    }
    if (floatingDanmakus.length >= DANMAKU_LIMIT_MAP[danmakuDensity]) return

    const text = inputText
    userDanmakuTimestamps.current[userId].push(Date.now())

    try {
      await rtmClientRef.current?.publish(CHANNEL, text)
    } catch { /* ignore */ }

    const display = `我: ${text}`
    setActiveDanmakus((prev) => [...prev, display])
    showFly(display)

    setInputText('')
  }, [inputText, danmakuDensity, floatingDanmakus.length, canSendDanmaku, showFly])

  // ────────────────────────────────────────────────────────
  // AI 助手
  // ────────────────────────────────────────────────────────
  const sendAiQuestion = useCallback(() => {
    if (!aiInput.trim()) return
    setAiMessages((prev) => [
      ...prev,
      { role: 'user', content: aiInput },
      { role: 'assistant', content: '已收到问题，接口对接后将返回答案。' },
    ])
    setAiInput('')
  }, [aiInput])

  // ────────────────────────────────────────────────────────
  // 留言板
  // ────────────────────────────────────────────────────────
  const postBoardMessage = useCallback(() => {
    if (!boardInput.trim()) return
    setBoardMessages((prev) => [{ name: currentUser?.name || '我', text: boardInput }, ...prev])
    setBoardInput('')
  }, [boardInput, currentUser?.name])

  // ────────────────────────────────────────────────────────
  // 资源库
  // ────────────────────────────────────────────────────────
  const getDisplayNameFromUrl = (url: string) => {
    const fileName = url.split('/').pop() || '录播视频'
    return decodeURIComponent(fileName).replace(/^[0-9]+_/, '')
  }

  const getStreamUrl = (videoUrl: string): string => {
    if (!videoUrl) return ''
    const fileName = videoUrl.split('/').pop() || ''
    if (!fileName) return videoUrl
    return `/api/video/stream/${courseId}/${encodeURIComponent(fileName)}`
  }

  const fetchCourseRecords = useCallback(async () => {
    try {
      const [videoRes, materialRes] = await Promise.all([
        fetch(`/api/video/resources?courseId=${courseId}`),
        fetch(`/api/materials/materials?courseId=${courseId}&category=courseware`),
      ])

      const videoData = await videoRes.json()
      const materialData = await materialRes.json()

      const recordings: ResourceItem[] = []
      if (videoData.success) {
        const records: any[] = videoData.data || []
        const now = Date.now()
        records.forEach((item: any) => {
          const startAt = item.startAt || item.createdAt
          const available = new Date(startAt).getTime() <= now
          recordings.push({
            id: item.id,
            name: item.name || getDisplayNameFromUrl(item.videoUrl || ''),
            type: 'VIDEO' as const,
            available,
            startAt,
            url: getStreamUrl(item.videoUrl),
          })
        })
        console.log('[AutoPlay] Videos loaded:', recordings.length)
      }

      const courseware: ResourceItem[] = []
      if (materialData.success) {
        const mats: any[] = materialData.data || []
        mats.forEach((mat: any) => {
          const latestVersion = mat.versions?.[mat.versions.length - 1]
          const filePath = latestVersion?.filePath || ''
          const resourceType: 'PPT' | 'PDF' = mat.type === 'pdf' ? 'PDF' : 'PPT'
          courseware.push({
            id: mat.id,
            name: mat.title,
            type: resourceType,
            available: true,
            filePath,
            materialType: mat.type,
            pages: resourceType === 'PPT' ? 10 : undefined,
          })
        })
        console.log('[Resource] Courseware loaded:', courseware.length)
      }

      setVisibleResources([...courseware, ...recordings])
    } catch (error) {
      console.error('[Resource] Failed to fetch:', error)
    }
  }, [courseId])

  const openResourceItem = (item: ResourceItem) => {
    if (!item.available) return
    setSelectedResource(item)
    setCurrentPage(1)
    if (item.type === 'PPT' || item.type === 'PDF') {
      setShowResourcePreview(true)
    } else if (item.type === 'VIDEO' && item.url) {
      const videoUrl = item.url.startsWith('/') ? `http://localhost:3001${item.url}` : item.url
      window.open(videoUrl, '_blank')
    }
  }

  const closeResourcePreview = () => setShowResourcePreview(false)

  // ────────────────────────────────────────────────────────
  // 全屏
  // ────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      videoContainerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // ────────────────────────────────────────────────────────
  // 浮动窗口拖拽
  // ────────────────────────────────────────────────────────
  const startFloatDrag = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.classList.contains('resize-handle') || target.classList.contains('float-close-btn')) return
    floatDragRef.current = {
      dragging: true,
      offsetX: e.clientX - floatStyle.left,
      offsetY: e.clientY - floatStyle.top,
    }
    const onMouseMove = (ev: MouseEvent) => {
      if (!floatDragRef.current.dragging) return
      setFloatStyle((prev) => ({
        ...prev,
        left: ev.clientX - floatDragRef.current.offsetX,
        top: ev.clientY - floatDragRef.current.offsetY,
      }))
    }
    const onMouseUp = () => {
      floatDragRef.current.dragging = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [floatStyle.left, floatStyle.top])

  const startResize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    resizeRef.current = {
      resizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startW: floatStyle.width,
      startH: floatStyle.height,
    }
    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current.resizing) return
      setFloatStyle((prev) => ({
        ...prev,
        width: Math.max(300, resizeRef.current.startW + (ev.clientX - resizeRef.current.startX)),
        height: Math.max(250, resizeRef.current.startH + (ev.clientY - resizeRef.current.startY)),
      }))
    }
    const onMouseUp = () => {
      resizeRef.current.resizing = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [floatStyle.width, floatStyle.height])

  // ────────────────────────────────────────────────────────
  // 录播视频自动播放
  // ────────────────────────────────────────────────────────
  const checkAndPlayScheduledVideo = useCallback(() => {
    console.log('[AutoPlay] Checking for scheduled videos...')
    console.log('[AutoPlay] Teacher screen on:', isTeacherScreenOn, 'camera on:', isTeacherCameraOn)
    console.log('[AutoPlay] Already playing:', !!currentPlayingVideoRef.current)
    
    if (isTeacherScreenOn || isTeacherCameraOn) {
      console.log('[AutoPlay] Skipping - teacher is live')
      return
    }
    if (currentPlayingVideoRef.current) {
      console.log('[AutoPlay] Skipping - already playing:', currentPlayingVideoRef.current.name)
      return
    }
    if (!videoContainerRef.current) {
      console.log('[AutoPlay] Skipping - video container not found')
      return
    }
    
    const now = Date.now()
    console.log('[AutoPlay] Current time:', new Date(now).toISOString())
    console.log('[AutoPlay] Available videos:', visibleResources.filter(r => r.type === 'VIDEO').length)
    
    const scheduled = visibleResources.find((item) => {
      if (item.type !== 'VIDEO') return false
      if (!item.startAt) {
        console.log('[AutoPlay] Video', item.name, 'has no start time')
        return false
      }
      if (!item.url) {
        console.log('[AutoPlay] Video', item.name, 'has no URL')
        return false
      }
      if (playedVideoIds.has(item.id)) {
        console.log('[AutoPlay] Video', item.name, 'already played, skipping')
        return false
      }
      const startTime = new Date(item.startAt).getTime()
      const diff = startTime - now
      console.log('[AutoPlay] Video', item.name, 'start time:', new Date(startTime).toISOString(), 'diff:', diff)
      
      return startTime <= now && startTime > now - 24 * 60 * 60 * 1000
    })
    
    if (scheduled && scheduled.url) {
      console.log('[AutoPlay] Found scheduled video:', scheduled.name, scheduled.url)
      currentPlayingVideoRef.current = scheduled
      
      setPlayedVideoIds(prev => new Set(prev).add(scheduled.id))
      
      const el = document.createElement('video')
      el.src = scheduled.url
      el.controls = true
      el.autoplay = true
      el.muted = false
      el.playsInline = true
      el.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;z-index:10;object-fit:cover'
      
      videoContainerRef.current?.appendChild(el)
      
      el.onended = () => {
        console.log('[AutoPlay] Video ended:', scheduled.name)
        currentPlayingVideoRef.current = null
        el.remove()
      }
      
      el.onerror = (e) => {
        console.error('[AutoPlay] Failed to play video:', scheduled.url, e)
        currentPlayingVideoRef.current = null
        el.remove()
      }
      
      el.onloadedmetadata = () => {
        console.log('[AutoPlay] Video loaded, starting playback')
      }
    } else {
      console.log('[AutoPlay] No scheduled video found')
    }
  }, [isTeacherScreenOn, isTeacherCameraOn, visibleResources, playedVideoIds])

  // ────────────────────────────────────────────────────────
  // 资源更新后立即检查自动播放
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    console.log('[AutoPlay] Resources updated, checking immediately')
    checkAndPlayScheduledVideo()
  }, [visibleResources, checkAndPlayScheduledVideo])

  // ────────────────────────────────────────────────────────
  // 初始化 Agora
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    let rtcClient: IAgoraRTCClient | null = null
    let rtmClient: InstanceType<typeof AgoraRTM.RTM> | null = null

    const init = async () => {
      // RTC
      rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
      rtcClientRef.current = rtcClient

      rtcClient.on('user-published', async (user: any, mediaType: 'audio' | 'video') => {
        await rtcClient!.subscribe(user, mediaType)
        if (mediaType === 'video') {
          if (user.uid >= 10000) {
            setIsTeacherScreenOn(true)
            user.videoTrack.play('screen-video')
          } else {
            setIsTeacherCameraOn(true)
            user.videoTrack.play('camera-video')
          }
        }
        if (mediaType === 'audio') {
          user.audioTrack.play()
        }
      })

      rtcClient.on('user-unpublished', (user: any, mediaType: 'audio' | 'video') => {
        if (mediaType === 'video') {
          if (user.uid >= 10000) {
            setIsTeacherScreenOn(false)
          } else {
            setIsTeacherCameraOn(false)
          }
        }
      })

      try {
        await rtcClient.join(APP_ID, CHANNEL, TOKEN, UID.current)
      } catch (e) {
        console.error('RTC join failed', e)
      }

      // RTM v2
      try {
        rtmClient = new AgoraRTM.RTM(APP_ID, String(UID.current))
        await rtmClient.login()
        rtmClientRef.current = rtmClient

        await rtmClient.subscribe(CHANNEL)

        rtmClient.addEventListener('message', (event: any) => {
          const publisherId = String(event.publisher || event.userId || event.from || '')
          if (publisherId === String(UID.current)) return
          const text = event.message || event.payload || event.data || ''
          const msgStr = typeof text === 'string' ? text : (text ? JSON.stringify(text) : '')
          if (msgStr) {
            setActiveDanmakus((prev) => [...prev, msgStr])
            showFly(msgStr)
          }
        })
      } catch (e) {
        console.error('RTM init failed', e)
      }
    }

    init()
    fetchCourseRecords()
    // 定期刷新资源列表（替代 storage 事件）
    resourceRefreshRef.current = setInterval(fetchCourseRecords, 2000)

    videoCheckIntervalRef.current = setInterval(checkAndPlayScheduledVideo, 5000)

    return () => {
      rtcClient?.leave().catch(() => {})
      rtmClient?.unsubscribe(CHANNEL).catch(() => {})
      rtmClient?.logout().catch(() => {})
      if (resourceRefreshRef.current) clearInterval(resourceRefreshRef.current)
      if (videoCheckIntervalRef.current) clearInterval(videoCheckIntervalRef.current)
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
            <Radio size={16} />
            {!isSideNavCollapsed && '直播课堂'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
            {!isSideNavCollapsed && '返回主页'}
          </button>
          <button className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
            <BookOpen size={16} />
            {!isSideNavCollapsed && '课程大纲'}
          </button>
          <button className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
            <FileText size={16} />
            {!isSideNavCollapsed && '作业'}
          </button>
        </nav>

        {/* 课程信息 */}
        <div className={`mt-auto bg-white rounded-lg border border-slate-200 flex flex-col gap-1.5 ${isSideNavCollapsed ? 'p-2 items-center' : 'p-4'}`}>
          {!isSideNavCollapsed && <div className="text-[11px] text-slate-500">当前课程</div>}
          {!isSideNavCollapsed && <div className="text-sm font-semibold text-slate-900">课程 {courseId}</div>}
          <div
            className={`text-xs px-2.5 py-1 rounded-full w-fit ${
              isLive ? 'bg-emerald-200 text-green-800' : 'bg-amber-200 text-amber-800'
            }`}
          >
            {isLive ? '🟢 直播中' : '⏳ 等待开播'}
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
          <div
            ref={videoContainerRef}
            className="flex-1 bg-slate-900 relative rounded-2xl overflow-hidden border border-slate-200"
          >
            {/* 屏幕共享 */}
            <div
              id="screen-video"
              className={`w-full h-full absolute top-0 left-0 z-[1] ${isTeacherScreenOn ? '' : 'hidden'}`}
            />

            {/* 摄像头 */}
            <div
              id="camera-video"
              className={`${
                isTeacherScreenOn
                  ? 'absolute top-4 right-4 w-[200px] h-[140px] bg-slate-800 border-2 border-slate-700 rounded-xl z-10 cursor-move min-w-[120px] min-h-[80px]'
                  : 'w-full h-full absolute top-0 left-0 z-[1]'
              } ${isTeacherCameraOn ? '' : 'hidden'}`}
            />

            {/* 等待画面 */}
            {!isTeacherScreenOn && !isTeacherCameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-center gap-3">
                <Monitor size={64} className="text-slate-500" />
                <h2 className="text-lg font-medium text-slate-300">正在等待老师开播...</h2>
                <p className="text-[13px] text-slate-500">请保持页面打开，开播后将自动开始播放</p>
              </div>
            )}

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
          </div>

          {/* 控制栏 */}
          <div className="bg-white px-5 py-3.5 rounded-lg flex justify-between items-center shadow-sm">
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowFloatingDanmaku((v) => !v)}
                className={`px-4 py-2 rounded-lg border text-[13px] transition-colors ${
                  showFloatingDanmaku
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:text-blue-500'
                }`}
              >
                {showFloatingDanmaku ? '📢 弹幕' : '🚫 弹幕'}
              </button>
              <button
                onClick={toggleFullscreen}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[13px] hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                {isFullscreen ? <Minimize size={14} className="inline mr-1" /> : <Maximize size={14} className="inline mr-1" />}
                {isFullscreen ? '退出全屏' : '全屏'}
              </button>
              <select
                value={danmakuDensity}
                onChange={(e) => setDanmakuDensity(e.target.value as 'high' | 'normal' | 'low')}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs cursor-pointer outline-none"
              >
                <option value="high">大量</option>
                <option value="normal">少量</option>
                <option value="low">微量</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendDanmaku()}
                placeholder="发个弹幕互动..."
                className="px-3.5 py-2.5 rounded-full border border-slate-200 text-[13px] w-[200px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button
                onClick={sendDanmaku}
                className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 transition-colors"
              >
                发送
              </button>
            </div>
          </div>
        </section>

        {/* ── 右侧面板 ── */}
        <aside className="w-[340px] flex flex-col gap-4 overflow-y-auto">
          {/* AI 助手 */}
          <div className="bg-white rounded-lg shadow-sm flex flex-col">
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-200">
              <Bot size={18} className="text-blue-500" />
              <span className="flex-1 text-sm font-semibold text-slate-900">AI教学助手</span>
              <button
                onClick={() => setShowAiPanel((v) => !v)}
                className="text-xs text-slate-500 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                {showAiPanel ? '收起' : '展开'}
              </button>
            </div>
            {showAiPanel && (
              <>
                <div className="flex-1 px-3.5 py-3.5 overflow-y-auto max-h-[220px] flex flex-col gap-2.5">
                  {aiMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] px-3 py-2.5 rounded-xl text-[13px] leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        <span className={`block text-[11px] font-semibold mb-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-blue-600'}`}>
                          {msg.role === 'user' ? '我' : 'AI'}
                        </span>
                        <p className="m-0">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-3.5 py-3 border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendAiQuestion()}
                    placeholder="输入问题..."
                    className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-full text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <button
                    onClick={sendAiQuestion}
                    className="w-9 h-9 bg-slate-900 rounded-full text-white flex items-center justify-center hover:bg-slate-800 transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 弹幕面板 */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <MessageCircle size={14} /> 弹幕面板
              </span>
              <button
                onClick={() => setShowDanmakuPanel((v) => !v)}
                className="text-xs text-slate-500 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
              >
                {showDanmakuPanel ? '收起' : '展开'}
              </button>
            </div>
            {showDanmakuPanel && (
              <div className="px-3.5 py-3.5">
                <div className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto" ref={danmakuPanelRef}>
                  {activeDanmakus.slice(-20).map((dm, i) => (
                    <div key={i} className="px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs break-all">
                      {dm}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 留言板 */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <MessageSquare size={14} /> 留言板
              </span>
              <button
                onClick={() => setShowBoardPanel((v) => !v)}
                className="text-xs text-slate-500 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
              >
                {showBoardPanel ? '收起' : '展开'}
              </button>
            </div>
            {showBoardPanel && (
              <div className="px-3.5 py-3.5">
                <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto mb-3">
                  {boardMessages.map((item, i) => (
                    <div key={i} className="px-2.5 py-2 bg-slate-50 rounded-lg text-xs">
                      <span className="text-amber-600 font-semibold mr-2">{item.name}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={boardInput}
                    onChange={(e) => setBoardInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && postBoardMessage()}
                    placeholder="留言给老师或同学"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-full text-xs outline-none focus:border-blue-400 transition-colors"
                  />
                  <button
                    onClick={postBoardMessage}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                  >
                    发布
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 资料库 */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Library size={14} /> 资料库
              </span>
              <button
                onClick={() => setShowResourceListPanel((v) => !v)}
                className="text-xs text-slate-500 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
              >
                {showResourceListPanel ? '收起' : '展开'}
              </button>
            </div>
            {showResourceListPanel && (
              <div className="px-3.5 py-3.5 max-h-[300px] overflow-y-auto">
                <div className="flex flex-col gap-2.5">
                  {visibleResources.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => openResourceItem(item)}
                      className="flex items-center gap-3 px-2.5 py-2.5 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${RESOURCE_COLORS[item.type] || 'bg-slate-100'}`}>
                        {item.type === 'PPT' ? '📊' : item.type === 'PDF' ? '📄' : '🎬'}
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5">
                        <span className="text-[13px] font-semibold text-slate-900">{item.name}</span>
                        <span className="text-[11px] text-slate-500">{item.type}</span>
                      </div>
                      <button
                        disabled={!item.available}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          item.available
                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                        onClick={(e) => { e.stopPropagation(); openResourceItem(item) }}
                      >
                        {item.available ? '查看' : '未开放'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ═══ 浮动资源预览窗口 ═══ */}
      {showResourcePreview && selectedResource && (
        <div
          className="fixed bg-white rounded-2xl overflow-hidden shadow-2xl z-[1000] cursor-move min-w-[320px] min-h-[280px]"
          style={{ left: floatStyle.left, top: floatStyle.top, width: floatStyle.width, height: floatStyle.height }}
          onMouseDown={startFloatDrag}
        >
          {/* 标题栏 */}
          <div className="flex justify-between items-center px-4 py-3 bg-slate-900 text-white cursor-move select-none">
            <span className="text-[13px] font-semibold">{selectedResource.name}</span>
            <button
              onClick={closeResourcePreview}
              className="float-close-btn bg-white/15 border-none text-white text-lg cursor-pointer px-2 leading-none rounded-md hover:bg-white/25 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* 内容 */}
          <div className="h-[calc(100%-48px)] overflow-hidden">
            {selectedResource.type === 'PDF' && selectedResource.filePath ? (
              <iframe
                src={`/api/materials/preview?url=${encodeURIComponent(selectedResource.filePath)}`}
                className="w-full h-full border-none"
                title={selectedResource.name}
              />
            ) : selectedResource.type === 'PPT' && selectedResource.filePath ? (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedResource.filePath)}&embedded=true`}
                className="w-full h-full border-none"
                title={selectedResource.name}
                onError={(e) => {
                  const target = e.target as HTMLIFrameElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = `
                      <div class="flex flex-col items-center justify-center h-full gap-4">
                        <div class="text-6xl">📊</div>
                        <p class="text-slate-700 font-semibold">${selectedResource.name}</p>
                        <p class="text-xs text-slate-500">PPT在线预览服务暂不可用</p>
                        <a href="${selectedResource.filePath}" target="_blank" download
                          class="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors no-underline">
                          下载文件
                        </a>
                      </div>
                    `
                  }
                }}
              />
            ) : selectedResource.type === 'PPT' ? (
              <div className="flex flex-col gap-3.5 p-4 h-full overflow-y-auto">
                <div className="flex justify-center items-center gap-4">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="px-4 py-2 rounded-lg bg-blue-500 text-white text-[13px] font-semibold disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                  >
                    <ChevronLeft size={14} className="inline mr-1" />
                    上一页
                  </button>
                  <span className="text-[13px] font-semibold text-slate-900 min-w-[80px] text-center">
                    {currentPage} / {selectedResource.pages || 10}
                  </span>
                  <button
                    disabled={currentPage >= (selectedResource.pages || 10)}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-4 py-2 rounded-lg bg-blue-500 text-white text-[13px] font-semibold disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                  >
                    下一页
                    <ChevronRight size={14} className="inline ml-1" />
                  </button>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="bg-white rounded-[10px] overflow-hidden">
                    <div className="bg-blue-500 text-white px-4 py-2.5 text-xs font-semibold">
                      第 {currentPage} 页
                    </div>
                    <div className="p-5">
                      <div className="text-base font-bold text-slate-900 mb-4 text-center">
                        《{selectedResource.name}》
                      </div>
                      <div className="text-[13px] text-slate-700 leading-relaxed space-y-2">
                        <p>这是第 {currentPage} 页的内容</p>
                        <p>主要知识点：{SLIDE_CONTENTS[currentPage] || `第 ${currentPage} 页内容`}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedResource.type === 'PDF' ? (
              <div className="flex justify-center items-center py-10 h-full">
                <div className="text-center">
                  <FileText size={64} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-700">PDF文档预览</p>
                  <p className="text-xs text-slate-500 mt-2">暂无可预览的文件</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* 调整大小手柄 */}
          <div
            className="resize-handle absolute right-0 bottom-0 w-5 h-5 bg-slate-900 cursor-se-resize"
            onMouseDown={startResize}
          >
            <div className="absolute right-1 bottom-1 w-2.5 h-2.5 border-r-2 border-b-2 border-slate-500" />
          </div>
        </div>
      )}

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