<template>
  <div class="usb-key-auth">
    <div class="auth-status">
      <div :class="['lock-status', { 'locked': !isConnected, 'unlocked': isConnected && isVerified }]">
        <i v-if="!isConnected" class="lock-icon">🔒</i>
        <i v-else-if="isConnected && !isVerified" class="connecting-icon">🔄</i>
        <i v-else class="unlock-icon">✅</i>
      </div>
      <div class="status-text">
        <h3 v-if="!isConnected">请插入USB Key</h3>
        <h3 v-else-if="isConnected && !isVerified">正在验证USB Key...</h3>
        <h3 v-else>USB Key验证成功</h3>
        <p v-if="!isConnected" class="instruction">插入管理员USB Key以解锁登录界面</p>
      </div>
    </div>
    
    <div id="result" class="result-panel">
      <div v-for="(log, index) in logs" :key="index" :class="log.isError ? 'error' : ''">
        {{ log.message }}
      </div>
    </div>
  </div>
</template>

<script>
// 假设Syunew6.js将通过CDN或在主HTML中引入
// 如果需要在Vue项目中导入，可能需要使用webpack的expose-loader或其他方式处理

export default {
  name: 'UsbKeyAuth',
  emits: ['auth-success', 'auth-failure', 'status-change'],
  data() {
    return {
      // 公钥信息和设备路径
      pubKeyX: '',
      pubKeyY: '',
      devicePath: '',
      softKey: null,
      userName: 'bookstore',
      FIXED_PIN: '123',
      // UI状态
      logs: [],
      isLoading: false,
      hasPublicKey: false,
      isConnected: false,
      isVerified: false,
      // 轮询状态
      pollingInterval: null,
      pollingAttempts: 0,
      maxPollingAttempts: 3,
      // 预存储公钥
      storedPubKeyX: 'D5548C7825CBB56150A3506CD57464AF8A1AE0519DFAF3C58221DC810CAF28DD',
      storedPubKeyY: '921073768FE3D59CE54E79A49445CF73FED23086537027264D168946D479533E'
    }
  },
  mounted() {
    // 组件挂载后立即开始检测USB Key
    this.startDetection();
  },
  beforeUnmount() {
    // 组件卸载前清理轮询
    this.stopDetection();
  },
  methods: {
    // 发送状态变化事件
    sendStatusChange() {
      this.$emit('status-change', {
        isConnected: this.isConnected,
        isVerified: this.isVerified,
        hasPublicKey: this.hasPublicKey
      });
    },

    // 显示日志信息
    log(message, isError = false) {
      this.logs.push({ message, isError });
      console.log(message);
      // 自动滚动到底部
      this.$nextTick(() => {
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
          resultDiv.scrollTop = resultDiv.scrollHeight;
        }
      });
      // 保持日志数量在合理范围内
      if (this.logs.length > 50) {
        this.logs.shift();
      }
    },

    // 清除日志
    clearLog() {
      this.logs = [];
    },

    // 开始检测USB Key
    startDetection() {
      this.log('开始自动检测USB Key设备...');
      // 设置轮询，每1秒检测一次
      this.pollingInterval = setInterval(() => {
        this.detectAndVerify();
      }, 1000);
    },

    // 停止检测
    stopDetection() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },

    // 检测并验证USB Key
    async detectAndVerify() {
      // 如果已经验证成功，停止检测
      if (this.isVerified) {
        this.stopDetection();
        return;
      }

      try {
        // 检测设备连接
        await this.detectDevice();
        
        // 如果设备已连接，尝试验证
        if (this.isConnected && !this.isVerified) {
          await this.verifyDevice();
        }
      } catch (error) {
        this.log(`检测过程错误: ${error.message}`, true);
        // 如果连续失败多次，重置连接状态
        this.pollingAttempts++;
        if (this.pollingAttempts >= this.maxPollingAttempts) {
          this.isConnected = false;
          this.hasPublicKey = false;
          this.softKey = null;
          this.pollingAttempts = 0;
          this.sendStatusChange();
        }
      }
    },

    // 检测USB Key设备
    async detectDevice() {
      // 确保SoftKey6W在全局作用域可用
      if (!window.SoftKey6W) {
        this.log('未找到USB Key驱动，请确保已正确加载Syunew6.js', true);
        return;
      }

      try {
        // 创建SoftKey6W实例（如果不存在）
        if (!this.softKey) {
          this.softKey = new window.SoftKey6W();
        }

        // 查找USB Key设备，从端口0开始查找
        const port = await this.softKey.FindPort(0);
        
        if (port === null || port === undefined || port === false) {
          if (this.isConnected) {
            this.log('USB Key已断开连接');
            this.isConnected = false;
            this.hasPublicKey = false;
            this.isVerified = false;
            this.sendStatusChange();
          }
          return;
        }

        // 如果是新连接的设备
        if (!this.isConnected || this.devicePath !== port) {
          this.log(`成功找到设备，端口号: ${port}`);
          this.devicePath = port;
          this.isConnected = true;
          this.pollingAttempts = 0;
          
          // 直接使用预存储公钥，无需读取USB Key中的公钥
          this.log('设备已连接，直接使用预存储公钥...');
          
          // 获取设备基本信息
          try {
            const version = await this.softKey.GetVersion(port);
            this.log(`设备版本: ${version}`);
          } catch (e) {
            this.log('获取设备版本失败，将继续使用预存储公钥', true);
          }
          
          // 保存预存储公钥和设备信息
          this.pubKeyX = this.storedPubKeyX;
          this.pubKeyY = this.storedPubKeyY;
          this.hasPublicKey = true;
          
          this.log('已设置预存储公钥，准备进行随机数认证');
          this.sendStatusChange();
        }
      } catch (error) {
        this.log(`设备检测错误: ${error.message}`, true);
        throw error;
      }
    },

    // 验证设备
    async verifyDevice() {
      if (this.hasPublicKey && !this.isVerified) {
        this.log('开始验证USB Key...');
        await this.startRandomAuth();
      }
    },
    
    // 生成指定长度的随机十六进制字符串
    generateRandomHexString(length) {
      const chars = '0123456789ABCDEF';
      let result = '';
      for (let i = 0; i < length * 2; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    },
    
    // 随机数认证流程
    async startRandomAuth() {
      try {
        // 验证必要的信息是否已准备好
        if (!this.softKey || !this.devicePath || !this.pubKeyX || !this.pubKeyY) {
          this.log('请先读取公钥信息', true);
          return;
        }
        
        this.isLoading = true;
        this.log('\n========== 开始随机数认证 ==========', false);
        
        // 1. 生成随机数
        const randomNum = this.generateRandomHexString(16); // 生成16字节的随机数
        this.log(`\n1. 生成随机数: ${randomNum}`, false);
        this.log(`随机数长度: ${randomNum.length} 字符`, false);
        
        // 2. 使用USB Key对随机数进行签名
        this.log('\n2. 使用USB Key对随机数进行签名...', false);
        this.log(`使用PIN码: ${this.FIXED_PIN}`, false);
        
        try {
          // 确保使用bookstore用户的密钥对进行签名
          this.log(`使用USB Key中已存在的bookstore用户密钥对进行签名...`, false);
          
          // 直接使用预存储公钥，不再读取设备中的公钥
            this.log('直接使用预存储公钥进行签名验证...', false);
            this.log(`预存储公钥X前20字符: ${this.pubKeyX.substring(0, 20)}...`, false);
            this.log(`预存储公钥Y前20字符: ${this.pubKeyY.substring(0, 20)}...`, false);
          
          // 直接调用_YtSign进行签名，按照参考实现的参数顺序
          const signature = await this.softKey.SendCmdAndWait(false, this.softKey._YtSign, randomNum, this.FIXED_PIN, this.devicePath);
          
          this.log(`签名结果: ${signature}`, false);
          this.log(`签名长度: ${signature.length} 字符`, false);
          
          // 3. 使用预存储的公钥验证签名
          this.log('\n3. 使用预存储在电脑中的公钥验证签名...', false);
          
          try {
            const startTime = performance.now();
            
            // 直接使用预存储的公钥进行验证
            const storedPubKeyX = this.pubKeyX; // 从实例变量获取预存储的公钥X
            const storedPubKeyY = this.pubKeyY; // 从实例变量获取预存储的公钥Y
            
            // 记录使用的预存储公钥信息
            this.log(`使用预存储公钥进行验证`, false);
            this.log(`预存储公钥X: ${storedPubKeyX.substring(0, 20)}...`, false);
            this.log(`预存储公钥Y: ${storedPubKeyY.substring(0, 20)}...`, false);
            
            // 注意：修改参数顺序，尝试不同的调用方式
            this.log('尝试调用验证函数...', false);
            let verifyResult;
            
            try {
              // 尝试不同的参数顺序 - 方式1（使用预存储公钥）
              verifyResult = await this.softKey.SendCmdAndWait(false, this.softKey._YtVerfiy, 
                  this.userName, randomNum, storedPubKeyX, storedPubKeyY, signature, this.devicePath);
              this.log('验证函数调用成功（方式1）', false);
            } catch (firstTryError) {
              this.log(`第一次验证调用失败: ${firstTryError.message}`, true);
              this.log('尝试不同的参数顺序...', false);
              
              // 尝试不同的参数顺序 - 方式2（使用预存储公钥）
              try {
                verifyResult = await this.softKey.SendCmdAndWait(false, this.softKey._YtVerfiy, 
                    randomNum, signature, storedPubKeyX, storedPubKeyY, this.devicePath);
                this.log('第二次验证调用成功（方式2）', false);
              } catch (secondTryError) {
                this.log(`第二次验证调用失败: ${secondTryError.message}`, true);
                this.log('尝试直接使用_YtVerfiy方法...', false);
                
                // 尝试直接调用_YtVerfiy方法（使用预存储公钥）
                try {
                  // @ts-ignore - 假设_YtVerfiy是一个可直接调用的方法
                  verifyResult = await this.softKey._YtVerfiy(randomNum, storedPubKeyX, storedPubKeyY, signature, this.devicePath);
                  this.log('直接调用_YtVerfiy成功', false);
                } catch (directCallError) {
                  this.log(`直接调用验证方法失败: ${directCallError.message}`, true);
                  throw new Error('所有验证调用方式都失败');
                }
              }
            }
            
            const endTime = performance.now();
            
            this.log(`验证耗时: ${(endTime - startTime).toFixed(2)}ms`, false);
            this.log(`验证返回值类型: ${typeof verifyResult}`, false);
            this.log(`验证返回值: ${verifyResult}`, false);
            
            // 验证返回1表示成功，其他值表示失败
            if (verifyResult === '1' || verifyResult === 1 || verifyResult === true) {
              this.log('\n✅ 签名验证成功！认证通过！', false);
              this.isVerified = true;
              this.sendStatusChange();
              // 触发成功事件，通知父组件
              this.$emit('auth-success');
              // 验证成功后停止轮询
              this.stopDetection();
            } else {
              this.log('\n❌ 签名验证失败！认证不通过！', true);
              this.log(`详细返回值: ${verifyResult}`, true);
              this.log('可能原因: 签名使用的私钥与验证使用的公钥不匹配，或参数顺序不正确', true);
              this.isVerified = false;
              this.sendStatusChange();
              this.$emit('auth-failure', verifyResult);
            }
          } catch (verifyError) {
            this.log(`验证异常: ${verifyError.message}`, true);
            // 提供备选验证方式 - 打印签名内容供手动验证
            this.log('\n⚠️  验证失败，提供签名和数据供参考：', true);
            this.log(`随机数: ${randomNum}`, true);
            this.log(`签名: ${signature}`, true);
            this.$emit('auth-failure', verifyError);
          }
        } catch (signError) {
          this.log(`签名失败: ${signError.message}`, true);
          this.$emit('auth-failure', signError);
        }
        
        this.log('\n========== 认证流程结束 ==========', false);
      } catch (error) {
        this.log(`认证流程错误: ${error.message}`, true);
        this.isVerified = false;
        this.sendStatusChange();
        this.$emit('auth-failure', error);
      } finally {
        this.isLoading = false;
      }
    }
  }
}
</script>

<style scoped>
.usb-key-auth {
  font-family: Arial, sans-serif;
  margin: 10px 0;
  line-height: 1.6;
}

.auth-status {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.lock-status {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  transition: all 0.3s ease;
}

.lock-status.locked {
  background-color: rgba(245, 34, 45, 0.1);
  border: 2px solid #f5222d;
}

.lock-status.unlocked {
  background-color: rgba(82, 196, 26, 0.1);
  border: 2px solid #52c41a;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(82, 196, 26, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0);
  }
}

.lock-icon {
  font-size: 40px;
  color: #f5222d;
}

.unlock-icon {
  font-size: 40px;
  color: #52c41a;
}

.connecting-icon {
  font-size: 40px;
  color: #1890ff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-text {
  text-align: left;
}

.status-text h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
  font-weight: 500;
}

.instruction {
  margin: 5px 0 0 0;
  font-size: 14px;
  color: #666;
}

.result-panel {
  margin-top: 15px;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  white-space: pre-wrap;
  word-break: break-all;
  min-height: 60px;
  max-height: 150px;
  overflow-y: auto;
  font-size: 12px;
}

.error {
  color: #d32f2f;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .auth-status {
    flex-direction: column;
  }
  
  .lock-status {
    margin-right: 0;
    margin-bottom: 15px;
  }
  
  .status-text {
    text-align: center;
  }
}

</style>