<script setup>
// 引入主题样式
import './assets/theme.css';
import NavBar from './components/NavBar.vue';
import ErrorMessage from './components/ErrorMessage.vue';
import { useThemeStore } from './stores/theme';
import { useCartStore } from './stores/cart';
import { computed, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

const themeStore = useThemeStore();
const cartStore = useCartStore();
const currentTheme = computed(() => themeStore.theme);

// 设置HTML根元素的data-theme属性
function updateHtmlTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// 监听主题变化，应用全局样式修正
watch(currentTheme, (theme) => {
  updateHtmlTheme(theme);
  if (theme === 'dark') {
    applyDarkModeFixesToAll();
  }
}, { immediate: true });

// 在黑夜模式下修正所有白色背景元素
function applyDarkModeFixesToAll() {
  setTimeout(() => {
    if (themeStore.theme === 'dark') {
      // 查找所有内联样式含有白色背景的元素
      const whiteElements = document.querySelectorAll(
        '[style*="background-color: white"], ' +
        '[style*="background-color: #fff"], ' + 
        '[style*="background-color: rgb(255, 255, 255)"], ' +
        '[style*="background: white"], ' +
        '[style*="background: #fff"], ' +
        '.white, .white-bg, .bg-white'
      );
      
      // 应用暗色主题样式
      whiteElements.forEach(el => {
        el.style.backgroundColor = 'var(--card-bg)';
        el.style.color = 'var(--text-primary)';
        el.style.borderColor = 'var(--border-color)';
      });
      
      // 特殊处理某些容器
      document.querySelectorAll('.el-card, .el-dialog, .el-form, .el-input__wrapper').forEach(el => {
        el.style.backgroundColor = 'var(--card-bg)';
        el.style.color = 'var(--text-primary)';
        el.style.borderColor = 'var(--border-color)';
      });
    }
  }, 200);
}

onMounted(async () => {
  // 初始化主题
  updateHtmlTheme(themeStore.theme);
  
  // 验证购物车中的图书
  const result = await cartStore.validateItems();
  if (result && !result.valid && result.removedCount > 0) {
    ElMessage.warning(`您的购物车中有${result.removedCount}本图书已不存在，已自动从购物车中移除`);
  }
  
  // 每500ms进行一次检查，处理动态加载的元素
  const intervalId = setInterval(applyDarkModeFixesToAll, 500);
  
  // 清理函数
  return () => clearInterval(intervalId);
});
</script>

<template>
  <div class="app-container" :class="currentTheme">
    <NavBar />
    <ErrorMessage />
    <div class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<style>
:root {
  --primary-color: #409eff;
  --primary-hover: #66b1ff;
  --success-color: #67c23a;
  --warning-color: #e6a23c;
  --danger-color: #f56c6c;
  --info-color: #909399;
  --text-primary: #303133;
  --text-regular: #606266;
  --text-secondary: #909399;
  --border-color: #dcdfe6;
  --border-light: #e4e7ed;
  --background-light: #f5f7fa;
  --background-dark: #ebeef5;
  --border-radius-small: 4px;
  --border-radius-medium: 6px;
  --border-radius-large: 8px;
  --transition-normal: 0.3s ease;
  --box-shadow-light: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  --box-shadow-medium: 0 4px 16px 0 rgba(0, 0, 0, 0.15);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-primary);
  background-color: var(--bg-secondary);
  line-height: 1.5;
  transition: color var(--transition-normal), background-color var(--transition-normal);
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: var(--bg-primary);
  transition: background-color var(--transition-normal);
}

.main-content {
  flex: 1;
  padding: 80px 20px 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* 黑夜模式全局覆盖样式 */
.dark .white,
.dark [class*="white-"],
.dark [class*="bg-white"],
.dark [style*="background-color: white"],
.dark [style*="background-color: #fff"],
.dark [style*="background-color: rgb(255, 255, 255)"],
.dark [style*="background: white"],
.dark [style*="background: #fff"] {
  background-color: var(--card-bg) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
}

/* 系统公告和特色功能容器 */
.dark .announcement-card,
.dark .features-card,
.dark .notice-card,
.dark .system-announcement,
.dark .features-section {
  background-color: var(--card-bg) !important;
}

/* 登录和注册页面 */
.dark .login-container,
.dark .login-form,
.dark .register-container,
.dark .register-form,
.dark .role-select {
  background-color: var(--card-bg) !important;
}

/* 支付设置页面 */
.dark .payment-settings-container,
.dark .payment-code-uploader,
.dark .payment-code-preview {
  background-color: var(--card-bg) !important;
}

/* 全局过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .main-content {
    padding: 70px 10px 10px;
  }
}
</style>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
