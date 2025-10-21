# Vue USB Key 认证组件使用说明

本文件说明了如何在Vue项目中使用 `UsbKeyAuth.vue` 组件进行USB Key身份认证。

## 准备工作

1. **安装必要的依赖**
   - Vue 2.x 或 Vue 3.x
   - Syunew6.js USB Key驱动库

2. **引入USB Key驱动**
   - 将 `Syunew6.js` 驱动文件放置在项目的 `public` 目录中
   - Vue项目会自动从public目录提供静态资源，无需额外配置
   - 在项目的 `index.html` 中引入 Syunew6.js：

```html
<!-- 在 index.html 的 head 标签中引入 -->
<script src="/Syunew6.js"></script>
```

## 在Vue项目中使用

### 1. 导入组件

```javascript
// 在需要使用的Vue组件中导入
import UsbKeyAuth from './components/UsbKeyAuth.vue';

export default {
  components: {
    UsbKeyAuth
  },
  // ...其他组件配置
}
```

### 2. 在模板中使用

```vue
<template>
  <div class="app">
    <h1>网上书城用户登录</h1>
    
    <!-- 使用USB Key认证组件 -->
    <UsbKeyAuth 
      @auth-success="handleAuthSuccess"
      @auth-failure="handleAuthFailure"
    />
    
    <!-- 认证成功后的内容 -->
    <div v-if="isAuthenticated" class="auth-success">
      <h2>✅ 认证成功！欢迎回来！</h2>
      <button @click="logout">退出登录</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isAuthenticated: false,
      userInfo: null
    }
  },
  methods: {
    handleAuthSuccess() {
      console.log('USB Key认证成功');
      this.isAuthenticated = true;
      
      // 这里可以调用后端API获取用户信息
      // 例如：this.fetchUserInfo();
    },
    handleAuthFailure(error) {
      console.error('USB Key认证失败:', error);
      this.isAuthenticated = false;
      // 可以显示错误消息给用户
    },
    logout() {
      this.isAuthenticated = false;
      this.userInfo = null;
    },
    async fetchUserInfo() {
      try {
        // 这里应该调用您的后端API，传递认证信息
        // 例如：const response = await this.$axios.get('/api/user/info');
        // this.userInfo = response.data;
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    }
  }
}
</script>
```

## 后端集成

### 验证签名

在Node.js后端，您可以使用国密算法库（如`node-sm-crypto`）来验证签名：

```javascript
// 安装：npm install node-sm-crypto
const sm2 = require('node-sm-crypto').sm2;

// 路由示例（Express.js）
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { randomNum, signature } = req.body;
    
    // 从数据库或配置中获取预存储的公钥
    const storedPubKeyX = 'D5548C7825CBB56150A3506CD57464AF8A1AE0519DFAF3C58221DC810CAF28DD';
    const storedPubKeyY = '921073768FE3D59CE54E79A49445CF73FED23086537027264D168946D479533E';
    
    // 组合完整公钥（04 + X + Y格式）
    const fullPublicKey = `04${storedPubKeyX}${storedPubKeyY}`;
    
    // 验证签名
    const verifyResult = sm2.doVerify(randomNum, signature, fullPublicKey, { 
      hash: true,
      der: true 
    });
    
    if (verifyResult) {
      // 生成JWT token或session
      const token = generateAuthToken(userId); // 假设的函数
      
      res.json({
        success: true,
        token,
        message: '认证成功'
      });
    } else {
      res.json({
        success: false,
        message: '签名验证失败'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});
```

## 注意事项

1. **浏览器兼容性**：
   - USB Key操作可能需要特定的浏览器插件或ActiveX支持
   - 建议在IE浏览器或配置了适当插件的Chrome/Firefox中使用

2. **安全考虑**：
   - 预存储的公钥应通过安全渠道传输和存储
   - 生产环境中不应硬编码PIN码
   - 考虑在后端进行最终的签名验证

3. **用户体验**：
   - 添加适当的加载状态和错误提示
   - 提供清晰的操作指导给用户

4. **调试**：
   - 使用浏览器开发者工具的控制台查看详细日志
   - 确保USB Key驱动正确安装

## 常见问题

1. **无法找到USB Key设备**
   - 检查USB连接
   - 确认驱动安装正确
   - 检查是否有其他程序占用设备

2. **签名验证失败**
   - 确认预存储公钥与设备公钥匹配
   - 检查签名算法参数是否正确
   - 验证随机数生成和传输过程是否无误

3. **浏览器兼容性问题**
   - 尝试在IE浏览器中运行
   - 检查浏览器安全设置是否允许ActiveX或插件运行