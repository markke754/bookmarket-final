<template>
  <transition name="fade">
    <div v-if="error" class="error-message" :class="{ 'error-message-visible': error }">
      <div class="error-content">
        <i class="el-icon-error"></i>
        <span>{{ error }}</span>
        <button class="close-btn" @click="clearError">×</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const error = computed(() => authStore.error);

function clearError() {
  authStore.error = null;
}
</script>

<style scoped>
.error-message {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #f56c6c;
  color: white;
  padding: 10px 15px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 9999;
  max-width: 350px;
  opacity: 0;
  transform: translateY(-20px);
  transition: opacity 0.3s, transform 0.3s;
}

.error-message-visible {
  opacity: 1;
  transform: translateY(0);
}

.error-content {
  display: flex;
  align-items: center;
}

.error-content i {
  margin-right: 8px;
  font-size: 18px;
}

.close-btn {
  margin-left: 10px;
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0 5px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style> 