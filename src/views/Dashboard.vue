<template>
  <div class="dashboard-page">
    <header class="top-nav">
      <div class="logo">🚀 智能软件工程平台</div>
      <div class="user-info">
        <div class="role-badge" :class="userRole">身份: {{ userRole === 'teacher' ? '👨‍🏫 教师' : '🧑‍🎓 学生' }}</div>
        <button class="logout-btn" @click="logout">退出登录</button>
      </div>
    </header>

    <main class="main-container">
      <h2>我的课程</h2>
      <div class="course-grid">
        <div class="course-card" v-for="course in courseList" :key="course.id" @click="handleCourseClick(course.id)">
          <div class="card-cover">
            <span class="status-badge" :class="getCourseStatus(course.id) === '直播中' ? 'live' : ''">
              {{ getCourseStatus(course.id) }}
            </span>
          </div>
          <div class="card-info">
            <h3>{{ course.name }}</h3>
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
const userRole = ref(localStorage.getItem('userRole') || 'student')
const liveCourseId = ref(localStorage.getItem('liveCourseId') || null)

// 实时轮询检测直播状态
onMounted(() => {
  setInterval(() => {
    liveCourseId.value = localStorage.getItem('liveCourseId')
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
  router.push('/')
}

const courseList = ref([
  { id: 1, name: '软件工程基础与实践', teacher: '王教授' },
  { id: 2, name: '计算机网络', teacher: '李老师' },
  { id: 3, name: '数据结构与算法', teacher: '张老师' }
])
</script>

<style scoped>
.dashboard-page { background-color: #f5f7fa; min-height: 100vh; font-family: sans-serif; }
.top-nav { height: 60px; background-color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 0 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.role-badge { padding: 6px 12px; border-radius: 20px; font-weight: bold; background: #eee; }
.role-badge.teacher { background: #ffeaa7; color: #d63031; }
.course-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; margin-top: 20px; padding: 40px; }
.course-card { background: #fff; border-radius: 8px; overflow: hidden; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.card-cover { height: 140px; background: #ddd; position: relative; }
.status-badge { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
.status-badge.live { background: #ff4757; }
</style>