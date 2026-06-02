<template>
  <div class="dashboard-shell">
    <aside class="side-nav">
      <div class="brand">
        <div class="brand-mark">SE Mastery</div>
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
        <button class="ghost-btn" @click="openResourceCenter">资料下载</button>
      </div>
    </aside>

    <div class="page-body">
      <header class="top-bar">
        <div class="page-title">我的课程</div>
        <div class="top-actions">
          <button class="ghost-btn" @click="openResourceCenter">资料下载</button>
          <div class="notify-wrap">
            <button class="notify-btn" @click="toggleNotifications">通知</button>
            <div class="notify-dropdown" v-if="notificationsOpen">
              <div class="notify-title">通知</div>
              <div class="notify-item" v-for="(item, index) in notifications" :key="index">
                <div class="notify-text">{{ item.text }}</div>
                <div class="notify-time">{{ item.time }}</div>
              </div>
              <div class="notify-empty" v-if="notifications.length === 0">暂无通知</div>
            </div>
          </div>
          <div class="user-chip">
            <span class="user-name">{{ displayName }}</span>
            <span class="user-role">{{ userRole === 'teacher' ? '教师' : '学生' }}</span>
          </div>
          <button class="logout-btn" @click="logout">退出登录</button>
        </div>
      </header>

      <section class="cards-grid">
        <article class="course-card" v-for="course in courseList" :key="course.id" @click="handleCourseClick(course.id)">
          <div class="card-cover">
            <span class="status-badge" :class="getCourseStatus(course.id) === '直播中' ? 'live' : ''">
              {{ getCourseStatus(course.id) }}
            </span>
            <div class="cover-glow"></div>
          </div>
          <div class="card-info">
            <h3>{{ course.name }}</h3>
            <p class="card-sub">授课教师：{{ course.teacher }}</p>
          </div>
        </article>
      </section>
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
const notificationsOpen = ref(false)

const navItems = ref([
  { key: 'home', label: '主页', icon: '🏠' },
  { key: 'assignment', label: '作业', icon: '📝' },
  { key: 'resource', label: '资料', icon: '📚' },
  { key: 'ai', label: 'AI助手', icon: '🤖' }
])

const notifications = ref([
  { text: '课程直播开始提醒：软件工程基础与实践', time: '10:30' },
  { text: '课件更新提醒：第3讲 架构设计', time: '09:20' }
])

const RESOURCE_CENTER_URL = 'https://resource.example.com'

// 实时轮询检测直播状态
onMounted(() => {
  setInterval(() => {
    liveCourseId.value = localStorage.getItem('liveCourseId')
    userRole.value = sessionStorage.getItem('userRole') || localStorage.getItem('userRole') || 'student'
    displayName.value = sessionStorage.getItem('displayName') || localStorage.getItem('displayName') || (userRole.value === 'teacher' ? '教师姓名' : '学生姓名')
  }, 1000)
})

const getCourseStatus = (id) => {
  return liveCourseId.value == id ? '直播中' : '未开始'
}

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

const openResourceCenter = () => {
  window.open(RESOURCE_CENTER_URL, '_blank')
}

const toggleNotifications = () => {
  notificationsOpen.value = !notificationsOpen.value
}

const courseList = ref([
  { id: 1, name: '软件工程基础与实践', teacher: '王教授' },
  { id: 2, name: '计算机网络', teacher: '李老师' },
  { id: 3, name: '数据结构与算法', teacher: '张老师' }
])
</script>

<style scoped>
.dashboard-shell {
  min-height: 100vh;
  display: flex;
  background: radial-gradient(circle at top left, #f6f8ff 0%, #f4f6f9 40%, #eef1f6 100%);
  color: #111827;
  font-family: "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.side-nav {
  width: 240px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 8px 0 30px rgba(15, 23, 42, 0.04);
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.brand-mark {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.6px;
}

.brand-sub {
  font-size: 12px;
  color: #6b7280;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: #f3f4f6;
}

.nav-item.active {
  background: #111827;
  color: #ffffff;
  box-shadow: 0 12px 22px rgba(17, 24, 39, 0.18);
}

.nav-icon {
  font-size: 18px;
}

.nav-footer {
  margin-top: auto;
}

.page-body {
  flex: 1;
  padding: 28px 36px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ghost-btn {
  border: 1px solid #d1d5db;
  background: #ffffff;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  color: #111827;
}

.notify-btn {
  border: none;
  background: #111827;
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
}

.notify-wrap {
  position: relative;
}

.notify-dropdown {
  position: absolute;
  right: 0;
  top: 44px;
  width: 260px;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 20;
}

.notify-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.notify-item {
  padding: 8px 10px;
  border-radius: 10px;
  background: #f3f4f6;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notify-text {
  font-size: 12px;
  color: #111827;
}

.notify-time {
  font-size: 11px;
  color: #6b7280;
}

.notify-empty {
  font-size: 12px;
  color: #6b7280;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  font-size: 13px;
}

.user-role {
  color: #6b7280;
}

.logout-btn {
  border: none;
  background: #ef4444;
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 22px;
}

.course-card {
  background: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.course-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 26px 50px rgba(15, 23, 42, 0.12);
}

.card-cover {
  position: relative;
  height: 150px;
  background: linear-gradient(120deg, #dfe7f6 0%, #f5f0ff 45%, #f4f7fb 100%);
}

.cover-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 20%, rgba(17, 24, 39, 0.08) 0%, transparent 60%);
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(17, 24, 39, 0.6);
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  z-index: 1;
}

.status-badge.live {
  background: #ef4444;
}

.card-info {
  padding: 16px 18px 20px;
}

.card-info h3 {
  margin: 0 0 8px;
  font-size: 16px;
}

.card-sub {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

@media (max-width: 980px) {
  .dashboard-shell {
    flex-direction: column;
  }

  .side-nav {
    width: 100%;
    flex-direction: row;
    align-items: center;
    gap: 16px;
  }

  .nav-list {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .nav-footer {
    margin-top: 0;
  }
}
</style>