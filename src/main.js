import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useThemeStore } from './stores/theme'
import axios from 'axios'
// 引入自定义样式
import './assets/custom-styles.css'

// 添加axios请求/响应拦截器
axios.interceptors.request.use(
  config => {
    console.log(`发送请求: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  response => {
    console.log(`收到响应: ${response.status} ${response.config.url}`);
    return response;
  },
  error => {
    if (error.response) {
      console.error(`响应错误: ${error.response.status}`, error.response.data);
    } else if (error.request) {
      console.error('未收到响应', error.request);
    } else {
      console.error('请求配置错误', error.message);
    }
    return Promise.reject(error);
  }
);

// 创建应用实例
const app = createApp(App)

// 使用插件
app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// 挂载应用前初始化认证状态和主题
const pinia = createPinia()
app.use(pinia)
const authStore = useAuthStore(pinia)
const themeStore = useThemeStore(pinia)

// 初始化主题
themeStore.initTheme()

// 设置axios默认头部
authStore.autoLogin()

// 挂载应用
app.mount('#app')
