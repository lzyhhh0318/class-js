import { createRouter, createWebHistory } from 'vue-router'
// 引入我们的两个页面组件
import Dashboard from '../views/Dashboard.vue'
import LiveRoom from '../views/LiveRoom.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard // 默认打开就是课程主页
    },
    {
      path: '/live',
      name: 'liveroom',
      component: LiveRoom // 跳转后进入直播间
    }
  ]
})

export default router