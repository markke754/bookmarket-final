<template>
  <div class="buyer-container">
    <LoadingIndicator :loading="loading" text="加载中..." />
    
    <!-- 搜索和过滤区域 -->
    <div class="search-filter-container">
      <el-input
        v-model="searchQuery"
        placeholder="搜索书籍..."
        prefix-icon="el-icon-search"
        clearable
        @input="fetchBooks"
        class="search-input"
      />
      <el-select v-model="selectedCategory" placeholder="分类" @change="fetchBooks" class="filter-select">
        <el-option label="全部" value="" />
        <el-option v-for="category in categories" :key="category" :label="category" :value="category" />
      </el-select>
      <el-select v-model="sortOption" placeholder="排序" @change="fetchBooks" class="filter-select">
        <el-option label="默认排序" value="default" />
        <el-option label="价格从低到高" value="price_asc" />
        <el-option label="价格从高到低" value="price_desc" />
        <el-option label="最新上架" value="newest" />
      </el-select>
    </div>
    
    <!-- 书籍列表 -->
    <div class="books-container">
      <div v-if="books.length === 0 && !loading" class="no-books">
        <el-empty description="没有找到符合条件的书籍" />
      </div>
      <div v-else class="books-grid">
        <div v-for="book in books" :key="book.id" class="book-card">
          <div class="book-image">
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
            <p class="book-author">{{ book.author }}</p>
            <p v-if="book.category" class="book-category">{{ book.category }}</p>
            <p class="book-price">¥{{ book.price }}</p>
            <div class="book-actions">
              <el-button size="small" type="primary" @click="addToCart(book)">加入购物车</el-button>
              <el-button size="small" @click="viewBookDetail(book.id)">查看详情</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 分页 -->
    <div class="pagination-container" v-if="books.length > 0">
      <el-pagination
        background
        layout="prev, pager, next"
        :total="totalBooks"
        :page-size="pageSize"
        :current-page="currentPage"
        @current-change="handlePageChange"
      />
    </div>
    
    <!-- 购物车抽屉 -->
    <ShoppingCart ref="shoppingCartRef" @checkout="openCheckoutDialog" />
    
    <!-- 结账对话框 -->
    <el-dialog
      v-model="checkoutDialogVisible"
      title="结账"
      width="50%"
      :before-close="handleCloseCheckout"
    >
      <div class="checkout-container">
        <div class="order-summary">
          <h3>订单摘要</h3>
          <div class="order-items">
            <div v-for="(item, index) in cartItems" :key="index" class="order-item">
              <span>{{ item.title }} x {{ item.quantity }}</span>
              <span>¥{{ (item.price * item.quantity).toFixed(2) }}</span>
            </div>
          </div>
          <div class="order-total">
            <span>总计:</span>
            <span>¥{{ total }}</span>
          </div>
        </div>
        
        <div class="payment-methods">
          <h3>选择支付方式</h3>
          <div class="payment-options">
            <div
              class="payment-option"
              :class="{ active: selectedPaymentMethod === 'alipay' }"
              @click="selectedPaymentMethod = 'alipay'"
            >
              <AlipayIcon size="36" />
              <span>支付宝</span>
            </div>
            <div
              class="payment-option"
              :class="{ active: selectedPaymentMethod === 'wechat' }"
              @click="selectedPaymentMethod = 'wechat'"
            >
              <WechatPayIcon size="36" />
              <span>微信支付</span>
            </div>
          </div>
        </div>
        
        <div class="payment-qrcode" v-if="selectedPaymentMethod && sellerPaymentCodes">
          <h3>扫码支付</h3>
          <div class="qrcode-container">
            <img 
              v-if="selectedPaymentMethod === 'alipay' && getPaymentCodeUrl('alipay')" 
              :src="getImageUrl(getPaymentCodeUrl('alipay'))" 
              alt="支付宝二维码" 
            />
            <img 
              v-if="selectedPaymentMethod === 'wechat' && getPaymentCodeUrl('wechat')" 
              :src="getImageUrl(getPaymentCodeUrl('wechat'))" 
              alt="微信支付二维码" 
            />
            <div v-if="!canPay" class="no-payment-method">
              卖家未提供此支付方式，请选择其他方式
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="checkoutDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="confirmPayment" 
            :disabled="!canPay || paymentProcessing"
            :loading="paymentProcessing"
          >
            确认支付
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 购物车按钮 -->
    <div class="cart-button-container">
      <el-badge :value="cartItems.length ? cartItems.length : ''" class="cart-badge" :hidden="cartItems.length === 0">
        <el-button 
          type="primary" 
          circle 
          @click="openShoppingCart" 
          class="cart-button"
        >
          <el-icon><ShoppingCartIcon /></el-icon>
        </el-button>
      </el-badge>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ShoppingCart as ShoppingCartIcon, Picture } from '@element-plus/icons-vue';
import ShoppingCart from '../components/ShoppingCart.vue';
import LoadingIndicator from '../components/LoadingIndicator.vue';
import AlipayIcon from '../components/icons/AlipayIcon.vue';
import WechatPayIcon from '../components/icons/WechatPayIcon.vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const cartStore = useCartStore();
const authStore = useAuthStore();
const cartItems = computed(() => cartStore.items);
const router = useRouter();

// 状态变量
const books = ref([]);
const categories = ref([]);
const searchQuery = ref('');
const selectedCategory = ref('');
const sortOption = ref('default');
const currentPage = ref(1);
const pageSize = ref(12);
const totalBooks = ref(0);
const loading = ref(false);
const shoppingCartRef = ref(null);
const checkoutDialogVisible = ref(false);
const selectedPaymentMethod = ref('alipay');
const sellerPaymentCodes = ref(null);
const selectedSeller = ref(null);
const paymentProcessing = ref(false);

// 计算属性
const total = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
});

const canPay = computed(() => {
  console.log('支付码数据:', sellerPaymentCodes.value);
  if (!sellerPaymentCodes.value) return false;
  
  if (selectedPaymentMethod.value === 'alipay') {
    // 检查支付宝码是否存在，适配不同格式
    return !!(sellerPaymentCodes.value.alipay || 
             sellerPaymentCodes.value.payment_methods?.alipay ||
             (typeof sellerPaymentCodes.value === 'object' && 
              Object.values(sellerPaymentCodes.value).find(code => 
                code.type === 'alipay' || code.type === 'zhifubao')));
  } else if (selectedPaymentMethod.value === 'wechat') {
    // 检查微信码是否存在，适配不同格式
    return !!(sellerPaymentCodes.value.wechat || 
             sellerPaymentCodes.value.payment_methods?.wechat ||
             (typeof sellerPaymentCodes.value === 'object' && 
              Object.values(sellerPaymentCodes.value).find(code => 
                code.type === 'wechat' || code.type === 'weixin')));
  }
  
  return false;
});

// 获取图片URL
function getImageUrl(image) {
  if (!image) {
    console.warn('图片路径为空');
    return '';
  }
  
  console.log('处理图片路径:', image);
  
  // 如果已经是完整URL，直接返回
  if (image.startsWith('http')) {
    return image;
  }
  
  // 默认图片特殊处理
  if (image === 'default-book.jpg') {
    return `${import.meta.env.VITE_API_URL}/uploads/default-book.jpg`;
  }
  
  // 规范化路径
  let normalizedPath = image;
  
  // 移除开头的斜杠
  normalizedPath = normalizedPath.replace(/^\/*/, '');
  
  // 确保路径以uploads开头
  if (!normalizedPath.startsWith('uploads/')) {
    normalizedPath = `uploads/${normalizedPath}`;
  } else if (normalizedPath.startsWith('/uploads/')) {
    normalizedPath = normalizedPath.substring(1); // 移除开头的斜杠
  }
  
  // 构建完整URL
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const fullUrl = `${baseUrl}/${normalizedPath}`;
  console.log('构建的完整URL:', fullUrl);
  
  return fullUrl;
}

// 获取书籍列表
async function fetchBooks() {
  loading.value = true;
  try {
    // 构建查询参数
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: pageSize.value
    });
    
    if (searchQuery.value) {
      params.append('search', searchQuery.value);
    }
    
    if (selectedCategory.value) {
      params.append('category', selectedCategory.value);
    }
    
    if (sortOption.value !== 'default') {
      params.append('sort', sortOption.value);
    }
    
    // 构建完整的API URL
    const url = `${import.meta.env.VITE_API_URL}/api/books?${params.toString()}`;
    console.log('正在请求图书数据，URL:', url);
    
    const response = await axios.get(url);
    console.log('获取图书响应:', response.data);
    
    books.value = response.data.books || [];
    totalBooks.value = response.data.total || 0;
    
    // 如果是第一次加载，获取所有分类
    if (categories.value.length === 0) {
      fetchCategories();
    }
  } catch (error) {
    console.error('获取书籍失败，详细错误:', error);
    if (error.response) {
      console.error('服务器响应:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('未收到响应，请检查API服务是否运行');
    } else {
      console.error('请求配置错误:', error.message);
    }
    ElMessage.error(`获取图书列表失败: ${error.message || '未知错误'}`);
    books.value = []; // 确保在出错时设置为空数组
  } finally {
    // 确保无论如何都重置loading状态
    loading.value = false;
    console.log('图书加载状态已重置，loading =', loading.value);
  }
}

// 获取所有分类
async function fetchCategories() {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/books/categories`);
    categories.value = response.data.categories;
  } catch (error) {
    console.error('获取分类失败:', error);
  }
}

// 处理分页变化
function handlePageChange(page) {
  currentPage.value = page;
  fetchBooks();
}

// 加入购物车
function addToCart(book) {
  // 确保图片URL字段正确
  const bookWithCorrectImage = {
    ...book,
    image_url: book.image_url || book.image || 'default-book.jpg'
  };
  
  // 确保图片URL使用完整路径
  console.log('加入购物车的书籍:', bookWithCorrectImage);
  console.log('图片路径:', bookWithCorrectImage.image_url);
  
  cartStore.addItem(bookWithCorrectImage);
  ElMessage.success(`《${book.title}》已加入购物车`);
}

// 处理购物车
function openShoppingCart() {
  if (shoppingCartRef.value) {
    shoppingCartRef.value.openDrawer();
  }
}

function handleCloseCheckout() {
  checkoutDialogVisible.value = false;
}

// 打开结算对话框
async function openCheckoutDialog() {
  // 关闭购物车抽屉
  if (shoppingCartRef.value) {
    shoppingCartRef.value.closeDrawer();
  }
  
  if (cartItems.value.length === 0) {
    ElMessage.warning('购物车为空，无法结算');
    return;
  }
  
  if (cartItems.value.length > 0) {
    try {
      loading.value = true;
      
      // 过滤掉没有有效ID的图书
      const validItems = cartItems.value.filter(item => item.id);
      
      // 如果有无效项，先从购物车移除
      if (validItems.length < cartItems.value.length) {
        const invalidItems = cartItems.value.filter(item => !item.id);
        invalidItems.forEach(item => {
          const index = cartItems.value.findIndex(cartItem => cartItem === item);
          if (index !== -1) {
            cartStore.removeItem(index);
          }
        });
        
        ElMessage.warning('购物车中存在无效图书，已自动移除');
        
        // 如果购物车为空，则不继续结算
        if (cartStore.items.length === 0) {
          loading.value = false;
          return;
        }
      }
      
      // 首先验证购物车中的图书是否仍然存在
      const bookIds = validItems.map(item => item.id).filter(Boolean);
      
      if (bookIds.length === 0) {
        ElMessage.warning('购物车中没有有效图书');
        loading.value = false;
        return;
      }
      
      const validationResponse = await axios.post(`${import.meta.env.VITE_API_URL}/api/books/validate`, {
        bookIds: bookIds
      });
      
      // 检查是否有不存在的图书
      if (validationResponse.data.invalidBooks && validationResponse.data.invalidBooks.length > 0) {
        // 找出不存在的图书
        const invalidIds = validationResponse.data.invalidBooks;
        const invalidItems = cartItems.value.filter(item => invalidIds.includes(item.id));
        
        // 从购物车中移除不存在的图书
        invalidItems.forEach(item => {
          const index = cartItems.value.findIndex(cartItem => cartItem.id === item.id);
          if (index !== -1) {
            cartStore.removeItem(index);
          }
        });
        
        // 提示用户
        ElMessage.error(`部分图书已不存在，已从购物车中移除`);
        
        // 如果购物车为空，则不继续结算
        if (cartStore.items.length === 0) {
          loading.value = false;
          return;
        }
      }
      
      // 获取商品所属的卖家信息
      const sellerId = cartItems.value[0].seller_id;
      
      // 确保所有商品来自同一卖家
      const isSingleSeller = cartItems.value.every(item => item.seller_id === sellerId);
      if (!isSingleSeller) {
        ElMessage.warning('购物车包含来自不同卖家的商品，请分开结算');
        loading.value = false;
        return;
      }
      
      // 使用新的API端点获取卖家支付信息
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/orders/prepare`, {
        items: validItems
      }, {
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      });
      
      console.log('获取支付信息响应:', response.data);
      
      // 修改判断条件，兼容不同的响应格式
      if (response.data.success === true) {
        console.log('获取成功，支付方式数据:', response.data.data.payment_methods);
        sellerPaymentCodes.value = response.data.data.payment_methods;
        selectedSeller.value = response.data.data.seller;
        checkoutDialogVisible.value = true;
        
        // 打印支付方式数据，用于调试
        if (sellerPaymentCodes.value) {
          console.log('支付宝码:', sellerPaymentCodes.value.alipay);
          console.log('微信码:', sellerPaymentCodes.value.wechat);
          console.log('canPay计算结果:', canPay.value);
        }
      } else if (response.data.sellerPaymentCodes) {
        // 兼容旧版API格式
        console.log('获取成功(旧格式)，支付方式数据:', response.data.sellerPaymentCodes);
        sellerPaymentCodes.value = response.data.sellerPaymentCodes;
        selectedSeller.value = response.data.seller;
        checkoutDialogVisible.value = true;
        
        // 打印支付方式数据，用于调试
        if (sellerPaymentCodes.value) {
          console.log('支付宝码:', sellerPaymentCodes.value.alipay);
          console.log('微信码:', sellerPaymentCodes.value.wechat);
          console.log('canPay计算结果:', canPay.value);
        }
      } else {
        // 失败情况
        console.error('获取支付信息失败，响应:', response.data);
        ElMessage.error(response.data.message || '无法获取支付信息');
      }
    } catch (error) {
      console.error('获取支付信息出错:', error);
      if (error.response && error.response.data) {
        console.error('错误响应数据:', error.response.data);
        ElMessage.error(error.response.data.message || '获取支付信息失败');
      } else {
        ElMessage.error('获取支付信息失败，请重试');
      }
    } finally {
      loading.value = false;
    }
  }
}

// 确认支付
async function confirmPayment() {
  if (!canPay.value) {
    ElMessage.warning('请选择有效的支付方式');
    return;
  }
  
  paymentProcessing.value = true;
  try {
    // 过滤掉没有有效ID的图书
    const validItems = cartItems.value.filter(item => item.id);
    
    // 如果有无效项，先从购物车移除
    if (validItems.length < cartItems.value.length) {
      const invalidItems = cartItems.value.filter(item => !item.id);
      invalidItems.forEach(item => {
        const index = cartItems.value.findIndex(cartItem => cartItem === item);
        if (index !== -1) {
          cartStore.removeItem(index);
        }
      });
      
      // 如果购物车为空，则不继续结算
      if (cartStore.items.length === 0) {
        paymentProcessing.value = false;
        ElMessage.warning('购物车中没有有效图书');
        checkoutDialogVisible.value = false;
        return;
      }
    }
    
    // 再次验证所有图书是否存在
    const bookIds = validItems.map(item => item.id).filter(Boolean);
    
    if (bookIds.length === 0) {
      paymentProcessing.value = false;
      ElMessage.warning('购物车中没有有效图书');
      checkoutDialogVisible.value = false;
      return;
    }
    
    const validationResponse = await axios.post(`${import.meta.env.VITE_API_URL}/api/books/validate`, {
      bookIds: bookIds
    });
    
    // 检查是否有不存在的图书
    if (validationResponse.data.invalidBooks && validationResponse.data.invalidBooks.length > 0) {
      // 找出不存在的图书
      const invalidIds = validationResponse.data.invalidBooks;
      const invalidItems = cartItems.value.filter(item => invalidIds.includes(item.id));
      
      // 从购物车中移除不存在的图书
      invalidItems.forEach(item => {
        const index = cartItems.value.findIndex(cartItem => cartItem.id === item.id);
        if (index !== -1) {
          cartStore.removeItem(index);
        }
      });
      
      paymentProcessing.value = false;
      ElMessage.error('部分图书已不存在，已从购物车中移除，请重新结算');
      checkoutDialogVisible.value = false;
      return;
    }
    
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/orders/confirm`, {
      paymentMethod: selectedPaymentMethod.value,
      selectedSeller: selectedSeller.value,
      cartItems: validItems
    }, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    });
    
    ElMessage.success('支付成功！');
    checkoutDialogVisible.value = false;
    cartStore.clearCart();
  } catch (error) {
    console.error('支付确认失败:', error);
    if (error.response && error.response.data && error.response.data.message) {
      ElMessage.error(error.response.data.message);
    } else {
      ElMessage.error('支付确认失败，请稍后重试');
    }
  } finally {
    paymentProcessing.value = false;
  }
}

// 查看书籍详情
function viewBookDetail(bookId) {
  router.push(`/book/${bookId}`);
}

// 添加获取支付码URL的函数
function getPaymentCodeUrl(type) {
  if (!sellerPaymentCodes.value) return null;
  
  // 尝试直接访问特定格式
  if (sellerPaymentCodes.value[type]) {
    return sellerPaymentCodes.value[type];
  }
  
  // 尝试从payment_methods格式获取
  if (sellerPaymentCodes.value.payment_methods && sellerPaymentCodes.value.payment_methods[type]) {
    return sellerPaymentCodes.value.payment_methods[type];
  }
  
  // 尝试从对象数组中查找
  if (typeof sellerPaymentCodes.value === 'object') {
    // 支付宝有不同的名称
    const typeAliases = {
      'alipay': ['alipay', 'zhifubao', 'aliPay'],
      'wechat': ['wechat', 'weixin', 'wechatPay', 'wx']
    };
    
    // 查找匹配别名的支付码
    const matchedCode = Object.values(sellerPaymentCodes.value)
      .find(code => {
        if (!code || typeof code !== 'object') return false;
        return typeAliases[type].includes(code.type);
      });
    
    if (matchedCode) {
      return matchedCode.image_url;
    }
  }
  
  return null;
}

// 组件挂载时获取书籍列表
onMounted(() => {
  fetchBooks();
});
</script>

<style scoped>
.buyer-container {
  padding: 20px;
  background-color: var(--background-light);
  min-height: 100vh;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header-title {
  font-size: 20px;
  font-weight: bold;
  color: var(--text-primary);
}

.book-card {
  margin-bottom: 24px;
  transition: transform var(--transition-normal);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.book-card:hover {
  transform: translateY(-5px);
}

.book-cover {
  height: 160px;
  background-color: var(--background-dark);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border: 1px solid #dcdfe6;
  border-radius: var(--border-radius-small);
}

.book-cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--border-radius-small);
}

.book-cover-placeholder {
  width: 100px;
  height: 140px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  border-radius: var(--border-radius-small);
}

.book-info {
  padding: 16px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.book-title {
  font-size: 18px;
  margin: 0 0 10px 0;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.book-author {
  color: var(--text-secondary);
  margin: 5px 0;
  font-size: 14px;
}

.book-price {
  color: #e74c3c;
  font-weight: bold;
  font-size: 18px;
  margin: 5px 0;
}

.book-stock {
  color: var(--text-secondary);
  margin: 5px 0 15px 0;
  font-size: 14px;
}

.low-stock {
  color: var(--warning-color);
}

.stock-warning {
  background-color: var(--warning-color);
  color: white;
  padding: 2px 6px;
  border-radius: var(--border-radius-small);
  font-size: 12px;
  margin-left: 5px;
}

.stock-empty {
  background-color: var(--text-light);
  color: white;
  padding: 2px 6px;
  border-radius: var(--border-radius-small);
  font-size: 12px;
  margin-left: 5px;
}

.add-to-cart-btn {
  margin-top: auto;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.drawer-header h3 {
  margin: 0;
  font-size: 18px;
}

.cart-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background-color: #fff;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--box-shadow-light);
}

.total {
  font-size: 16px;
  color: var(--text-primary);
}

.total-price {
  font-size: 20px;
  font-weight: bold;
  color: #e74c3c;
}

.price {
  color: #e74c3c;
  font-weight: bold;
}

@media (max-width: 768px) {
  .buyer-container {
    padding: 10px;
  }
  
  .el-drawer {
    width: 80% !important;
  }
}

.checkout-dialog {
  border-radius: 8px;
}

.checkout-content {
  padding: 10px 0;
}

.order-summary {
  margin-bottom: 30px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 15px;
}

.summary-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #303133;
}

.summary-items {
  margin-bottom: 15px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #606266;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  padding: 15px 0;
  font-size: 16px;
  font-weight: 600;
}

.total-amount {
  color: #f56c6c;
  font-size: 20px;
}

.payment-methods {
  margin-top: 20px;
}

.payment-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #303133;
}

.payment-tabs {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 20px;
}

.payment-qrcode {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
}

.qrcode-image {
  width: 200px;
  height: 200px;
  object-fit: contain;
  margin-bottom: 15px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px;
}

.scan-tip {
  color: #606266;
  margin-top: 10px;
}

.no-payment-code {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
  font-size: 16px;
}

@media (max-width: 768px) {
  .qrcode-image {
    width: 150px;
    height: 150px;
  }
  
  .checkout-dialog {
    width: 95% !important;
  }
}

/* 购物车样式 */
.cart-content {
  padding: 20px;
  height: calc(100% - 40px);
  display: flex;
  flex-direction: column;
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
}

.empty-cart i {
  font-size: 50px;
  margin-bottom: 20px;
  color: #dcdfe6;
}

.empty-cart p {
  margin-bottom: 20px;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
}

.cart-item {
  display: flex;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #ebeef5;
}

.item-image {
  width: 60px;
  height: 80px;
  margin-right: 15px;
  overflow: hidden;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.item-info {
  flex: 1;
}

.item-title {
  font-weight: 500;
  margin-bottom: 5px;
}

.item-price {
  color: #f56c6c;
  font-weight: 600;
}

.item-quantity {
  margin: 0 15px;
}

.cart-footer {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cart-total {
  font-size: 16px;
}

.total-price {
  color: #f56c6c;
  font-weight: 600;
  font-size: 18px;
  margin-left: 5px;
}

.search-filter-container {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

.search-input {
  margin-right: 10px;
}

.filter-select {
  margin-right: 10px;
}

.books-container {
  margin-bottom: 20px;
}

.books-grid {
  display: flex;
  flex-wrap: wrap;
}

.book-card {
  width: calc(33.33% - 20px);
  margin: 10px;
}

.book-image {
  height: 160px;
  background-color: var(--background-dark);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border: 1px solid #dcdfe6;
  border-radius: var(--border-radius-small);
}

.book-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-price-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.book-category {
  color: var(--text-secondary);
  margin: 5px 0;
  font-size: 14px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.cart-button-container {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 15px;
}

.cart-button {
  background-color: var(--primary-color);
  color: white;
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.3s, background-color 0.3s;
  cursor: pointer;
}

.cart-button:hover {
  background-color: var(--primary-hover);
  transform: scale(1.1);
}

.cart-badge {
  margin-right: 0;
}

.cart-badge :deep(.el-badge__content) {
  z-index: 1001;
}

.checkout-container {
  padding: 20px;
}

.order-summary {
  margin-bottom: 30px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 15px;
}

.order-items {
  margin-bottom: 15px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #606266;
}

.order-total {
  display: flex;
  justify-content: space-between;
  padding: 15px 0;
  font-size: 16px;
  font-weight: 600;
}

.payment-methods {
  margin-top: 20px;
}

.payment-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.payment-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  transition: background-color var(--transition-normal);
}

.payment-option:hover {
  background-color: #f5f7fa;
}

.active {
  background-color: #f5f7fa;
}

.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
}

.no-payment-method {
  color: #f56c6c;
  font-size: 14px;
  margin-top: 10px;
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
</style>