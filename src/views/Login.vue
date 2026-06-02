<template>
  <div class="login-page">
    <div class="login-box">
      <h1>🚀 智能软件工程平台</h1>
      <p class="subtitle">请选择您的身份进入系统</p>
      
      <div class="button-group">
        <button class="role-btn teacher" @click="login('teacher')">
          <span class="icon">👨‍🏫</span>
          <span class="text">1 - 我是教师<br><small>(进入负责的课程开启直播)</small></span>
        </button>
        
        <button class="role-btn student" @click="login('student')">
          <span class="icon">🧑‍🎓</span>
          <span class="text">2 - 我是学生<br><small>(进入课程观看直播)</small></span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const login = (role) => {
  // 将用户身份保存到浏览器的本地存储中
  localStorage.setItem('userRole', role)
  sessionStorage.setItem('userRole', role)
  const defaultName = role === 'teacher' ? '教师姓名' : '学生姓名'
  if (!localStorage.getItem('displayName')) {
    localStorage.setItem('displayName', defaultName)
  }
  if (!sessionStorage.getItem('displayName')) {
    sessionStorage.setItem('displayName', defaultName)
  }
  // 跳转到课程主页
  router.push('/dashboard')
}
</script>

<style scoped>
.login-page { height: 100vh; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); font-family: sans-serif; }
.login-box { background: white; padding: 50px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; max-width: 500px; width: 100%; }
h1 { color: #2c3e50; margin-bottom: 10px; }
.subtitle { color: #7f8c8d; margin-bottom: 40px; }
.button-group { display: flex; gap: 20px; justify-content: center; }
.role-btn { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; border: 2px solid transparent; border-radius: 12px; cursor: pointer; transition: all 0.3s ease; background: #f8f9fa; }
.role-btn.teacher { border-color: #ff4757; color: #ff4757; }
.role-btn.teacher:hover { background: #ff4757; color: white; }
.role-btn.student { border-color: #00d1b2; color: #00d1b2; }
.role-btn.student:hover { background: #00d1b2; color: white; }
.icon { font-size: 40px; margin-bottom: 10px; }
.text { font-size: 16px; font-weight: bold; line-height: 1.4; }
.text small { font-size: 12px; font-weight: normal; opacity: 0.8; }
</style>