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
          <h3 v-else-if="isConnected && !isVerified && hasKeyInfo && !pinCode">请输入PIN码</h3>
          <h3 v-else-if="isConnected && !isVerified && !hasKeyInfo">正在使用默认配置验证...</h3>
          <h3 v-else-if="isConnected && !isVerified">正在验证USB Key...</h3>
          <h3 v-else>USB Key验证成功</h3>
          <p v-if="!isConnected" class="instruction">插入管理员USB Key以解锁登录界面</p>
          <p v-if="isConnected && !isVerified && !hasKeyInfo" class="instruction">使用默认用户名(bookstore)和PIN码(123)</p>
        </div>
      </div>
      
      <!-- PIN码输入区域 - 只在有密钥信息时显示 -->
      <div v-if="isConnected && !isVerified && hasKeyInfo" class="pin-input-section">
      <label for="pinCode">请输入PIN码：</label>
      <input 
        id="pinCode" 
        v-model="pinCode"
        type="password" 
        placeholder="输入管理员PIN码"
        @keyup.enter="startVerification"
        class="pin-input"
      />
      <button @click="startVerification" class="verify-button">验证</button>
    </div>
    
    <div id="result" class="result-panel">
      <div v-for="(log, index) in logs" :key="index" :class="log.isError ? 'error' : ''">
        {{ log.message }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UsbKeyAuth',
  props: {
    username: {
      type: String,
      default: ''
    },
    tempToken: {
      type: String,
      default: ''
    },
    serverPubKeyX: {
      type: String,
      default: ''
    },
    serverPubKeyY: {
      type: String,
      default: ''
    },
    hasKeyInfo: {
      type: Boolean,
      default: false
    }
  },
  emits: ['auth-success', 'auth-failure', 'status-change'],
  data() {
    return {
      pubKeyX: '',
      pubKeyY: '',
      devicePath: '',
      softKey: null,
      pinCode: '',
      logs: [],
      isLoading: false,
      hasPublicKey: false,
      isConnected: false,
      isVerified: false,
      authStatus: 'idle',
      pollingInterval: null,
      pollingAttempts: 0,
      maxPollingAttempts: 20,
      defaultPubKeyX: 'D5548C7825CBB56150A3506CD57464AF8A1AE0519DFAF3C58221DC810CAF28DD',
      defaultPubKeyY: '921073768FE3D59CE54E79A49445CF73FED23086537027264D168946D479533E',
      defaultUsername: 'bookstore',
      defaultPinCode: '123'
    }
  },
  mounted() {
    this.startDetection();
  },
  beforeUnmount() {
    this.stopDetection();
  },
  methods: {
    sendStatusChange() {
      this.$emit('status-change', {
        isConnected: this.isConnected,
        isVerified: this.isVerified,
        hasPublicKey: this.hasPublicKey,
        authStatus: this.authStatus
      });
    },

    log(message, isError = false) {
      this.logs.push({ message, isError });
      console.log(message);
      this.$nextTick(() => {
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
          resultDiv.scrollTop = resultDiv.scrollHeight;
        }
      });
      if (this.logs.length > 50) {
        this.logs.shift();
      }
    },

    clearLog() {
      this.logs = [];
    },

    startDetection() {
      this.log('开始自动检测USB Key设备...');
      this.pollingInterval = setInterval(() => {
        this.detectAndVerify();
        this.pollingAttempts++;
        
        if (this.pollingAttempts >= this.maxPollingAttempts) {
          this.stopDetection();
          if (!this.isConnected) {
            this.log('未检测到USB Key设备，请手动插入设备。', true);
            setTimeout(() => {
              this.pollingAttempts = 0;
              this.startDetection();
            }, 5000);
          }
        }
      }, 2000);
    },

    stopDetection() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },

    async detectAndVerify() {
      if (this.isVerified) {
        this.stopDetection();
        return;
      }

      try {
        await this.detectDevice();
        if (this.isConnected && !this.isVerified) {
          // 只显示提示信息，不自动触发验证
          this.verifyDevice();
        }
      } catch (error) {
        this.log(`检测过程错误: ${error.message}`, true);
        this.pollingAttempts++;
        if (this.pollingAttempts >= this.maxPollingAttempts) {
          this.isConnected = false;
          this.hasPublicKey = false;
          this.softKey = null;
          this.pollingAttempts = 0;
          this.authStatus = 'idle';
          this.sendStatusChange();
        }
      }
    },

    async detectDevice() {
      if (!window.SoftKey6W) {
        this.log('未找到USB Key驱动，请确保已正确加载Syunew6.js', true);
        return;
      }

      try {
        if (!this.softKey) {
          this.softKey = new window.SoftKey6W();
        }

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

        if (!this.isConnected || this.devicePath !== port) {
          this.log(`成功找到设备，端口号: ${port}`);
          this.devicePath = port;
          this.isConnected = true;
          this.pollingAttempts = 0;
          this.authStatus = 'connecting';
          
          try {
            const version = await this.softKey.GetVersion(port);
            this.log(`设备版本: ${version}`);
          } catch (e) {
            this.log('获取设备版本失败，将继续使用公钥', true);
          }
          
          // 根据后端返回的信息选择使用数据库公钥或默认公钥
          if (this.hasKeyInfo && this.serverPubKeyX && this.serverPubKeyY) {
            this.log('设备已连接，使用数据库中存储的公钥...');
            this.pubKeyX = this.serverPubKeyX;
            this.pubKeyY = this.serverPubKeyY;
            this.log(`公钥X: ${this.pubKeyX.substring(0, 20)}...`);
            this.log(`公钥Y: ${this.pubKeyY.substring(0, 20)}...`);
          } else {
            this.log('设备已连接，使用默认公钥...');
            this.pubKeyX = this.defaultPubKeyX;
            this.pubKeyY = this.defaultPubKeyY;
            this.log(`使用默认公钥和默认用户名：${this.defaultUsername}，请使用默认PIN码：${this.defaultPinCode}`);
          }
          
          this.hasPublicKey = true;
          this.log('公钥设置完成，准备进行随机数认证');
          this.sendStatusChange();
        }
      } catch (error) {
        this.log(`设备检测错误: ${error.message}`, true);
        this.authStatus = 'error';
        this.sendStatusChange();
        throw error;
      }
    },

    startVerification() {
      if (this.isConnected && this.pinCode) {
        this.log('开始验证USB Key...');
        this.authStatus = 'verifying';
        this.sendStatusChange();
        this.startRandomAuth();
      } else {
        this.log('请先输入PIN码', true);
      }
    },

    async verifyDevice() {
      // 设备连接后的处理
      if (this.hasPublicKey && !this.isVerified) {
        if (this.hasKeyInfo) {
          // 有密钥信息，等待用户输入PIN码
          if (!this.pinCode) {
            this.log('设备已连接，请输入PIN码进行验证');
            this.authStatus = 'waiting-pin';
            this.sendStatusChange();
          }
        } else {
          // 没有密钥信息，自动使用默认PIN码并开始验证
          this.log(`使用默认配置自动验证：用户名=${this.defaultUsername}, PIN码=${this.defaultPinCode}`);
          this.pinCode = this.defaultPinCode;
          this.authStatus = 'verifying';
          this.sendStatusChange();
          // 自动开始验证
          await this.startRandomAuth();
        }
      }
    },

    generateRandomHexString(length) {
      const chars = '0123456789ABCDEF';
      let result = '';
      for (let i = 0; i < length * 2; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    },

    async startRandomAuth() {
      try {
        if (!this.softKey || !this.devicePath || !this.pubKeyX || !this.pubKeyY) {
          this.log('请先读取公钥信息', true);
          this.authStatus = 'error';
          this.sendStatusChange();
          return;
        }
        
        this.isLoading = true;
        this.authStatus = 'verifying';
        this.log('\n========== 开始随机数认证 ==========', false);
        
        const randomNum = this.generateRandomHexString(16);
        this.log(`\n1. 生成随机数: ${randomNum}`, false);
        
        try {
            // 根据是否有密钥信息选择用户名：有密钥用真实用户名，无密钥用默认用户名
            const keyUsername = this.hasKeyInfo ? this.username : this.defaultUsername;
            this.log(`使用用户名: ${keyUsername} 进行签名`, false);
            
            // 使用选定的用户名和用户输入的PIN码进行签名
            const signature = await this.softKey.SendCmdAndWait(false, this.softKey._YtSign, keyUsername, randomNum, this.pinCode, this.devicePath);
            this.log(`签名结果: ${signature}`, false);
            
            try {
              let verifyResult;
              try {
                // 使用对应的用户名进行验证
                verifyResult = await this.softKey.SendCmdAndWait(false, this.softKey._YtVerfiy, 
                    keyUsername, randomNum, this.pubKeyX, this.pubKeyY, signature, this.devicePath);
              } catch (e) {
                try {
                  verifyResult = await this.softKey.SendCmdAndWait(false, this.softKey._YtVerfiy, 
                      randomNum, signature, this.pubKeyX, this.pubKeyY, this.devicePath);
                } catch (e) {
                  verifyResult = await this.softKey._YtVerfiy(randomNum, this.pubKeyX, this.pubKeyY, signature, this.devicePath);
                }
              }
            
            if (this.tempToken && this.username) {
              try {
                const response = await fetch('http://localhost:3000/api/verify-usb-key', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    tempToken: this.tempToken,
                    challenge: randomNum,
                    signature: signature,
                    pubKeyX: this.pubKeyX,
                    pubKeyY: this.pubKeyY,
                    pinCode: this.pinCode
                  })
                });
                
                const result = await response.json();
                
                if (result.success) {
                  this.log('\n✅ 后端验证成功！认证通过！', false);
                  this.isVerified = true;
                  this.authStatus = 'success';
                  this.sendStatusChange();
                  this.$emit('auth-success', result);
                  this.stopDetection();
                } else {
                  this.log('\n❌ 后端验证失败: ' + (result.message || '未知错误'), true);
                  this.isVerified = false;
                  this.authStatus = 'error';
                  this.sendStatusChange();
                  this.$emit('auth-failure', new Error(result.message || '后端验证失败'));
                }
              } catch (apiError) {
                this.log(`\n❌ API验证失败: ${apiError.message || '未知错误'}`, true);
                this.isVerified = false;
                this.authStatus = 'error';
                this.sendStatusChange();
                this.$emit('auth-failure', apiError);
              }
            } else {
              if (verifyResult === '1' || verifyResult === 1 || verifyResult === true) {
                this.log('\n✅ 本地签名验证成功！认证通过！', false);
                this.isVerified = true;
                this.authStatus = 'success';
                this.sendStatusChange();
                // 修改为传递验证结果对象，即使是本地验证也提供完整数据
                this.$emit('auth-success', {
                  success: true,
                  deviceVerified: true,
                  randomNum: randomNum,
                  signature: signature,
                  pubKeyX: this.pubKeyX,
                  pubKeyY: this.pubKeyY
                });
                this.stopDetection();
              } else {
                this.log('\n❌ 签名验证失败！认证不通过！', true);
                this.isVerified = false;
                this.authStatus = 'error';
                this.sendStatusChange();
                this.$emit('auth-failure', new Error('签名验证失败'));
              }
            }
          } catch (verifyError) {
            this.log(`验证异常: ${verifyError.message || '未知错误'}`, true);
            this.isVerified = false;
            this.authStatus = 'error';
            this.sendStatusChange();
            this.$emit('auth-failure', verifyError);
          }
        } catch (signError) {
          this.log(`签名失败: ${signError.message || '未知错误'}`, true);
          this.isVerified = false;
          this.authStatus = 'error';
          this.sendStatusChange();
          this.$emit('auth-failure', signError);
        }
      } catch (error) {
        this.log(`认证流程错误: ${error.message || '未知错误'}`, true);
        this.isVerified = false;
        this.authStatus = 'error';
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
  0% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(82, 196, 26, 0); }
  100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0); }
}

.lock-icon { font-size: 40px; color: #f5222d; }
.unlock-icon { font-size: 40px; color: #52c41a; }
.connecting-icon { font-size: 40px; color: #1890ff; animation: spin 1s linear infinite; }

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

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

.error { color: #d32f2f; }

.pin-input-section {
  margin-top: 20px;
  padding: 20px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.pin-input-section label {
  font-weight: 500;
  font-size: 16px;
}

.pin-input {
  padding: 10px 15px;
  font-size: 16px;
  border: 2px solid #d9d9d9;
  border-radius: 4px;
  width: 250px;
  transition: border-color 0.3s;
}

.pin-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.verify-button {
  padding: 10px 30px;
  font-size: 16px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.verify-button:hover {
  background-color: #40a9ff;
}

.verify-button:active {
  background-color: #096dd9;
}

@media (max-width: 768px) {
  .auth-status { flex-direction: column; }
  .lock-status { margin-right: 0; margin-bottom: 15px; }
  .status-text { text-align: center; }
  .pin-input { width: 100%; max-width: 250px; }
}
</style>