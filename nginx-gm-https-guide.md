# BookMarket项目国密HTTPS实现指南

本指南详细说明如何使用Nginx实现BookMarket项目的国密HTTPS支持，解决Node.js原生不支持国密算法的问题。

## 一、国密HTTPS方案概述

由于Node.js原生不支持国密算法（如SM2/SM3/SM4），我们采用以下方案：

1. 使用支持国密的Nginx作为反向代理服务器
2. Nginx处理所有HTTPS请求并使用国密算法
3. Nginx将请求转发给Node.js后端和Vite前端开发服务器

## 二、所需环境准备

### 1. 安装支持国密的Nginx

需要使用支持国密的Nginx版本，推荐以下两种选择：

- **Tengine**：淘宝开发的Nginx分支，内置国密支持
- **原生Nginx + 国密补丁**：为标准Nginx应用国密算法补丁

### 2. 生成国密证书

需要准备以下国密证书文件：

- 国密SSL证书 (gm_server.crt)
- 国密SSL私钥 (gm_server.key)
- 国密会话票据密钥 (ticket.key)
- 传统SSL证书 (server.crt) - 用于兼容性
- 传统SSL私钥 (server.key) - 用于兼容性

> 提示：可以向证书颁发机构申请国密证书，或使用工具如OpenSSL生成自签名国密证书用于测试。

## 三、配置Nginx

1. 将生成的`nginx-gm-https.conf`文件复制到Nginx配置目录

2. 根据实际情况修改配置文件中的以下内容：
   - 证书文件路径
   - 域名配置
   - 后端服务地址和端口

3. 验证Nginx配置：
   ```bash
   nginx -t
   ```

4. 重启Nginx服务：
   ```bash
   nginx -s reload
   ```

## 四、项目调整

### 1. 前端调整

项目中发现多处直接使用硬编码的HTTP地址，需要修改为使用相对路径或通过环境变量配置。

#### 主要修改点：

- 在`.env`文件中设置API基础URL：
  ```
  VITE_API_URL=https://your-domain.com
  ```

- 修改所有硬编码的`http://localhost:3000`为使用环境变量：
  ```javascript
  // 从
  axios.post('http://localhost:3000/api/login', { ... })
  // 改为
  axios.post(`${import.meta.env.VITE_API_URL}/api/login`, { ... })
  ```

- 修改的主要文件包括：
  - `src/stores/auth.js`
  - `src/views/Admin.vue`
  - 其他包含API请求的组件

### 2. 后端调整

- 在`server/.env`文件中添加以下配置：
  ```
  NODE_ENV=production
  TRUST_PROXY=true
  ```

- 确保Express应用信任代理：
  ```javascript
  // 在server/index.js中添加
  app.set('trust proxy', true);
  ```

## 五、启动流程

1. 启动后端服务器：
   ```bash
   cd server
   npm run dev
   ```

2. 启动前端开发服务器：
   ```bash
   cd ..
   npm run dev
   ```

3. 启动Nginx（国密代理）

4. 通过`https://your-domain.com`访问应用

## 六、配置说明

### Nginx配置详解

- **前端代理**：将根路径`/`的请求转发到Vite开发服务器（5173端口）
- **API代理**：将`/api`路径的请求转发到Node.js后端（3000端口）
- **静态文件代理**：将`/uploads`路径的请求转发到Node.js后端
- **国密配置**：通过`ssl_gm_certificate`等指令启用国密算法

### 安全性考虑

1. 确保所有证书文件权限正确（仅root可读）
2. 使用强密码保护私钥
3. 配置HSTS（HTTP Strict Transport Security）
4. 定期更新证书

## 七、常见问题解决

1. **混合内容警告**：确保所有资源（图片、API请求等）都使用HTTPS

2. **跨域问题**：确保Nginx配置中的代理头信息正确设置

3. **证书验证失败**：确保客户端支持国密算法，或保留传统SSL证书作为兼容层

4. **请求转发问题**：检查Nginx错误日志，确认代理配置正确

## 八、其他说明

- 本配置同时支持传统TLS和国密SSL算法，确保最大兼容性
- 对于生产环境，建议使用更严格的SSL参数和安全配置
- 国密证书和密钥文件应妥善保管，定期更新

通过以上配置，您的BookMarket项目将能够支持国密HTTPS访问，满足相关安全要求。