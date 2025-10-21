<template>
  <div class="help-container">
    <h1 class="help-title">帮助中心</h1>
    
    <el-tabs tab-position="left" class="help-tabs">
      <el-tab-pane label="购物指南">
        <h2>如何购买图书</h2>
        <ol class="help-steps">
          <li>在首页或查询页面浏览图书</li>
          <li>点击图书查看详情</li>
          <li>选择数量并点击"加入购物车"</li>
          <li>进入购物车页面确认订单</li>
          <li>选择支付方式完成支付</li>
        </ol>
        
        <h2>如何搜索图书</h2>
        <p>在首页顶部的搜索框中输入书名、作者或关键词，点击搜索按钮即可。您还可以使用高级搜索功能按类别、价格范围等条件筛选图书。</p>
        
        <h2>订单状态说明</h2>
        <div class="status-list">
          <div class="status-item">
            <span class="status-badge pending">待付款</span>
            <span class="status-desc">订单已创建但尚未支付</span>
          </div>
          <div class="status-item">
            <span class="status-badge processing">处理中</span>
            <span class="status-desc">订单已支付，卖家正在处理</span>
          </div>
          <div class="status-item">
            <span class="status-badge shipped">已发货</span>
            <span class="status-desc">图书已发出，等待送达</span>
          </div>
          <div class="status-item">
            <span class="status-badge completed">已完成</span>
            <span class="status-desc">订单已完成</span>
          </div>
          <div class="status-item">
            <span class="status-badge cancelled">已取消</span>
            <span class="status-desc">订单已取消</span>
          </div>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="卖家指南">
        <h2>如何成为卖家</h2>
        <p>注册账号后，点击个人中心中的"成为卖家"按钮，填写必要的卖家信息并提交审核。审核通过后即可上架图书。</p>
        
        <h2>如何上架图书</h2>
        <ol class="help-steps">
          <li>进入卖家中心</li>
          <li>点击"添加图书"按钮</li>
          <li>填写图书信息（书名、作者、出版社、价格等）</li>
          <li>上传图书封面图片</li>
          <li>点击"保存"完成图书上架</li>
        </ol>
        
        <h2>订单处理流程</h2>
        <p>当买家下单并支付后，您将收到新订单通知。请及时处理订单并更新订单状态（发货、完成等）。系统会自动通知买家订单状态的变化。</p>
        
        <h2>如何设置支付方式</h2>
        <p>在卖家中心的"支付设置"页面，您可以绑定支付宝和微信支付账号，系统会自动处理支付流程。</p>
      </el-tab-pane>
      
      <el-tab-pane label="支付问题">
        <h2>支持的支付方式</h2>
        <p>目前支持以下支付方式：</p>
        <ul class="payment-methods">
          <li>
            <div class="payment-icon alipay"></div>
            <span>支付宝</span>
          </li>
          <li>
            <div class="payment-icon wechat"></div>
            <span>微信支付</span>
          </li>
        </ul>
        
        <h2>支付失败怎么办</h2>
        <p>如果支付过程中遇到问题，请尝试以下解决方法：</p>
        <ol>
          <li>检查网络连接是否稳定</li>
          <li>确认支付账户余额是否充足</li>
          <li>尝试使用其他支付方式</li>
          <li>刷新页面重新支付</li>
          <li>联系客服获取帮助</li>
        </ol>
        
        <h2>退款流程</h2>
        <p>如需申请退款，请按以下步骤操作：</p>
        <ol class="help-steps">
          <li>进入"我的订单"页面</li>
          <li>找到需要退款的订单</li>
          <li>点击"申请退款"按钮</li>
          <li>填写退款原因并提交</li>
          <li>等待卖家确认退款</li>
        </ol>
        <p>退款申请提交后，卖家将在48小时内处理。退款金额将在卖家确认后3-7个工作日内返还到您的支付账户。</p>
      </el-tab-pane>
      
      <el-tab-pane label="联系我们">
        <h2>客服联系方式</h2>
        <div class="contact-info">
          <div class="contact-item">
            <i class="el-icon-phone"></i>
            <div class="contact-details">
              <span class="contact-title">客服电话</span>
              <span class="contact-value">400-123-4567</span>
              <span class="contact-note">（工作时间：周一至周日 9:00-18:00）</span>
            </div>
          </div>
          <div class="contact-item">
            <i class="el-icon-message"></i>
            <div class="contact-details">
              <span class="contact-title">客服邮箱</span>
              <span class="contact-value">support@bookstore.com</span>
            </div>
          </div>
          <div class="contact-item">
            <i class="el-icon-chat-dot-round"></i>
            <div class="contact-details">
              <span class="contact-title">在线客服</span>
              <el-button type="primary" size="small">开始聊天</el-button>
              <span class="contact-note">（工作时间：周一至周日 9:00-22:00）</span>
            </div>
          </div>
        </div>
        
        <h2>意见反馈</h2>
        <p>我们非常重视您的意见和建议，请通过以下表单提交您的反馈：</p>
        <el-form class="feedback-form" label-position="top">
          <el-form-item label="反馈类型">
            <el-select placeholder="请选择反馈类型">
              <el-option label="功能建议" value="feature"></el-option>
              <el-option label="页面问题" value="ui"></el-option>
              <el-option label="系统错误" value="bug"></el-option>
              <el-option label="其他问题" value="other"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="反馈内容">
            <el-input type="textarea" rows="4" placeholder="请详细描述您的问题或建议"></el-input>
          </el-form-item>
          <el-form-item label="联系方式（选填）">
            <el-input placeholder="电话/邮箱"></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary">提交反馈</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
// 这里可以添加需要的逻辑
</script>

<style scoped>
.help-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.help-title {
  text-align: center;
  margin-bottom: 30px;
  color: var(--text-primary);
}

.help-tabs {
  min-height: 500px;
}

.help-tabs :deep(.el-tabs__content) {
  padding: 0 20px;
}

h2 {
  color: var(--text-primary);
  margin-top: 25px;
  margin-bottom: 15px;
  font-size: 20px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 10px;
}

p {
  line-height: 1.6;
  color: var(--text-regular);
  margin-bottom: 15px;
}

.help-steps {
  padding-left: 20px;
  margin-bottom: 20px;
}

.help-steps li {
  margin-bottom: 10px;
  color: var(--text-regular);
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  min-width: 80px;
  text-align: center;
}

.status-badge.pending {
  background-color: #e6a23c;
  color: white;
}

.status-badge.processing {
  background-color: #409eff;
  color: white;
}

.status-badge.shipped {
  background-color: #67c23a;
  color: white;
}

.status-badge.completed {
  background-color: #909399;
  color: white;
}

.status-badge.cancelled {
  background-color: #f56c6c;
  color: white;
}

.status-desc {
  color: var(--text-regular);
}

.payment-methods {
  list-style: none;
  padding: 0;
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.payment-methods li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.payment-icon {
  width: 40px;
  height: 40px;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.payment-icon.alipay {
  background-color: #00a0e9;
  border-radius: 4px;
}

.payment-icon.wechat {
  background-color: #07c160;
  border-radius: 4px;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}

.contact-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  border-radius: 4px;
  background-color: var(--background-lighter);
}

.contact-details {
  display: flex;
  flex-direction: column;
}

.contact-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 5px;
}

.contact-value {
  color: var(--text-regular);
  font-size: 16px;
  margin-bottom: 5px;
}

.contact-note {
  color: var(--text-secondary);
  font-size: 14px;
}

.feedback-form {
  max-width: 600px;
}

@media (max-width: 768px) {
  .help-tabs :deep(.el-tabs__nav) {
    width: 100%;
  }
  
  .payment-methods {
    flex-direction: column;
  }
}
</style> 