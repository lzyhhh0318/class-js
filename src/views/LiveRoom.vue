<template>
  <div class="app-wrapper">
    <aside class="side-nav" :class="{ collapsed: isSideNavCollapsed }">
      <div class="brand">
        <div class="brand-mark">SE大师</div>
        <div class="brand-sub">智能软件工程平台</div>
      </div>
      <nav class="nav-list">
        <button class="nav-item active">
          <span class="nav-icon">📹</span>
          <span class="nav-text">直播课堂</span>
        </button>
        <button class="nav-item" @click="goBack">
          <span class="nav-icon">🏠</span>
          <span class="nav-text">返回主页</span>
        </button>
        <button class="nav-item">
          <span class="nav-icon">📚</span>
          <span class="nav-text">课程大纲</span>
        </button>
        <button class="nav-item">
          <span class="nav-icon">📝</span>
          <span class="nav-text">作业</span>
        </button>
      </nav>
      <div class="course-info">
        <div class="course-label">当前课程</div>
        <div class="course-name">课程 {{ courseId }}</div>
        <div class="live-status" :class="isLive ? 'live' : 'waiting'">
          {{ isLive ? '🟢 直播中' : '⏳ 等待开播' }}
        </div>
      </div>
      <button class="collapse-btn" @click="isSideNavCollapsed = !isSideNavCollapsed">
        {{ isSideNavCollapsed ? '▶' : '◀' }}
      </button>
    </aside>

    <div class="main-content">
      <section class="video-section">
        <div class="video-container" :class="{'has-screen': isTeacherScreenOn}">
          <div id="screen-video" class="main-screen" v-show="isTeacherScreenOn"></div>
          <div id="camera-video" 
               :class="isTeacherScreenOn ? 'pip-window' : 'main-screen'" 
               v-show="isTeacherCameraOn"
               @mousedown="startDrag">
          </div>
          <div v-if="!isTeacherScreenOn && !isTeacherCameraOn" class="waiting-text">
            <div class="waiting-icon">📺</div>
            <h2>正在等待老师开播...</h2>
            <p>请保持页面打开，开播后将自动开始播放</p>
          </div>
        </div>

        <div class="video-controls">
          <div class="control-left">
            <button class="control-btn" :class="{ active: showFloatingDanmaku }" @click="showFloatingDanmaku = !showFloatingDanmaku">
              {{ showFloatingDanmaku ? '📢 弹幕' : '🚫 弹幕' }}
            </button>
            <button class="control-btn" @click="toggleFullscreen">
              {{ isFullscreen ? '⛶ 退出全屏' : '⛶ 全屏' }}
            </button>
            <select v-model="danmakuDensity" class="density-select">
              <option value="high">大量</option>
              <option value="normal">少量</option>
              <option value="low">微量</option>
            </select>
          </div>
          <div class="control-input">
            <input type="text" v-model="inputText" @keyup.enter="sendDanmaku" placeholder="发个弹幕互动..." />
            <button class="send-btn" @click="sendDanmaku">发送</button>
          </div>
        </div>
      </section>

      <aside class="side-panel">
        <div class="ai-panel">
          <div class="panel-header">
            <div class="ai-icon">🤖</div>
            <span class="panel-title">AI教学助手</span>
            <button class="card-toggle" @click="showAiPanel = !showAiPanel">
              {{ showAiPanel ? '收起' : '展开' }}
            </button>
          </div>
          <div v-show="showAiPanel">
            <div class="chat-container">
              <div class="chat-message bot" v-for="(msg, index) in aiMessages" :key="index">
                <div class="chat-bubble" :class="msg.role">
                  <span class="chat-role">{{ msg.role === 'user' ? '我' : 'AI' }}</span>
                  <p>{{ msg.content }}</p>
                </div>
              </div>
            </div>
            <div class="chat-input-wrap">
              <input type="text" v-model="aiInput" placeholder="输入问题..." @keyup.enter="sendAiQuestion" />
              <button class="chat-send" @click="sendAiQuestion">→</button>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="card-header">
            <span class="card-title">💬 弹幕面板</span>
            <button class="card-toggle" @click="showDanmakuPanel = !showDanmakuPanel">
              {{ showDanmakuPanel ? '收起' : '展开' }}
            </button>
          </div>
          <div class="card-body" v-show="showDanmakuPanel">
            <div class="danmaku-list">
              <div class="dm-item" v-for="(dm, index) in activeDanmakus.slice(-20)" :key="index">
                <span class="dm-content">{{ dm }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="card-header">
            <span class="card-title">📝 留言板</span>
            <button class="card-toggle" @click="showBoardPanel = !showBoardPanel">
              {{ showBoardPanel ? '收起' : '展开' }}
            </button>
          </div>
          <div class="card-body" v-show="showBoardPanel">
            <div class="board-list">
              <div class="board-item" v-for="(item, index) in boardMessages" :key="index">
                <span class="board-name">{{ item.name }}</span>
                <span class="board-text">{{ item.text }}</span>
              </div>
            </div>
            <div class="board-input-wrap">
              <input type="text" v-model="boardInput" placeholder="留言给老师或同学" @keyup.enter="postBoardMessage" />
              <button class="board-send" @click="postBoardMessage">发布</button>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="card-header">
            <span class="card-title">📚 资料库</span>
            <button class="card-toggle" @click="showResourceListPanel = !showResourceListPanel">
              {{ showResourceListPanel ? '收起' : '展开' }}
            </button>
          </div>
          <div class="card-body" v-show="showResourceListPanel">
            <div class="resource-list">
              <div class="resource-item" v-for="item in visibleResources" :key="item.id" @click="openResourceItem(item)">
                <div class="resource-icon" :style="{ background: getResourceColor(item.type) }">
                  {{ getResourceIcon(item.type) }}
                </div>
                <div class="resource-info">
                  <span class="resource-name">{{ item.name }}</span>
                  <span class="resource-type">{{ item.type }}</span>
                </div>
                <button class="resource-btn" :disabled="!item.available">{{ item.available ? '查看' : '未开放' }}</button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <div class="danmaku-canvas" v-if="showFloatingDanmaku">
      <div class="fly-item" v-for="dm in floatingDanmakus" :key="dm.id" :style="{top: dm.top + 'px'}">{{ dm.text }}</div>
    </div>

    <div class="float-window" v-if="showResourcePreview" :style="floatWindowStyle" @mousedown="startFloatDrag">
      <div class="float-header" @mousedown.stop>
        <span class="float-title">{{ selectedResource?.name }}</span>
        <button class="float-close" @click="closeResourcePreview">×</button>
      </div>
      <div class="float-body">
        <div class="ppt-preview" v-if="selectedResource?.type === 'PPT'">
          <div class="ppt-toolbar">
            <button class="nav-btn" :disabled="currentPage <= 1" @click="currentPage--">← 上一页</button>
            <span class="page-indicator">{{ currentPage }} / {{ selectedResource?.pages || 10 }}</span>
            <button class="nav-btn" :disabled="currentPage >= (selectedResource?.pages || 10)" @click="currentPage++">下一页 →</button>
          </div>
          <div class="ppt-content">
            <div class="ppt-slide">
              <div class="slide-header">第 {{ currentPage }} 页</div>
              <div class="slide-body">
                <div class="slide-title">《{{ selectedResource?.name }}》</div>
                <div class="slide-content">
                  <p>这是第 {{ currentPage }} 页的内容</p>
                  <p>章节标题：软件工程基础</p>
                  <p>主要知识点：{{ getSlideContent(currentPage) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="pdf-preview" v-else-if="selectedResource?.type === 'PDF'">
          <div class="pdf-placeholder">
            <div class="pdf-icon">📄</div>
            <p>PDF文档预览</p>
            <p class="pdf-hint">完整PDF查看功能需要后端接口支持</p>
          </div>
        </div>
      </div>
      <div class="resize-handle" @mousedown="startResize"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AgoraRTC from 'agora-rtc-sdk-ng'
import AgoraRTM from 'agora-rtm-sdk'

const route = useRoute()
const router = useRouter()

const APP_ID = 'ef5c5abed935411c8366d07d8af1d3ef' 
const courseId = route.query.courseId || 'default'
const CHANNEL = `course_room_${courseId}` 
const TOKEN = null                  
const UID = Math.floor(Math.random() * 10000)

const isTeacherCameraOn = ref(false)
const isTeacherScreenOn = ref(false)
const inputText = ref('')
const activeDanmakus = ref([])
const showFloatingDanmaku = ref(true)
const floatingDanmakus = ref([])
const showDanmakuPanel = ref(true)
const isSideNavCollapsed = ref(false)

const danmakuDensity = ref('normal')
const danmakuLimit = {
  high: 50,
  normal: 20,
  low: 5
}
const danmakuPositions = {
  high: { minTop: 20, maxTop: 400 },
  normal: { minTop: 20, maxTop: 150 },
  low: { minTop: 20, maxTop: 40 }
}
const userDanmakuTimestamps = ref({})
const DANMAKU_LIMIT_PER_MINUTE = 10

const currentPlayingVideo = ref(null)
const aiInput = ref('')
const aiMessages = ref([
  { role: 'assistant', content: '你好，我是课堂 AI 助手，可以帮你整理知识点。' }
])
const showAiPanel = ref(true)
const boardInput = ref('')
const boardMessages = ref([
  { name: '系统', text: '欢迎留言，老师下课后会集中回复。' }
])
const showBoardPanel = ref(true)
const resourceItems = ref([
  { id: 'ppt-01', name: '第1讲 课程导论', type: 'PPT' },
  { id: 'pdf-02', name: '第2讲 需求分析', type: 'PDF' },
  { id: 'ppt-03', name: '第3讲 架构设计', type: 'PPT' },
  { id: 'ppt-demo', name: '软件工程.pptx', type: 'PPT', demo: true, pages: 12 }
])
const visibleResources = ref([])
const selectedResource = ref(null)
const showResourcePreview = ref(false)
const showResourceListPanel = ref(true)
const currentPage = ref(1)
const floatWindowStyle = ref({
  left: '50px',
  top: '50px',
  width: '500px',
  height: '400px'
})

const isLive = computed(() => isTeacherCameraOn.value || isTeacherScreenOn.value)
const isFullscreen = ref(false)

const toggleFullscreen = () => {
  const container = document.querySelector('.video-container')
  if (!document.fullscreenElement) {
    container?.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

let isDragging = false
let isResizing = false
let dragOffset = { x: 0, y: 0 }
let resizeStart = { x: 0, y: 0, width: 0, height: 0 }

const startFloatDrag = (e) => {
  const target = e.target
  if (target.classList.contains('resize-handle') || target.classList.contains('float-close')) return
  
  isDragging = true
  const windowEl = document.querySelector('.float-window')
  const rect = windowEl.getBoundingClientRect()
  dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  
  const onMouseMove = (e) => {
    if (!isDragging) return
    floatWindowStyle.value.left = `${e.clientX - dragOffset.x}px`
    floatWindowStyle.value.top = `${e.clientY - dragOffset.y}px`
  }
  
  const onMouseUp = () => {
    isDragging = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const startResize = (e) => {
  isResizing = true
  const windowEl = document.querySelector('.float-window')
  const rect = windowEl.getBoundingClientRect()
  resizeStart = {
    x: e.clientX,
    y: e.clientY,
    width: rect.width,
    height: rect.height
  }
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

const onResize = (e) => {
  if (!isResizing) return
  
  const deltaX = e.clientX - resizeStart.x
  const deltaY = e.clientY - resizeStart.y
  
  floatWindowStyle.value.width = `${Math.max(300, resizeStart.width + deltaX)}px`
  floatWindowStyle.value.height = `${Math.max(250, resizeStart.height + deltaY)}px`
}

const stopResize = () => {
  isResizing = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

const getSlideContent = (page) => {
  const contents = {
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
    12: '课程总结与展望'
  }
  return contents[page] || `第 ${page} 页内容`
}

const getResourceColor = (type) => {
  const colors = {
    'PPT': '#dbeafe',
    'PDF': '#fef3c7',
    'VIDEO': '#dcfce7'
  }
  return colors[type] || '#f1f5f9'
}

const getResourceIcon = (type) => {
  const icons = {
    'PPT': '📊',
    'PDF': '📄',
    'VIDEO': '🎬'
  }
  return icons[type] || '📁'
}

const RESOURCE_STORAGE_KEY = `course_resources_${courseId}`

let rtcClient = null, rtmClient = null, rtmChannel = null

const goBack = () => { router.push('/dashboard') }

const sendAiQuestion = () => {
  if (!aiInput.value.trim()) return
  aiMessages.value.push({ role: 'user', content: aiInput.value })
  aiMessages.value.push({ role: 'assistant', content: '已收到问题，接口对接后将返回答案。' })
  aiInput.value = ''
}

const postBoardMessage = () => {
  if (!boardInput.value.trim()) return
  boardMessages.value.unshift({ name: '我', text: boardInput.value })
  boardInput.value = ''
}

const openResourceItem = (item) => {
  if (!item.available) return
  selectedResource.value = item
  if (item.type === 'PPT' || item.type === 'PDF') {
    showResourcePreview.value = true
  }
}

const closeResourcePreview = () => {
  showResourcePreview.value = false
}

const showFly = (text) => {
  const id = Date.now()
  const position = danmakuPositions[danmakuDensity.value]
  const top = Math.random() * (position.maxTop - position.minTop) + position.minTop
  
  floatingDanmakus.value.push({ id, text, top })
  
  if (floatingDanmakus.value.length > danmakuLimit[danmakuDensity.value]) {
    floatingDanmakus.value.shift()
  }
  
  setTimeout(() => { 
    floatingDanmakus.value = floatingDanmakus.value.filter(d => d.id !== id) 
  }, 5000)
}

const canSendDanmaku = (userId) => {
  const now = Date.now()
  if (!userDanmakuTimestamps.value[userId]) {
    userDanmakuTimestamps.value[userId] = []
  }
  
  userDanmakuTimestamps.value[userId] = userDanmakuTimestamps.value[userId].filter(
    ts => now - ts < 60000
  )
  
  return userDanmakuTimestamps.value[userId].length < DANMAKU_LIMIT_PER_MINUTE
}

const getDisplayNameFromUrl = (url) => {
  if (!url) return '录播视频'
  const fileName = url.split('/').pop() || '录播视频'
  return decodeURIComponent(fileName).replace(/^[0-9]+_/, '')
}

const fetchCourseRecords = async () => {
  const raw = localStorage.getItem(RESOURCE_STORAGE_KEY)
  const records = raw ? JSON.parse(raw) : []
  const now = Date.now()
  const recordings = records.map(item => {
    const startAt = item.startAt || item.createdAt
    const available = new Date(startAt).getTime() <= now
    return {
      id: item.id,
      name: item.name || getDisplayNameFromUrl(item.videoUrl),
      type: 'VIDEO',
      available,
      startAt,
      url: item.videoUrl
    }
  })

  visibleResources.value = [...resourceItems.value, ...recordings].map(item => {
    if (item.type !== 'VIDEO') {
      return { ...item, available: true, url: '' }
    }
    return item
  })
}

const initStudentLive = async () => {
  rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })

  rtcClient.on('user-published', async (user, mediaType) => {
    await rtcClient.subscribe(user, mediaType)
    if (mediaType === 'video') {
      if (user.uid >= 10000) {
        isTeacherScreenOn.value = true
        user.videoTrack.play('screen-video')
      } else {
        isTeacherCameraOn.value = true
        user.videoTrack.play('camera-video')
      }
    }
    if (mediaType === 'audio') user.audioTrack.play()
  })

  rtcClient.on('user-unpublished', (user, mediaType) => {
    if (mediaType === 'video') {
      if (user.uid >= 10000) {
        isTeacherScreenOn.value = false
        const pip = document.getElementById('camera-video')
        if(pip) { pip.style.top = ''; pip.style.left = ''; }
      } else {
        isTeacherCameraOn.value = false
      }
    }
  })

  try { await rtcClient.join(APP_ID, CHANNEL, TOKEN, UID) } catch (e) { console.error(e) }

  rtmClient = AgoraRTM.createInstance(APP_ID)
  await rtmClient.login({ uid: String(UID) })
  rtmChannel = rtmClient.createChannel(CHANNEL)
  await rtmChannel.join()

  rtmChannel.on('ChannelMessage', (message) => {
    activeDanmakus.value.push(message.text)
    showFly(message.text)
  })
}

const sendDanmaku = async () => {
  if (!inputText.value.trim()) return
  
  const userId = String(UID)
  
  if (!canSendDanmaku(userId)) {
    alert('发送频率过高，请稍后再试')
    return
  }
  
  if (floatingDanmakus.value.length >= danmakuLimit[danmakuDensity.value]) {
    return
  }
  
  const text = inputText.value
  userDanmakuTimestamps.value[userId].push(Date.now())
  
  await rtmChannel.sendMessage({ text: text })
  activeDanmakus.value.push("我: " + text)
  showFly("我: " + text)
  inputText.value = ''
}

const checkAndPlayScheduledVideo = async () => {
  if (isTeacherScreenOn.value || isTeacherCameraOn.value) {
    return
  }
  
  const now = Date.now()
  
  const scheduledVideo = visibleResources.value.find(item => {
    if (item.type !== 'VIDEO') return false
    const startTime = new Date(item.startAt).getTime()
    return Math.abs(startTime - now) < 5 * 60 * 1000
  })
  
  if (scheduledVideo && !currentPlayingVideo.value) {
    currentPlayingVideo.value = scheduledVideo
    playVideoInLive(scheduledVideo)
  }
}

const playVideoInLive = (video) => {
  const videoElement = document.createElement('video')
  videoElement.src = video.url
  videoElement.controls = true
  videoElement.autoplay = true
  videoElement.style.width = '100%'
  videoElement.style.height = '100%'
  videoElement.style.position = 'absolute'
  videoElement.style.top = '0'
  videoElement.style.left = '0'
  videoElement.style.zIndex = '10'
  
  const videoContainer = document.querySelector('.video-container')
  videoContainer.appendChild(videoElement)
  
  videoElement.onended = () => {
    currentPlayingVideo.value = null
    videoElement.remove()
  }
}

let videoCheckInterval = null

let isPipDragging = false
let pipDragOffset = { x: 0, y: 0 }
const startDrag = (e) => {
  if (!isTeacherScreenOn.value) return 
  const pip = document.getElementById('camera-video')
  const rect = pip.getBoundingClientRect()
  if (e.clientX > rect.right - 25 && e.clientY > rect.bottom - 25) return 
  isPipDragging = true
  pipDragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}
const onDrag = (e) => {
  if (!isPipDragging) return
  const pip = document.getElementById('camera-video')
  const container = pip.parentElement.getBoundingClientRect()
  pip.style.left = `${e.clientX - container.left - pipDragOffset.x}px`
  pip.style.top = `${e.clientY - container.top - pipDragOffset.y}px`
  pip.style.right = 'auto'; pip.style.bottom = 'auto'
}
const stopDrag = () => { isPipDragging = false; document.removeEventListener('mousemove', onDrag); document.removeEventListener('mouseup', stopDrag); }

onMounted(() => {
  sessionStorage.setItem('userRole', 'student')
  if (!sessionStorage.getItem('displayName')) {
    sessionStorage.setItem('displayName', '学生姓名')
  }
  initStudentLive()
  fetchCourseRecords()
  window.addEventListener('storage', fetchCourseRecords)
  
  checkAndPlayScheduledVideo()
  videoCheckInterval = setInterval(checkAndPlayScheduledVideo, 60000)
})
onUnmounted(async () => {
  if (rtcClient) await rtcClient.leave()
  if (rtmChannel) await rtmChannel.leave()
  if (rtmClient) await rtmClient.logout()
  window.removeEventListener('storage', fetchCourseRecords)
  if (videoCheckInterval) clearInterval(videoCheckInterval)
})
</script>

<style scoped>
.app-wrapper {
  height: 100vh;
  display: flex;
  font-family: "Inter", "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #F8F9FA;
  color: #1e293b;
}

.side-nav {
  width: 240px;
  background: #F8F9FA;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  border-right: 1px solid #e2e8f0;
  transition: width 0.3s ease;
  position: relative;
}

.side-nav.collapsed {
  width: 64px;
  padding: 24px 8px;
}

.side-nav.collapsed .brand-sub,
.side-nav.collapsed .nav-text,
.side-nav.collapsed .course-label,
.side-nav.collapsed .course-name,
.side-nav.collapsed .live-status {
  display: none;
}

.side-nav.collapsed .brand-mark {
  font-size: 16px;
}

.side-nav.collapsed .course-info {
  padding: 8px;
}

.collapse-btn {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  z-index: 10;
}

.collapse-btn:hover {
  background: #f1f5f9;
  color: #334155;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.brand-mark {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #0F172A;
}

.brand-sub {
  font-size: 11px;
  color: #94a3b8;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: #e2e8f0;
  color: #334155;
}

.nav-item.active {
  background: #e0f2fe;
  color: #0369a1;
}

.nav-icon {
  font-size: 16px;
}

.course-info {
  margin-top: auto;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.course-label {
  font-size: 11px;
  color: #64748b;
}

.course-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.live-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  display: inline-block;
  width: fit-content;
}

.live-status.live {
  background: #A7F3D0;
  color: #166534;
}

.live-status.waiting {
  background: #fef3c7;
  color: #b45309;
}

.main-content {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px;
  overflow: hidden;
}

.video-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.video-container {
  flex: 1;
  background: #0f172a;
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.main-screen {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.pip-window {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 200px;
  height: 140px;
  background: #1e293b;
  border: 2px solid #334155;
  border-radius: 12px;
  z-index: 10;
  cursor: move;
  min-width: 120px;
  min-height: 80px;
}

.waiting-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  text-align: center;
  gap: 12px;
}

.waiting-icon {
  font-size: 64px;
}

.waiting-text h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #cbd5e1;
}

.waiting-text p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.danmaku-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  pointer-events: none;
  overflow: hidden;
}

.fly-item {
  position: absolute;
  animation: fly-left 6s linear;
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

@keyframes fly-left {
  from { left: 100%; }
  to { left: -320px; }
}

.video-controls {
  background: #ffffff;
  padding: 14px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.control-left {
  display: flex;
  gap: 10px;
}

.control-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.control-btn.active {
  background: #3b82f6;
  color: #ffffff;
  border-color: #3b82f6;
}

.density-select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-size: 12px;
  cursor: pointer;
  outline: none;
}

.control-input {
  display: flex;
  gap: 8px;
}

.control-input input {
  padding: 10px 14px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  width: 200px;
  outline: none;
  transition: all 0.2s ease;
}

.control-input input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.send-btn {
  padding: 10px 20px;
  border-radius: 8px;
  background: #0F172A;
  color: #ffffff;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-btn:hover {
  background: #1e293b;
}

.side-panel {
  width: 340px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-panel {
  background: #ffffff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.ai-icon {
  font-size: 18px;
}

.panel-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.panel-menu {
  border: none;
  background: transparent;
  font-size: 16px;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.panel-menu:hover {
  background: #f1f5f9;
}

.chat-container {
  flex: 1;
  padding: 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-message {
  display: flex;
}

.chat-message.bot {
  justify-content: flex-start;
}

.chat-message.user {
  justify-content: flex-end;
}

.chat-bubble {
  max-width: 85%;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f1f5f9;
}

.chat-bubble.user {
  background: #3b82f6;
}

.chat-role {
  display: block;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #2563eb;
}

.chat-bubble.user .chat-role {
  color: #bfdbfe;
}

.chat-bubble p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #1e293b;
}

.chat-bubble.user p {
  color: #ffffff;
}

.chat-input-wrap {
  padding: 12px 14px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 8px;
}

.chat-input-wrap input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.chat-input-wrap input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.chat-send {
  width: 36px;
  height: 36px;
  border: none;
  background: #0F172A;
  border-radius: 50%;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.card-header {
  padding: 14px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.card-toggle {
  font-size: 12px;
  color: #64748b;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.card-toggle:hover {
  background: #e2e8f0;
}

.card-body {
  padding: 14px;
}

.board-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.board-item {
  padding: 8px 10px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 12px;
}

.board-name {
  color: #d97706;
  font-weight: 600;
  margin-right: 8px;
}

.board-input-wrap {
  display: flex;
  gap: 8px;
}

.board-input-wrap input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  font-size: 12px;
  outline: none;
}

.board-send {
  padding: 8px 14px;
  border-radius: 8px;
  background: #0F172A;
  color: #ffffff;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.danmaku-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 150px;
  overflow-y: auto;
}

.dm-item {
  padding: 6px 10px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 12px;
}

.dm-content {
  color: #1e293b;
  word-break: break-all;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.resource-item:hover {
  background: #f1f5f9;
}

.resource-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.resource-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.resource-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.resource-type {
  font-size: 11px;
  color: #64748b;
}

.resource-btn {
  padding: 6px 12px;
  border-radius: 8px;
  background: #0F172A;
  color: #ffffff;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.resource-btn:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
}

.float-window {
  position: fixed;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.2);
  z-index: 1000;
  cursor: move;
  min-width: 320px;
  min-height: 280px;
}

.float-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #0f172a;
  color: #ffffff;
  cursor: move;
}

.float-title {
  font-size: 13px;
  font-weight: 600;
}

.float-close {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #ffffff;
  font-size: 18px;
  cursor: pointer;
  padding: 2px 8px;
  line-height: 1;
  border-radius: 6px;
}

.float-body {
  padding: 16px;
  height: calc(100% - 48px);
  overflow-y: auto;
}

.resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 20px;
  height: 20px;
  background: #0f172a;
  cursor: se-resize;
}

.resize-handle::after {
  content: '';
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 10px;
  height: 10px;
  border-right: 2px solid #64748b;
  border-bottom: 2px solid #64748b;
}

.ppt-preview {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ppt-toolbar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.nav-btn {
  padding: 8px 18px;
  border-radius: 8px;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.nav-btn:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  min-width: 80px;
  text-align: center;
}

.ppt-content {
  background: #f8fafc;
  border-radius: 12px;
  padding: 18px;
}

.ppt-slide {
  background: #ffffff;
  border-radius: 10px;
  overflow: hidden;
}

.slide-header {
  background: #3b82f6;
  color: #ffffff;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 600;
}

.slide-body {
  padding: 20px;
}

.slide-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
  text-align: center;
}

.slide-content {
  font-size: 13px;
  color: #334155;
  line-height: 1.8;
}

.slide-content p {
  margin: 8px 0;
}

.pdf-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

.pdf-placeholder {
  text-align: center;
}

.pdf-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.pdf-hint {
  font-size: 12px;
  color: #64748b;
  margin-top: 8px;
}

@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
  }
  
  .side-panel {
    width: 100%;
  }
  
  .ai-panel {
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .app-wrapper {
    flex-direction: column;
  }
  
  .side-nav {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .nav-list {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .nav-item {
    padding: 8px 12px;
    font-size: 12px;
  }
  
  .course-info {
    margin-top: 0;
    margin-left: auto;
    padding: 10px 14px;
  }
  
  .main-content {
    padding: 12px;
  }
  
  .control-input input {
    width: 150px;
  }
}
</style>