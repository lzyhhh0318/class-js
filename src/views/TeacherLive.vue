<template>
  <div class="teacher-live-page">
    <header class="navbar">
      <div class="logo">🚀 智能软件工程平台 - 👨‍🏫 教师开播端 (课程ID: {{ courseId }})</div>
      <button class="stop-btn" v-if="isClassStarted" @click="stopLive">结束直播并保存弹幕</button>
    </header>

    <main class="main-content">
      <div class="video-container" :class="{'has-screen': isScreenOn}">
        
        <div id="screen-video" class="main-screen" v-show="isScreenOn"></div>
        
        <div id="camera-video" class="pip-window" v-show="isCameraOn"></div>

        <div class="pre-class-mask" v-if="!isClassStarted">
          <button class="start-btn primary" @click="startClass">🎬 开始上课 (加入房间)</button>
        </div>

        <div class="danmaku-board" v-if="isClassStarted">
           <div class="board-title">💬 实时弹幕</div>
           <div class="danmaku-list">
             <div class="dm-item" v-for="(dm, index) in danmakuList" :key="index">
               <span class="time">[{{ formatTime(dm.timestamp) }}]</span>: {{ dm.content }}
             </div>
           </div>
        </div>
      </div>

      <div class="control-panel" v-if="isClassStarted">
        <button class="toggle-btn camera-btn" :class="{ active: isCameraOn }" @click="toggleCamera">
          {{ isCameraOn ? '📹 关闭摄像头' : '📹 开启摄像头' }}
        </button>
        <button class="toggle-btn screen-btn" :class="{ active: isScreenOn }" @click="toggleScreen">
          {{ isScreenOn ? '💻 停止共享屏幕' : '💻 共享屏幕' }}
        </button>
      </div>
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

// ===== 核心配置 =====
const APP_ID = 'ef5c5abed935411c8366d07d8af1d3ef' 
const courseId = route.query.courseId || 'default' // 动态课程ID
const CHANNEL = `course_room_${courseId}`          // 动态频道名
const TOKEN = null

// 教师基本 UID (摄像头)，屏幕共享的 UID = 摄像头 UID + 10000
const CAMERA_UID = Math.floor(Math.random() * 10000)
const SCREEN_UID = CAMERA_UID + 10000

// 状态控制
const isClassStarted = ref(false)
const isCameraOn = ref(false)
const isScreenOn = ref(false)
const danmakuList = ref([])

// 实例变量
let rtcClient = null      // 负责麦克风和摄像头
let screenClient = null   // 独立负责屏幕共享
let rtmClient = null      // 负责弹幕通讯
let rtmChannel = null
let localAudioTrack = null
let localVideoTrack = null
let screenVideoTrack = null

// 时间格式化
const formatTime = (ts) => {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`
}

// 1. 初始化并开始上课
const startClass = async () => {
  try {
    // --- RTC (音视频) 初始化 ---
    rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
    await rtcClient.join(APP_ID, CHANNEL, TOKEN, CAMERA_UID)
    
    // 默认开启麦克风
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack()
    await rtcClient.publish([localAudioTrack])

    // 初始化屏幕共享客户端 (先加入频道，不推流)
    screenClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
    await screenClient.join(APP_ID, CHANNEL, TOKEN, SCREEN_UID)

    // --- RTM (弹幕) 初始化 ---
    rtmClient = AgoraRTM.createInstance(APP_ID)
    await rtmClient.login({ uid: String(CAMERA_UID) })
    rtmChannel = rtmClient.createChannel(CHANNEL)
    await rtmChannel.join()

    // 监听学生弹幕
    rtmChannel.on('ChannelMessage', (message) => {
      danmakuList.value.push({ timestamp: Date.now(), content: message.text })
    })

    isClassStarted.value = true
    
    // 默认开启摄像头
    await toggleCamera()
    
  } catch (error) {
    console.error('上课开启失败:', error)
    alert('开启失败，请检查设备权限！')
  }
}

// 2. 独立开关：摄像头
const toggleCamera = async () => {
  if (isCameraOn.value) {
    // 关闭
    await rtcClient.unpublish(localVideoTrack)
    localVideoTrack.close()
    localVideoTrack = null
    isCameraOn.value = false
  } else {
    // 开启
    localVideoTrack = await AgoraRTC.createCameraVideoTrack()
    localVideoTrack.play('camera-video')
    await rtcClient.publish(localVideoTrack)
    isCameraOn.value = true
  }
}

// 3. 独立开关：屏幕共享
const toggleScreen = async () => {
  if (isScreenOn.value) {
    // 关闭
    await screenClient.unpublish(screenVideoTrack)
    screenVideoTrack.close()
    screenVideoTrack = null
    isScreenOn.value = false
  } else {
    // 开启
    try {
      screenVideoTrack = await AgoraRTC.createScreenVideoTrack({ encoderConfig: "1080p_1" }, "auto")
      screenVideoTrack.play('screen-video')
      await screenClient.publish(screenVideoTrack)
      isScreenOn.value = true

      // 监听浏览器原生的“停止共享”按钮
      screenVideoTrack.on("track-ended", async () => {
        await screenClient.unpublish(screenVideoTrack)
        screenVideoTrack.close()
        screenVideoTrack = null
        isScreenOn.value = false
      })
    } catch (e) {
      console.log('老师取消了屏幕共享或发生错误')
    }
  }
}

// 4. 结束直播并保存数据
const stopLive = async () => {
  if (localAudioTrack) localAudioTrack.close()
  if (localVideoTrack) localVideoTrack.close()
  if (screenVideoTrack) screenVideoTrack.close()
  
  if (rtcClient) { await rtcClient.leave() }
  if (screenClient) { await screenClient.leave() }
  if (rtmChannel) { await rtmChannel.leave() }
  if (rtmClient) { await rtmClient.logout() }
  
  isClassStarted.value = false

  // 核心保存逻辑：存入浏览器 localStorage
  if (danmakuList.value.length > 0) {
    const storageKey = `course_${courseId}_danmaku`
    localStorage.setItem(storageKey, JSON.stringify(danmakuList.value))
    alert(`直播已结束！弹幕已自动保存在浏览器中 (标识: ${storageKey})，\n后续可提取发送给 AI 进行分析。`)
  } else {
    alert('已结束直播，本次无弹幕产生。')
  }
  
  router.push('/dashboard')
}

onUnmounted(() => { stopLive() })
</script>

<style scoped>
.teacher-live-page { height: 100vh; display: flex; flex-direction: column; background-color: #1e1e1e; color: #fff; font-family: sans-serif;}
.navbar { height: 60px; background-color: #2c3e50; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; }
.logo { font-size: 18px; font-weight: bold; }
.stop-btn { background: #ff4757; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight:bold;}

.main-content { flex: 1; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 20px;}
.video-container { width: 1000px; height: 562px; background: #000; position: relative; border-radius: 8px; border: 2px solid #444; overflow: hidden;}

/* 课前遮罩层 */
.pre-class-mask { position: absolute; top:0; left:0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 50;}
.start-btn { padding: 15px 40px; font-size: 20px; background: #00d1b2; color: white; border: none; border-radius: 30px; cursor: pointer; transition: 0.3s; font-weight: bold;}
.start-btn:hover { transform: scale(1.05); }

/* 屏幕共享铺满 */
.main-screen { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 1;}

/* 画中画：摄像头悬浮窗（自带CSS可调大小魔法） */
.pip-window { 
  position: absolute; bottom: 20px; right: 20px; 
  width: 240px; height: 180px; 
  background: #222; border: 2px solid #00d1b2; border-radius: 8px;
  z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  resize: both; overflow: hidden; /* 核心：允许拖拽调节大小 */
  min-width: 150px; min-height: 100px; max-width: 800px; max-height: 500px;
}

/* 魔法逻辑：如果屏幕共享关闭了，摄像头自动全屏！ */
.video-container:not(.has-screen) .pip-window {
  width: 100%; height: 100%; bottom: 0; right: 0; border: none; resize: none; border-radius: 0;
}

/* 控制台中控台 */
.control-panel { display: flex; gap: 20px; background: #2d2d2d; padding: 15px 30px; border-radius: 30px;}
.toggle-btn { padding: 10px 20px; border-radius: 20px; border: none; cursor: pointer; font-weight: bold; font-size: 14px; background: #555; color: white; transition: 0.3s;}
.toggle-btn.active { background: #00d1b2; box-shadow: 0 0 10px rgba(0, 209, 178, 0.4);}
.toggle-btn.screen-btn.active { background: #3273f6; }

/* 弹幕面板 */
.danmaku-board { position: absolute; left: 20px; top: 20px; width: 260px; height: 300px; background: rgba(0,0,0,0.6); border-radius: 8px; display: flex; flex-direction: column; z-index: 20; border: 1px solid #444;}
.board-title { padding: 10px; font-size: 14px; font-weight: bold; border-bottom: 1px solid #555; color: #00ffcc;}
.danmaku-list { padding: 10px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 5px; font-size: 13px;}
.time { color: #888; font-size: 12px; }
</style>