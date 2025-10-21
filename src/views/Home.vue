<template>
  <div class="home-container">
    <!-- 英雄区 -->
    <HomeHero />
    
    <!-- 系统公告 -->
    <div class="announcements-section" v-if="announcements.length > 0">
      <div class="particles-background"></div>
      <h2 class="section-title">系统公告</h2>
      <el-carousel :interval="4000" type="card" height="200px" indicator-position="outside" class="announcement-carousel">
        <el-carousel-item v-for="announcement in announcements" :key="announcement.id" class="announcement-item">
          <el-card class="announcement-card">
            <template #header>
              <div class="announcement-header">
                <span class="announcement-time">{{ new Date(announcement.created_at).toLocaleString() }}</span>
                <span class="announcement-admin">发布人：{{ announcement.admin_username || 'admin' }}</span>
              </div>
            </template>
            <div class="announcement-content">
              <h3>{{ announcement.title }}</h3>
              <p>{{ announcement.content }}</p>
            </div>
          </el-card>
        </el-carousel-item>
      </el-carousel>
    </div>
    
    <!-- 特色功能 -->
    <div class="features-section">
      <h2 class="section-title">我们的特色</h2>
      <div class="features-grid">
        <div class="feature-card" v-for="(feature, index) in features" :key="index">
          <el-icon class="feature-icon"><component :is="feature.icon" /></el-icon>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </div>
      </div>
    </div>
    
    <!-- 图书展示区域 -->
    <div class="books-section" ref="booksSection">
      <h2 class="section-title">热门图书</h2>
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
        <el-skeleton :rows="3" animated />
        <el-skeleton :rows="3" animated />
      </div>
      <el-row v-else :gutter="24">
        <el-col v-for="book in books.slice(0, 8)" :key="book.id" :xs="24" :sm="12" :md="8" :lg="6">
          <el-card :body-style="{ padding: '0px' }" class="book-card" shadow="hover">
            <div class="book-cover">
              <el-image 
                :src="getImageUrl(book.image_url || 'default-book.jpg')" 
                fit="cover"
                class="book-cover-image"
              >
                <template #error>
                  <div class="image-error">
                    <el-icon><Picture /></el-icon>
                    <span>图片加载失败</span>
                  </div>
                </template>
              </el-image>
            </div>
            <div class="book-info">
              <h3 class="book-title">{{ book.title }}</h3>
              <p class="book-author">作者：{{ book.author }}</p>
              <div class="book-price-stock">
                <span class="book-price">¥{{ book.price }}</span>
                <span class="book-stock" :class="{ 'low-stock': book.stock < 5 }">库存: {{ book.stock }}</span>
              </div>
              <el-button 
                type="primary" 
                @click="viewBookDetail(book.id)"
                :disabled="book.stock <= 0"
                class="view-book-btn"
              >
                查看详情
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <el-empty v-if="books.length === 0 && !loading" description="暂无图书" />
    </div>
    
    <div class="cta-section">
      <div class="cta-content" v-if="!isLoggedIn">
        <h2>准备好开始了吗？</h2>
        <p>立即注册账号，开始您的图书之旅</p>
        <router-link to="/register">
          <el-button type="primary" size="large">立即注册</el-button>
        </router-link>
      </div>
      <div class="cta-content" v-else>
        <h2>开始您的图书之旅</h2>
        <p>浏览更多图书，享受阅读的乐趣</p>
        <router-link :to="'/' + userRole">
          <el-button type="primary" size="large">进入{{ userRoleText }}中心</el-button>
        </router-link>
      </div>
    </div>
    
    <!-- 使用指南对话框 -->
    <el-dialog v-model="showGuide" title="使用指南" width="50%">
      <div class="guide-content">
        <h3>如何使用图书商城</h3>
        <el-divider></el-divider>
        <h4>1. 浏览图书</h4>
        <p>您可以在首页浏览所有图书，查看图书详情、价格和库存情况。</p>
        
        <h4>2. 注册账号</h4>
        <p>点击右上角的"注册"按钮，填写用户信息并选择您的角色（买家/卖家）。</p>
        
        <h4>3. 登录系统</h4>
        <p>使用您的用户名和密码登录系统，根据您的角色进入相应的界面。</p>
        
        <h4>4. 买家功能</h4>
        <p>作为买家，您可以浏览图书、将图书加入购物车、管理购物车并完成购买。</p>
        
        <h4>5. 卖家功能</h4>
        <p>作为卖家，您可以管理您的图书，包括添加新书、编辑图书信息和管理库存。</p>
      </div>
    </el-dialog>

    <!-- 登录提示对话框 -->
    <el-dialog v-model="showLoginPrompt" title="提示" width="30%">
      <span>请先登录后再进行操作</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showLoginPrompt = false">取消</el-button>
          <el-button type="primary" @click="$router.push('/login')">去登录</el-button>
        </span>
      </template>
    </el-dialog>
    
    <footer class="home-footer">
      <div class="footer-links">
        <router-link to="/about">关于我们</router-link>
        <span class="divider">|</span>
        <router-link to="/help">帮助中心</router-link>
      </div>
      <p>&copy; 2023-{{ new Date().getFullYear() }} 图书商城. 保留所有权利.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { 
  ShoppingBag, 
  Goods, 
  Money, 
  Reading, 
  Picture, 
  ArrowDown, 
  HomeFilled, 
  SwitchButton,
  Shop, 
  Collection, 
  Service, 
  Discount 
} from '@element-plus/icons-vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { ElMessageBox, ElMessage, ElCarousel, ElCarouselItem } from 'element-plus';
import HomeHero from '../components/HomeHero.vue'

const books = ref([]);
const announcements = ref([]);
const loading = ref(false);
const announcementsLoading = ref(false);
const showGuide = ref(false);
const showLoginPrompt = ref(false);
const booksSection = ref(null);
const apiUrl = import.meta.env.VITE_API_URL;
const authStore = useAuthStore();
const router = useRouter();

const features = ref([
  {
    icon: 'Shop',
    title: '丰富的图书资源',
    description: '提供各类图书，满足您的阅读需求。'
  },
  {
    icon: 'Collection',
    title: '个性化推荐',
    description: '根据您的阅读喜好，推荐您可能感兴趣的图书。'
  },
  {
    icon: 'Service',
    title: '优质的服务',
    description: '提供专业的客服团队，解答您的疑问。'
  },
  {
    icon: 'Discount',
    title: '优惠活动',
    description: '定期举办各类优惠活动，让您享受实惠的购书体验。'
  }
])

// 获取图片URL
function getImageUrl(image) {
  if (!image) {
    console.warn('图片路径为空，使用默认图片');
    return `${apiUrl}/uploads/default-book.jpg`;
  }
  
  console.log('处理图片路径:', image);
  
  // 如果已经是完整URL，直接返回
  if (image.startsWith('http')) {
    return image;
  }
  
  // 规范化路径
  let normalizedPath = image;
  
  // 移除开头的斜杠
  normalizedPath = normalizedPath.replace(/^\/+/, '');
  
  // 确保路径以uploads开头
  if (!normalizedPath.startsWith('uploads/')) {
    normalizedPath = `uploads/${normalizedPath}`;
  }
  
  // 构建完整URL
  const fullUrl = `${apiUrl}/${normalizedPath}`;
  console.log('构建的完整URL:', fullUrl);
  
  return fullUrl;
}

// 加载图书数据
async function loadBooks() {
  loading.value = true;
  try {
    const response = await axios.get(`${apiUrl}/api/books/public`);
    books.value = response.data.books || [];
  } catch (error) {
    console.error('获取图书列表失败:', error);
  } finally {
    loading.value = false;
  }
}

// 查看图书详情
function viewBookDetail(bookId) {
  if (isLoggedIn.value) {
    // 已登录，直接跳转到详情页
    router.push(`/book/${bookId}`);
  } else {
    // 未登录，显示登录提示
    showLoginPrompt.value = true;
  }
}

// 滚动到图书区域
function scrollToBooks() {
  booksSection.value.scrollIntoView({ behavior: 'smooth' });
}

// 计算已登录用户信息
const isLoggedIn = computed(() => authStore.isAuthenticated);
const username = computed(() => authStore.user?.username || '');
const userRole = computed(() => authStore.user?.role || '');
const userRoleText = computed(() => {
  switch (userRole.value) {
    case 'buyer': return '买家';
    case 'seller': return '卖家';
    case 'admin': return '管理员';
    default: return '用户';
  }
});

// 处理下拉菜单命令
function handleCommand(command) {
  if (command === 'dashboard') {
    router.push(`/${userRole.value}`);
  } else if (command === 'logout') {
    confirmLogout();
  }
}

// 退出登录确认
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

// 获取公告列表
async function fetchAnnouncements() {
  announcementsLoading.value = true;
  try {
    const response = await axios.get(`${apiUrl || 'http://localhost:3000'}/api/admin/announcements`);
    announcements.value = response.data;
    console.log('公告数据加载成功:', response.data.length);
  } catch (error) {
    console.error('获取公告失败:', error);
  } finally {
    announcementsLoading.value = false;
  }
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(async () => {
  loading.value = true;
  try {
    // 获取图书数据
    const response = await axios.get(`${apiUrl || 'http://localhost:3000'}/api/books`);
    books.value = response.data.books;
    console.log(`已获取 ${books.value.length} 本图书`);
    
    // 获取公告数据
    await fetchAnnouncements();
  } catch (error) {
    console.error('获取数据失败:', error);
    ElMessage.error('获取数据失败，请刷新页面重试');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.home-container {
  padding-bottom: 40px;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background-color: var(--primary-color);
}

.logo {
  display: flex;
  align-items: center;
}

.logo img {
  width: 40px;
  height: 40px;
  margin-right: 10px;
}

.logo h1 {
  font-size: 1.5rem;
  color: #fff;
}

.nav-links {
  display: flex;
  align-items: center;
}

.links {
  display: flex;
  gap: 20px;
}

.links a {
  color: #fff;
  text-decoration: none;
  transition: color 0.3s;
}

.links a:hover {
  color: var(--primary-hover);
  text-decoration: underline;
}

.auth-links {
  display: flex;
  gap: 20px;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.username {
  margin-right: 5px;
}

.hero-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 60px;
  gap: 40px;
}

.hero-content {
  flex: 1;
}

.hero-title {
  font-size: 3rem;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: var(--text-secondary);
  margin-bottom: 30px;
}

.hero-buttons {
  display: flex;
  gap: 20px;
}

.hero-image {
  flex: 1;
  max-width: 500px;
}

.hero-image img {
  width: 100%;
  border-radius: var(--border-radius-medium);
  box-shadow: var(--box-shadow-medium);
}

.image-placeholder {
  width: 100%;
  height: 300px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: var(--border-radius-medium);
  box-shadow: var(--box-shadow-medium);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.placeholder-icon {
  font-size: 4rem;
  color: var(--primary-color);
  margin-bottom: 20px;
}

.image-placeholder span {
  font-size: 1.5rem;
  color: var(--text-primary);
  font-weight: bold;
}

.section-title {
  text-align: center;
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 40px;
}

.features-section {
  margin-bottom: 60px;
  margin-top: 40px;
  padding: 40px;
  background-color: transparent !important;
  border-radius: var(--border-radius-large);
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.features-section::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(3px);
  z-index: -1;
  border-radius: var(--border-radius-large);
  background: rgba(22, 22, 30, 0.4);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.features-section .section-title {
  position: relative;
  z-index: 2;
  color: var(--text-primary);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  margin-top: 20px;
  position: relative;
  z-index: 2;
}

.feature-card {
  text-align: center;
  padding: 30px 20px;
  border-radius: var(--border-radius-medium);
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.feature-card::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    transparent, 
    rgba(var(--primary-rgb), 0.05), 
    transparent, 
    transparent
  );
  animation: rotate 6s linear infinite;
  z-index: -1;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 
              0 0 10px rgba(var(--primary-rgb), 0.2), 
              0 0 20px rgba(var(--primary-rgb), 0.1);
}

.feature-card:hover .feature-icon {
  transform: scale(1.15);
  color: var(--primary-color);
  text-shadow: 0 0 15px rgba(var(--primary-rgb), 0.5);
}

/* 白天/黑夜模式颜色适配 */
:root[data-theme="light"] .features-section::before {
  background: rgba(240, 249, 255, 0.7);
}

:root[data-theme="light"] .feature-card {
  background: rgba(64, 158, 255, 0.08);
  border: 1px solid rgba(64, 158, 255, 0.1);
}

:root[data-theme="dark"] .feature-card {
  background: rgba(31, 91, 142, 0.08);
  border: 1px solid rgba(31, 91, 142, 0.15);
}

.feature-icon {
  font-size: 40px;
  color: var(--primary-color);
  margin-bottom: 20px;
  transition: all 0.3s ease;
  position: relative;
}

:root[data-theme="dark"] .feature-icon {
  filter: drop-shadow(0 0 8px rgba(var(--primary-rgb), 0.3));
}

:root[data-theme="light"] .feature-icon {
  filter: drop-shadow(0 0 5px rgba(var(--primary-rgb), 0.2));
}

/* 响应式布局 */
@media (max-width: 992px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .feature-card {
    padding: 20px 10px;
  }
  
  .section-title {
    font-size: 24px;
  }
  
  .announcement-carousel {
    height: 240px !important;
  }
}

@media (max-width: 576px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .feature-card {
    max-width: 320px;
    margin: 0 auto;
  }
}

.books-section {
  margin-bottom: 60px;
}

.loading-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.book-card {
  margin-bottom: 24px;
  transition: transform 0.3s;
  height: 100%;
}

.book-card:hover {
  transform: translateY(-5px);
}

.book-cover {
  height: 200px;
  overflow: hidden;
  background-color: var(--background-dark);
}

.book-cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-cover-placeholder {
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.book-info {
  padding: 15px;
}

.book-title {
  font-size: 16px;
  margin-bottom: 8px;
  color: var(--text-primary);
  height: 44px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.book-author {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.book-price {
  font-size: 18px;
  font-weight: bold;
  color: var(--danger-color);
  margin-bottom: 8px;
}

.book-stock {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stock-warning {
  color: var(--warning-color);
  font-size: 12px;
}

.stock-empty {
  color: var(--danger-color);
  font-size: 12px;
}

.low-stock {
  color: var(--warning-color);
}

.view-book-btn {
  width: 100%;
}

.cta-section {
  background-color: var(--primary-color);
  padding: 60px 0;
  border-radius: var(--border-radius-medium);
  margin-bottom: 60px;
}

.cta-content {
  text-align: center;
  color: #fff;
}

.cta-content h2 {
  font-size: 2rem;
  margin-bottom: 15px;
}

.cta-content p {
  font-size: 1.2rem;
  margin-bottom: 30px;
}

.guide-content h3 {
  font-size: 20px;
  color: var(--text-primary);
  margin-bottom: 15px;
}

.guide-content h4 {
  font-size: 16px;
  color: var(--text-primary);
  margin: 15px 0 5px;
}

.guide-content p {
  color: var(--text-regular);
  margin-bottom: 10px;
}

.home-footer {
  text-align: center;
  color: var(--text-secondary);
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
}

.footer-links {
  margin-bottom: 10px;
}

.footer-links a {
  color: var(--primary-color);
  text-decoration: none;
  transition: color 0.3s;
}

.footer-links a:hover {
  color: var(--primary-hover);
  text-decoration: underline;
}

.divider {
  margin: 0 10px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.2rem;
  }
  
  .hero-buttons {
    justify-content: center;
  }
  
  .hero-image {
    order: -1;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .cta-section {
    padding: 40px 20px;
  }
}

.image-error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: #909399;
  font-size: 12px;
  background-color: #f5f7fa;
}

.image-error .el-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.book-price-stock {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.announcements-section {
  margin-bottom: 60px;
  padding: 40px;
  background-color: transparent !important;
  border-radius: var(--border-radius-large);
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.announcements-section::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(3px);
  z-index: -1;
  border-radius: var(--border-radius-large);
  background: rgba(22, 22, 30, 0.4);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.announcements-section .section-title {
  position: relative;
  z-index: 2;
  color: var(--text-primary);
}

.announcement-card {
  height: 100%;
  border-radius: var(--border-radius-medium);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.announcement-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 
              0 0 10px rgba(var(--primary-rgb), 0.2), 
              0 0 20px rgba(var(--primary-rgb), 0.1);
}

/* 白天/黑夜模式颜色适配 */
:root[data-theme="light"] .announcements-section::before {
  background: rgba(240, 249, 255, 0.7);
}

:root[data-theme="light"] .announcement-card {
  background: rgba(64, 158, 255, 0.08);
  border: 1px solid rgba(64, 158, 255, 0.1);
}

:root[data-theme="dark"] .announcement-card {
  background: rgba(31, 91, 142, 0.08);
  border: 1px solid rgba(31, 91, 142, 0.15);
}

.particles-background {
  position: relative;
  overflow: hidden;
}

.particles-background::before, 
.particles-background::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.particles-background::before {
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(var(--primary-rgb), 0.15) 1px, transparent 1px),
    radial-gradient(circle at 75% 75%, rgba(var(--primary-rgb), 0.15) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: particlesAnimation1 20s linear infinite;
}

.particles-background::after {
  background-image: 
    radial-gradient(circle at 50% 50%, rgba(var(--primary-rgb), 0.1) 1px, transparent 2px),
    radial-gradient(circle at 25% 75%, rgba(var(--primary-rgb), 0.1) 2px, transparent 2px);
  background-size: 60px 60px;
  animation: particlesAnimation2 30s linear infinite;
}

@keyframes particlesAnimation1 {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 40px 40px;
  }
}

@keyframes particlesAnimation2 {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 60px 60px;
  }
}

:root[data-theme="dark"] .particles-background::before {
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(var(--primary-rgb), 0.1) 1px, transparent 1px),
    radial-gradient(circle at 75% 75%, rgba(var(--primary-rgb), 0.1) 1px, transparent 1px);
}

:root[data-theme="dark"] .particles-background::after {
  background-image: 
    radial-gradient(circle at 50% 50%, rgba(var(--primary-rgb), 0.07) 1px, transparent 2px),
    radial-gradient(circle at 25% 75%, rgba(var(--primary-rgb), 0.07) 2px, transparent 2px);
}

.section-title {
  text-align: center;
  margin-bottom: 30px;
  font-size: 28px;
  color: var(--text-primary);
  transition: color var(--transition-normal);
  position: relative;
  z-index: 1;
}

.announcement-carousel {
  padding: 10px 0;
  position: relative;
  z-index: 2;
}

.announcement-item {
  height: 100%;
}

.announcement-card {
  height: 100%;
  border-radius: var(--border-radius-medium);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.announcement-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 
              0 0 10px rgba(var(--primary-rgb), 0.2), 
              0 0 20px rgba(var(--primary-rgb), 0.1);
}

.announcement-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
}

.announcement-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.announcement-content h3 {
  margin: 0 0 10px;
  color: var(--text-primary);
  font-size: 18px;
}

.announcement-content p {
  margin: 0;
  color: var(--text-regular);
  line-height: 1.5;
  font-size: 14px;
}

/* Carousel 组件深色模式适配 */
:deep(.el-carousel__item) {
  padding: 0;
}

:deep(.el-carousel__arrow) {
  background-color: var(--primary-color);
}

:deep(.el-carousel__arrow:hover) {
  background-color: var(--primary-hover);
}

:deep(.el-carousel__indicator) {
  padding: 12px 4px;
}

:deep(.el-carousel__indicator.is-active .el-carousel__button) {
  background-color: var(--primary-color);
}

:deep(.el-carousel__button) {
  background-color: var(--text-secondary);
  opacity: 0.5;
}
</style>