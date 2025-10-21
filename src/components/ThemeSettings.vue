<template>
  <div class="theme-settings card">
    <h2 class="theme-settings-title">界面风格设置</h2>
    <div class="theme-options">
      <div 
        class="theme-option" 
        :class="{ active: currentTheme === 'light' }"
        @click="setTheme('light')"
      >
        <div class="theme-preview light-preview">
          <div class="preview-navbar"></div>
          <div class="preview-content">
            <div class="preview-card"></div>
            <div class="preview-text"></div>
            <div class="preview-button"></div>
          </div>
        </div>
        <div class="theme-label">
          <el-icon><Sunny /></el-icon>
          <span>白天模式</span>
        </div>
      </div>
      
      <div 
        class="theme-option" 
        :class="{ active: currentTheme === 'dark' }"
        @click="setTheme('dark')"
      >
        <div class="theme-preview dark-preview">
          <div class="preview-navbar"></div>
          <div class="preview-content">
            <div class="preview-card"></div>
            <div class="preview-text"></div>
            <div class="preview-button"></div>
          </div>
        </div>
        <div class="theme-label">
          <el-icon><Moon /></el-icon>
          <span>黑夜模式</span>
        </div>
      </div>
    </div>
    
    <div class="theme-description">
      <p>选择适合您的界面风格，白天模式明亮清爽，黑夜模式护眼舒适。系统将记住您的偏好设置。</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../stores/theme'
import { Sunny, Moon } from '@element-plus/icons-vue'

const themeStore = useThemeStore()
const currentTheme = computed(() => themeStore.theme)

const setTheme = (theme) => {
  themeStore.setTheme(theme)
}
</script>

<style scoped>
.theme-settings {
  background-color: var(--card-bg);
  border-radius: var(--border-radius-medium);
  padding: 24px;
  box-shadow: var(--box-shadow-light);
  transition: background-color var(--transition-normal), box-shadow var(--transition-normal);
}

.theme-settings-title {
  font-size: 20px;
  margin-bottom: 24px;
  color: var(--text-primary);
}

.theme-options {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.theme-option {
  flex: 1;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-medium);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.theme-option.active {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: var(--box-shadow-light);
}

.theme-preview {
  height: 160px;
  padding: 8px;
  transition: background-color var(--transition-normal);
}

.light-preview {
  background-color: #f5f7fa;
}

.dark-preview {
  background-color: #333;
}

.preview-navbar {
  height: 20px;
  margin-bottom: 8px;
  border-radius: 4px;
}

.light-preview .preview-navbar {
  background-color: #fff;
}

.dark-preview .preview-navbar {
  background-color: #252525;
}

.preview-content {
  height: calc(100% - 28px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-card {
  flex: 2;
  border-radius: 4px;
}

.light-preview .preview-card {
  background-color: #fff;
}

.dark-preview .preview-card {
  background-color: #2a2a2a;
}

.preview-text {
  flex: 1;
  width: 80%;
  border-radius: 4px;
}

.light-preview .preview-text {
  background-color: #eaeaea;
}

.dark-preview .preview-text {
  background-color: #3a3a3a;
}

.preview-button {
  width: 40%;
  height: 16px;
  border-radius: 4px;
}

.light-preview .preview-button {
  background-color: #409eff;
}

.dark-preview .preview-button {
  background-color: #4aa3df;
}

.theme-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 0;
  font-weight: 500;
  background-color: var(--card-bg);
  color: var(--text-primary);
}

.theme-label .el-icon {
  font-size: 18px;
}

.theme-description {
  margin-top: 16px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .theme-options {
    flex-direction: column;
  }
  
  .theme-preview {
    height: 120px;
  }
}
</style> 