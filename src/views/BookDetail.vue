<template>
  <div class="book-detail-container">
    <div class="back-button">
      <el-button @click="goBack" type="text" size="large">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
    </div>
    <LoadingIndicator :loading="loading" text="加载中..." />
    
    <div v-if="!loading" class="book-detail-content">
      <div class="book-cover">
        <el-image
          :src="getImageUrl(book.image_url || 'default-book.jpg')"
          fit="cover"
          class="cover-image"
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
        <h1 class="book-title">{{ book.title }}</h1>
        <p class="book-author">作者：{{ book.author }}</p>
        <p v-if="book.category" class="book-category">分类：{{ book.category }}</p>
        <p class="book-price">价格：¥{{ book.price }}</p>
        <p class="book-stock">库存：{{ book.stock }}</p>
        
        <div class="book-description">
          <h3>图书简介</h3>
          <p>{{ book.description || '暂无描述' }}</p>
        </div>
        
        <div class="book-actions">
          <el-input-number v-model="quantity" :min="1" :max="book.stock" />
          <el-button 
            type="primary" 
            :disabled="!book.stock" 
            @click="addToCart"
          >
            {{ book.stock ? '加入购物车' : '缺货' }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { ElMessage } from 'element-plus';
import { Picture, ArrowLeft } from '@element-plus/icons-vue';
import LoadingIndicator from '../components/LoadingIndicator.vue';
import axios from 'axios';

const route = useRoute();
const router = useRouter();
const cartStore = useCartStore();
const authStore = useAuthStore();
const apiUrl = import.meta.env.VITE_API_URL;

const loading = ref(true);
const book = ref({});
const quantity = ref(1);
const bookId = computed(() => route.params.id);
const isLoggedIn = computed(() => authStore.isAuthenticated);

// 获取图片URL
function getImageUrl(image) {
  if (!image) {
    console.warn('图片路径为空');
    return `${apiUrl}/uploads/default-book.jpg`;
  }
  
  console.log('处理图片路径:', image);
  
  // 如果已经是完整URL，直接返回
  if (image.startsWith('http')) {
    return image;
  }
  
  // 默认图片特殊处理
  if (image === 'default-book.jpg') {
    return `${apiUrl}/uploads/default-book.jpg`;
  }
  
  // 确保路径以/uploads开头
  let normalizedPath = image;
  if (!normalizedPath.startsWith('/uploads/') && !normalizedPath.startsWith('uploads/')) {
    normalizedPath = `/uploads/${normalizedPath.replace(/^\/+/, '')}`;
  } else if (normalizedPath.startsWith('uploads/')) {
    normalizedPath = `/${normalizedPath}`;
  }
  
  // 构建完整URL
  const fullUrl = `${apiUrl}${normalizedPath}`;
  
  return fullUrl;
}

// 获取图书详情
async function fetchBookDetails() {
  loading.value = true;
  
  try {
    const response = await axios.get(`${apiUrl}/api/books/${bookId.value}`);
    book.value = response.data;
    document.title = `图书商城 - ${book.value.title}`;
  } catch (error) {
    console.error('获取图书详情失败:', error);
    ElMessage.error('获取图书详情失败');
  } finally {
    loading.value = false;
  }
}

// 添加到购物车
// 返回上一页
function goBack() {
  router.back();
}

function addToCart() {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再进行操作');
    router.push('/login');
    return;
  }
  
  cartStore.addItem({
    book_id: book.value.id,
    title: book.value.title,
    price: book.value.price,
    image_url: book.value.image_url,
    quantity: quantity.value,
    seller_id: book.value.seller_id
  });
  
  ElMessage.success(`已将《${book.value.title}》添加到购物车`);
}

onMounted(() => {
  fetchBookDetails();
});
</script>

<style scoped>
.book-detail-container {
  max-width: 1200px;
  margin: 80px auto 40px;
  padding: 20px;
}

.back-button {
  margin-bottom: 20px;
}

.back-button .el-button {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 16px;
}

.book-detail-content {
  display: flex;
  gap: 40px;
}

.book-cover {
  flex: 0 0 300px;
}

.cover-image {
  width: 100%;
  height: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.book-info {
  flex: 1;
}

.book-title {
  font-size: 24px;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.book-author, .book-category, .book-price, .book-stock {
  margin-bottom: 10px;
  color: var(--text-secondary);
}

.book-price {
  font-size: 20px;
  color: var(--price-color);
  font-weight: bold;
}

.book-description {
  margin-top: 30px;
  border-top: 1px solid var(--border-color);
  padding-top: 20px;
}

.book-description h3 {
  margin-bottom: 10px;
  font-size: 18px;
}

.book-actions {
  margin-top: 30px;
  display: flex;
  gap: 20px;
  align-items: center;
}

.image-error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background-color: #f5f7fa;
  color: #909399;
}

.image-error .el-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

@media (max-width: 768px) {
  .book-detail-content {
    flex-direction: column;
  }
  
  .book-cover {
    flex: none;
    margin-bottom: 20px;
  }
  
  .cover-image {
    height: 300px;
  }
}
</style>