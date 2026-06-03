<template>
  <div class="app-wrapper">
    <header class="navbar">
      <div class="logo">
        <button class="back-btn" @click="goBack">⬅ 返回主页</button>
        🚀 智能软件工程平台 - 🧑‍🎓 学生端 (当前房间: {{ courseId }})
      </div>
    </header>

    <main class="main-content">
      <section class="video-section">
        <div class="video-container" :class="{'has-screen': isTeacherScreenOn}">
          
          <div id="screen-video" class="main-screen" v-show="isTeacherScreenOn"></div>
          
          <div id="camera-video" 
               :class="isTeacherScreenOn ? 'pip-window' : 'main-screen'" 
               v-show="isTeacherCameraOn"
               @mousedown="startDrag">
          </div>

          <div v-if="!isTeacherScreenOn && !isTeacherCameraOn" class="waiting-text">
            <h1>⏳ 正在等待老师开播...</h1>
          </div>
        </div>

        <div class="video-controls">
          <button class="toggle-btn" @click="showFloatingDanmaku = !showFloatingDanmaku">
             {{ showFloatingDanmaku ? '🚫 关弹幕' : '📢 开弹幕' }}
          </button>
          <input type="text" v-model="inputText" @keyup.enter="sendDanmaku" placeholder="发个弹幕互动..." class="mock-input" />
          <button class="mock-btn primary" @click="sendDanmaku">发送弹幕</button>
        </div>
      </section>

      <aside class="side-panel">
        <div class="panel-group">
          <section class="panel-card">
            <header class="panel-header" @click="togglePanel('ai')">
              <div class="panel-title">🤖 AI助手</div>
              <span class="panel-toggle">{{ panelStates.ai ? '收起' : '展开' }}</span>
            </header>
            <div class="panel-body" v-show="panelStates.ai">
              <div class="ai-thread">
                <div class="ai-msg" v-for="(msg, index) in aiMessages" :key="index" :class="msg.role">
                  <span class="ai-role">{{ msg.role === 'user' ? '我' : 'AI' }}</span>
                  <p>{{ msg.content }}</p>
                </div>
              </div>
              <div class="ai-input">
                <input type="text" v-model="aiInput" placeholder="输入问题或上传图片的说明" />
                <button @click="sendAiQuestion">发送</button>
              </div>
              <div class="panel-hint">接口预留：POST /api/ai/chat</div>
            </div>
          </section>

          <section class="panel-card">
            <header class="panel-header" @click="togglePanel('board')">
              <div class="panel-title">📝 留言板</div>
              <span class="panel-toggle">{{ panelStates.board ? '收起' : '展开' }}</span>
            </header>
            <div class="panel-body" v-show="panelStates.board">
              <div class="board-list">
                <div class="board-item" v-for="(item, index) in boardMessages" :key="index">
                  <span class="board-name">{{ item.name }}</span>
                  <span class="board-text">{{ item.text }}</span>
                </div>
              </div>
              <div class="board-input">
                <input type="text" v-model="boardInput" placeholder="留言给老师或同学" />
                <button @click="postBoardMessage">发布</button>
              </div>
              <div class="panel-hint">接口预留：留言板写入与拉取</div>
            </div>
          </section>

          <section class="panel-card">
            <header class="panel-header" @click="togglePanel('danmaku')">
              <div class="panel-title">💬 弹幕面板</div>
              <span class="panel-toggle">{{ panelStates.danmaku ? '收起' : '展开' }}</span>
            </header>
            <div class="panel-body" v-show="panelStates.danmaku">
              <div class="danmaku-list">
                <div class="dm-item" v-for="(dm, i) in activeDanmakus" :key="i">{{ dm }}</div>
              </div>
              <div class="panel-hint">接口预留：弹幕数据库查询与归档</div>
            </div>
          </section>

          <section class="panel-card">
            <header class="panel-header" @click="togglePanel('library')">
              <div class="panel-title">📚 资料库</div>
              <span class="panel-toggle">{{ panelStates.library ? '收起' : '展开' }}</span>
            </header>
            <div class="panel-body" v-show="panelStates.library">
              <div class="resource-list">
                <div class="resource-item" v-for="item in visibleResources" :key="item.id" @click="openResourceItem(item)">
                  <div class="resource-meta">
                    <span class="resource-name">{{ item.name }}</span>
                    <span class="resource-type">{{ item.type }}</span>
                  </div>
                  <button class="resource-btn" :disabled="!item.available">{{ item.available ? '查看' : '未开放' }}</button>
                </div>
              </div>
              <div class="resource-player" v-if="selectedResource">
                <div class="player-title">{{ selectedResource.name }}</div>
                <video v-if="selectedResource.type === 'VIDEO'" :src="selectedResource.url" controls></video>
                <div class="player-hint" v-else>该资源为文档类型，后端接入后将提供查看入口。</div>
              </div>
              <div class="panel-hint">接口预留：资源库列表与下载</div>
            </div>
          </section>
        </div>
      </aside>
    </main>

    <div class="danmaku-canvas" v-if="showFloatingDanmaku">
      <div class="fly-item" v-for="dm in floatingDanmakus" :key="dm.id" :style="{top: dm.top + 'px'}">{{ dm.text }}</div>
    </div>

    <div class="resource-modal-overlay" v-if="showResourcePreview" @click.self="closeResourcePreview">
      <div class="resource-modal">
        <div class="modal-header">
          <span class="modal-title">{{ selectedResource?.name }}</span>
          <button class="modal-close" @click="closeResourcePreview">×</button>
        </div>
        <div class="modal-body">
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
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
const panelStates = ref({
  ai: true,
  board: false,
  danmaku: true,
  library: false
})
const aiInput = ref('')
const aiMessages = ref([
  { role: 'assistant', content: '你好，我是课堂 AI 助手，可以帮你整理知识点。' }
])
const boardInput = ref('')
const boardMessages = ref([
  { name: '系统', text: '欢迎留言，老师下课后会集中回复。' }
])
const resourceItems = ref([
  { id: 'ppt-01', name: '第1讲 课程导论', type: 'PPT' },
  { id: 'pdf-02', name: '第2讲 需求分析', type: 'PDF' },
  { id: 'ppt-03', name: '第3讲 架构设计', type: 'PPT' },
  { id: 'ppt-demo', name: 'lcs4.pptx', type: 'PPT', demo: true, pages: 12 }
])
const visibleResources = ref([])
const selectedResource = ref(null)
const showResourcePreview = ref(false)
const currentPage = ref(1)

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

const RESOURCE_STORAGE_KEY = `course_resources_${courseId}`

let rtcClient = null, rtmClient = null, rtmChannel = null

const goBack = () => { router.push('/dashboard') }
const togglePanel = (key) => {
  panelStates.value[key] = !panelStates.value[key]
}

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
  floatingDanmakus.value.push({ id, text, top: Math.random() * 400 + 20 })
  setTimeout(() => { floatingDanmakus.value = floatingDanmakus.value.filter(d => d.id !== id) }, 5000)
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
  const text = inputText.value
  await rtmChannel.sendMessage({ text: text })
  activeDanmakus.value.push("我: " + text)
  showFly("我: " + text)
  inputText.value = ''
}

// 拖拽逻辑
let isDragging = false, dragOffset = { x: 0, y: 0 }
const startDrag = (e) => {
  if (!isTeacherScreenOn.value) return 
  const pip = document.getElementById('camera-video')
  const rect = pip.getBoundingClientRect()
  if (e.clientX > rect.right - 25 && e.clientY > rect.bottom - 25) return 
  isDragging = true
  dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}
const onDrag = (e) => {
  if (!isDragging) return
  const pip = document.getElementById('camera-video')
  const container = pip.parentElement.getBoundingClientRect()
  pip.style.left = `${e.clientX - container.left - dragOffset.x}px`
  pip.style.top = `${e.clientY - container.top - dragOffset.y}px`
  pip.style.right = 'auto'; pip.style.bottom = 'auto'
}
const stopDrag = () => { isDragging = false; document.removeEventListener('mousemove', onDrag); document.removeEventListener('mouseup', stopDrag); }

onMounted(() => {
  sessionStorage.setItem('userRole', 'student')
  if (!sessionStorage.getItem('displayName')) {
    sessionStorage.setItem('displayName', '学生姓名')
  }
  initStudentLive()
  fetchCourseRecords()
  window.addEventListener('storage', fetchCourseRecords)
})
onUnmounted(async () => {
  if (rtcClient) await rtcClient.leave()
  if (rtmChannel) await rtmChannel.leave()
  if (rtmClient) await rtmClient.logout()
  window.removeEventListener('storage', fetchCourseRecords)
})
</script>

<style scoped>
.app-wrapper {
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  background: radial-gradient(circle at top left, #f6f8ff 0%, #f4f6f9 40%, #eef1f6 100%);
  color: #111827;
}

.navbar {
  height: 64px;
  background: #ffffff;
  display: flex;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.back-btn {
  background: #111827;
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  margin-right: 14px;
  font-weight: 600;
}

.main-content {
  display: flex;
  flex-direction: row;
  height: calc(100vh - 64px);
  padding: 24px;
  gap: 24px;
}

.video-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.video-container {
  flex: 1;
  background: #0f172a;
  position: relative;
  border-radius: 18px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
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
  top: 18px;
  right: 18px;
  width: 240px;
  height: 180px;
  background: #111827;
  border: 2px solid #111827;
  border-radius: 14px;
  z-index: 10;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.28);
  resize: both;
  overflow: hidden;
  cursor: move;
  min-width: 160px;
  min-height: 110px;
  max-width: 820px;
  max-height: 520px;
}

.video-player-placeholder:not(.has-screen) .pip-window {
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  border: none;
  resize: none;
  border-radius: 0;
}

.waiting-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e2e8f0;
  text-align: center;
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
  color: #111827;
  text-shadow: 0 6px 18px rgba(15, 23, 42, 0.25);
  white-space: nowrap;
}

@keyframes fly-left {
  from {
    left: 100%;
  }
  to {
    left: -320px;
  }
}

.video-controls {
  height: 64px;
  background: #ffffff;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 12px;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.toggle-btn {
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  font-weight: 600;
  background: #f9fafb;
  color: #111827;
  transition: all 0.2s ease;
}

.mock-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  outline: none;
  background: #ffffff;
  color: #111827;
}

.mock-btn.primary {
  background: #111827;
  color: #ffffff;
  padding: 10px 22px;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  cursor: pointer;
}

.side-panel {
  width: 320px;
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid #e5e7eb;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
}

.panel-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  cursor: pointer;
  background: #f9fafb;
  font-weight: 600;
  font-size: 14px;
  color: #111827;
}

.panel-toggle {
  font-size: 12px;
  color: #6b7280;
}

.panel-body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: #111827;
}

.ai-thread {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 160px;
  overflow-y: auto;
}

.ai-msg {
  background: #f3f4f6;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
  color: #111827;
}

.ai-msg.user {
  background: #e0f2fe;
}

.ai-role {
  display: block;
  color: #0284c7;
  font-size: 11px;
  margin-bottom: 4px;
}

.ai-input,
.board-input {
  display: flex;
  gap: 8px;
}

.ai-input input,
.board-input input {
  flex: 1;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #111827;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
}

.ai-input button,
.board-input button {
  background: #111827;
  border: none;
  color: #ffffff;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
}

.board-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 140px;
  overflow-y: auto;
}

.board-item {
  background: #f9fafb;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
}

.board-name {
  color: #f59e0b;
  margin-right: 6px;
}

.danmaku-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 160px;
  overflow-y: auto;
  font-size: 12px;
  color: #111827;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resource-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9fafb;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
}

.resource-name {
  font-size: 12px;
}

.resource-type {
  font-size: 11px;
  color: #6b7280;
}

.resource-btn {
  background: #111827;
  border: none;
  color: #ffffff;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
}

.resource-btn:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

.resource-player {
  background: #f9fafb;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-title {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
}

.resource-player video {
  width: 100%;
  border-radius: 10px;
  background: #111827;
}

.player-hint {
  font-size: 12px;
  color: #6b7280;
}

.panel-hint {
  font-size: 11px;
  color: #6b7280;
}

.resource-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.resource-modal {
  background: #ffffff;
  border-radius: 20px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(15, 23, 42, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #111827;
  color: #ffffff;
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
}

.modal-close {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 24px;
  cursor: pointer;
  padding: 0 8px;
  line-height: 1;
}

.modal-body {
  padding: 20px;
  max-height: calc(85vh - 60px);
  overflow-y: auto;
}

.ppt-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ppt-toolbar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.nav-btn {
  background: #111827;
  color: #ffffff;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.nav-btn:hover:not(:disabled) {
  background: #374151;
}

.nav-btn:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  min-width: 80px;
  text-align: center;
}

.ppt-content {
  background: #f9fafb;
  border-radius: 16px;
  padding: 20px;
}

.ppt-slide {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.slide-header {
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  color: #ffffff;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 600;
}

.slide-body {
  padding: 24px;
}

.slide-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 20px;
  text-align: center;
}

.slide-content {
  font-size: 14px;
  color: #374151;
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
  color: #6b7280;
  margin-top: 8px;
}

@media (max-width: 1080px) {
  .main-content {
    flex-direction: column;
  }

  .side-panel {
    width: 100%;
  }
}
</style>