<template>
  <div class="seller-container">
    <LoadingIndicator :loading="loading" text="加载中..." />
    
    <el-tabs v-model="activeTab" class="seller-tabs">
      <el-tab-pane label="我的图书" name="books">
        <div class="tab-header">
          <h2>我的图书</h2>
          <el-button type="primary" @click="showAddBookDialog">添加新书</el-button>
        </div>
        
        <div v-if="books.length === 0 && !loading" class="empty-state">
          <el-empty description="您还没有添加任何图书" />
          <el-button type="primary" @click="showAddBookDialog">添加第一本书</el-button>
        </div>
        
        <el-table v-else :data="books" style="width: 100%" border>
          <el-table-column label="封面" width="100">
            <template #default="scope">
              <div class="book-cover">
                <el-image 
                  :src="getImageUrl(scope.row.image_url || 'default-book.jpg')" 
                  :preview-src-list="[getImageUrl(scope.row.image_url || 'default-book.jpg')]"
                  fit="cover"
                  @load="handleImageLoaded('表格图片', scope.row.image_url)" 
                  @error="handleImageError('表格图片', scope.row.image_url)"
                >
                  <template #error>
                    <div class="image-error">
                      <el-icon><Picture /></el-icon>
                      <span>加载失败</span>
                    </div>
                  </template>
                </el-image>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="书名" />
          <el-table-column prop="author" label="作者" />
          <el-table-column prop="price" label="价格">
            <template #default="scope">
              ¥{{ scope.row.price }}
            </template>
          </el-table-column>
          <el-table-column prop="stock" label="库存" />
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button size="small" @click="editBook(scope.row)">编辑</el-button>
              <el-button size="small" type="danger" @click="confirmDeleteBook(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      
      <el-tab-pane label="订单管理" name="orders">
        <div class="tab-header">
          <h2>订单管理</h2>
        </div>
        
        <div v-if="orders.length === 0 && !loading" class="empty-state">
          <el-empty description="暂无订单" />
        </div>
        
        <el-table v-else :data="orders" style="width: 100%" border>
          <el-table-column prop="id" label="订单ID" width="80" />
          <el-table-column prop="buyer.username" label="买家" />
          <el-table-column prop="book.title" label="图书" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="total_price" label="金额">
            <template #default="scope">
              ¥{{ scope.row.total_price }}
            </template>
          </el-table-column>
          <el-table-column prop="payment_method" label="支付方式">
            <template #default="scope">
              {{ scope.row.payment_method === 'alipay' ? '支付宝' : '微信支付' }}
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间">
            <template #default="scope">
              {{ formatDate(scope.row.created_at) }}
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      
      <el-tab-pane label="支付设置" name="payment">
        <div class="tab-header">
          <h2>支付设置</h2>
        </div>
        
        <div class="payment-settings">
          <el-form :model="paymentSettings" label-width="120px">
            <el-form-item label="支付宝收款码">
              <el-upload
                class="payment-code-uploader"
                :action="`${apiUrl}/api/seller/payment-codes`"
                :headers="uploadHeaders"
                :show-file-list="false"
                :on-success="handleAlipayUploadSuccess"
                :on-error="handleUploadError"
                :before-upload="beforeUpload"
                :data="{type: 'alipay'}"
                name="file"
              >
                <img v-if="paymentSettings.alipayCode" :src="getImageUrl(paymentSettings.alipayCode)" class="payment-code-preview" />
                <div v-else class="payment-code-placeholder">
                  <el-icon><Plus /></el-icon>
                  <span>点击上传支付宝收款码</span>
                </div>
              </el-upload>
            </el-form-item>
            
            <el-form-item label="微信支付收款码">
              <el-upload
                class="payment-code-uploader"
                :action="`${apiUrl}/api/seller/payment-codes`"
                :headers="uploadHeaders"
                :show-file-list="false"
                :on-success="handleWechatUploadSuccess"
                :on-error="handleUploadError"
                :before-upload="beforeUpload"
                :data="{type: 'wechat'}"
                name="file"
              >
                <img v-if="paymentSettings.wechatCode" :src="getImageUrl(paymentSettings.wechatCode)" class="payment-code-preview" />
                <div v-else class="payment-code-placeholder">
                  <el-icon><Plus /></el-icon>
                  <span>点击上传微信支付收款码</span>
                </div>
              </el-upload>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 添加/编辑图书对话框 -->
    <el-dialog
      v-model="bookDialogVisible"
      :title="isEditMode ? '编辑图书' : '添加图书'"
      width="50%"
    >
      <el-form :model="bookForm" :rules="bookRules" ref="bookFormRef" label-width="100px">
        <el-form-item label="书名" prop="title">
          <el-input v-model="bookForm.title" placeholder="请输入书名" />
        </el-form-item>
        
        <el-form-item label="作者" prop="author">
          <el-input v-model="bookForm.author" placeholder="请输入作者" />
        </el-form-item>
        
        <el-form-item label="分类" prop="category">
          <el-select v-model="bookForm.category" placeholder="请选择分类">
            <el-option
              v-for="category in categories"
              :key="category"
              :label="category"
              :value="category"
            />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="价格" prop="price">
          <el-input-number v-model="bookForm.price" :precision="2" :step="0.01" :min="0" />
        </el-form-item>
        
        <el-form-item label="库存" prop="stock">
          <el-input-number v-model="bookForm.stock" :min="0" :step="1" />
        </el-form-item>
        
        <el-form-item label="描述" prop="description">
          <el-input v-model="bookForm.description" type="textarea" rows="4" placeholder="请输入图书描述" />
        </el-form-item>
        
        <el-form-item label="封面图片">
          <el-upload
            class="book-cover-uploader"
            :action="`${apiUrl}/api/books/upload`"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleCoverUploadSuccess"
            :on-error="handleUploadError"
            :before-upload="beforeUpload"
            name="file"
            accept="image/jpeg,image/png,image/gif"
          >
            <div v-if="bookForm.image_url" class="image-container">
              <el-image 
                :src="getImageUrl(bookForm.image_url)" 
                :preview-src-list="[getImageUrl(bookForm.image_url)]"
                fit="cover"
                class="book-cover-preview"
                @load="handleImageLoaded('表单图片', bookForm.image_url)" 
                @error="handleImageError('表单图片', bookForm.image_url)"
              >
                <template #error>
                  <div class="image-error">
                    <el-icon><Picture /></el-icon>
                    <span>加载失败</span>
                  </div>
                </template>
              </el-image>
            </div>
            <div v-else class="book-cover-placeholder">
              <el-icon><Plus /></el-icon>
              <span>点击上传封面</span>
            </div>
          </el-upload>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="bookDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitBookForm" :loading="submitting">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Picture, Plus } from '@element-plus/icons-vue';
import LoadingIndicator from '../components/LoadingIndicator.vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

// 创建实例
const router = useRouter();
const authStore = useAuthStore();
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

console.log('API URL:', apiUrl);

// 状态变量
const activeTab = ref('books');
const loading = ref(false);
const submitting = ref(false);
const books = ref([]);
const orders = ref([]);
const categories = ref([]);
const bookDialogVisible = ref(false);
const isEditMode = ref(false);
const bookForm = reactive({
  id: null,
  title: '',
  author: '',
  category: '',
  price: 0,
  stock: 0,
  description: '',
  image_url: ''
});
const bookRules = {
  title: [{ required: true, message: '请输入书名', trigger: 'blur' }],
  author: [{ required: true, message: '请输入作者', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存', trigger: 'blur' }]
};
const paymentSettings = reactive({
  alipayCode: '',
  wechatCode: ''
});
const bookFormRef = ref(null);

// 计算属性
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${authStore.token}`
}));

// 获取图片URL
function getImageUrl(image) {
  if (!image) {
    console.warn('获取图片URL失败: 路径为空');
    const defaultUrl = `${apiUrl}/uploads/default-book.jpg`;
    console.log('使用默认图片URL:', defaultUrl);
    return defaultUrl;
  }
  
  console.log('处理图片路径:', image);
  console.log('当前API URL:', apiUrl);
  
  // 如果已经是完整URL，直接返回
  if (image.startsWith('http')) {
    console.log('使用完整URL:', image);
    return image;
  }
  
  // 默认图片特殊处理
  if (image === 'default-book.jpg') {
    const defaultUrl = `${apiUrl}/uploads/default-book.jpg`;
    console.log('使用默认图片URL:', defaultUrl);
    return defaultUrl;
  }
  
  // 规范化路径
  let normalizedPath = image;
  
  // 移除开头的斜杠
  normalizedPath = normalizedPath.replace(/^\/+/, '');
  
  // 确保路径以uploads开头
  if (!normalizedPath.startsWith('uploads/')) {
    normalizedPath = `uploads/${normalizedPath}`;
  }
  
  // 添加开头的斜杠
  normalizedPath = `/${normalizedPath}`;
  
  console.log('规范化后的路径:', normalizedPath);
  
  // 构建完整URL
  const fullUrl = `${apiUrl}${normalizedPath}`;
  console.log('最终构建的URL:', fullUrl);
  
  // 测试图片是否可访问
  testImageAccess(fullUrl, normalizedPath);
  
  return fullUrl;
}

// 测试图片是否可访问
function testImageAccess(url, originalPath) {
  console.log('测试图片访问:', url);
  // 使用API检查图片路径
  axios.get(`${apiUrl}/api/check-static-path`, {
    params: { path: originalPath }
  })
  .then(response => {
    console.log('图片路径检查结果:', response.data);
  })
  .catch(error => {
    console.error('检查图片路径失败:', error);
  });
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString();
}

// 获取图书列表
async function fetchBooks() {
  loading.value = true;
  try {
    console.log('正在获取图书列表...');
    const response = await axios.get(`${apiUrl}/api/seller/books`);
    console.log('获取图书列表响应:', response.data);
    
    // 详细检查每本书的图片URL
    if (response.data.books && response.data.books.length > 0) {
      response.data.books.forEach((book, index) => {
        console.log(`图书${index+1}:`, {
          id: book.id,
          title: book.title,
          image_url: book.image_url,
          full_image_url: book.image_url ? getImageUrl(book.image_url) : '无图片'
        });
      });
    }
    
    books.value = response.data.books || [];
  } catch (error) {
    console.error('获取图书列表失败:', error);
    ElMessage.error('获取图书列表失败');
  } finally {
    loading.value = false;
  }
}

// 获取订单列表
async function fetchOrders() {
  loading.value = true;
  try {
    console.log('正在获取订单列表...');
    const response = await axios.get(`${apiUrl}/api/seller/orders`);
    console.log('获取订单列表响应:', response.data);
    orders.value = response.data.orders || [];
  } catch (error) {
    console.error('获取订单列表失败:', error);
    ElMessage.error('获取订单列表失败');
  } finally {
    loading.value = false;
  }
}

// 获取分类列表
async function fetchCategories() {
  try {
    const response = await axios.get(`${apiUrl}/api/books/categories`);
    categories.value = response.data.categories;
  } catch (error) {
    console.error('获取分类列表失败:', error);
  }
}

// 获取支付设置
async function fetchPaymentSettings() {
  loading.value = true;
  try {
    console.log('正在获取支付设置...');
    const response = await axios.get(`${apiUrl}/api/seller/payment-codes`);
    console.log('获取支付设置响应:', response.data);
    if (response.data.alipay) {
      paymentSettings.alipayCode = response.data.alipay;
    }
    if (response.data.wechat) {
      paymentSettings.wechatCode = response.data.wechat;
    }
  } catch (error) {
    console.error('获取支付设置失败:', error);
    ElMessage.error('获取支付设置失败');
  } finally {
    loading.value = false;
  }
}

// 显示添加图书对话框
function showAddBookDialog() {
  isEditMode.value = false;
  resetBookForm();
  bookDialogVisible.value = true;
}

// 编辑图书
function editBook(book) {
  isEditMode.value = true;
  Object.assign(bookForm, book);
  bookDialogVisible.value = true;
}

// 确认删除图书
function confirmDeleteBook(book) {
  ElMessageBox.confirm(`确定要删除《${book.title}》吗？此操作不可恢复。`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    deleteBook(book.id);
  }).catch(() => {});
}

// 删除图书
async function deleteBook(id) {
  loading.value = true;
  try {
    await axios.delete(`${apiUrl}/api/books/${id}`);
    ElMessage.success('删除成功');
    fetchBooks();
  } catch (error) {
    console.error('删除图书失败:', error);
    ElMessage.error('删除图书失败');
  } finally {
    loading.value = false;
  }
}

// 重置图书表单
function resetBookForm() {
  bookForm.id = null;
  bookForm.title = '';
  bookForm.author = '';
  bookForm.category = '';
  bookForm.price = 0;
  bookForm.stock = 0;
  bookForm.description = '';
  bookForm.image_url = '';
}

// 提交图书表单
async function submitBookForm() {
  if (!bookFormRef.value) return;
  
  await bookFormRef.value.validate(async (valid) => {
    if (!valid) {
      console.error('表单验证失败');
      return;
    }
    
    submitting.value = true;
    console.log('提交图书表单:', bookForm);
    
    try {
      // 准备要发送的数据，确保包含所有必要字段
      const bookData = {
        title: bookForm.title,
        author: bookForm.author,
        category: bookForm.category,
        price: bookForm.price,
        stock: bookForm.stock,
        description: bookForm.description || '',
        image_url: bookForm.image_url
      };
      
      if (isEditMode.value) {
        // 更新图书
        console.log(`更新图书 ${bookForm.id}:`, bookData);
        const response = await axios.put(`${apiUrl}/api/books/${bookForm.id}`, bookData);
        console.log('更新图书响应:', response.data);
        ElMessage.success('更新成功');
      } else {
        // 添加图书
        console.log('添加新图书:', bookData);
        const response = await axios.post(`${apiUrl}/api/books`, bookData);
        console.log('添加图书响应:', response.data);
        ElMessage.success('添加成功');
      }
      bookDialogVisible.value = false;
      fetchBooks();
    } catch (error) {
      console.error('提交图书表单失败:', error);
      if (error.response) {
        console.error('服务器响应:', error.response.status, error.response.data);
        const errorMessage = error.response.data?.message || '操作失败，请重试';
        ElMessage.error(errorMessage);
      } else {
        ElMessage.error('操作失败，请重试');
      }
    } finally {
      submitting.value = false;
    }
  });
}

// 上传前检查
function beforeUpload(file) {
  const isImage = file.type.startsWith('image/');
  const isLt2M = file.size / 1024 / 1024 < 2;
  
  if (!isImage) {
    ElMessage.error('只能上传图片文件!');
    return false;
  }
  
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!');
    return false;
  }
  
  return true;
}

// 处理封面上传成功
function handleCoverUploadSuccess(response) {
  console.log('封面上传成功，完整响应:', response);
  if (response && response.path) {
    bookForm.image_url = response.path;
    console.log('设置封面路径:', bookForm.image_url);
    console.log('构建的完整URL:', getImageUrl(bookForm.image_url));
  } else {
    console.error('封面上传响应中缺少path字段:', response);
  }
  ElMessage.success('上传成功');
}

// 处理支付宝收款码上传成功
function handleAlipayUploadSuccess(response) {
  paymentSettings.alipayCode = response.path;
  ElMessage.success('支付宝收款码上传成功');
}

// 处理微信收款码上传成功
function handleWechatUploadSuccess(response) {
  paymentSettings.wechatCode = response.path;
  ElMessage.success('微信收款码上传成功');
}

// 处理上传错误
function handleUploadError(error, file) {
  console.error('上传失败:', error, file);
  let errorMsg = '上传失败，请重试';
  
  if (error && error.response) {
    try {
      const response = JSON.parse(error.response);
      errorMsg = response.message || errorMsg;
    } catch (e) {
      errorMsg = `上传失败: ${error.status || '未知错误'}`;
    }
  }
  
  ElMessage.error(errorMsg);
}

// 添加图片加载事件处理函数
function handleImageLoaded(tag, path) {
  console.log(`✅ 图片加载成功 [${tag}]:`, path);
}

function handleImageError(tag, path) {
  console.error(`❌ 图片加载失败 [${tag}]:`, path);
  console.error('完整URL:', getImageUrl(path));
  
  // 测试服务器静态资源路径
  axios.get(`${apiUrl}/api/test-uploads`)
    .then(response => {
      console.log('上传目录测试结果:', response.data);
    })
    .catch(error => {
      console.error('测试上传目录失败:', error);
    });
}

// 监听标签页变化
function handleTabChange() {
  if (activeTab.value === 'books') {
    fetchBooks();
  } else if (activeTab.value === 'orders') {
    fetchOrders();
  } else if (activeTab.value === 'payment') {
    fetchPaymentSettings();
  }
}

// 组件挂载时获取数据
onMounted(() => {
  console.log('卖家组件已挂载');
  
  // 测试静态资源访问
  console.log('测试静态资源访问...');
  const testImageUrl = `${apiUrl}/uploads/test.jpg`;
  console.log('测试图片URL:', testImageUrl);
  
  // 创建一个图片元素来测试
  const testImg = new Image();
  testImg.onload = () => console.log('✅ 测试图片加载成功:', testImageUrl);
  testImg.onerror = () => console.error('❌ 测试图片加载失败:', testImageUrl);
  testImg.src = testImageUrl;
  
  // 使用API检查静态路径
  axios.get(`${apiUrl}/api/check-static-path`)
    .then(response => {
      console.log('静态路径检查结果:', response.data);
    })
    .catch(error => {
      console.error('静态路径检查失败:', error);
    });
  
  activeTab.value = 'books'; // 确保默认选中图书标签
  fetchBooks();
  fetchCategories();
  
  // 监听标签页变化
  watch(activeTab, (newTab) => {
    console.log('标签页切换到:', newTab);
    handleTabChange();
  });
});
</script>

<style scoped>
.seller-container {
  padding: 20px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tab-header h2 {
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.book-cover {
  width: 60px;
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
  border-radius: 4px;
  overflow: hidden;
}

.book-cover img,
.book-cover .el-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-container {
  width: 100%;
  height: 100%;
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
}

.image-error .el-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.book-cover-uploader,
.payment-code-uploader {
  display: flex;
  justify-content: center;
  align-items: center;
}

.book-cover-preview,
.payment-code-preview {
  width: 150px;
  height: 200px;
  object-fit: cover;
  border-radius: 4px;
}

.book-cover-placeholder,
.payment-code-placeholder {
  width: 150px;
  height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  background-color: #fafafa;
  cursor: pointer;
}

.payment-code-placeholder {
  width: 200px;
  height: 200px;
}

.book-cover-placeholder:hover,
.payment-code-placeholder:hover {
  border-color: #409eff;
}

.payment-code-tips {
  margin-top: 10px;
  color: #909399;
  font-size: 12px;
}

.payment-settings {
  max-width: 600px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .book-cover-preview,
  .payment-code-preview,
  .book-cover-placeholder,
  .payment-code-placeholder {
    width: 120px;
    height: 160px;
  }
  
  .payment-code-preview,
  .payment-code-placeholder {
    width: 160px;
    height: 160px;
  }
}
</style>