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

      <aside class="danmaku-sidebar">
        <div class="board-title">💬 交流面板</div>
        <div class="danmaku-list">
          <div class="dm-item" v-for="(dm, i) in activeDanmakus" :key="i">{{ dm }}</div>
        </div>
      </aside>
    </main>

    <div class="danmaku-canvas" v-if="showFloatingDanmaku">
      <div class="fly-item" v-for="dm in floatingDanmakus" :key="dm.id" :style="{top: dm.top + 'px'}">{{ dm.text }}</div>
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

let rtcClient = null, rtmClient = null, rtmChannel = null

const goBack = () => { router.push('/dashboard') }

const showFly = (text) => {
  const id = Date.now()
  floatingDanmakus.value.push({ id, text, top: Math.random() * 400 + 20 })
  setTimeout(() => { floatingDanmakus.value = floatingDanmakus.value.filter(d => d.id !== id) }, 5000)
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

onMounted(() => { initStudentLive() })
onUnmounted(async () => {
  if (rtcClient) await rtcClient.leave()
  if (rtmChannel) await rtmChannel.leave()
  if (rtmClient) await rtmClient.logout()
})
</script>

<style scoped>
.app-wrapper { height: 100vh; display: flex; flex-direction: column; font-family: sans-serif; background-color: #1e1e1e; color: #fff; }
.navbar { height: 60px; background-color: #2d2d2d; display: flex; align-items: center; padding: 0 20px; }
.back-btn { background: #444; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 15px;}
.main-content { display: flex; flex-direction: row; height: calc(100vh - 60px); padding: 20px; gap: 20px; }
.video-section { flex: 1; display: flex; flex-direction: column; gap: 15px; min-width: 0;}
.video-container { flex: 1; background: #000; position: relative; border-radius: 8px; border: 2px solid #555; overflow: hidden; }

.main-screen { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 1;}
.pip-window { 
  position: absolute; top: 20px; right: 20px; width: 240px; height: 180px; 
  background: #222; border: 2px solid #00d1b2; border-radius: 8px;
  z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  resize: both; overflow: hidden; cursor: move; min-width: 150px; min-height: 100px;
}
.video-player-placeholder:not(.has-screen) .pip-window { width: 100%; height: 100%; top: 0; left: 0; border: none; resize: none; border-radius: 0; }

.danmaku-canvas { position: absolute; top:0; left:0; width: 100%; height: 100%; z-index: 100; pointer-events: none; overflow: hidden; }
.fly-item { position: absolute; animation: fly-left 5s linear; font-size: 24px; font-weight: bold; color: #fff; text-shadow: 1px 1px 2px #000; white-space: nowrap; }
@keyframes fly-left { from { left: 100%; } to { left: -300px; } }

.video-controls { height: 60px; background-color: #2d2d2d; display: flex; align-items: center; padding: 0 20px; gap: 15px; border-radius: 8px;}
.mock-input { flex: 1; padding: 10px; border-radius: 20px; border: none; outline: none; background: #444; color: white;}
.mock-btn.primary { background: #00d1b2; color: white; padding: 10px 25px; border-radius: 20px; border: none; font-weight: bold; cursor: pointer;}
.danmaku-sidebar { width: 300px; background: #222; border-radius: 8px; border: 1px solid #444; display: flex; flex-direction: column; }
.board-title { padding: 15px; font-size: 14px; font-weight: bold; border-bottom: 1px solid #444; color: #00ffcc;}
.danmaku-list { padding: 10px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #ddd;}
</style>