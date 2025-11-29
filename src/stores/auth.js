import { defineStore } from 'pinia';
import axios from 'axios';
import router from '../router';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user')),
    loading: false,
    error: null,
    tempToken: null, // 用于两阶段认证的临时token
    requiresUsbKey: false // 是否需要USB Key验证
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.token,
    userRole: (state) => state.user?.role,
    userId: (state) => state.user?.id,
    username: (state) => state.user?.username,
  },
  
  actions: {
    setError(error) {
      this.error = error;
      // 5秒后自动清除错误
      setTimeout(() => {
        this.error = null;
      }, 5000);
    },
    
    // 重置临时token和USB Key标志
    resetAuthState() {
      this.tempToken = null;
      this.requiresUsbKey = false;
      this.error = null;
    },
    
    // 第一阶段登录：验证用户名密码
    async firstStageLogin(username, password, role) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.post('http://localhost:3000/api/login', {
          username,
          password,
        });
        
        const data = response.data;
        
        // 检查是否需要USB Key验证（管理员）
        if (data.requiresUsbKey && data.tempToken) {
          // 需要USB Key验证，存储临时token并返回
          this.tempToken = data.tempToken;
          this.requiresUsbKey = true;
          return { 
            success: true, 
            requiresUsbKey: true,
            tempToken: data.tempToken,
            username: username,
            role: role,
            hasKeyInfo: data.hasKeyInfo || false,
            pubKeyX: data.pubKeyX || '',
            pubKeyY: data.pubKeyY || ''
          };
        } else {
          // 验证用户角色是否匹配
          if (data.user.role !== role) {
            this.setError(`登录失败: 您不是${role === 'buyer' ? '买家' : role === 'seller' ? '卖家' : '管理员'}`);
            this.loading = false;
            return { success: false, error: this.error };
          }
          
          // 不需要USB Key验证，直接完成登录
          const loginSuccess = this.completeLogin(data);
          return { success: loginSuccess };
        }
      } catch (error) {
        console.error('登录失败:', error);
        
        if (error.response) {
          // 服务器返回错误
          const message = error.response.data.message || '登录失败';
          this.setError(`登录失败: ${message}`);
        } else if (error.request) {
          // 请求已发出但没有收到响应
          this.setError('登录失败: 服务器无响应');
        } else {
          // 请求设置出错
          this.setError(`登录失败: ${error.message}`);
        }
        
        this.loading = false;
        return { success: false, error: this.error };
      } finally {
        this.loading = false;
      }
    },
    
    // 第二阶段登录：验证USB Key
    async verifyUsbKey(authData) {
      this.loading = true;
      this.error = null;
      
      try {
        // 添加空值检查，防止访问undefined属性
        if (!authData) {
          throw new Error('USB Key验证失败，未收到有效的认证信息');
        }
        
        // 检查是否是本地验证（只有deviceVerified，没有token和user）
        if (authData.deviceVerified && !authData.token && !authData.user) {
          // 本地验证成功，模拟完成登录
          console.log('本地USB Key验证成功');
          
          // 这里我们假设有一个默认的管理员角色，因为没有实际的后端验证
          // 实际项目中可能需要根据USB Key的信息查询用户
          this.user = {
            id: 'admin',
            username: 'admin',
            role: 'admin'
          };
          
          // 生成一个临时token用于本地认证
          this.token = 'local-usb-key-verified-token-' + Date.now();
          
          // 保存到localStorage
          localStorage.setItem('token', this.token);
          localStorage.setItem('user', JSON.stringify(this.user));
          
          // 配置axios头部
          this.setAxiosDefaultHeader();
          
          this.loading = false;
          return { success: true };
        }
        
        // 检查是否包含token和user属性（后端验证情况）
        if (!authData.token || !authData.user) {
          // 如果没有直接的token和user，可能authData本身就是后端返回的结果
          if (authData.success && authData.token && authData.user) {
            // 已经是正确格式
            return this.completeLogin(authData);
          } else {
            throw new Error('USB Key验证失败，认证信息不完整');
          }
        }
        
        // 数据格式正确，完成登录
        return this.completeLogin(authData);
      } catch (error) {
        this.error = error.message || 'USB Key验证失败';
        return { success: false, error: this.error };
      } finally {
        this.loading = false;
      }
    },
    
    // 完成登录流程
    completeLogin(authData) {
      // 添加空值检查
      if (!authData || !authData.token || !authData.user) {
        console.error('登录失败: 认证信息不完整');
        this.error = '登录失败: 认证信息不完整';
        return false;
      }
      
      this.token = authData.token;
      this.user = authData.user;
      this.tempToken = null; // 清除临时token
      this.requiresUsbKey = false; // 清除USB Key验证标志
      
      localStorage.setItem('token', this.token);
      localStorage.setItem('user', JSON.stringify(this.user));
      
      // 配置全局axios默认头部
      this.setAxiosDefaultHeader();
      
      return true;
    },
    
    async register(userData) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.post('http://localhost:3000/api/register', userData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        return { success: true, message: response.data.message };
      } catch (error) {
        console.error('注册失败:', error.response?.data || error);
        
        if (error.response) {
          // 服务器返回错误
          const message = error.response.data.message || '注册失败';
          this.setError(`注册失败: ${message}`);
        } else if (error.request) {
          // 请求已发出但没有收到响应
          this.setError('注册失败: 服务器无响应');
        } else {
          // 请求设置出错
          this.setError(`注册失败: ${error.message}`);
        }
        
        return { 
          success: false, 
          message: error.response?.data?.message || '注册失败，请稍后重试'
        };
      } finally {
        this.loading = false;
      }
    },
    
    logout() {
      this.token = null;
      this.user = null;
      this.tempToken = null;
      this.requiresUsbKey = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // 清除全局axios默认头部
      delete axios.defaults.headers.common['Authorization'];
      
      // 重定向到登录页
      router.push('/login');
    },
    
    // 自动恢复会话（如果有存储的token）
    autoLogin() {
      // 重置临时认证状态
      this.resetAuthState();
      
      if (this.token && this.user) {
        // 验证用户信息完整性
        if (!this.user.role) {
          console.error('用户信息不完整，尝试重新解析缓存');
          try {
            const cachedUser = localStorage.getItem('user');
            if (cachedUser) {
              this.user = JSON.parse(cachedUser);
              console.log('从缓存重新加载的用户信息:', this.user);
            }
          } catch (e) {
            console.error('解析缓存用户信息失败:', e);
            // 信息不完整或失效，执行登出
            this.logout();
            return false;
          }
        }
        
        // 配置全局axios默认头部
        this.setAxiosDefaultHeader();
        
        // 额外日志
        console.log('自动登录成功，当前用户信息:', {
          id: this.user.id,
          username: this.user.username,
          role: this.user.role,
          token存在: !!this.token,
          tokenLength: this.token?.length
        });
        
        return true;
      }
      return false;
    },
    
    // 设置全局axios默认头部
    setAxiosDefaultHeader() {
      if (this.token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        console.log('已设置全局认证头部');
      } else {
        console.warn('无法设置认证头部，token不存在');
      }
    },
    
    // 检查token是否过期
    async checkTokenValidity() {
      if (!this.token) return false;
      
      try {
        // 调用一个简单的API端点来验证token
        await axios.get('http://localhost:3000/api/health', {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        });
        return true;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // token已过期，执行登出
          this.logout();
        }
        return false;
      }
    },
    
    // 检查和刷新认证状态
    async checkAuth() {
      console.log('检查认证状态...');
      if (!this.token) {
        console.log('token不存在，尝试从localStorage恢复');
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
          try {
            this.token = storedToken;
            this.user = JSON.parse(storedUser);
            this.setAxiosDefaultHeader();
            console.log('从localStorage恢复会话成功');
          } catch (e) {
            console.error('解析localStorage用户数据失败:', e);
            this.logout();
            return false;
          }
        } else {
          console.log('localStorage中没有存储的会话');
          return false;
        }
      }
      
      // 验证token有效性
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await axios.get(`${apiUrl}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        });
        
        // 更新用户信息
        if (response.data && response.data.user) {
          this.user = response.data.user;
          localStorage.setItem('user', JSON.stringify(this.user));
          console.log('认证状态检查成功，用户信息已更新');
          return true;
        }
        
        return !!this.user;
      } catch (error) {
        console.error('认证状态检查失败:', error);
        
        // 如果是401或403，表示token已失效
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          console.log('认证token已失效，执行登出');
          this.logout();
        }
        
        return false;
      }
    }
  },
});