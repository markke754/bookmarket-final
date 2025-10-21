<template>
  <div class="theme-toggle">
    <el-tooltip
      :content="toggleTooltip"
      placement="bottom"
      effect="light"
    >
      <div class="theme-switch" @click="toggleTheme">
        <el-icon v-if="currentTheme === 'light'"><Sunny /></el-icon>
        <el-icon v-else><Moon /></el-icon>
      </div>
    </el-tooltip>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../stores/theme'
import { Sunny, Moon } from '@element-plus/icons-vue'

const themeStore = useThemeStore()

const currentTheme = computed(() => themeStore.theme)

const toggleTooltip = computed(() => {
  return currentTheme.value === 'light' 
    ? '切换到夜间模式' 
    : '切换到白天模式'
})

const toggleTheme = () => {
  themeStore.toggleTheme()
  
  setTimeout(() => {
    if (currentTheme.value === 'dark') {
      const whiteElements = document.querySelectorAll(
        '[style*="background-color: white"], ' +
        '[style*="background-color: #fff"], ' + 
        '[style*="background-color: rgb(255, 255, 255)"], ' +
        '[style*="background: white"], ' +
        '[style*="background: #fff"], ' +
        '.white, .white-bg, .bg-white, .el-card, .el-dialog, .payment-code-uploader, ' +
        '.payment-settings-card, .payment-card, .system-announcement, .features-section'
      );
      
      whiteElements.forEach(el => {
        el.style.backgroundColor = 'var(--card-bg)';
        el.style.color = 'var(--text-primary)';
        el.style.borderColor = 'var(--border-color)';
      });
    }
    
    const heroElement = document.querySelector("#app > div > div.main-content > div > div.hero-section > div.hero-image > div");
    if (heroElement) {
      heroElement.style.backgroundImage = currentTheme.value === 'dark' 
        ? 'url("/src/assets/黑夜.png")' 
        : 'url("/src/assets/白天.jpg")';
    }
  }, 100);
}
</script>

<style scoped>
.theme-toggle {
  margin-left: 16px;
  display: flex;
  align-items: center;
}

.theme-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  color: var(--navbar-text);
}

.theme-switch:hover {
  background-color: rgba(125, 125, 125, 0.1);
}

.el-icon {
  font-size: 20px;
}

/* 动画效果 */
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.theme-switch:active .el-icon {
  animation: rotate 0.5s ease-in-out;
}
</style> 