<template>
  <div class="dashboard-shell">
    <aside class="side-nav">
      <div class="brand">
        <div class="brand-mark">SE大师</div>
        <div class="brand-sub">智能软件工程平台</div>
      </div>
      <nav class="nav-list">
        <button
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ active: activeNav === item.key }"
          @click="setActiveNav(item.key)"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.label }}</span>
        </button>
      </nav>
      <div class="nav-footer">
        <button class="ghost-btn help-btn" @click="showHelp">帮助</button>
        <button class="ghost-btn logout-btn" @click="logout">退出登录</button>
      </div>
    </aside>

    <div class="page-body">
      <div class="welcome-card">
        <div class="avatar-wrap">
          <div class="avatar">
            <span class="avatar-icon">👨‍🏫</span>
          </div>
        </div>
        <div class="welcome-content">
          <h1>欢迎回来，{{ displayName }}。</h1>
          <p>准备好掌握AI驱动的架构技术了吗？</p>
        </div>
        <div class="welcome-tags">
          <span class="tag course-tag">课程信息</span>
          <span class="tag live-tag">直播状态</span>
        </div>
      </div>

      <div class="main-content">
        <div class="content-left">
          <div class="progress-card">
            <div class="card-header">
              <span class="status-badge progress">进行中</span>
              <span class="refresh-btn" @click="refreshCourse">↻</span>
            </div>
            <h3>{{ currentCourse.name }}</h3>
            <p>{{ currentCourse.description }}</p>
            <div class="progress-bar-wrap">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: currentCourse.progress + '%' }"></div>
              </div>
              <span class="progress-text">{{ currentCourse.progress }}% 完成</span>
            </div>
            <button class="resume-btn" @click="resumeCourse">继续学习</button>
          </div>

          <div class="live-card">
            <span class="live-icon">📡</span>
            <div class="live-info">
              <h4>{{ upcomingLive.name }}</h4>
              <p>{{ upcomingLive.teacher }}</p>
            </div>
            <div class="live-time">
              <div class="time-value">{{ upcomingLive.time }}</div>
              <div class="time-label">{{ upcomingLive.status }}</div>
            </div>
          </div>

          <div class="library-section">
            <div class="section-header">
              <h2>我的课程库</h2>
              <button class="view-all-btn">查看全部 →</button>
            </div>
            <div class="library-grid">
              <div class="library-card" v-for="course in courseList" :key="course.id" @click="handleCourseClick(course.id)">
                <div class="library-icon" :style="{ background: course.bgColor }">{{ course.icon }}</div>
                <h4>{{ course.name }}</h4>
                <p>{{ course.desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="content-right">
          <div class="ai-panel">
            <div class="panel-header">
              <div class="ai-icon">🤖</div>
              <span class="panel-title">AI教学助手</span>
              <button class="panel-menu">⋮</button>
            </div>
            <div class="chat-container">
              <div class="chat-message bot">
                <div class="chat-bubble">
                  <p>你好！我注意到你正在学习第4模块。需要帮助理解代理机制吗？</p>
                </div>
              </div>
              <div class="chat-message user">
                <div class="chat-bubble user-bubble">
                  <p>是的，你能解释一下代理中的内存是如何工作的吗？</p>
                </div>
              </div>
            </div>
            <div class="chat-input-wrap">
              <input 
                type="text" 
                class="chat-input" 
                placeholder="输入问题..." 
                v-model="chatInput"
                @keyup.enter="sendMessage"
              />
              <button class="send-btn" @click="sendMessage">→</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userRole = ref(sessionStorage.getItem('userRole') || localStorage.getItem('userRole') || 'student')
const displayName = ref(sessionStorage.getItem('displayName') || localStorage.getItem('displayName') || (userRole.value === 'teacher' ? '教师姓名' : '学生姓名'))
const liveCourseId = ref(localStorage.getItem('liveCourseId') || null)
const activeNav = ref('home')
const chatInput = ref('')

const navItems = ref([
  { key: 'home', label: '主页', icon: '📊' },
  { key: 'curriculum', label: '课程大纲', icon: '📚' },
  { key: 'assignment', label: '作业', icon: '📝' },
  { key: 'ai', label: 'AI助手', icon: '🤖' },
  { key: 'settings', label: '设置', icon: '⚙️' }
])

const RESOURCE_CENTER_URL = 'https://resource.example.com'

onMounted(() => {
  setInterval(() => {
    liveCourseId.value = localStorage.getItem('liveCourseId')
    userRole.value = sessionStorage.getItem('userRole') || localStorage.getItem('userRole') || 'student'
    displayName.value = sessionStorage.getItem('displayName') || localStorage.getItem('displayName') || (userRole.value === 'teacher' ? '教师姓名' : '学生姓名')
  }, 1000)
})

const currentCourse = ref({
  name: '第4模块：LLM集成模式',
  description: '学习如何将大型语言模型无缝集成到现有的微服务架构中。',
  progress: 65
})

const upcomingLive = ref({
  name: '高级提示词工程',
  teacher: '张教授',
  time: '14:00',
  status: '2小时后开始'
})

const courseList = ref([
  { id: 1, name: 'Python AI编程', desc: '基础结构', icon: '<>', bgColor: '#e8eaf6' },
  { id: 2, name: '系统设计', desc: '可扩展的ML管道', icon: '⚙️', bgColor: '#e8f5e9' },
  { id: 3, name: '软件工程基础', desc: '实践与理论', icon: '📦', bgColor: '#fff3e0' },
  { id: 4, name: '数据结构', desc: '算法与实现', icon: '📊', bgColor: '#f3e5f5' }
])

const handleCourseClick = (courseId) => {
  if (userRole.value === 'teacher') {
    router.push({ path: '/teacher', query: { courseId: courseId } })
  } else {
    router.push({ path: '/live', query: { courseId: courseId } })
  }
}

const logout = () => {
  localStorage.removeItem('userRole')
  localStorage.removeItem('displayName')
  sessionStorage.removeItem('userRole')
  sessionStorage.removeItem('displayName')
  router.push('/')
}

const setActiveNav = (key) => {
  activeNav.value = key
}

const resumeCourse = () => {
  if (userRole.value === 'teacher') {
    router.push({ path: '/teacher', query: { courseId: 1 } })
  } else {
    router.push({ path: '/live', query: { courseId: 1 } })
  }
}

const refreshCourse = () => {
  console.log('刷新课程')
}

const showHelp = () => {
  console.log('显示帮助')
}

const sendMessage = () => {
  if (chatInput.value.trim()) {
    console.log('发送消息:', chatInput.value)
    chatInput.value = ''
  }
}
</script>

<style scoped>
.dashboard-shell {
  min-height: 100vh;
  display: flex;
  background: #f8fafc;
  color: #1e293b;
  font-family: "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.side-nav {
  width: 240px;
  background: #f1f5f9;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  border-right: 1px solid #e2e8f0;
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
  color: #3b82f6;
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

.nav-footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.ghost-btn {
  border: none;
  background: transparent;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ghost-btn:hover {
  background: #e2e8f0;
  color: #334155;
}

.logout-btn {
  color: #ef4444;
}

.logout-btn:hover {
  background: #fee2e2;
}

.page-body {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}

.welcome-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}

.avatar-wrap {
  flex-shrink: 0;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  font-size: 28px;
}

.welcome-content h1 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
}

.welcome-content p {
  margin: 0;
  font-size: 14px;
  color: #64748b;
}

.welcome-tags {
  margin-left: auto;
  display: flex;
  gap: 12px;
}

.tag {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.course-tag {
  background: #f1f5f9;
  color: #475569;
}

.live-tag {
  background: #dcfce7;
  color: #166534;
}

.main-content {
  display: flex;
  gap: 24px;
}

.content-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content-right {
  width: 360px;
}

.progress-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status-badge.progress {
  background: #fef3c7;
  color: #b45309;
}

.refresh-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  color: #94a3b8;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background: #f1f5f9;
  color: #64748b;
}

.progress-card h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.progress-card p {
  margin: 0 0 16px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

.progress-bar-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.progress-bar {
  flex: 1;
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
  font-weight: 500;
  color: #3b82f6;
}

.resume-btn {
  border: none;
  background: transparent;
  color: #3b82f6;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 0;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.resume-btn:hover {
  background: #eff6ff;
}

.live-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
}

.live-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #dcfce7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.live-info h4 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.live-info p {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.live-time {
  margin-left: auto;
  text-align: right;
}

.time-value {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.time-label {
  font-size: 11px;
  color: #64748b;
}

.library-section {
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.view-all-btn {
  border: none;
  background: transparent;
  color: #3b82f6;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.view-all-btn:hover {
  text-decoration: underline;
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.library-card {
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;
}

.library-card:hover {
  background: #f1f5f9;
  transform: translateY(-2px);
}

.library-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  font-size: 18px;
}

.library-card h4 {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.library-card p {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
}

.ai-panel {
  background: #ffffff;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.ai-icon {
  font-size: 20px;
}

.panel-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.panel-menu {
  border: none;
  background: transparent;
  font-size: 16px;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.panel-menu:hover {
  background: #f1f5f9;
}

.chat-container {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-message {
  display: flex;
}

.chat-message.bot {
  justify-content: flex-start;
}

.chat-message.user {
  justify-content: flex-end;
}

.chat-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 14px;
  background: #f1f5f9;
}

.chat-bubble.user-bubble {
  background: #3b82f6;
}

.chat-bubble p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.chat-bubble.user-bubble p {
  color: #ffffff;
}

.chat-input-wrap {
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 8px;
}

.chat-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.chat-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.send-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #3b82f6;
  border-radius: 50%;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.send-btn:hover {
  background: #2563eb;
}

@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
  }
  
  .content-right {
    width: 100%;
  }
  
  .ai-panel {
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .dashboard-shell {
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
  
  .nav-footer {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
    flex-direction: row;
    margin-left: auto;
  }
  
  .page-body {
    padding: 16px;
  }
  
  .welcome-card {
    flex-direction: column;
    text-align: center;
  }
  
  .welcome-tags {
    margin-left: 0;
    margin-top: 12px;
  }
  
  .library-grid {
    grid-template-columns: 1fr;
  }
}
</style>