<template>
  <div class="dashboard-page">
    <header class="top-nav">
      <div class="logo">🚀 智能软件工程平台</div>
      <div class="user-info">
        <button class="global-ai-btn">✨ AI 智能答疑</button>
        <div class="avatar" v-if="userRole === 'teacher'">👨‍🏫 教师端</div>
        <div class="avatar" v-else>🧑‍🎓 学生端</div>
        <button class="logout-btn" @click="logout">退出登录</button>
      </div>
    </header>

    <main class="main-container">
      <h2>{{ userRole === 'teacher' ? '我负责的课程' : '我的课程 (本学期)' }}</h2>
      
      <div class="course-grid">
        <div 
          class="course-card" 
          v-for="course in courseList" 
          :key="course.id"
          @click="handleCourseClick(course.id)"
        >
          <div class="card-cover">
            <span class="status-badge" :class="userRole === 'teacher' ? '' : (course.status === '直播中' ? 'live' : '')">
              {{ userRole === 'teacher' ? '点击开播 🎥' : course.status }}
            </span>
          </div>
          <div class="card-info">
            <h3>{{ course.name }}</h3>
            <p v-if="userRole === 'student'">👨‍🏫 教师: {{ course.teacher }}</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userRole = ref('student')

// 页面加载时，获取当前用户的身份
onMounted(() => {
  userRole.value = localStorage.getItem('userRole') || 'student'
})

// 核心逻辑：点击课程后的分发
const handleCourseClick = (courseId) => {
  if (userRole.value === 'teacher') {
    router.push('/teacher') // 教师去推流页
  } else {
    router.push('/live')    // 学生去观看页
  }
}

// 退出登录，清空身份并回到登录页
const logout = () => {
  localStorage.removeItem('userRole')
  router.push('/')
}

const courseList = ref([
  { id: 1, name: '软件工程基础与实践', teacher: '王教授', status: '直播中' },
  { id: 2, name: '计算机网络', teacher: '李老师', status: '未开始' },
  { id: 3, name: '数据结构与算法', teacher: '张老师', status: '回放' },
])
</script>

<style scoped>
/* 保持你原有的样式，仅新增退出按钮样式 */
.dashboard-page { background-color: #f5f7fa; min-height: 100vh; font-family: sans-serif; color: #333; }
.top-nav { height: 60px; background-color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 0 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.logo { font-size: 18px; font-weight: bold; color: #2c3e50; }
.user-info { display: flex; gap: 20px; align-items: center; }
.global-ai-btn { background: linear-gradient(135deg, #6e8efb, #a777e3); color: white; border: none; padding: 8px 18px; border-radius: 20px; cursor: pointer; font-weight: bold; font-size: 14px;}
.logout-btn { background: #ff4757; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;}
.logout-btn:hover { background: #ff6b81; }
.main-container { padding: 40px; max-width: 1200px; margin: 0 auto; }
.course-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; margin-top: 20px; }
.course-card { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s; }
.course-card:hover { transform: translateY(-5px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
.card-cover { height: 140px; background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); position: relative; }
.status-badge { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
.status-badge.live { background: #ff4757; animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
.card-info { padding: 15px; }
.card-info h3 { margin: 0 0 10px 0; font-size: 16px; }
.card-info p { margin: 0; font-size: 14px; color: #7f8c8d; }
</style>