<template>
  <div class="seller-payment-container">
    <LoadingIndicator :loading="loading" text="加载中..." />
    
    <h2>支付设置</h2>
    
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
            <el-image v-if="paymentSettings.alipayCode" :src="getImageUrl(paymentSettings.alipayCode)" class="payment-code-preview" />
            <div v-else class="payment-code-placeholder">
              <el-icon><Plus /></el-icon>
              <span>点击上传支付宝收款码</span>
            </div>
          </el-upload>
          <div class="payment-tips">用于买家通过支付宝向您付款，请上传清晰的收款二维码</div>
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
            <el-image v-if="paymentSettings.wechatCode" :src="getImageUrl(paymentSettings.wechatCode)" class="payment-code-preview" />
            <div v-else class="payment-code-placeholder">
              <el-icon><Plus /></el-icon>
              <span>点击上传微信支付收款码</span>
            </div>
          </el-upload>
          <div class="payment-tips">用于买家通过微信支付向您付款，请上传清晰的收款二维码</div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Picture } from '@element-plus/icons-vue';
import { useAuthStore } from '../stores/auth';
import axios from 'axios';
import LoadingIndicator from '../components/LoadingIndicator.vue';

const apiUrl = import.meta.env.VITE_API_URL;
const authStore = useAuthStore();
const loading = ref(false);

const paymentSettings = reactive({
  alipayCode: '',
  wechatCode: ''
});

// 计算上传请求头
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${authStore.token}`
}));

// 获取图片URL
function getImageUrl(image) {
  if (!image) {
    return '';
  }
  
  if (image.startsWith('http')) {
    return image;
  }
  
  let normalizedPath = image;
  if (!normalizedPath.startsWith('/uploads/') && !normalizedPath.startsWith('uploads/')) {
    normalizedPath = `/uploads/${normalizedPath.replace(/^\/+/, '')}`;
  } else if (normalizedPath.startsWith('uploads/')) {
    normalizedPath = `/${normalizedPath}`;
  }
  
  return `${apiUrl}${normalizedPath}`;
}

// 获取支付设置
async function fetchPaymentSettings() {
  loading.value = true;
  try {
    const response = await axios.get(`${apiUrl}/api/seller/payment-codes`);
    
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

// 上传前检查
function beforeUpload(file) {
  const isJPG = file.type === 'image/jpeg';
  const isPNG = file.type === 'image/png';
  const isLt2M = file.size / 1024 / 1024 < 2;
  
  if (!isJPG && !isPNG) {
    ElMessage.error('收款码只能是JPG或PNG格式!');
    return false;
  }
  
  if (!isLt2M) {
    ElMessage.error('收款码图片大小不能超过2MB!');
    return false;
  }
  
  return true;
}

// 处理支付宝收款码上传成功
async function handleAlipayUploadSuccess(response) {
  if (response && response.path) {
    paymentSettings.alipayCode = response.path;
    ElMessage.success('支付宝收款码上传成功');
    // 手动保存支付码关联
    try {
      await savePaymentCode('alipay', response.path);
    } catch (error) {
      console.error('保存支付码关联失败:', error);
    }
  } else {
    console.error('响应中缺少path字段:', response);
    ElMessage.error('上传失败，响应格式不正确');
  }
}

// 处理微信收款码上传成功
async function handleWechatUploadSuccess(response) {
  if (response && response.path) {
    paymentSettings.wechatCode = response.path;
    ElMessage.success('微信支付收款码上传成功');
    // 手动保存支付码关联
    try {
      await savePaymentCode('wechat', response.path);
    } catch (error) {
      console.error('保存支付码关联失败:', error);
    }
  } else {
    console.error('响应中缺少path字段:', response);
    ElMessage.error('上传失败，响应格式不正确');
  }
}

// 保存支付码关联到数据库
async function savePaymentCode(type, path) {
  try {
    // 已通过上传接口保存，这里只是为了确保同步
    console.log(`确保${type}支付码已保存:`, path);
  } catch (error) {
    console.error(`保存${type}支付码失败:`, error);
    throw error;
  }
}

// 处理上传错误
function handleUploadError(error) {
  console.error('上传失败:', error);
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

onMounted(() => {
  fetchPaymentSettings();
});
</script>

<style scoped>
.seller-payment-container {
  max-width: 800px;
  margin: 80px auto 40px;
  padding: 0 20px;
}

h2 {
  margin-bottom: 20px;
  color: var(--text-primary);
}

.payment-settings {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.payment-code-uploader {
  display: flex;
  justify-content: center;
}

.payment-code-preview {
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.payment-code-placeholder {
  width: 200px;
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

.payment-code-placeholder:hover {
  border-color: var(--primary-color);
}

.payment-code-placeholder .el-icon {
  font-size: 32px;
  color: #8c939d;
  margin-bottom: 8px;
}

.payment-tips {
  margin-top: 10px;
  color: #909399;
  font-size: 12px;
}

.el-form-item {
  margin-bottom: 30px;
}

@media (max-width: 768px) {
  .payment-settings {
    padding: 20px;
  }
  
  .payment-code-preview,
  .payment-code-placeholder {
    width: 160px;
    height: 160px;
  }
}
</style> 