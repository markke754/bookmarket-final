<template>
  <div class="navbar">
    <div class="navbar-container">
      <div class="navbar-logo">
        <router-link to="/">
          <h1>图书商城</h1>
        </router-link>
      </div>
      
      <div class="navbar-menu">
        <template v-if="isLoggedIn">
          <!-- 买家导航 -->
          <template v-if="userRole === 'buyer'">
            <router-link to="/buyer" class="nav-item">
              <el-icon><ShoppingBag /></el-icon>
              <span>买家中心</span>
            </router-link>
            <router-link to="/buyer/orders" class="nav-item">
              <el-icon><List /></el-icon>
              <span>我的订单</span>
            </router-link>
          </template>
          
          <!-- 卖家导航 -->
          <template v-else-if="userRole === 'seller'">
            <router-link to="/seller" class="nav-item">
              <el-icon><Goods /></el-icon>
              <span>卖家中心</span>
            </router-link>
            <router-link to="/seller/orders" class="nav-item">
              <el-icon><List /></el-icon>
              <span>订单管理</span>
            </router-link>
            <router-link to="/seller/payment" class="nav-item">
              <el-icon><Money /></el-icon>
              <span>支付设置</span>
            </router-link>
          </template>
          
          <!-- 管理员导航 -->
          <template v-else-if="userRole === 'admin'">
            <router-link to="/admin/users" class="nav-item">
              <el-icon><User /></el-icon>
              <span>用户管理</span>
            </router-link>
            <router-link to="/admin/books" class="nav-item">
              <el-icon><Reading /></el-icon>
              <span>图书管理</span>
            </router-link>
            <router-link to="/admin/orders" class="nav-item">
              <el-icon><List /></el-icon>
              <span>订单管理</span>
            </router-link>
          </template>
        </template>
        
        <!-- 公共导航，每个人都能看到 -->
        <router-link to="/help" class="nav-item">
          <el-icon><QuestionFilled /></el-icon>
          <span>帮助中心</span>
        </router-link>
        <router-link to="/about" class="nav-item">
          <el-icon><InfoFilled /></el-icon>
          <span>关于我们</span>
        </router-link>
      </div>
      
      <div class="navbar-user">
        <!-- 主题切换按钮 -->
        <ThemeToggle />
        
        <template v-if="isLoggedIn">
          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="32" :icon="UserFilled" />
              <span class="username">{{ username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  <span>个人信息</span>
                </el-dropdown-item>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <template v-else>
          <router-link to="/login" class="login-btn">
            <el-button type="primary">登录</el-button>
          </router-link>
          <router-link to="/register" class="register-btn">
            <el-button>注册</el-button>
          </router-link>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';
import ThemeToggle from './ThemeToggle.vue';
import { 
  ShoppingBag, 
  List, 
  Goods, 
  Money, 
  User, 
  Reading, 
  ArrowDown, 
  SwitchButton,
  UserFilled,
  QuestionFilled,
  InfoFilled
} from '@element-plus/icons-vue';

const router = useRouter();
const authStore = useAuthStore();

const isLoggedIn = computed(() => authStore.isAuthenticated);
const username = computed(() => authStore.user?.username || '');
const userRole = computed(() => authStore.user?.role || '');

function handleCommand(command) {
  if (command === 'profile') {
    router.push('/profile');
  } else if (command === 'logout') {
    confirmLogout();
  }
}

function confirmLogout() {
  ElMessageBox.confirm('确定要退出登录吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    authStore.logout();
    ElMessage.success('已退出登录');
    router.push('/login');
  }).catch(() => {});
}
</script>

<style scoped>
.navbar {
  background-color: var(--navbar-bg);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  transition: background-color var(--transition-normal);
}

.navbar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  max-width: 1200px;
  margin: 0 auto;
}

.navbar-logo h1 {
  margin: 0;
  font-size: 24px;
  color: var(--primary-color);
}

.navbar-logo a {
  text-decoration: none;
  color: inherit;
}

.navbar-menu {
  display: flex;
  align-items: center;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0 15px;
  height: 60px;
  color: var(--navbar-text);
  text-decoration: none;
  transition: all 0.3s;
}

.nav-item:hover {
  color: var(--primary-color);
  background-color: rgba(64, 158, 255, 0.1);
}

.nav-item.router-link-active {
  color: var(--primary-color);
  font-weight: 500;
}

.nav-item .el-icon {
  margin-right: 5px;
}

.navbar-user {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: var(--bg-tertiary);
}

.username {
  margin: 0 5px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--navbar-text);
}

.login-btn, .register-btn {
  margin-left: 10px;
}

@media (max-width: 768px) {
  .navbar-container {
    padding: 0 10px;
  }
  
  .navbar-logo h1 {
    font-size: 20px;
  }
  
  .nav-item {
    padding: 0 10px;
  }
  
  .nav-item span {
    display: none;
  }
  
  .nav-item .el-icon {
    margin-right: 0;
  }
  
  .username {
    display: none;
  }
}
</style> 