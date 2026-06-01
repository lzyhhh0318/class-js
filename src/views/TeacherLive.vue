<template>
  <div class="teacher-live-page">
    <header class="navbar">
      <div class="logo">🚀 智能软件工程平台 - 👨‍🏫 教师开播端</div>
      <button class="stop-btn" v-if="isStreaming" @click="stopLive">结束直播</button>
    </header>

    <main class="main-content">
      <div class="video-container">
        <div id="local-video" class="video-player"></div>
        
        <div class="controls" v-if="!isStreaming">
          <button class="start-btn" @click="startLive">🎥 开始上课 (开启摄像头推流)</button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import AgoraRTC from 'agora-rtc-sdk-ng'

// ===== 核心配置 =====
const APP_ID = 'EF5C5abed935411c8366d07D8af1d3ef' // 替换为你的真实 AppID
const CHANNEL = 'class_room_1'      // 频道名，学生端必须和这个一致
const TOKEN = null                  // 调试模式下设为 null 即可
const UID = Math.floor(Math.random() * 10000) // 随机生成教师的临时 ID

const isStreaming = ref(false)
let rtcClient = null
let localAudioTrack = null
let localVideoTrack = null

const startLive = async () => {
  try {
    // 1. 创建本地客户端
    rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
    
    // 2. 加入频道
    await rtcClient.join(APP_ID, CHANNEL, TOKEN, UID)
    
    // 3. 采集麦克风和摄像头画面
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack()
    localVideoTrack = await AgoraRTC.createCameraVideoTrack()
    
    // 4. 将视频播放到页面上的 div 中
    localVideoTrack.play('local-video')
    
    // 5. 将音视频流推送到远端（发布）
    await rtcClient.publish([localAudioTrack, localVideoTrack])
    
    isStreaming.value = true
    alert('推流成功！学生现在可以进入直播间观看了。')
  } catch (error) {
    console.error('直播开启失败:', error)
    alert('开启直播失败，请检查是否授予了摄像头/麦克风权限！')
  }
}

const stopLive = async () => {
  if (localAudioTrack) { localAudioTrack.close() }
  if (localVideoTrack) { localVideoTrack.close() }
  if (rtcClient) {
    await rtcClient.unpublish()
    await rtcClient.leave()
  }
  isStreaming.value = false
  alert('已结束直播')
}

// 页面销毁时清理资源
onUnmounted(() => {
  stopLive()
})
</script>

<style scoped>
.teacher-live-page { height: 100vh; display: flex; flex-direction: column; background-color: #1e1e1e; color: #fff; font-family: sans-serif;}
.navbar { height: 60px; background-color: #2c3e50; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; }
.logo { font-size: 18px; font-weight: bold; }
.stop-btn { background: #ff4757; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
.main-content { flex: 1; padding: 20px; display: flex; justify-content: center; align-items: center; }
.video-container { width: 800px; height: 500px; background: #000; position: relative; border-radius: 8px; overflow: hidden; border: 2px solid #555; }
.video-player { width: 100%; height: 100%; }
.controls { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.6); }
.start-btn { padding: 15px 30px; font-size: 18px; background: #00d1b2; color: white; border: none; border-radius: 8px; cursor: pointer; }
.start-btn:hover { background: #00b89c; }
</style>