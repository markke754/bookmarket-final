<template>
  <div class="login-container">
    <LoadingIndicator :loading="loading" text="登录中..." />
    <el-card class="login-card" :class="{ 'locked': role === 'admin' && !usbKeyVerified }">
      <div class="login-header">
        <el-button type="text" @click="$router.push('/')" class="back-home-button">
          <el-icon><ArrowLeft /></el-icon> 返回主页
        </el-button>
        <h2>登录</h2>
        <p class="login-subtitle">欢迎回到图书商城系统</p>
      </div>
      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input 
            v-model="username" 
            placeholder="请输入用户名" 
            prefix-icon="el-icon-user" 
            :disabled="role === 'admin' && !usbKeyVerified"
          />
        </el-form-item>
        
        <el-form-item>
          <el-input 
            v-model="password" 
            type="password" 
            placeholder="请输入密码" 
            prefix-icon="el-icon-lock" 
            show-password 
            :disabled="role === 'admin' && !usbKeyVerified"
          />
        </el-form-item>
        
        <el-form-item>
          <el-select v-model="role" placeholder="请选择角色" class="role-select">
            <el-option label="买家" value="buyer" />
            <el-option label="卖家" value="seller" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>

        <!-- 管理员专用USB Key认证区域 -->
        <div v-if="role === 'admin'" class="admin-usb-key-section">
          <el-divider>USB Key认证（管理员专用）</el-divider>
          <UsbKeyAuth 
            @auth-success="handleAuthSuccess"
            @auth-failure="handleAuthFailure"
            @status-change="handleStatusChange"
          />
        </div>

        <el-form-item class="login-actions">
          <el-button 
            type="primary" 
            native-type="submit" 
            :loading="loading" 
            :disabled="role === 'admin' && !usbKeyVerified" 
            class="login-button"
          >
            {{ role === 'admin' && !usbKeyVerified ? '请先验证USB Key' : '登录' }}
          </el-button>
          <div class="register-link">
            <span>还没有账号？</span>
            <el-button type="text" @click="$router.push('/register')">立即注册</el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 管理员锁定提示遮罩 -->
    <div v-if="role === 'admin' && !usbKeyVerified && !isConnected" class="lock-overlay">
      <div class="lock-message">
        <el-icon class="lock-icon-large"><Lock /></el-icon>
        <h3>管理员登录需要USB Key</h3>
        <p>请插入管理员USB Key以解锁登录界面</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Lock } from '@element-plus/icons-vue';
import LoadingIndicator from '../components/LoadingIndicator.vue';
import UsbKeyAuth from '../components/auth/UsbKeyAuth.vue';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const role = ref('');
const usbKeyVerified = ref(false);
const isConnected = ref(false);
// 使用本地loading状态而非store中的状态
const loading = ref(false);

// 添加生命周期钩子，在组件挂载时输出日志，便于调试
onMounted(() => {
  console.log('登录页面已加载');
  console.log('当前认证状态:', authStore.isAuthenticated);
  console.log('当前用户角色:', authStore.userRole);
  
  // 强制刷新Pinia状态，确保与localStorage同步
  if (localStorage.getItem('token') === null && authStore.token !== null) {
    console.log('检测到状态不一致，正在重置Pinia状态');
    authStore.logout();
  }
});

// 处理USB Key认证成功
function handleAuthSuccess() {
  ElMessage.success('USB Key认证成功');
  usbKeyVerified.value = true;
  isConnected.value = true;
}

// 处理USB Key认证失败
function handleAuthFailure(error) {
  console.error('USB Key认证失败:', error);
  // 不显示错误提示，避免频繁弹窗
  // ElMessage.error('USB Key认证失败，请检查设备连接');
  usbKeyVerified.value = false;
}

// 处理USB Key状态变化
function handleStatusChange(status) {
  isConnected.value = status.isConnected;
  if (status.isVerified) {
    usbKeyVerified.value = true;
  }
  console.log('USB Key状态变化:', status);
}

// 监听角色变化，重置认证状态
watch(() => role.value, (newRole, oldRole) => {
  if (newRole === 'admin') {
    // 当切换到管理员角色时，重置认证状态
    usbKeyVerified.value = false;
    isConnected.value = false;
  }
});

async function handleLogin() {
  if (!username.value || !password.value || !role.value) {
    ElMessage.warning('请输入用户名、密码和选择角色');
    return;
  }
  
  // 管理员必须通过USB Key认证
  if (role.value === 'admin' && !usbKeyVerified.value) {
    ElMessage.warning('管理员登录必须先通过USB Key认证');
    return;
  }
  
  // 设置本地loading状态
  loading.value = true;
  
  try {
    // 为管理员登录添加usbKeyVerified标志
    const success = await authStore.login(username.value, password.value, role.value, role.value === 'admin' ? { usbKeyVerified: true } : {});
    if (success) {
      ElMessage.success('登录成功');
      router.push(`/${role.value}`);
    }
  } catch (error) {
    console.error('登录处理错误:', error);
    ElMessage.error('登录失败，请稍后重试');
  } finally {
    // 确保loading状态被重置
    loading.value = false;
    // 同时确保store中的loading状态也被重置
    if (authStore.loading) {
      authStore.$patch({ loading: false });
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: var(--bg-secondary);
  background-image: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  transition: background-color var(--transition-normal), background-image var(--transition-normal);
  position: relative;
}

.login-card {
  width: 400px;
  border-radius: var(--border-radius-medium);
  box-shadow: var(--box-shadow);
  padding: 10px 20px;
  background-color: var(--card-bg);
  color: var(--text-primary);
  transition: background-color var(--transition-normal), color var(--transition-normal), box-shadow 0.3s ease;
  position: relative;
  z-index: 10;
}

.login-card.locked {
  box-shadow: 0 0 30px rgba(245, 34, 45, 0.2);
  background-color: rgba(var(--card-bg), 0.8);
}

.lock-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.lock-message {
  text-align: center;
  color: white;
  background-color: rgba(0, 0, 0, 0.9);
  padding: 30px;
  border-radius: 12px;
  border: 2px solid #f5222d;
  box-shadow: 0 0 40px rgba(245, 34, 45, 0.3);
}

.lock-icon-large {
  font-size: 48px;
  margin-bottom: 20px;
  color: #f5222d;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.lock-message h3 {
  font-size: 20px;
  margin-bottom: 10px;
  color: #fff;
}

.lock-message p {
  font-size: 16px;
  color: #ccc;
  margin: 0;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;

}

.login-header h2 {
  font-size: 28px;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.login-subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

.login-button {
  width: 100%;
  padding: 12px 0;
  font-size: 16px;
  margin-top: 10px;
}

.login-actions {
  margin-top: 20px;
}

.register-link {
  text-align: center;
  margin-top: 15px;
  color: var(--text-secondary);
  font-size: 14px;
}

.el-input {
  margin-bottom: 15px;
}

.el-input__inner {
  padding: 12px 15px;
}

.back-home-button {
  position: absolute;
  left: 20px;
  top: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 14px;
}

.back-home-button:hover {
  color: var(--text-primary);
}

.role-select {
    width: 100%;
  }
  
  .admin-usb-key-section {
    margin-top: 20px;
    padding: 15px;
    background-color: rgba(64, 158, 255, 0.05);
    border-radius: 8px;
  }
</style>