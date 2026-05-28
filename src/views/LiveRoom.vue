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
          <h1>▶️ 视频直播流播放器 (2-1组开发区)</h1>
          <p>在这里对接流媒体协议，展示老师上课画面</p>
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
        <div class="tab-header">
          <button :class="['tab-btn', currentTab === 'ai' ? 'active' : '']" @click="currentTab = 'ai'">🤖 AI答疑</button>
          <button :class="['tab-btn', currentTab === 'files' ? 'active' : '']" @click="currentTab = 'files'">📁 课件资料</button>
          <button :class="['tab-btn', currentTab === 'board' ? 'active' : '']" @click="currentTab = 'board'">💬 留言板</button>
        </div>

        <div class="tab-body">
          <div v-if="currentTab === 'ai'" class="slot-container group-2-3">
            <h3>🤖 AI 智能答疑助手</h3>
            <p>【接口预留】2-3组的同学：请将你们的 ChatGPT 对话窗口写在这里。</p>
            <div class="mock-chat-box">
              <div class="mock-bubble ai">同学你好，我是基于课程PPT的答疑助手。</div>
            </div>
          </div>
          <div v-if="currentTab === 'files'" class="slot-container group-2-2">
            <h3>📁 课程资料与大纲</h3>
            <p>【接口预留】2-2组同学的课件资料区。</p>
          </div>
          <div v-if="currentTab === 'board'" class="slot-container group-2-4">
            <h3>💬 课程留言板</h3>
            <p>【接口预留】2-4组同学的留言板区。</p>
          </div>
        </div>
      </aside>

    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentTab = ref('ai')

// 返回主页的方法
const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
/* 这里完全保留你之前的样式代码 */
.app-wrapper { height: 100vh; display: flex; flex-direction: column; font-family: sans-serif; background-color: #1e1e1e; color: #fff; overflow: hidden; }
.navbar { height: 60px; background-color: #2d2d2d; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; border-bottom: 1px solid #444; }
.logo { display: flex; align-items: center; gap: 10px; }
.back-btn { background: #444; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
.back-btn:hover { background: #666; }
.nav-right { display: flex; gap: 15px; align-items: center; }
.main-content { flex: 1; display: flex; padding: 20px; gap: 20px; height: calc(100vh - 60px); }
.video-stage { flex: 7; display: flex; flex-direction: column; position: relative; background-color: #000; border-radius: 8px; overflow: hidden; border: 2px dashed #666; }
.video-player-placeholder { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #888; }
.danmaku-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 70%; pointer-events: none; }
.danmaku-item { font-size: 20px; font-weight: bold; color: #00ffcc; text-shadow: 1px 1px 2px #000; }
.video-controls { height: 60px; background-color: #222; display: flex; padding: 10px; gap: 10px; }
.interaction-sidebar { flex: 3; display: flex; flex-direction: column; background-color: #2d2d2d; border-radius: 8px; border: 1px solid #444; }
.tab-header { display: flex; border-bottom: 1px solid #444; }
.tab-btn { flex: 1; padding: 15px 0; background: none; border: none; color: #aaa; cursor: pointer; font-size: 16px; }
.tab-btn.active { color: #fff; border-bottom: 3px solid #00ffcc; font-weight: bold; }
.tab-body { flex: 1; padding: 20px; overflow-y: auto; }
.slot-container { height: 100%; border: 2px dashed; border-radius: 8px; padding: 15px; background-color: rgba(255, 255, 255, 0.05); }
.group-2-3 { border-color: #ff9900; }
.group-2-2 { border-color: #3399ff; }
.group-2-4 { border-color: #cc33ff; }
.mock-btn { padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; }
.mock-btn.primary { background-color: #00ffcc; color: #000; font-weight: bold;}
.mock-input { flex: 1; padding: 10px; border-radius: 4px; border: 1px solid #555; background-color: #111; color: #fff; }
.mock-chat-box { margin-top: 20px; }
.mock-bubble { background: #444; padding: 10px; border-radius: 8px; width: fit-content;}
</style>