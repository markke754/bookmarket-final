import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // 主题模式：'light' 或 'dark'
  const theme = ref(localStorage.getItem('theme') || 'light')
  
  // 监听主题变化并保存到本地存储
  watch(theme, (newTheme) => {
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  })
  
  // 切换主题
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    forceRefreshTheme(theme.value)
  }
  
  // 设置特定主题
  function setTheme(newTheme) {
    if (newTheme === 'light' || newTheme === 'dark') {
      theme.value = newTheme
      forceRefreshTheme(newTheme)
    }
  }
  
  // 应用主题到DOM
  function applyTheme(currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme)
    
    // 设置body和html的类名以方便CSS选择器匹配
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }
  }
  
  // 强制刷新主题样式
  function forceRefreshTheme(currentTheme) {
    // 立即应用主题
    applyTheme(currentTheme)
    
    // 更新首页背景图
    setTimeout(() => {
      const heroElement = document.querySelector("#app > div > div.main-content > div > div.hero-section > div.hero-image > div");
      if (heroElement) {
        heroElement.style.backgroundImage = currentTheme === 'dark' 
          ? 'url("/src/assets/黑夜.png")' 
          : 'url("/src/assets/白天.jpg")';
      }
    }, 100);
    
    if (currentTheme === 'dark') {
      // 使用setTimeout以确保DOM已更新
      setTimeout(() => {
        // 查找所有具有白色背景的元素
        const whiteSelectors = [
          '[style*="background-color: white"]',
          '[style*="background-color: #fff"]', 
          '[style*="background-color: rgb(255, 255, 255)"]',
          '[style*="background: white"]',
          '[style*="background: #fff"]',
          '.white', 
          '.white-bg', 
          '.bg-white',
          '.el-card', 
          '.payment-code-uploader',
          '.payment-code-section',
          '.system-announcement',
          '.features-section',
          '.login-box',
          '.register-box',
          '.role-select',
          '.white-card',
          '.white-box'
        ].join(', ');
        
        // 应用暗色样式
        document.querySelectorAll(whiteSelectors).forEach(el => {
          el.style.setProperty('background-color', 'var(--card-bg)', 'important');
          el.style.setProperty('color', 'var(--text-primary)', 'important');
          el.style.setProperty('border-color', 'var(--border-color)', 'important');
        });
      }, 50);
    }
  }
  
  // 初始化主题
  function initTheme() {
    // 如果有保存的主题，使用保存的主题
    // 否则尝试使用系统偏好
    if (!localStorage.getItem('theme')) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'light'
    }
    
    applyTheme(theme.value)
    forceRefreshTheme(theme.value) // 确保初始化时应用强制刷新
  }

  return {
    theme,
    toggleTheme,
    setTheme,
    initTheme,
    forceRefreshTheme
  }
})