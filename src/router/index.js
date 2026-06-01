import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue' // 引入登录页
import Dashboard from '../views/Dashboard.vue'
import LiveRoom from '../views/LiveRoom.vue'
import TeacherLive from '../views/TeacherLive.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: Login // 默认打开是登录页
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard // 登录后跳转到课程主页
    },
    {
      path: '/live',
      name: 'liveroom',
      component: LiveRoom 
    },
    {
      path: '/teacher',
      name: 'teacherlive',
      component: TeacherLive 
    }
  ]
})

export default router