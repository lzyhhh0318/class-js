<template>
  <div class="app-wrapper">
    <header class="navbar">
      <div class="logo">
        <button class="back-btn" @click="goBack">⬅ 返回主页</button>
        🚀 智能软件工程平台 - 🧑‍🎓 学生观看端 (课程ID: {{ courseId }})
      </div>
    </header>

    <main class="main-content">
      <section class="video-stage">
        <div class="video-player-placeholder" :class="{'has-screen': isTeacherScreenOn}">
          
          <div id="screen-video" class="main-screen" v-show="isTeacherScreenOn"></div>
          
          <div id="camera-video" class="pip-window" v-show="isTeacherCameraOn"></div>

          <div v-if="!isTeacherScreenOn && !isTeacherCameraOn" class="waiting-text">
            <h1>⏳ 正在等待老师开播...</h1>
            <p>老师推流后，画面将自动在此呈现</p>
          </div>
        </div>

        <div class="danmaku-overlay">
          <marquee scrollamount="10" class="danmaku-item" v-for="(dm, i) in activeDanmakus" :key="i" :style="{ marginTop: (i*35)+'px' }">
            {{ dm }}
          </marquee>
        </div>

        <div class="video-controls">
          <input 
            type="text" 
            v-model="inputText" 
            @keyup.enter="sendDanmaku"
            placeholder="发个弹幕参与互动..." 
            class="mock-input" 
          />
          <button class="mock-btn primary" @click="sendDanmaku">发送弹幕</button>
        </div>
      </section>

      <aside class="interaction-sidebar"></aside>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AgoraRTC from 'agora-rtc-sdk-ng'
import AgoraRTM from 'agora-rtm-sdk'

const route = useRoute()
const router = useRouter()

// ===== 核心配置 =====
const APP_ID = 'ef5c5abed935411c8366d07d8af1d3ef' 
const courseId = route.query.courseId || 'default'
const CHANNEL = `course_room_${courseId}` 
const TOKEN = null                  
const UID = Math.floor(Math.random() * 10000)

const isTeacherCameraOn = ref(false)
const isTeacherScreenOn = ref(false)
const inputText = ref('')
const activeDanmakus = ref([]) // 用于页面飘屏显示的弹幕

let rtcClient = null
let rtmClient = null
let rtmChannel = null

const goBack = () => { router.push('/dashboard') }

const initStudentLive = async () => {
  // --- 1. RTC 视频接收 ---
  rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })

  rtcClient.on('user-published', async (user, mediaType) => {
    await rtcClient.subscribe(user, mediaType)
    
    if (mediaType === 'video') {
      // 智能识别：UID >= 10000 规定为屏幕共享流，否则为摄像头流
      if (user.uid >= 10000) {
        isTeacherScreenOn.value = true
        user.videoTrack.play('screen-video')
      } else {
        isTeacherCameraOn.value = true
        user.videoTrack.play('camera-video')
      }
    }
    if (mediaType === 'audio') {
      user.audioTrack.play()
    }
  })

  rtcClient.on('user-unpublished', (user, mediaType) => {
    if (mediaType === 'video') {
      if (user.uid >= 10000) isTeacherScreenOn.value = false
      else isTeacherCameraOn.value = false
    }
  })

  try {
    await rtcClient.join(APP_ID, CHANNEL, TOKEN, UID)
  } catch (error) { console.error('RTC 加入失败', error) }

  // --- 2. RTM 弹幕接收与发送 ---
  rtmClient = AgoraRTM.createInstance(APP_ID)
  await rtmClient.login({ uid: String(UID) })
  rtmChannel = rtmClient.createChannel(CHANNEL)
  await rtmChannel.join()

  // 监听其他人的弹幕在自己屏幕上飘过
  rtmChannel.on('ChannelMessage', (message) => {
    showDanmakuOnScreen(message.text)
  })
}

const sendDanmaku = async () => {
  if (!inputText.value.trim()) return
  const text = inputText.value
  
  // 1. 发送给老师频道
  await rtmChannel.sendMessage({ text: text })
  
  // 2. 自己的屏幕也显示
  showDanmakuOnScreen(text)
  
  inputText.value = ''
}

const showDanmakuOnScreen = (text) => {
  activeDanmakus.value.push(text)
  // 8秒后自动清理飘过的弹幕
  setTimeout(() => { activeDanmakus.value.shift() }, 8000)
}

onMounted(() => { initStudentLive() })

onUnmounted(async () => {
  if (rtcClient) await rtcClient.leave()
  if (rtmChannel) await rtmChannel.leave()
  if (rtmClient) await rtmClient.logout()
})
</script>

<style scoped>
.app-wrapper { height: 100vh; display: flex; flex-direction: column; font-family: sans-serif; background-color: #1e1e1e; color: #fff; overflow: hidden; }
.navbar { height: 60px; background-color: #2d2d2d; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; border-bottom: 1px solid #444; }
.logo { display: flex; align-items: center; gap: 10px; font-weight: bold;}
.back-btn { background: #444; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
.back-btn:hover { background: #666; }

.main-content { flex: 1; display: flex; padding: 20px; gap: 20px; height: calc(100vh - 60px); }
.video-stage { flex: 7; display: flex; flex-direction: column; position: relative; background-color: #000; border-radius: 8px; overflow: hidden; border: 2px solid #555; }
.interaction-sidebar { flex: 2; background-color: #2d2d2d; border-radius: 8px; border: 1px solid #444; }

/* 视频播放器逻辑 (同老师端) */
.video-player-placeholder { flex: 1; width: 100%; height: 100%; position: relative; }
.waiting-text { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #888; background: #111; z-index: 10; }

.main-screen { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 1;}

/* 画中画样式 */
.pip-window { 
  position: absolute; bottom: 20px; right: 20px; 
  width: 240px; height: 180px; 
  background: #222; border: 2px solid #00d1b2; border-radius: 8px;
  z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  resize: both; overflow: hidden; 
  min-width: 150px; min-height: 100px; max-width: 800px; max-height: 500px;
}
/* 如果老师没开屏幕共享，摄像头直接铺满！ */
.video-player-placeholder:not(.has-screen) .pip-window {
  width: 100%; height: 100%; bottom: 0; right: 0; border: none; resize: none; border-radius: 0;
}

/* 弹幕浮层与输入框 */
.danmaku-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 70%; pointer-events: none; z-index: 20; overflow: hidden;}
.danmaku-item { font-size: 22px; font-weight: bold; color: #fff; text-shadow: 2px 2px 4px #000; position: absolute;}
.video-controls { height: 70px; background-color: #222; display: flex; align-items: center; padding: 0 20px; gap: 15px; z-index: 20; border-top: 1px solid #444;}
.mock-input { flex: 1; padding: 12px 15px; border-radius: 20px; border: none; outline: none; background: #333; color: white; font-size: 14px;}
.mock-input:focus { border: 1px solid #00d1b2;}
.mock-btn.primary { background: #00d1b2; color: white; padding: 10px 25px; border-radius: 20px; border: none; font-weight: bold; cursor: pointer;}
.mock-btn.primary:hover { background: #00b89c; }
</style>