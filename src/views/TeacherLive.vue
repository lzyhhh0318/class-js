<template>
  <div class="teacher-live-page">
    <header class="navbar">
      <div class="logo">🚀 智能软件工程平台 - 👨‍🏫 教师端 (独立房间号: {{ courseId }})</div>
      <button class="stop-btn" v-if="isClassStarted" @click="stopLive">结束直播</button>
    </header>

    <main class="main-content">
      <section class="video-section">
        <div class="video-container" :class="{'has-screen': isScreenOn}">
          
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
import { ref, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AgoraRTC from 'agora-rtc-sdk-ng'
import AgoraRTM from 'agora-rtm-sdk'

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
const danmakuList = ref([])

let rtcClient = null, screenClient = null, rtmClient = null, rtmChannel = null
let localAudioTrack = null, localVideoTrack = null, screenVideoTrack = null

const formatTime = (ts) => {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`
}

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
    })

    isClassStarted.value = true
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
  router.push('/dashboard')
}

onUnmounted(() => { stopLive() })
</script>

<style scoped>
.teacher-live-page { height: 100vh; display: flex; flex-direction: column; background-color: #1e1e1e; color: #fff; font-family: sans-serif;}
.navbar { height: 60px; background-color: #2c3e50; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; }
.logo { font-size: 18px; font-weight: bold; }
.stop-btn { background: #ff4757; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight:bold;}

/* 【修复四核心布局】：左右分栏，独立区域不遮挡 */
.main-content { display: flex; flex-direction: row; height: calc(100vh - 60px); padding: 20px; gap: 20px; }
.video-section { flex: 1; display: flex; flex-direction: column; gap: 15px; min-width: 0; }

.video-container { flex: 1; background: #000; position: relative; border-radius: 8px; border: 2px solid #444; overflow: hidden;}

/* 全屏状态 */
.main-screen { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 1;}

/* 画中画状态：缩放与拖拽光标 */
.pip-window { 
  position: absolute; top: 20px; left: 20px; 
  width: 240px; height: 180px; 
  background: #222; border: 2px solid #00d1b2; border-radius: 8px;
  z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  resize: both; overflow: hidden; cursor: move; 
  min-width: 150px; min-height: 100px; max-width: 800px; max-height: 500px;
}

.pre-class-mask { position: absolute; top:0; left:0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 50;}
.start-btn { padding: 15px 40px; font-size: 20px; background: #00d1b2; color: white; border: none; border-radius: 30px; cursor: pointer; font-weight: bold;}

.control-panel { display: flex; justify-content: space-between; background: #2d2d2d; padding: 15px 20px; border-radius: 8px;}
.media-controls { display: flex; gap: 15px; }
.toggle-btn { padding: 10px 20px; border-radius: 20px; border: none; cursor: pointer; font-weight: bold; background: #555; color: white;}
.toggle-btn.active { background: #00d1b2; }
.toggle-btn.screen-btn.active { background: #3273f6; }
.dm-toggle-btn { background: #fdcb6e; color: #2d3436; }

/* 侧边独立弹幕区 */
.danmaku-sidebar { width: 300px; background: #222; border-radius: 8px; border: 1px solid #444; display: flex; flex-direction: column; }
.board-title { padding: 15px; font-size: 14px; font-weight: bold; border-bottom: 1px solid #444; color: #00ffcc;}
.danmaku-list { padding: 10px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px; font-size: 13px;}
.time { color: #888; font-size: 12px; }
</style>