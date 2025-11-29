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
          />
        </el-form-item>
        
        <el-form-item>
          <el-input 
            v-model="password" 
            type="password" 
            placeholder="请输入密码" 
            prefix-icon="el-icon-lock" 
            show-password 
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
        <div v-if="role === 'admin' && showUsbKeyAuth" class="admin-usb-key-section">
          <el-divider>USB Key认证（管理员专用）</el-divider>
          <UsbKeyAuth 
            @auth-success="handleAuthSuccess"
            @auth-failure="handleAuthFailure"
            @status-change="handleStatusChange"
            :username="username"
            :temp-token="tempToken"
            :server-pub-key-x="serverPubKeyX"
            :server-pub-key-y="serverPubKeyY"
            :has-key-info="hasKeyInfo"
          />
        </div>

        <el-form-item class="login-actions">
          <el-button 
            type="primary" 
            native-type="submit" 
            :loading="loading" 
            class="login-button"
          >
            {{ loginButtonText }}
          </el-button>
          <div class="register-link">
            <span>还没有账号？</span>
            <el-button type="text" @click="$router.push('/register')">立即注册</el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 管理员锁定提示遮罩 - 修改为只有在用户尝试登录后才显示 -->
    <div v-if="role === 'admin' && !usbKeyVerified && !isConnected && showUsbKeyAuth" class="lock-overlay">
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
const showUsbKeyAuth = ref(false);
const tempToken = ref('');
const currentAdminId = ref(null);
// 使用本地loading状态而非store中的状态
const loading = ref(false);
// 添加authStatus变量定义
const authStatus = ref('未连接');
// 添加服务器返回的公钥信息
const serverPubKeyX = ref('');
const serverPubKeyY = ref('');
const hasKeyInfo = ref(false);

// 计算登录按钮文本
const loginButtonText = computed(() => {
  if (loading.value) return '登录中...';
  if (role.value === 'admin' && showUsbKeyAuth.value && !usbKeyVerified.value) return '请完成USB Key验证';
  return '登录';
});

// 处理登录 - 函数定义已移至文件底部

// 处理USB Key认证成功
async function handleAuthSuccess(data) {
  console.log('USB Key认证成功:', data);
  
  try {
    // 调用store的verifyUsbKey方法完成第二阶段认证
    const result = await authStore.verifyUsbKey(data);
    console.log('verifyUsbKey 返回结果:', result);
    
    if (result && result.success) {
      usbKeyVerified.value = true;
      ElMessage.success('USB Key验证成功，正在跳转...');
      showUsbKeyAuth.value = false; // 隐藏USB Key认证区域
      // 手动重置表单字段，而不是调用不存在的resetForm函数
      username.value = '';
      password.value = '';
      
      console.log('准备跳转到管理员页面...');
      console.log('当前用户:', authStore.user);
      console.log('当前token:', authStore.token);
      
      // 使用setTimeout确保状态已更新
      setTimeout(() => {
        router.push('/admin');
      }, 100);
    } else {
      ElMessage.error(result?.error || 'USB Key验证失败');
      authStatus.value = '验证失败';
      usbKeyVerified.value = false;
    }
  } catch (error) {
    console.error('USB Key验证失败:', error);
    ElMessage.error('USB Key验证过程中发生错误');
  }
}

// 完成管理员登录
async function completeAdminLogin(authData) {
  try {
    // 这里authData应该已经包含了所有需要的信息
    // 如果需要，我们可以在这里做额外的处理
    
    // 保存认证信息到store
    authStore.token = authData.token;
    authStore.user = authData.user;
    
    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(authData.user));
    
    // 配置全局axios默认头部
    axios.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;
    
    // 跳转到管理员页面
    router.push('/admin');
  } catch (error) {
    console.error('完成管理员登录失败:', error);
    ElMessage.error('登录失败，请重试');
  }
}

// 处理USB Key认证失败
function handleAuthFailure(error) {
  usbKeyVerified.value = false;
  console.error('USB Key验证失败:', error);
  ElMessage.error('USB Key验证失败: ' + (error.message || '未知错误'));
  authStatus.value = '验证失败';
  // 重置认证状态，让用户可以重新尝试
  authStore.resetAuthState();
  showUsbKeyAuth.value = false;
}

// 处理USB Key状态变化
function handleStatusChange(status) {
  isConnected.value = status.isConnected;
  if (status.isVerified !== undefined) {
    usbKeyVerified.value = status.isVerified;
    authStatus.value = status.isVerified ? '已验证' : '已连接';
  } else if (status.isConnected) {
    authStatus.value = '已连接';
  } else {
    authStatus.value = '未连接';
  }
  console.log('USB Key状态变化:', status);
}
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

// 额外的函数定义 - 保持一个版本的函数定义

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
  
  // 设置本地loading状态
  loading.value = true;
  
  try {
    // 对于管理员，需要先进行第一阶段登录（验证用户名密码）
    if (role.value === 'admin') {
      const result = await authStore.firstStageLogin(username.value, password.value, role.value);
      
      if (result && result.requiresUsbKey) {
        // 需要USB Key验证，保存临时token和公钥信息
        tempToken.value = result.tempToken;
        hasKeyInfo.value = result.hasKeyInfo || false;
        
        // 如果后端返回了公钥，使用后端的公钥
        if (result.pubKeyX && result.pubKeyY) {
          serverPubKeyX.value = result.pubKeyX;
          serverPubKeyY.value = result.pubKeyY;
        }
        
        // 显示USB Key认证区域
        showUsbKeyAuth.value = true;
        ElMessage.info('请插入USB Key并完成验证以继续管理员登录');
      } else if (result && result.success === false) {
        ElMessage.error(result.error || '登录失败');
      }
    } else {
      // 非管理员直接登录
      const result = await authStore.firstStageLogin(username.value, password.value, role.value);
      
      if (result && result.success !== false) {
        ElMessage.success('登录成功');
        router.push(`/${role.value}`);
      } else {
        ElMessage.error(result?.error || '登录失败');
      }
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