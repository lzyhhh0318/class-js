<template>
  <div class="teacher-live-page">
    <header class="navbar">
      <div class="logo">🚀 智能软件工程平台 - 👨‍🏫 教师端 (独立房间号: {{ courseId }})</div>
      <button class="stop-btn" v-if="isClassStarted" @click="stopLive">结束直播</button>
    </header>

    <main class="main-content">
      <section class="video-section">
        <div class="video-container" :class="{'has-screen': isScreenOn}">
          <div class="danmaku-canvas" v-if="showFloatingDanmaku">
            <div class="fly-item" v-for="dm in floatingDanmakus" :key="dm.id" :style="{top: dm.top + 'px'}">{{ dm.text }}</div>
          </div>  
          <div id="screen-video" class="main-screen" v-show="isScreenOn"></div>
          
          <div id="camera-video" 
               :class="isScreenOn ? 'pip-window' : 'main-screen'" 
               v-show="isCameraOn"
               @mousedown="startDrag">
          </div>

          <div class="pre-class-mask" v-if="!isClassStarted">
            <button class="start-btn primary" @click="startClass">🎬 开始上课</button>
          </div>
        </div>

        <div class="control-panel" v-if="isClassStarted">
          <div class="media-controls">
            <button class="toggle-btn" :class="{ active: isCameraOn }" @click="toggleCamera">
              {{ isCameraOn ? '📹 关摄像头' : '📹 开摄像头' }}
            </button>
            <button class="toggle-btn screen-btn" :class="{ active: isScreenOn }" @click="toggleScreen">
              {{ isScreenOn ? '💻 停共享' : '💻 享屏幕' }}
            </button>
          </div>
          <button class="toggle-btn dm-toggle-btn" @click="showDanmaku = !showDanmaku">
            {{ showDanmaku ? '🔕 隐藏侧边弹幕' : '💬 展开侧边弹幕' }}
          </button>
          <button class="toggle-btn" @click="showFloatingDanmaku = !showFloatingDanmaku">{{ showFloatingDanmaku ? '🚫 关飘屏' : '📢 开飘屏' }}</button>
        </div>

        <div class="resource-panel">
          <div class="resource-header">📼 录播与资料管理</div>
          <div class="resource-form">
            <input v-model="resourceTitle" type="text" placeholder="资源名称（如：第4讲 录播）" />
            <input v-model="resourceStartAt" type="datetime-local" />
            <input ref="resourceFileInput" type="file" accept="video/*" @change="handleResourceFileChange" :disabled="isUploading" />
            <div class="resource-actions">
              <button class="toggle-btn" @click="addResource('prerecord')" :disabled="isUploading">上传预录视频</button>
              <button class="toggle-btn" @click="addResource('recording')" :disabled="isUploading">保存直播录像</button>
            </div>
            <div class="resource-hint">说明：视频会上传到 Supabase Storage，并写入 course_records 表。</div>
          </div>
          <div class="resource-list">
            <div class="resource-item" v-for="item in resourceItems" :key="item.id">
              <div class="resource-meta">
                <div class="resource-name">{{ item.name }}</div>
                <div class="resource-sub">可观看时间：{{ formatStartAt(item.startAt) }}</div>
              </div>
              <button class="ghost-btn" @click="openVideoLink(item.videoUrl)">打开</button>
            </div>
            <div class="resource-empty" v-if="resourceItems.length === 0">暂无录播资源</div>
          </div>
        </div>
      </section>

      <aside class="danmaku-sidebar" v-show="isClassStarted && showDanmaku">
        <div class="board-title">💬 实时弹幕面板</div>
        <div class="danmaku-list">
          <div class="dm-item" v-for="(dm, index) in danmakuList" :key="index">
            <span class="time">[{{ formatTime(dm.timestamp) }}]</span>: {{ dm.content }}
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AgoraRTC from 'agora-rtc-sdk-ng'
import AgoraRTM from 'agora-rtm-sdk'
import { supabase } from '../lib/supabaseClient'

const route = useRoute()
const router = useRouter()

// 【修复问题三】：读取真实的 courseId 并生成唯一房间号
const APP_ID = 'ef5c5abed935411c8366d07d8af1d3ef' 
const courseId = route.query.courseId || 'default'
const CHANNEL = `course_room_${courseId}`          
const TOKEN = null

const CAMERA_UID = Math.floor(Math.random() * 10000)
const SCREEN_UID = CAMERA_UID + 10000

const isClassStarted = ref(false)
const isCameraOn = ref(false)
const isScreenOn = ref(false)
const showDanmaku = ref(true) // 弹幕面板开关
const showFloatingDanmaku = ref(true)
const danmakuList = ref([])
const floatingDanmakus = ref([])

let rtcClient = null, screenClient = null, rtmClient = null, rtmChannel = null
let localAudioTrack = null, localVideoTrack = null, screenVideoTrack = null

const resourceTitle = ref('')
const resourceStartAt = ref('')
const resourceFile = ref(null)
const resourceFileInput = ref(null)
const resourceItems = ref([])
const isUploading = ref(false)

const formatTime = (ts) => {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`
}
const showFly = (text) => {
  const id = Date.now();
  floatingDanmakus.value.push({ id, text, top: Math.random() * 400 + 20 });
  setTimeout(() => { floatingDanmakus.value = floatingDanmakus.value.filter(d => d.id !== id) }, 5000);
};
const startClass = async () => {
  try {
    rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
    await rtcClient.join(APP_ID, CHANNEL, TOKEN, CAMERA_UID)
    
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack()
    await rtcClient.publish([localAudioTrack])

    screenClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
    await screenClient.join(APP_ID, CHANNEL, TOKEN, SCREEN_UID)

    rtmClient = AgoraRTM.createInstance(APP_ID)
    await rtmClient.login({ uid: String(CAMERA_UID) })
    rtmChannel = rtmClient.createChannel(CHANNEL)
    await rtmChannel.join()
    rtmChannel.on('ChannelMessage', (message) => {
      danmakuList.value.push({ timestamp: Date.now(), content: message.text })
      showFly(message.text)
    })

    isClassStarted.value = true
    localStorage.setItem('liveCourseId', String(courseId))
    await toggleCamera()
  } catch (error) {
    alert('开启失败，请检查设备权限！')
  }
}

const toggleCamera = async () => {
  if (isCameraOn.value) {
    await rtcClient.unpublish(localVideoTrack)
    localVideoTrack.close()
    localVideoTrack = null
    isCameraOn.value = false
  } else {
    localVideoTrack = await AgoraRTC.createCameraVideoTrack()
    localVideoTrack.play('camera-video')
    await rtcClient.publish(localVideoTrack)
    isCameraOn.value = true
  }
}

const toggleScreen = async () => {
  if (isScreenOn.value) {
    await screenClient.unpublish(screenVideoTrack)
    screenVideoTrack.close()
    screenVideoTrack = null
    isScreenOn.value = false
    // 恢复摄像头样式
    const pip = document.getElementById('camera-video')
    if(pip) { pip.style.top = ''; pip.style.left = ''; } 
  } else {
    screenVideoTrack = await AgoraRTC.createScreenVideoTrack({ encoderConfig: "1080p_1" }, "auto")
    screenVideoTrack.play('screen-video')
    await screenClient.publish(screenVideoTrack)
    isScreenOn.value = true
    screenVideoTrack.on("track-ended", async () => {
      await screenClient.unpublish(screenVideoTrack)
      screenVideoTrack.close()
      screenVideoTrack = null
      isScreenOn.value = false
      const pip = document.getElementById('camera-video')
      if(pip) { pip.style.top = ''; pip.style.left = ''; }
    })
  }
}

// 【修复问题二】：极其顺滑的原生拖拽算法
let isDragging = false
let dragOffset = { x: 0, y: 0 }

const startDrag = (e) => {
  if (!isScreenOn.value) return // 只有在画中画模式才允许拖拽
  const pip = document.getElementById('camera-video')
  const rect = pip.getBoundingClientRect()
  // 防止在调整大小把手（右下角）按下时触发拖拽
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
  
  let newLeft = e.clientX - container.left - dragOffset.x
  let newTop = e.clientY - container.top - dragOffset.y
  
  pip.style.left = `${newLeft}px`
  pip.style.top = `${newTop}px`
  pip.style.right = 'auto'
  pip.style.bottom = 'auto'
}

const stopDrag = () => {
  isDragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const stopLive = async () => {
  if (localAudioTrack) localAudioTrack.close()
  if (localVideoTrack) localVideoTrack.close()
  if (screenVideoTrack) screenVideoTrack.close()
  if (rtcClient) await rtcClient.leave()
  if (screenClient) await screenClient.leave()
  if (rtmChannel) await rtmChannel.leave()
  if (rtmClient) await rtmClient.logout()
  isClassStarted.value = false
  if (localStorage.getItem('liveCourseId') === String(courseId)) {
    localStorage.removeItem('liveCourseId')
  }
  router.push('/dashboard')
}

const handleResourceFileChange = (event) => {
  const file = event.target.files && event.target.files[0]
  resourceFile.value = file || null
}

const getFileExtension = (name) => {
  const dotIndex = name.lastIndexOf('.')
  return dotIndex >= 0 ? name.slice(dotIndex) : ''
}

const normalizeTitle = (title) => {
  const safe = title.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '')
  return safe || `recording_${Date.now()}`
}

const getDisplayNameFromUrl = (url) => {
  if (!url) return '录播视频'
  const fileName = url.split('/').pop() || '录播视频'
  return decodeURIComponent(fileName).replace(/^[0-9]+_/, '')
}

const fetchCourseRecords = async () => {
  const { data, error } = await supabase
    .from('course_records')
    .select('id, course_id, video_url, created_at, start_at')
    .eq('course_id', String(courseId))
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return
  }

  resourceItems.value = (data || []).map(item => ({
    id: item.id,
    name: getDisplayNameFromUrl(item.video_url),
    videoUrl: item.video_url,
    startAt: item.start_at || item.created_at
  }))
}

const addResource = async (source) => {
  if (!resourceTitle.value.trim()) return
  if (!resourceStartAt.value) return
  if (!resourceFile.value) return

  isUploading.value = true

  try {
    const extension = getFileExtension(resourceFile.value.name)
    const baseName = normalizeTitle(resourceTitle.value.trim())
    const filePath = `${courseId}/${Date.now()}_${baseName}${extension}`

    const { error: uploadError } = await supabase
      .storage
      .from('videos')
      .upload(filePath, resourceFile.value, { contentType: resourceFile.value.type })

    if (uploadError) throw uploadError

    const { data: publicData } = supabase
      .storage
      .from('videos')
      .getPublicUrl(filePath)

    const startAt = new Date(resourceStartAt.value).toISOString()
    const payload = {
      course_id: String(courseId),
      video_url: publicData.publicUrl,
      start_at: startAt
    }

    const { error: insertError } = await supabase
      .from('course_records')
      .insert(payload)

    if (insertError && insertError.message && insertError.message.includes('start_at')) {
      const { error: retryError } = await supabase
        .from('course_records')
        .insert({
          course_id: String(courseId),
          video_url: publicData.publicUrl
        })

      if (retryError) throw retryError
    } else if (insertError) {
      throw insertError
    }

    resourceTitle.value = ''
    resourceStartAt.value = ''
    resourceFile.value = null
    if (resourceFileInput.value) {
      resourceFileInput.value.value = ''
    }
    await fetchCourseRecords()
  } catch (error) {
    console.error(error)
    alert('上传失败，请检查 Supabase 配置或表结构。')
  } finally {
    isUploading.value = false
  }
}

const openVideoLink = (url) => {
  if (!url) return
  window.open(url, '_blank')
}

const formatStartAt = (value) => {
  if (!value) return '未设置'
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  sessionStorage.setItem('userRole', 'teacher')
  if (!sessionStorage.getItem('displayName')) {
    sessionStorage.setItem('displayName', '教师姓名')
  }
  fetchCourseRecords()
})

onUnmounted(() => { stopLive() })
</script>

<style scoped>
.teacher-live-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at top left, #f6f8ff 0%, #f4f6f9 40%, #eef1f6 100%);
  color: #111827;
  font-family: "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.navbar {
  height: 64px;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.logo {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.stop-btn {
  background: #111827;
  color: #ffffff;
  border: none;
  padding: 10px 18px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 12px 24px rgba(17, 24, 39, 0.2);
}

.stop-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 28px rgba(17, 24, 39, 0.24);
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
  left: 18px;
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

.pre-class-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.68);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
  backdrop-filter: blur(2px);
}

.start-btn {
  padding: 14px 42px;
  font-size: 18px;
  background: #111827;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 16px 30px rgba(17, 24, 39, 0.28);
}

.control-panel {
  display: flex;
  justify-content: space-between;
  background: #ffffff;
  padding: 16px 20px;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06);
}

.resource-panel {
  margin-top: 16px;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  padding: 16px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resource-header {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.resource-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resource-form input[type="text"],
.resource-form input[type="datetime-local"] {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
}

.resource-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.resource-hint {
  font-size: 12px;
  color: #6b7280;
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
  padding: 10px 12px;
  border-radius: 12px;
}

.resource-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resource-name {
  font-size: 13px;
  font-weight: 600;
}

.resource-sub {
  font-size: 12px;
  color: #6b7280;
}

.resource-empty {
  font-size: 12px;
  color: #6b7280;
}

.media-controls {
  display: flex;
  gap: 12px;
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

.toggle-btn.active {
  background: #111827;
  color: #ffffff;
  border-color: #111827;
}

.toggle-btn.screen-btn.active {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.dm-toggle-btn {
  background: #f3f4f6;
  color: #111827;
  border-color: #e5e7eb;
}

.danmaku-sidebar {
  width: 300px;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
}

.board-title {
  padding: 16px;
  font-size: 13px;
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
  color: #111827;
  letter-spacing: 0.4px;
}

.danmaku-list {
  padding: 12px 14px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
  color: #111827;
}

.time {
  color: #6b7280;
  font-size: 12px;
}
</style>