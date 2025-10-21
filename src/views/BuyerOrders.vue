<template>
  <div class="buyer-orders-container">
    <LoadingIndicator :loading="loading" text="加载中..." />
    
    <h2>我的订单</h2>
    
    <div v-if="orders.length === 0 && !loading" class="empty-state">
      <el-empty description="您还没有订单记录" />
    </div>
    
    <div v-else class="orders-list">
      <el-card v-for="order in orders" :key="order.id" class="order-card" shadow="hover">
        <div class="order-header">
          <span class="order-number">订单号: {{ order.id }}</span>
          <span class="order-date">{{ formatDate(order.created_at) }}</span>
        </div>
        
        <div class="order-content">
          <div class="book-info">
            <el-image 
              :src="getImageUrl(order.book.image_url || 'default-book.jpg')" 
              fit="cover"
              class="book-cover"
            >
              <template #error>
                <div class="image-error">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
            <div class="book-details">
              <h3>{{ order.book.title }}</h3>
              <p>作者: {{ order.book.author }}</p>
              <p>数量: {{ order.quantity }} 本</p>
            </div>
          </div>
          
          <div class="order-info">
            <p class="order-total">总价: ¥{{ order.total_price }}</p>
            <p class="order-status">状态: {{ getStatusText(order.status) }}</p>
            <p class="payment-method">支付方式: {{ getPaymentMethodText(order.payment_method) }}</p>
          </div>
        </div>
      </el-card>
    </div>
    
    <div class="pagination-container" v-if="totalPages > 1">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        layout="prev, pager, next"
        :total="totalOrders"
        @current-change="fetchOrders"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Picture } from '@element-plus/icons-vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import LoadingIndicator from '../components/LoadingIndicator.vue';

const authStore = useAuthStore();
const apiUrl = import.meta.env.VITE_API_URL;
const loading = ref(false);
const orders = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const totalOrders = ref(0);
const totalPages = ref(0);

// 获取订单列表
async function fetchOrders(page = 1) {
  loading.value = true;
  
  try {
    console.log('正在获取买家订单，用户信息:', {
      token存在: !!authStore.token,
      tokenLength: authStore.token?.length,
      isAuthenticated: authStore.isAuthenticated,
      role: authStore.user?.role,
      userId: authStore.user?.id
    });
    
    // 确保用户已登录且token有效
    if (!authStore.token || !authStore.isAuthenticated) {
      console.log('检测到用户未登录或Token无效，尝试刷新认证状态');
      await authStore.checkAuth();
      
      if (!authStore.isAuthenticated) {
        throw new Error('用户未登录或会话已过期');
      }
    }
    
    // 确保用户是买家角色
    if (authStore.user?.role !== 'buyer') {
      ElMessage.error(`您的账户角色是 ${authStore.user?.role || '未知'}，需要买家角色才能查看订单`);
      loading.value = false;
      return;
    }
    
    console.log('开始发送API请求获取订单');
    const response = await axios.get(`${apiUrl}/api/orders/buyer`, {
      params: {
        page,
        limit: pageSize.value
      },
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    });
    
    console.log('获取订单列表响应:', response.data);
    
    // 初始化为空数组，确保视图正确更新
    orders.value = [];
    totalOrders.value = 0;
    totalPages.value = 0;
    
    // 检查响应数据结构
    if (response.data && typeof response.data === 'object') {
      // 处理返回的订单列表
      if (Array.isArray(response.data.orders)) {
        orders.value = response.data.orders;
      } else if (response.data.orders === null) {
        console.log('服务器返回了null订单列表，处理为空数组');
        orders.value = [];
      }
      
      // 处理分页信息
      if (typeof response.data.total === 'number') {
        totalOrders.value = response.data.total;
      }
      
      if (typeof response.data.pages === 'number') {
        totalPages.value = response.data.pages;
      }
      
      console.log('处理后的订单数据:', {
        订单数量: orders.value.length,
        总记录数: totalOrders.value,
        总页数: totalPages.value
      });
    } else {
      console.error('响应格式不正确:', response.data);
    }
  } catch (error) {
    console.error('获取订单列表失败:', error);
    console.error('详细错误信息:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      message: error.message
    });
    
    // 更精确的错误处理
    if (error.response) {
      // 服务器返回了错误
      const status = error.response.status;
      const errorData = error.response.data;
      
      // 如果是403错误，检查是否因为角色问题
      if (status === 403) {
        const currentRole = errorData?.currentRole;
        if (currentRole) {
          if (currentRole !== 'buyer') {
            ElMessage.error(`权限错误: 您的账户角色是 ${currentRole}，但需要买家角色才能查看订单`);
          } else {
            // 如果角色是正确的buyer但仍403，可能是授权问题
            ElMessage.error('授权验证失败，请尝试重新登录');
          }
        } else {
          ElMessage.error('没有权限访问订单列表，请确认您是买家账号');
        }
      } else if (status === 401) {
        // 401表示未认证
        ElMessage.error('会话已过期，请重新登录');
        // 重新登录后跳转回当前页面
        authStore.logout();
      } else if (status === 404) {
        // 找不到资源
        ElMessage.error('获取订单列表失败: 请求的资源不存在');
      } else if (status === 500) {
        // 服务器内部错误
        ElMessage.error('服务器内部错误，请稍后重试');
      } else if (errorData?.message) {
        // 其他有消息的错误
        ElMessage.error(errorData.message);
      } else {
        // 其他HTTP错误
        ElMessage.error(`获取订单列表失败: HTTP错误 ${status}`);
      }
    } else if (error.request) {
      // 发送请求但没有收到响应
      ElMessage.error('服务器无响应，请检查网络连接');
    } else {
      // 请求设置出错
      ElMessage.error('获取订单列表失败: ' + error.message);
    }
    
    // 确保即使出错也设置空列表，避免显示旧数据
    orders.value = [];
  } finally {
    loading.value = false;
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

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    'pending': '待付款',
    'paid': '已付款',
    'shipped': '已发货',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return statusMap[status] || status;
}

// 获取支付方式文本
function getPaymentMethodText(method) {
  const methodMap = {
    'alipay': '支付宝',
    'wechat': '微信支付',
    'credit_card': '信用卡'
  };
  return methodMap[method] || method;
}

// 获取图片URL
function getImageUrl(image) {
  if (!image) {
    return `${apiUrl}/uploads/default-book.jpg`;
  }
  
  if (image.startsWith('http')) {
    return image;
  }
  
  if (image === 'default-book.jpg') {
    return `${apiUrl}/uploads/default-book.jpg`;
  }
  
  let normalizedPath = image;
  if (!normalizedPath.startsWith('/uploads/') && !normalizedPath.startsWith('uploads/')) {
    normalizedPath = `/uploads/${normalizedPath.replace(/^\/+/, '')}`;
  } else if (normalizedPath.startsWith('uploads/')) {
    normalizedPath = `/${normalizedPath}`;
  }
  
  return `${apiUrl}${normalizedPath}`;
}

onMounted(() => {
  fetchOrders();
});
</script>

<style scoped>
.buyer-orders-container {
  max-width: 1200px;
  margin: 80px auto 40px;
  padding: 0 20px;
}

h2 {
  margin-bottom: 20px;
  color: var(--text-primary);
}

.empty-state {
  margin: 40px 0;
  text-align: center;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.order-card {
  border-radius: 8px;
  overflow: hidden;
}

.order-header {
  display: flex;
  justify-content: space-between;
  padding-bottom: 15px;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--border-color-light);
}

.order-number {
  font-weight: bold;
  color: var(--text-primary);
}

.order-date {
  color: var(--text-secondary);
}

.order-content {
  display: flex;
  justify-content: space-between;
}

.book-info {
  display: flex;
  gap: 20px;
}

.book-cover {
  width: 80px;
  height: 120px;
  border-radius: 4px;
  overflow: hidden;
}

.book-details h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
}

.book-details p {
  margin: 5px 0;
  color: var(--text-secondary);
}

.order-info {
  text-align: right;
}

.order-total {
  font-size: 18px;
  font-weight: bold;
  color: var(--price-color);
}

.order-status, .payment-method {
  color: var(--text-secondary);
}

.pagination-container {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}

.image-error {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background-color: #f5f7fa;
  color: #909399;
}

@media (max-width: 768px) {
  .order-content {
    flex-direction: column;
  }
  
  .book-info {
    margin-bottom: 15px;
  }
  
  .order-info {
    text-align: left;
  }
}
</style> 