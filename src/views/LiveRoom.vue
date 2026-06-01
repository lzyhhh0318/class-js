<template>
  <div class="app-wrapper">
    <header class="navbar">
      <div class="logo">
        <button class="back-btn" @click="goBack">⬅ 返回主页</button>
        🚀 智能软件工程平台
      </div>
      <div class="nav-right">
        <button class="mock-btn notification-btn">🔔 通知(2-4组)</button>
        <div class="user-avatar">🧑‍🎓 学生(2-1组)</div>
      </div>
    </header>

    <main class="main-content">
      
      <section class="video-stage">
        <div class="video-player-placeholder">
          <div id="remote-video" class="remote-video-container">
            <div v-if="!isTeacherStreaming" class="waiting-text">
              <h1>⏳ 正在等待老师开播...</h1>
              <p>教师端推流后，画面将自动在此呈现</p>
            </div>
          </div>
        </div>
        <div class="danmaku-overlay">
          <marquee scrollamount="8" class="danmaku-item">老师讲得太好了！</marquee>
          <marquee scrollamount="12" class="danmaku-item" style="margin-top: 40px;">2-1组的弹幕测试~~</marquee>
        </div>
        <div class="video-controls">
          <input type="text" placeholder="发个弹幕参与互动..." class="mock-input" />
          <button class="mock-btn primary">发送弹幕</button>
        </div>
      </section>

      <aside class="interaction-sidebar">
        </aside>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AgoraRTC from 'agora-rtc-sdk-ng'

const router = useRouter()
const currentTab = ref('ai')
const isTeacherStreaming = ref(false)

// 原来是 router.push('/')
const goBack = () => { router.push('/dashboard') }

// ===== 核心配置 (必须和教师端完全一致) =====
const APP_ID = 'ef5c5abed935411c8366d07d8af1d3ef' 
const CHANNEL = 'class_room_1'      
const TOKEN = null                  
const UID = Math.floor(Math.random() * 10000) // 随机生成学生的临时 ID

let rtcClient = null

const initStudentLive = async () => {
  rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })

  // 监听远端用户（老师）发布视频流的事件
  rtcClient.on('user-published', async (user, mediaType) => {
    // 订阅老师的流
    await rtcClient.subscribe(user, mediaType)
    
    if (mediaType === 'video') {
      isTeacherStreaming.value = true
      const remoteVideoTrack = user.videoTrack
      // 将老师的画面播放在页面指定的 div 里
      remoteVideoTrack.play('remote-video')
    }
    
    if (mediaType === 'audio') {
      const remoteAudioTrack = user.audioTrack
      remoteAudioTrack.play()
    }
  })

  // 监听老师下播事件
  rtcClient.on('user-unpublished', (user) => {
    isTeacherStreaming.value = false
  })

  // 学生加入频道（只看，不发推流）
  try {
    await rtcClient.join(APP_ID, CHANNEL, TOKEN, UID)
    console.log('加入直播间成功，等待接收画面')
  } catch (error) {
    console.error('加入直播间失败', error)
  }
}

onMounted(() => {
  initStudentLive()
})

onUnmounted(async () => {
  if (rtcClient) {
    await rtcClient.leave()
  }
})
</script>

<style scoped>
/* 在你原有的样式基础上，增加/修改这几行即可 */
.app-wrapper { height: 100vh; display: flex; flex-direction: column; font-family: sans-serif; background-color: #1e1e1e; color: #fff; overflow: hidden; }
.navbar { height: 60px; background-color: #2d2d2d; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; border-bottom: 1px solid #444; }
.logo { display: flex; align-items: center; gap: 10px; }
.back-btn { background: #444; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
.back-btn:hover { background: #666; }
.nav-right { display: flex; gap: 15px; align-items: center; }
.main-content { flex: 1; display: flex; padding: 20px; gap: 20px; height: calc(100vh - 60px); }
.video-stage { flex: 7; display: flex; flex-direction: column; position: relative; background-color: #000; border-radius: 8px; overflow: hidden; border: 2px dashed #666; }

/* 视频播放器容器调整 */
.video-player-placeholder { flex: 1; width: 100%; height: 100%; position: relative; }
.remote-video-container { width: 100%; height: 100%; }
.waiting-text { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #888; background: #111; z-index: 10; }

.danmaku-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 70%; pointer-events: none; z-index: 20;}
.danmaku-item { font-size: 20px; font-weight: bold; color: #00ffcc; text-shadow: 1px 1px 2px #000; }
.video-controls { height: 60px; background-color: #222; display: flex; padding: 10px; gap: 10px; z-index: 20; position: relative;}
.interaction-sidebar { flex: 3; display: flex; flex-direction: column; background-color: #2d2d2d; border-radius: 8px; border: 1px solid #444; }
/* ... 后续侧边栏样式同之前 ... */
</style>