<template>
  <div class="admin-container">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <i class="el-icon-s-tools header-icon"></i>
            <span class="card-header-title">管理员控制台</span>
          </div>
          <el-button type="danger" plain @click="handleLogout" class="logout-btn">
            <i class="el-icon-switch-button"></i> 退出登录
          </el-button>
        </div>
      </template>
      
      <el-tabs type="border-card" class="admin-tabs" v-model="activeTab">
        <el-tab-pane label="管理员注册" name="register">
          <div class="tab-content">
            <h3 class="section-title">创建新管理员账号</h3>
            <p class="section-desc">仅限有权限的管理员创建新的管理员账号</p>
            
            <el-form @submit.prevent="handleAdminRegister" class="admin-register-form" label-position="top">
              <el-form-item label="用户名">
                <el-input v-model="newAdmin.username" placeholder="请输入用户名" prefix-icon="el-icon-user" />
              </el-form-item>
              
              <el-form-item label="密码">
                <el-input v-model="newAdmin.password" type="password" placeholder="请输入密码" prefix-icon="el-icon-lock" show-password />
              </el-form-item>
              
              <el-form-item label="邮箱">
                <el-input v-model="newAdmin.email" placeholder="请输入邮箱" prefix-icon="el-icon-message" />
              </el-form-item>

              <!-- 添加密钥设置部分 -->
              <el-divider>密钥设置（可选）</el-divider>
              <div class="key-setting-section">
                <el-form-item label="公钥X分量">
                  <el-input v-model="newAdmin.pubKeyX" placeholder="请输入公钥X分量" />
                </el-form-item>
                
                <el-form-item label="公钥Y分量">
                  <el-input v-model="newAdmin.pubKeyY" placeholder="请输入公钥Y分量" />
                </el-form-item>
                
                <el-form-item label="PIN码">
                  <el-input v-model="newAdmin.pinCode" type="password" placeholder="请输入PIN码" show-password />
                </el-form-item>
                
                <el-alert
                  title="安全提示"
                  type="info"
                  description="设置密钥后，该管理员登录时将需要USB Key验证。如不设置，将使用默认验证方式。"
                  :closable="false"
                />
              </div>
              
              <el-form-item>
                <el-button type="primary" native-type="submit" :loading="registerLoading" class="register-button">
                  <i class="el-icon-plus"></i> 创建管理员账号
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="用户管理" name="users">
          <div class="tab-content">
            <h3 class="section-title">系统用户管理</h3>
            <p class="section-desc">查看和管理所有注册用户</p>
            
            <div class="table-toolbar">
              <el-input placeholder="搜索用户..." v-model="userSearchQuery" class="search-input" prefix-icon="el-icon-search"></el-input>
              <el-select v-model="userRoleFilter" placeholder="角色筛选" clearable class="role-filter">
                <el-option label="全部角色" value=""></el-option>
                <el-option label="管理员" value="admin"></el-option>
                <el-option label="卖家" value="seller"></el-option>
                <el-option label="买家" value="buyer"></el-option>
              </el-select>
            </div>
            
            <el-table 
              :data="filteredUsers" 
              style="width: 100%" 
              border 
              stripe
              highlight-current-row
              class="data-table"
            >
              <el-table-column prop="username" label="用户名" min-width="120">
                <template #default="{ row }">
                  <div class="user-cell">
                    <i class="el-icon-user user-icon"></i>
                    <span>{{ row.username }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="role" label="角色" width="120">
                <template #default="{ row }">
                  <el-tag 
                    :type="row.role === 'admin' ? 'danger' : row.role === 'seller' ? 'warning' : 'success'"
                    size="medium"
                    effect="dark"
                  >
                    {{ row.role === 'admin' ? '管理员' : row.role === 'seller' ? '卖家' : '买家' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="email" label="邮箱" min-width="180" />
              <el-table-column prop="created_at" label="注册时间" min-width="180">
                <template #default="{ row }">
                  <i class="el-icon-time"></i> {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="{ row }">
                  <el-button 
                    type="danger" 
                    size="small" 
                    icon="el-icon-delete" 
                    circle 
                    title="删除用户"
                    @click="confirmDeleteUser(row)"
                    :disabled="row.id === authStore.user?.id || row.role === 'admin'"
                  ></el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <el-empty v-if="filteredUsers.length === 0" description="暂无用户数据" class="empty-state" />
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="公告管理" name="announcements">
          <div class="tab-content">
            <h3 class="section-title">系统公告管理</h3>
            <p class="section-desc">发布和管理系统公告</p>
            
            <el-form @submit.prevent="publishAnnouncement" class="announcement-form">
              <el-form-item label="公告内容">
                <el-input 
                  v-model="newAnnouncement.content" 
                  type="textarea" 
                  :rows="4" 
                  placeholder="请输入公告内容..." 
                  maxlength="1000" 
                  show-word-limit
                ></el-input>
              </el-form-item>
              
              <el-form-item>
                <el-button 
                  type="primary" 
                  native-type="submit" 
                  :loading="announcementLoading" 
                  class="publish-button"
                >
                  <i class="el-icon-s-promotion"></i> 发布公告
                </el-button>
              </el-form-item>
            </el-form>
            
            <div class="announcement-list">
              <h4 class="list-title">历史公告</h4>
              
              <el-timeline>
                <el-timeline-item
                  v-for="announcement in announcements"
                  :key="announcement.id"
                  :timestamp="formatDate(announcement.created_at)"
                  placement="top"
                  type="primary"
                  size="large"
                >
                  <el-card class="announcement-card">
                    <template #header>
                      <div class="announcement-header">
                        <span class="admin-name">
                          <i class="el-icon-user"></i> {{ announcement.admin_username }}
                        </span>
                      </div>
                    </template>
                    <div class="announcement-content">{{ announcement.content }}</div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
              
              <el-empty 
                v-if="announcements.length === 0" 
                description="暂无公告" 
                class="empty-state"
              />
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="订单管理" name="orders">
          <div class="tab-content">
            <h3 class="section-title">订单管理系统</h3>
            <p class="section-desc">查看和管理所有用户订单</p>
            
            <div class="table-toolbar">
              <el-input placeholder="搜索订单..." v-model="orderSearchQuery" class="search-input" prefix-icon="el-icon-search"></el-input>
              <el-select v-model="orderStatusFilter" placeholder="状态筛选" clearable class="status-filter">
                <el-option label="全部状态" value=""></el-option>
                <el-option label="待处理" value="pending"></el-option>
                <el-option label="已完成" value="completed"></el-option>
              </el-select>
            </div>
            
            <el-table 
              :data="filteredOrders" 
              style="width: 100%" 
              border 
              stripe
              highlight-current-row
              class="data-table"
            >
              <el-table-column prop="id" label="订单ID" width="100">
                <template #default="{ row }">
                  <span class="order-id">#{{ row.id }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="buyer_id" label="买家ID" width="100" />
              <el-table-column prop="total_price" label="总价" width="120">
                <template #default="{ row }">
                  <span class="price">¥{{ formatPrice(row.total_price) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="120">
                <template #default="{ row }">
                  <el-tag 
                    :type="row.status === 'completed' ? 'success' : row.status === 'pending' ? 'warning' : 'info'"
                    size="medium"
                    effect="dark"
                  >
                    {{ row.status === 'completed' ? '已完成' : row.status === 'pending' ? '待处理' : row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="创建时间" min-width="180">
                <template #default="{ row }">
                  <i class="el-icon-time"></i> {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" size="small" icon="el-icon-view" circle title="查看详情"></el-button>
                  <el-button 
                    :type="row.status === 'pending' ? 'success' : 'info'" 
                    size="small" 
                    :icon="row.status === 'pending' ? 'el-icon-check' : 'el-icon-refresh'" 
                    circle
                    :title="row.status === 'pending' ? '标记为完成' : '重置状态'"
                  ></el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <el-empty v-if="filteredOrders.length === 0" description="暂无订单数据" class="empty-state" />
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="图书管理" name="books">
          <div class="tab-content">
            <h3 class="section-title">图书管理系统</h3>
            <p class="section-desc">查看和管理所有图书信息</p>
            
            <div class="table-toolbar">
              <el-input placeholder="搜索图书..." v-model="bookSearchQuery" class="search-input" prefix-icon="el-icon-search"></el-input>
              <el-select v-model="bookCategoryFilter" placeholder="分类筛选" clearable class="category-filter">
                <el-option label="全部分类" value=""></el-option>
                <el-option label="小说" value="小说"></el-option>
                <el-option label="教育" value="教育"></el-option>
                <el-option label="文学" value="文学"></el-option>
                <el-option label="科技" value="科技"></el-option>
              </el-select>
            </div>
            
            <el-table 
              :data="filteredBooks" 
              style="width: 100%" 
              border 
              stripe
              highlight-current-row
              class="data-table"
            >
              <el-table-column prop="id" label="图书ID" width="80" />
              <el-table-column prop="title" label="书名" min-width="180" />
              <el-table-column prop="author" label="作者" width="120" />
              <el-table-column prop="category" label="分类" width="100">
                <template #default="{ row }">
                  <el-tag size="small">{{ row.category || '未分类' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="price" label="价格" width="100">
                <template #default="{ row }">
                  <span class="price">¥{{ formatPrice(row.price) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="stock" label="库存" width="80" />
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" size="small" icon="el-icon-view" circle title="查看详情" @click="viewBookDetail(row)"></el-button>
                  <el-button type="danger" size="small" icon="el-icon-delete" circle title="删除图书" @click="confirmDeleteBook(row)"></el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <el-empty v-if="filteredBooks.length === 0" description="暂无图书数据" class="empty-state" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter, useRoute } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const users = ref([]);
const orders = ref([]);
const books = ref([]);
const registerLoading = ref(false);
const logoutLoading = ref(false);
const newAdmin = ref({
  username: '',
  password: '',
  email: '',
  pubKeyX: '', // 新增公钥X分量
  pubKeyY: '', // 新增公钥Y分量
  pinCode: ''  // 新增PIN码
});

// 标签页激活名称
const activeTab = ref('register');

// 根据路由设置激活的标签页
function setActiveTabFromRoute() {
  if (route.meta.activeTab) {
    activeTab.value = route.meta.activeTab;
  } else if (route.path === '/admin') {
    activeTab.value = 'register';
  }
}

// 路由变化时更新标签页
watch(() => route.path, () => {
  setActiveTabFromRoute();
});

// 标签页变化时更新路由
watch(activeTab, (newTabName) => {
  if (newTabName === 'register' && route.path !== '/admin') {
    router.push('/admin');
  } else if (newTabName === 'users' && route.path !== '/admin/users') {
    router.push('/admin/users');
  } else if (newTabName === 'books' && route.path !== '/admin/books') {
    router.push('/admin/books');
  } else if (newTabName === 'orders' && route.path !== '/admin/orders') {
    router.push('/admin/orders');
  } else if (newTabName === 'announcements' && route.path !== '/admin/announcements') {
    router.push('/admin/announcements');
  }
});

// 搜索和筛选
const userSearchQuery = ref('');
const userRoleFilter = ref('');
const orderSearchQuery = ref('');
const orderStatusFilter = ref('');
const bookSearchQuery = ref('');
const bookCategoryFilter = ref('');

// 计算筛选后的用户列表
const filteredUsers = computed(() => {
  return users.value.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(userSearchQuery.value.toLowerCase()) ||
                         user.email.toLowerCase().includes(userSearchQuery.value.toLowerCase());
    const matchesRole = !userRoleFilter.value || user.role === userRoleFilter.value;
    return matchesSearch && matchesRole;
  });
});

// 计算筛选后的订单列表
const filteredOrders = computed(() => {
  return orders.value.filter(order => {
    const matchesSearch = order.id.toString().includes(orderSearchQuery.value) ||
                         order.buyer_id.toString().includes(orderSearchQuery.value);
    const matchesStatus = !orderStatusFilter.value || order.status === orderStatusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

// 计算筛选后的图书列表
const filteredBooks = computed(() => {
  return books.value.filter(book => {
    const matchesSearch = (book.title && book.title.toLowerCase().includes(bookSearchQuery.value.toLowerCase())) ||
                         (book.author && book.author.toLowerCase().includes(bookSearchQuery.value.toLowerCase()));
    const matchesCategory = !bookCategoryFilter.value || book.category === bookCategoryFilter.value;
    return matchesSearch && matchesCategory;
  });
});

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

// 格式化价格
function formatPrice(price) {
  return Number(price).toFixed(2);
}

onMounted(() => {
  // 设置初始标签页
  setActiveTabFromRoute();
  
  // 加载数据
  fetchData();
});

async function fetchData() {
  try {
    console.log('正在加载管理员数据...');
    const [usersRes, ordersRes, booksRes, announcementsRes] = await Promise.all([
      axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/users`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }),
      axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/orders`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }),
      axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/books`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }),
      axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/announcements`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      })
    ]);
    console.log('用户数据加载成功:', usersRes.data.length);
    console.log('订单数据加载成功:', ordersRes.data.length);
    console.log('图书数据加载成功:', booksRes.data.length);
    console.log('公告数据加载成功:', announcementsRes.data.length);
    users.value = usersRes.data;
    orders.value = ordersRes.data;
    books.value = booksRes.data.books || [];
    announcements.value = announcementsRes.data;
  } catch (error) {
    console.error('获取数据失败:', error);
    let errorMessage = '获取数据失败';
    
    if (error.response) {
      if (error.response.status === 403) {
        errorMessage = '权限不足，只有管理员可以访问此页面';
      } else if (error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
    } else if (error.request) {
      errorMessage = '无法连接到服务器，请检查网络连接';
    } else {
      errorMessage = `请求错误: ${error.message}`;
    }
    
    ElMessage.error(errorMessage);
  }
}

async function handleAdminRegister() {
  if (!newAdmin.value.username || !newAdmin.value.password || !newAdmin.value.email) {
    ElMessage.warning('请填写所有必填字段');
    return;
  }
  
  // 密钥信息验证：如果填写了部分密钥信息，则必须填写完整
  if ((newAdmin.value.pubKeyX || newAdmin.value.pubKeyY || newAdmin.value.pinCode) && 
      (!newAdmin.value.pubKeyX || !newAdmin.value.pubKeyY || !newAdmin.value.pinCode)) {
    ElMessage.warning('如果要设置密钥，请填写完整的公钥X分量、公钥Y分量和PIN码');
    return;
  }
  
  registerLoading.value = true;
  try {
    const response = await axios.post('http://localhost:3000/api/admin/register', {
      ...newAdmin.value,
      role: 'admin'
    }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    
    if (response.data.success) {
      ElMessage.success('管理员账号创建成功' + (response.data.hasKeyInfo ? '，并已设置密钥' : ''));
      // 重置表单
      newAdmin.value = {
        username: '',
        password: '',
        email: '',
        pubKeyX: '',
        pubKeyY: '',
        pinCode: ''
      };
      // 刷新用户列表
      const usersRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/users`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      users.value = usersRes.data;
    } else {
      ElMessage.error(response.data.message || '创建失败');
    }
  } catch (error) {
    console.error('创建管理员账号失败:', error);
    ElMessage.error('创建管理员账号失败');
  } finally {
    registerLoading.value = false;
  }
}

// 处理退出登录
function handleLogout() {
  try {
    console.log('开始退出登录处理...');
    // 先清除存储和状态
    authStore.logout();
    ElMessage.success('退出登录成功');
    console.log('状态已清除，准备跳转到登录页...');
    
    // 确保在下一个事件循环中进行路由跳转
    setTimeout(() => {
      router.push({ path: '/login', replace: true });
      console.log('路由跳转到登录页面已执行');
    }, 0);
  } catch (error) {
    console.error('退出登录失败:', error);
    ElMessage.error('退出登录失败，请重试');
  }
}

// 确认删除用户
function confirmDeleteUser(user) {
  ElMessageBox.confirm(
    `确定要删除用户 ${user.username} 吗？此操作不可恢复。`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      closeOnClickModal: false
    }
  )
    .then(() => {
      deleteUser(user);
    })
    .catch(() => {
      ElMessage.info('已取消删除');
    });
}

// 删除用户
async function deleteUser(user) {
  try {
    const response = await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/users/${user.id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    
    if (response.data.success) {
      ElMessage.success('用户删除成功');
      // 刷新用户列表
      const usersRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/users`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      users.value = usersRes.data;
    } else {
      ElMessage.error(response.data.message || '删除失败');
    }
  } catch (error) {
    console.error('删除用户失败:', error);
    let errorMessage = '删除用户失败';
    
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    
    ElMessage.error(errorMessage);
  }
}

// 查看图书详情
function viewBookDetail(book) {
  // 可以跳转到图书详情页或显示详情对话框
  ElMessage.info(`查看图书ID: ${book.id} 的详情`);
}

// 确认删除图书
function confirmDeleteBook(book) {
  ElMessageBox.confirm(
    `确定要删除图书《${book.title}》吗？此操作不可恢复。`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      closeOnClickModal: false
    }
  )
    .then(() => {
      deleteBook(book);
    })
    .catch(() => {
      ElMessage.info('已取消删除');
    });
}

// 删除图书
async function deleteBook(book) {
  try {
    const response = await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/books/admin/${book.id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    
    if (response.data.success) {
      ElMessage.success('图书删除成功');
      // 刷新图书列表
      const booksRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/books`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      books.value = booksRes.data.books || [];
    } else {
      ElMessage.error(response.data.message || '删除失败');
    }
  } catch (error) {
    console.error('删除图书失败:', error);
    let errorMessage = '删除图书失败';
    
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    
    ElMessage.error(errorMessage);
  }
}

// 发布公告
const newAnnouncement = ref({
  content: ''
});
const announcementLoading = ref(false);
const announcements = ref([]);

async function publishAnnouncement() {
  if (!newAnnouncement.value.content) {
    ElMessage.warning('请填写公告内容');
    return;
  }
  
  announcementLoading.value = true;
  try {
    const response = await axios.post('http://localhost:3000/api/admin/announcements', {
      content: newAnnouncement.value.content
    }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    
    if (response.data.success) {
      ElMessage.success('公告发布成功');
      newAnnouncement.value.content = '';
      // 刷新公告列表
      const announcementsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/announcements`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      });
      announcements.value = announcementsRes.data;
    } else {
      ElMessage.error(response.data.message || '发布失败');
    }
  } catch (error) {
    console.error('发布公告失败:', error);
    ElMessage.error('发布公告失败');
  } finally {
    announcementLoading.value = false;
  }
}
</script>

<style scoped>
.admin-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.main-card {
  border-radius: 8px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ffffff;
  padding: 16px 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-icon {
  font-size: 24px;
  margin-right: 10px;
  color: #409EFF;
}

.card-header-title {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.logout-btn {
  font-weight: 500;
}

.admin-tabs {
  margin-top: 0;
  border: none;
  background-color: #ffffff;
  box-shadow: none;
}

.tab-content {
  padding: 20px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.section-desc {
  color: #909399;
  font-size: 14px;
  margin-bottom: 24px;
}

.admin-register-form {
  max-width: 500px;
  margin: 20px auto;
  padding: 30px;
  background-color: #f9fafc;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.register-button {
  width: 100%;
  padding: 12px 0;
  font-size: 16px;
  font-weight: 500;
  margin-top: 10px;
  border-radius: 4px;
}

.table-toolbar {
  display: flex;
  margin-bottom: 20px;
  gap: 16px;
  align-items: center;
}

.search-input {
  max-width: 300px;
}

.role-filter,
.status-filter,
.category-filter {
  width: 140px;
}

.data-table {
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-icon {
  color: #409EFF;
}

.price {
  color: #f56c6c;
  font-weight: 600;
}

.order-id {
  font-weight: 600;
  color: #606266;
}

.empty-state {
  margin: 40px 0;
}

.announcement-form {
  max-width: 800px;
  margin: 20px 0;
  padding: 24px;
  background-color: #f9fafc;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.publish-button {
  padding: 10px 20px;
  font-weight: 500;
}

.announcement-list {
  margin-top: 30px;
}

.list-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.announcement-card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 15px;
}

.announcement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-name {
  font-weight: 600;
  color: #409EFF;
}

.announcement-content {
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
}

@media (max-width: 768px) {
  .admin-container {
    padding: 10px;
  }
  
  .table-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input,
  .role-filter,
  .status-filter,
  .category-filter {
    max-width: none;
    width: 100%;
    margin-bottom: 10px;
  }
}

/* 添加密钥设置部分的样式 */
.key-setting-section {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.key-setting-section .el-alert {
  margin-top: 15px;
}

/* 其他样式保持不变 */
.table-toolbar {
  display: flex;
  margin-bottom: 20px;
  gap: 16px;
  align-items: center;
}

.search-input {
  max-width: 300px;
}

.role-filter,
.status-filter,
.category-filter {
  width: 140px;
}

.data-table {
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-icon {
  color: #409EFF;
}

.price {
  color: #f56c6c;
  font-weight: 600;
}

.order-id {
  font-weight: 600;
  color: #606266;
}

.empty-state {
  margin: 40px 0;
}

.announcement-form {
  max-width: 800px;
  margin: 20px 0;
  padding: 24px;
  background-color: #f9fafc;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.publish-button {
  padding: 10px 20px;
  font-weight: 500;
}

.announcement-list {
  margin-top: 30px;
}

.list-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.announcement-card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 15px;
}

.announcement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-name {
  font-weight: 600;
  color: #409EFF;
}

.announcement-content {
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>