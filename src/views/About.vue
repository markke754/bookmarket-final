<template>
  <div class="about-container">
    <el-card class="about-card">
      <template #header>
        <div class="about-header">
          <h2>关于图书商城</h2>
        </div>
      </template>
      
      <div class="about-content">
        <h3>项目介绍</h3>
        <p>图书商城是一个在线图书交易平台，提供买家和卖家角色，支持图书的浏览、搜索、购买和管理等功能。本项目使用现代化的技术栈构建，旨在提供流畅、便捷的用户体验。</p>
        
        <h3 class="section-title">主要功能</h3>
        <ul class="feature-list">
          <li>
            <strong>买家功能</strong>
            <ul>
              <li>浏览和搜索图书</li>
              <li>加入购物车</li>
              <li>支付宝/微信支付</li>
              <li>订单管理</li>
            </ul>
          </li>
          <li>
            <strong>卖家功能</strong>
            <ul>
              <li>图书管理（添加、编辑、删除）</li>
              <li>订单处理</li>
              <li>支付设置</li>
              <li>销售统计</li>
            </ul>
          </li>
        </ul>
        
        <h3 class="section-title">技术栈</h3>
        <div class="tech-stack">
          <div class="tech-item">
            <h4>前端</h4>
            <ul>
              <li>Vue.js 3</li>
              <li>Vue Router</li>
              <li>Pinia</li>
              <li>Element Plus</li>
              <li>Axios</li>
            </ul>
          </div>
          <div class="tech-item">
            <h4>后端</h4>
            <ul>
              <li>Node.js</li>
              <li>Express.js</li>
              <li>PostgreSQL</li>
              <li>JWT</li>
              <li>Multer</li>
            </ul>
          </div>
        </div>
        
        <h3 class="section-title">版本信息</h3>
        <p>当前版本: v1.0.0</p>
        <p>最后更新: {{ formatDate(new Date()) }}</p>
        
        <div class="about-footer">
          <p>图书商城 &copy; 2023-{{ new Date().getFullYear() }} 保留所有权利</p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
</script>

<style scoped>
.about-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px 0;
}

.about-card {
  border-radius: var(--border-radius-medium);
  box-shadow: var(--box-shadow-light);
}

.about-header {
  display: flex;
  justify-content: center;
}

.about-header h2 {
  color: var(--text-primary);
  margin: 0;
  font-size: 24px;
}

.about-content {
  color: var(--text-regular);
}

.about-content h3 {
  color: var(--text-primary);
  margin-top: 30px;
  margin-bottom: 15px;
  font-size: 20px;
}

.about-content h3:first-child {
  margin-top: 0;
}

.about-content p {
  line-height: 1.6;
  margin-bottom: 15px;
}

.section-title {
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 10px;
}

.feature-list {
  padding-left: 20px;
}

.feature-list > li {
  margin-bottom: 15px;
}

.feature-list ul {
  margin-top: 8px;
  padding-left: 20px;
}

.feature-list ul li {
  margin-bottom: 5px;
}

.tech-stack {
  display: flex;
  gap: 40px;
  margin-top: 20px;
}

.tech-item {
  flex: 1;
}

.tech-item h4 {
  color: var(--text-primary);
  margin-bottom: 10px;
}

.tech-item ul {
  padding-left: 20px;
}

.tech-item li {
  margin-bottom: 5px;
}

.about-footer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .tech-stack {
    flex-direction: column;
    gap: 20px;
  }
}
</style> 