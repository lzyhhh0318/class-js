<template>
  <div class="dashboard-page">
    <header class="top-nav">
      <div class="logo">🚀 智能软件工程平台</div>
      
      <div class="search-bar">
        <input type="text" placeholder="搜索我的课程..." />
        <button>搜索</button>
      </div>

      <div class="user-info">
        <button class="global-ai-btn" @click="openGlobalAI">✨ AI 智能答疑</button>

        <span class="notification">🔔 通知</span>
        <div class="avatar">🧑‍🎓 张同学</div>
      </div>
    </header>

    <main class="main-container">
      <h2>我的课程 (本学期)</h2>
      
      <div class="course-grid">
        <div 
          class="course-card" 
          v-for="course in courseList" 
          :key="course.id"
          @click="goToLive(course.id)"
        >
          <div class="card-cover">
            <span class="status-badge" :class="course.status === '直播中' ? 'live' : ''">
              {{ course.status }}
            </span>
          </div>
          <div class="card-info">
            <h3>{{ course.name }}</h3>
            <p>👨‍🏫 教师: {{ course.teacher }}</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
// 1. 引入 useRouter
import { useRouter } from 'vue-router'

// 2. 初始化路由实例（必须有这一步，否则 router.push 会报错）
const router = useRouter()

// 3. 定义你刚才加的按钮点击事件
const openGlobalAI = () => {
  alert('【基座预留】这里将由 2-3 组接入全局 AI 答疑悬浮窗！')
}

// 4. 定义跳转到直播间的方法
const goToLive = (courseId) => {
  router.push('/live')
}

// 课程数据
const courseList = ref([
  { id: 1, name: '软件工程基础与实践', teacher: '王教授', status: '直播中' },
  { id: 2, name: '计算机网络', teacher: '李老师', status: '未开始' },
  { id: 3, name: '数据结构与算法', teacher: '张老师', status: '回放' },
  { id: 4, name: '人工智能导论', teacher: '赵教授', status: '未开始' }
])
</script>

<style scoped>
.dashboard-page {
  background-color: #f5f7fa; /* 明亮的主页背景，区别于暗色直播间 */
  min-height: 100vh;
  font-family: sans-serif;
  color: #333;
}

.top-nav {
  height: 60px;
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.logo { font-size: 18px; font-weight: bold; color: #2c3e50; }

.search-bar {
  display: flex;
}
.search-bar input {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px 0 0 4px;
  width: 250px;
}
.search-bar button {
  padding: 8px 16px;
  background-color: #00d1b2;
  border: none;
  color: white;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}

.user-info { display: flex; gap: 20px; align-items: center; }

/* 全局 AI 按钮的酷炫样式 */
.global-ai-btn {
  background: linear-gradient(135deg, #6e8efb, #a777e3); /* 紫蓝渐变色 */
  color: white;
  border: none;
  padding: 8px 18px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 4px 10px rgba(167, 119, 227, 0.3);
  transition: all 0.3s ease;
}

.global-ai-btn:hover {
  transform: translateY(-2px); /* 鼠标悬浮时微微上浮 */
  box-shadow: 0 6px 15px rgba(167, 119, 227, 0.5);
}

.main-container {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 25px;
  margin-top: 20px;
}

.course-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.course-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}

.card-cover {
  height: 140px;
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  position: relative;
}

.status-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0,0,0,0.5);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}
.status-badge.live {
  background: #ff4757; /* 直播中显示红色警示 */
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}

.card-info { padding: 15px; }
.card-info h3 { margin: 0 0 10px 0; font-size: 16px; color: #2c3e50; }
.card-info p { margin: 0; font-size: 14px; color: #7f8c8d; }
</style>