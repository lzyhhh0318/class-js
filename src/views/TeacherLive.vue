<template>
  <div class="teacher-live-page">
    <aside class="side-nav" :class="{ collapsed: isSideNavCollapsed }">
      <div class="brand">
        <div class="brand-mark">SE大师</div>
        <div class="brand-sub">智能软件工程平台</div>
      </div>
      <nav class="nav-list">
        <button class="nav-item active">
          <span class="nav-icon">🎬</span>
          <span class="nav-text">直播授课</span>
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
          <span class="nav-text">作业管理</span>
        </button>
      </nav>
      <div class="course-info">
        <div class="course-label">当前课程</div>
        <div class="course-name">课程 {{ courseId }}</div>
        <div class="live-status" :class="isClassStarted ? 'live' : 'waiting'">
          {{ isClassStarted ? '🟢 直播中' : '⏳ 未开始' }}
        </div>
      </div>
      <button class="collapse-btn" @click="isSideNavCollapsed = !isSideNavCollapsed">
        {{ isSideNavCollapsed ? '▶' : '◀' }}
      </button>
    </aside>

    <div class="main-content">
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
            <button class="start-btn" @click="startClass">🎬 开始上课</button>
          </div>
        </div>

        <div class="control-panel" v-if="isClassStarted">
          <div class="media-controls">
            <button class="control-btn" :class="{ active: isCameraOn }" @click="toggleCamera">
              {{ isCameraOn ? '📹 摄像头' : '📹 开启摄像头' }}
            </button>
            <button class="control-btn" :class="{ active: isScreenOn, screen: isScreenOn }" @click="toggleScreen">
              {{ isScreenOn ? '💻 屏幕共享中' : '💻 共享屏幕' }}
            </button>
          </div>
          <div class="control-actions">
            <button class="action-btn" :class="{ recording: isRecording }" :disabled="isUploading" @click="toggleRecording" title="录制">
              <span class="btn-icon">{{ isRecording ? '⏹' : '⏺' }}</span>
              <span class="btn-text">{{ isRecording ? '录制中' : '录制' }}</span>
            </button>
            <button class="action-btn" @click="showResourcePanel = !showResourcePanel" title="录播管理">
              <span class="btn-icon">📼</span>
              <span class="btn-text">录播</span>
            </button>
            <button class="action-btn" @click="showDanmaku = !showDanmaku">
              <span class="btn-icon">{{ showDanmaku ? '💬' : '🔕' }}</span>
              <span class="btn-text">{{ showDanmaku ? '弹幕' : '隐藏弹幕' }}</span>
            </button>
            <button class="action-btn" @click="showFloatingDanmaku = !showFloatingDanmaku">
              <span class="btn-icon">{{ showFloatingDanmaku ? '📢' : '🚫' }}</span>
              <span class="btn-text">{{ showFloatingDanmaku ? '飘屏' : '关闭飘屏' }}</span>
            </button>
            <button class="action-btn stop" @click="stopLive">
              <span class="btn-icon">⏹</span>
              <span class="btn-text">结束直播</span>
            </button>
          </div>
        </div>

        <div class="resource-panel" v-if="showResourcePanel">
          <div class="panel-header">
            <span class="panel-title">📼 录播与资料管理</span>
            <button class="close-btn" @click="showResourcePanel = false">×</button>
          </div>
          <div class="panel-body">
            <div class="resource-form">
              <input v-model="resourceTitle" type="text" placeholder="资源名称（如：第4讲 录播）" />
              <input v-model="resourceStartAt" type="datetime-local" />
              <input ref="resourceFileInput" type="file" accept="video/*" @change="handleResourceFileChange" :disabled="isUploading" />
              <div class="form-actions">
                <button class="form-btn" @click="addResource('prerecord')" :disabled="isUploading">上传预录视频</button>
                <button class="form-btn" @click="addResource('recording')" :disabled="isUploading">保存直播录像</button>
              </div>
              <div class="upload-progress" v-if="isUploading">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{width: uploadProgress + '%'}"></div>
                </div>
                <div class="progress-text">上传中: {{ uploadProgress }}%</div>
              </div>
              <div class="upload-error" v-if="uploadError">{{ uploadError }}</div>
              <div class="resource-hint">说明：视频会上传到后端存储服务，并同步本地列表。</div>
            </div>
            <div class="resource-list">
              <div class="resource-item" v-for="item in resourceItems" :key="item.id">
                <div class="resource-icon">🎬</div>
                <div class="resource-info">
                  <span class="resource-name">{{ item.name }}</span>
                  <span class="resource-sub">可观看时间：{{ formatStartAt(item.startAt) }}</span>
                </div>
                <div class="resource-actions">
                  <button class="item-btn" @click="openVideoLink(item.videoUrl)">打开</button>
                  <button class="item-btn delete" @click="deleteResource(item)">删除</button>
                </div>
              </div>
              <div class="resource-empty" v-if="resourceItems.length === 0">暂无录播资源</div>
            </div>
          </div>
        </div>
      </section>

      <aside class="danmaku-sidebar" v-show="isClassStarted && showDanmaku">
        <div class="sidebar-header">
          <span class="sidebar-title">💬 实时弹幕面板</span>
        </div>
        <div class="danmaku-list">
          <div class="dm-item" v-for="(dm, index) in danmakuList" :key="index">
            <span class="dm-time">[{{ formatTime(dm.timestamp) }}]</span>
            <span class="dm-content">{{ dm.content }}</span>
          </div>
        </div>
      </aside>
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

const UPLOAD_ENDPOINT = 'http://localhost:8080/api/video/upload'
const STREAM_BASE_URL = 'http://localhost:8080/api/video/stream'
const RESOURCE_STORAGE_KEY = `course_resources_${courseId}`

const uploadProgress = ref(0)
const uploadError = ref('')

const CAMERA_UID = Math.floor(Math.random() * 10000)
const SCREEN_UID = CAMERA_UID + 10000

const isClassStarted = ref(false)
const isCameraOn = ref(false)
const isScreenOn = ref(false)
const showDanmaku = ref(true)
const showFloatingDanmaku = ref(true)
const danmakuList = ref([])
const floatingDanmakus = ref([])
const showResourcePanel = ref(false)
const isRecording = ref(false)
const isSideNavCollapsed = ref(false)

let rtcClient = null, screenClient = null, rtmClient = null, rtmChannel = null
let localAudioTrack = null, localVideoTrack = null, screenVideoTrack = null
let mediaRecorder = null
let recordedChunks = []

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

let isDragging = false
let dragOffset = { x: 0, y: 0 }

const startDrag = (e) => {
  if (!isScreenOn.value) return
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

const goBack = () => {
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

const loadResourceItems = () => {
  const raw = localStorage.getItem(RESOURCE_STORAGE_KEY)
  resourceItems.value = raw ? JSON.parse(raw) : []
}

const persistResourceItems = () => {
  localStorage.setItem(RESOURCE_STORAGE_KEY, JSON.stringify(resourceItems.value))
}

const addResource = async (source) => {
  if (!resourceTitle.value.trim()) {
    uploadError.value = '请输入资源名称'
    return
  }
  if (!resourceStartAt.value) {
    uploadError.value = '请选择可观看时间'
    return
  }
  if (!resourceFile.value) {
    uploadError.value = '请选择要上传的文件'
    return
  }

  isUploading.value = true
  uploadProgress.value = 0
  uploadError.value = ''

  try {
    const extension = getFileExtension(resourceFile.value.name)
    const baseName = normalizeTitle(resourceTitle.value.trim())
    const fileId = Date.now()
    const ossPath = `protected/${courseId}/recordings/${fileId}/${fileId}${extension}`
    
    const formData = new FormData()
    formData.append('file', resourceFile.value)
    formData.append('course_id', String(courseId))
    formData.append('start_at', new Date(resourceStartAt.value).toISOString())
    formData.append('title', resourceTitle.value.trim())
    formData.append('path', ossPath)

    const response = await fetch(UPLOAD_ENDPOINT, {
      method: 'POST',
      body: formData,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total > 0) {
          uploadProgress.value = Math.round((progressEvent.loaded / progressEvent.total) * 100)
        }
      }
    })

    if (!response.ok) {
      const errorText = await getErrorResponse(response)
      throw new Error(`上传失败 [${response.status}]: ${errorText}`)
    }

    const result = await parseResponse(response)
    const videoUrl = extractVideoUrl(result, ossPath)

    resourceItems.value.unshift({
      id: `res_${Date.now()}`,
      name: resourceTitle.value.trim(),
      videoUrl,
      startAt: new Date(resourceStartAt.value).toISOString(),
      createdAt: new Date().toISOString(),
      source
    })
    persistResourceItems()

    resourceTitle.value = ''
    resourceStartAt.value = ''
    resourceFile.value = null
    uploadProgress.value = 0
    if (resourceFileInput.value) {
      resourceFileInput.value.value = ''
    }
    
    alert('上传成功！')
  } catch (error) {
    console.error('上传错误:', error)
    uploadError.value = error.message || '上传失败，请检查上传接口或网络'
    alert(uploadError.value)
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

const getErrorResponse = async (response) => {
  try {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await response.json()
      return data.message || data.error || '未知错误'
    }
    return await response.text()
  } catch {
    return '无法获取错误详情'
  }
}

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  
  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }
  
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

const extractVideoUrl = (result, fallbackPath) => {
  if (!result) {
    const fileName = fallbackPath.split('/').pop() || 'unknown.mp4'
    return `${STREAM_BASE_URL}/${courseId}/${encodeURIComponent(fileName)}`
  }

  const fileNameFields = ['fileName', 'name', 'data.fileName', 'data.name', 'result.fileName', 'result.name']
  for (const field of fileNameFields) {
    const fileName = getNestedValue(result, field)
    if (fileName && typeof fileName === 'string') {
      return `${STREAM_BASE_URL}/${courseId}/${encodeURIComponent(fileName)}`
    }
  }

  const fileName = fallbackPath.split('/').pop() || 'unknown.mp4'
  return `${STREAM_BASE_URL}/${courseId}/${encodeURIComponent(fileName)}`
}

const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined
  }, obj)
}

const openVideoLink = (url) => {
  if (!url) return
  window.open(url, '_blank')
}

const deleteResource = async (item) => {
  if (!confirm(`确定要删除视频 "${item.name}" 吗？此操作无法撤销。`)) {
    return
  }

  try {
    const ossPath = extractOssPath(item.videoUrl)
    const response = await fetch('http://localhost:8080/api/video/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ossPath })
    })

    if (!response.ok) {
      throw new Error('删除失败')
    }

    const result = await response.json()
    if (result.success) {
      resourceItems.value = resourceItems.value.filter(res => res.id !== item.id)
      persistResourceItems()
      alert('删除成功！')
    } else {
      throw new Error(result.message || '删除失败')
    }
  } catch (error) {
    console.error('删除错误:', error)
    alert('删除失败：' + error.message)
  }
}

const extractOssPath = (url) => {
  if (!url) return ''
  
  const streamPattern = new RegExp(`${STREAM_BASE_URL.replace(/\//g, '\\/')}\\/${courseId}\\/(.+)$`)
  const match = url.match(streamPattern)
  if (match) {
    const fileName = decodeURIComponent(match[1])
    return `courses/${courseId}/${fileName}`
  }
  
  const ossBaseUrl = `https://code-class-video.oss-cn-${ALIYUN_REGION}.aliyuncs.com/`
  if (url.startsWith(ossBaseUrl)) {
    return decodeURIComponent(url.substring(ossBaseUrl.length))
  }
  
  return ''
}

const ALIYUN_REGION = 'cn-beijing'

const formatStartAt = (value) => {
  if (!value) return '未设置'
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getRecordFileName = () => {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  return `live_${courseId}_${stamp}.webm`
}

const toggleRecording = async () => {
  if (isRecording.value) {
    if (mediaRecorder) {
      mediaRecorder.stop()
    }
    return
  }

  if (!isClassStarted.value) {
    alert('请先开始上课后再录制。')
    return
  }

  const tracks = []
  if (localAudioTrack) tracks.push(localAudioTrack.getMediaStreamTrack())
  if (isScreenOn.value && screenVideoTrack) {
    tracks.push(screenVideoTrack.getMediaStreamTrack())
  } else if (localVideoTrack) {
    tracks.push(localVideoTrack.getMediaStreamTrack())
  }

  if (tracks.length === 0) {
    alert('当前没有可录制的视频流。')
    return
  }

  const stream = new MediaStream(tracks)
  const options = {}
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
    options.mimeType = 'video/webm;codecs=vp9,opus'
  } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
    options.mimeType = 'video/webm;codecs=vp8,opus'
  }

  recordedChunks = []
  mediaRecorder = new MediaRecorder(stream, options)
  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data)
    }
  }
  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordedChunks, { type: options.mimeType || 'video/webm' })
    const file = new File([blob], getRecordFileName(), { type: blob.type })
    resourceFile.value = file
    resourceTitle.value = `直播录制_${new Date().toLocaleString('zh-CN')}`
    resourceStartAt.value = new Date().toISOString().slice(0, 16)
    showResourcePanel.value = true
    await addResource('recording')
    isRecording.value = false
  }
  mediaRecorder.start()
  isRecording.value = true
}

onMounted(() => {
  sessionStorage.setItem('userRole', 'teacher')
  if (!sessionStorage.getItem('displayName')) {
    sessionStorage.setItem('displayName', '教师姓名')
  }
  loadResourceItems()
})

onUnmounted(() => { stopLive() })
</script>

<style scoped>
.teacher-live-page {
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
  left: 16px;
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

.pre-class-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
}

.start-btn {
  padding: 16px 40px;
  font-size: 18px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 12px 30px rgba(59, 130, 246, 0.4);
  transition: all 0.25s ease;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 36px rgba(59, 130, 246, 0.5);
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

.control-panel {
  background: #ffffff;
  padding: 14px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.media-controls {
  display: flex;
  gap: 12px;
}

.control-btn {
  padding: 10px 18px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  border-color: #3b82f6;
}

.control-btn.active {
  background: #0F172A;
  color: #ffffff;
  border-color: #0F172A;
}

.control-btn.screen {
  background: #16a34a;
  border-color: #16a34a;
}

.control-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.action-btn.recording {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
}

.action-btn.stop {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
}

.btn-icon {
  font-size: 16px;
}

.btn-text {
  font-size: 12px;
}

.resource-panel {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.close-btn {
  border: none;
  background: transparent;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px 8px;
  line-height: 1;
}

.panel-body {
  padding: 16px;
}

.resource-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.resource-form input[type="text"],
.resource-form input[type="datetime-local"] {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.resource-form input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
  display: flex;
  gap: 10px;
}

.form-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: #0F172A;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.form-btn:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
}

.upload-progress {
  margin-top: 8px;
}

.progress-bar {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #64748b;
  margin-top: 6px;
  text-align: center;
}

.upload-error {
  font-size: 12px;
  color: #dc2626;
  padding: 10px;
  background: #fef2f2;
  border-radius: 10px;
}

.resource-hint {
  font-size: 11px;
  color: #94a3b8;
  padding: 10px;
  background: #f8fafc;
  border-radius: 10px;
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
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
}

.resource-icon {
  font-size: 24px;
}

.resource-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resource-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.resource-sub {
  font-size: 11px;
  color: #64748b;
}

.resource-actions {
  display: flex;
  gap: 8px;
}

.item-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
}

.item-btn:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

.item-btn.delete {
  border-color: #fca5a5;
  background: #fef2f2;
  color: #dc2626;
}

.item-btn.delete:hover {
  background: #fee2e2;
}

.resource-empty {
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  padding: 20px;
}

.danmaku-sidebar {
  width: 300px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 14px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.danmaku-list {
  flex: 1;
  padding: 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dm-item {
  padding: 8px 10px;
  background: #f8fafc;
  border-radius: 10px;
  font-size: 13px;
}

.dm-time {
  color: #64748b;
  font-size: 11px;
  margin-right: 8px;
}

.dm-content {
  color: #1e293b;
}

@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
  }
  
  .danmaku-sidebar {
    width: 100%;
    max-height: 200px;
  }
}

@media (max-width: 768px) {
  .teacher-live-page {
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
  
  .control-panel {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .control-actions {
    flex-wrap: wrap;
  }
}
</style>