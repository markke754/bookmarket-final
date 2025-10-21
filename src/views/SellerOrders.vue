<template>
  <div class="seller-orders-container">
    <LoadingIndicator :loading="loading" text="加载中..." />
    
    <h2>订单管理</h2>
    
    <div v-if="orders.length === 0 && !loading" class="empty-state">
      <el-empty description="暂无订单" />
    </div>
    
    <div v-else class="orders-table">
      <el-table :data="orders" style="width: 100%" border>
        <el-table-column prop="id" label="订单ID" width="80" />
        
        <el-table-column label="图书信息" min-width="250">
          <template #default="scope">
            <div class="book-info">
              <el-image 
                :src="getImageUrl(scope.row.book.image_url || 'default-book.jpg')" 
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
                <h3>{{ scope.row.book.title }}</h3>
                <p>作者: {{ scope.row.book.author }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="buyer.username" label="买家" />
        
        <el-table-column prop="quantity" label="数量" width="80" />
        
        <el-table-column prop="total_price" label="金额">
          <template #default="scope">
            ¥{{ scope.row.total_price }}
          </template>
        </el-table-column>
        
        <el-table-column prop="payment_method" label="支付方式">
          <template #default="scope">
            {{ getPaymentMethodText(scope.row.payment_method) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="created_at" label="创建时间">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button 
              v-if="scope.row.status === 'paid'" 
              size="small" 
              type="primary"
              @click="updateOrderStatus(scope.row.id, 'shipped')"
            >
              标记为已发货
            </el-button>
            <el-button 
              v-if="scope.row.status === 'shipped'" 
              size="small" 
              type="success"
              @click="updateOrderStatus(scope.row.id, 'completed')"
            >
              完成订单
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Picture } from '@element-plus/icons-vue';
import axios from 'axios';
import LoadingIndicator from '../components/LoadingIndicator.vue';

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
    const response = await axios.get(`${apiUrl}/api/seller/orders`, {
      params: {
        page,
        limit: pageSize.value
      }
    });
    
    orders.value = response.data.orders || [];
    totalOrders.value = response.data.total || 0;
    totalPages.value = response.data.pages || 0;
  } catch (error) {
    console.error('获取订单列表失败:', error);
    ElMessage.error('获取订单列表失败');
  } finally {
    loading.value = false;
  }
}

// 更新订单状态
async function updateOrderStatus(orderId, status) {
  try {
    await axios.put(`${apiUrl}/api/seller/orders/${orderId}/status`, { status });
    ElMessage.success('订单状态更新成功');
    fetchOrders(currentPage.value);
  } catch (error) {
    console.error('更新订单状态失败:', error);
    ElMessage.error('更新订单状态失败');
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

// 获取状态标签类型
function getStatusType(status) {
  const statusMap = {
    'pending': 'warning',
    'paid': 'primary',
    'shipped': 'success',
    'completed': 'success',
    'cancelled': 'danger'
  };
  return statusMap[status] || 'info';
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
.seller-orders-container {
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

.book-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.book-cover {
  width: 60px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
}

.book-details h3 {
  margin: 0 0 5px 0;
  font-size: 14px;
}

.book-details p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
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
</style> 