<template>
  <div class="usb-key-auth">
    <h1>USB Key SM2密钥读取与随机数认证</h1>
    
    <div class="step">
      <h2>1. 读取USB Key公钥</h2>
      <p>本程序将帮助您查找USB Key设备并读取其SM2密钥的公钥信息。</p>
      <button @click="readPublicKey" :disabled="isLoading">开始读取公钥</button>
    </div>
    
    <div class="step verification-section">
      <h2>2. 随机数认证</h2>
      <p>使用USB Key对随机数进行签名并验证，确保设备正常工作。</p>
      <button @click="startRandomAuth" id="authBtn" :disabled="!hasPublicKey || isLoading">开始随机数认证</button>
      <p><small>请先完成公钥读取，再进行认证</small></p>
    </div>
    
    <div id="result">
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
      // 预存储公钥
      storedPubKeyX: 'D5548C7825CBB56150A3506CD57464AF8A1AE0519DFAF3C58221DC810CAF28DD',
      storedPubKeyY: '921073768FE3D59CE54E79A49445CF73FED23086537027264D168946D479533E'
    }
  },
  methods: {
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
    },

    // 清除日志
    clearLog() {
      this.logs = [];
    },

    // 读取USB Key公钥
    async readPublicKey() {
      this.clearLog();
      this.log('开始查找USB Key设备...');
      this.isLoading = true;
      
      try {
        // 确保SoftKey6W在全局作用域可用
        if (!window.SoftKey6W) {
          throw new Error('未找到USB Key驱动，请确保已正确加载Syunew6.js');
        }
        
        // 创建SoftKey6W实例
        const softKey = new window.SoftKey6W();
        
        // 查找USB Key设备，从端口0开始查找
        const port = await softKey.FindPort(0);
        
        if (port === null || port === undefined || port === false) {
          throw new Error('未找到USB Key设备，请确保设备已正确连接');
        }
        
        this.log(`成功找到设备，端口号: ${port}`);
        
        // 直接使用FindPort返回的路径作为设备路径
        const keyPath = port;
        this.log(`设备路径: ${keyPath}`);
        
        // 获取设备信息
        this.log('获取设备信息...');
        const version = await softKey.GetVersion(keyPath);
        this.log(`设备版本: ${version}`);
        
        // 获取USB Key ID (ID_1)
        this.log('获取USB Key ID (ID_1)...');
        const id1 = await softKey.GetID_1(keyPath);
        this.log(`USB Key ID_1: ${id1}`);
        this.log(`ID_1长度: ${typeof id1 === 'string' ? id1.length : '非字符串类型'}`);
        
        // 获取USB Key ID (ID_2)
        this.log('获取USB Key ID (ID_2)...');
        const id2 = await softKey.GetID_2(keyPath);
        this.log(`USB Key ID_2: ${id2}`);
        this.log(`ID_2长度: ${typeof id2 === 'string' ? id2.length : '非字符串类型'}`);
        
        // 获取芯片ID
        this.log('获取芯片ID...');
        const chipId = await softKey.GetChipID(keyPath);
        this.log(`芯片ID: ${chipId}`);
        this.log(`芯片ID长度: ${chipId ? chipId.length : '未知'} 字符`);
        
        // 使用固定的用户名用于标识密钥对
        const fixedUserName = 'bookstore';
        
        // 验证USB Key中是否存在bookstore用户的密钥对
        try {
          this.log('正在检查USB Key中已存在的密钥对...');
          
          // 1. 验证步骤1: 检查bookstore用户是否已设置
          try {
            const currentUserName = await softKey.GetSm2UserName(keyPath);
            this.log(`当前用户名: ${currentUserName || '未设置'}`);
            
            // 验证用户名是否为bookstore
            if (currentUserName === fixedUserName) {
              this.log('✅ 用户名验证成功！已检测到bookstore用户的密钥对');
            } else {
              this.log(`⚠️  警告：当前用户名与预期的bookstore不匹配，将继续尝试使用已有密钥`, true);
            }
          } catch (userError) {
            this.log(`获取用户名时出错: ${userError.message}，将继续尝试使用已有密钥`, true);
          }
          
          // 2. 预先验证公钥是否可读
          try {
            const currentPubX = await softKey.GetPubKeyX(keyPath);
            const currentPubY = await softKey.GetPubKeyY(keyPath);
            
            if (currentPubX && currentPubY) {
              this.log(`✅ 公钥验证成功！已成功读取到公钥信息`);
              this.log(`当前公钥X前20字符: ${currentPubX.substring(0, 20)}...`);
              this.log(`当前公钥Y前20字符: ${currentPubY.substring(0, 20)}...`);
            } else {
              this.log('⚠️  警告：公钥信息读取不完整，可能影响签名验证', true);
            }
          } catch (pubKeyError) {
            this.log(`获取公钥信息时出错: ${pubKeyError.message}`, true);
          }
          
          this.log(`将直接使用USB Key中已存在的密钥对进行操作，用户名为: ${fixedUserName}`);
        } catch (e) {
          this.log('密钥检查操作失败: ' + e.message);
          // 继续执行，尝试使用已有密钥
        }
        
        // 使用预存储在电脑中的公钥
        this.log('使用预存储在电脑中的公钥...');
        
        this.log(`预存储公钥X: ${this.storedPubKeyX}`, false);
        this.log(`预存储公钥Y: ${this.storedPubKeyY}`, false);
        
        // 仍然尝试从USB Key读取公钥（可选，用于验证）
        try {
          const usbKeyPubKeyX = await softKey.GetPubKeyX(keyPath);
          const usbKeyPubKeyY = await softKey.GetPubKeyY(keyPath);
          this.log('从USB Key读取的公钥（用于验证）:', false);
          this.log(`USB Key公钥X: ${usbKeyPubKeyX}`, false);
          this.log(`USB Key公钥Y: ${usbKeyPubKeyY}`, false);
          
          // 验证预存储公钥与USB Key公钥是否匹配
          const isMatch = (this.storedPubKeyX === usbKeyPubKeyX) && (this.storedPubKeyY === usbKeyPubKeyY);
          this.log(`预存储公钥与USB Key公钥匹配状态: ${isMatch ? '✅ 匹配' : '❌ 不匹配'}`, isMatch ? false : true);
        } catch (e) {
          this.log('从USB Key读取公钥失败（不影响使用预存储公钥）: ' + e.message, true);
        }
        
        // 获取用户名并保存到实例变量
        try {
          const userName = await softKey.GetSm2UserName(keyPath);
          this.log(`读取到的用户名: ${userName || '未设置'}`);
          this.userName = userName || fixedUserName; // 如果没读取到，使用我们设置的默认用户名
        } catch (e) {
          this.log('获取用户名失败: ' + e.message);
          this.userName = fixedUserName; // 失败时使用默认用户名
        }
        
        // 保存预存储公钥和设备信息到实例变量，供认证使用
        this.pubKeyX = this.storedPubKeyX;
        this.pubKeyY = this.storedPubKeyY;
        this.devicePath = keyPath;
        this.softKey = softKey;
        this.hasPublicKey = true;
        
        this.log(`已保存必要信息到变量，准备进行随机数认证`, false);
        
        // 显示完整公钥信息
        this.log('\n========== 公钥信息 ==========', false);
        this.log(`公钥X分量: ${this.pubKeyX}`, false);
        this.log(`公钥X长度: ${this.pubKeyX.length} 字符`, false);
        this.log(`公钥Y分量: ${this.pubKeyY}`, false);
        this.log(`公钥Y长度: ${this.pubKeyY.length} 字符`, false);
        
        // 组合完整公钥（通常SM2公钥是04 + X + Y格式）
        const fullPublicKey = `04${this.pubKeyX}${this.pubKeyY}`;
        this.log(`\n完整公钥(04+X+Y): ${fullPublicKey}`, false);
        this.log(`完整公钥长度: ${fullPublicKey.length} 字符`, false);
        this.log('\n✅ 公钥读取成功！现在可以进行随机数认证了。', false);
        
      } catch (error) {
        this.log('❌ 错误: ' + error.message, true);
        this.log('请检查：', true);
        this.log('1. USB Key是否正确连接', true);
        this.log('2. 是否安装了USB Key驱动程序', true);
        this.log('3. 是否有其他程序正在使用USB Key', true);
      } finally {
        this.isLoading = false;
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
          
          // 验证设备中存储的公钥与预存储公钥是否匹配（可选，用于验证）
          try {
            const devicePubKeyX = await this.softKey.GetPubKeyX(this.devicePath);
            const devicePubKeyY = await this.softKey.GetPubKeyY(this.devicePath);
            this.log(`设备中当前存储的公钥X: ${devicePubKeyX.substring(0, 20)}...`, false);
            this.log(`设备中当前存储的公钥Y: ${devicePubKeyY.substring(0, 20)}...`, false);
            
            // 验证预存储公钥与设备公钥是否匹配
            const isPubKeyMatch = (devicePubKeyX === this.pubKeyX) && (devicePubKeyY === this.pubKeyY);
            this.log(`预存储公钥与设备公钥匹配状态: ${isPubKeyMatch ? '✅ 匹配' : '❌ 不匹配'}`, isPubKeyMatch ? false : true);
            
            if (!isPubKeyMatch) {
              this.log('警告：公钥不匹配可能导致验证失败，但仍将使用预存储公钥进行验证', true);
            }
          } catch (keyError) {
            this.log(`获取设备当前公钥失败: ${keyError.message}，将继续使用预存储公钥`, true);
          }
          
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
              // 可以在这里触发成功事件，通知父组件
              this.$emit('auth-success');
            } else {
              this.log('\n❌ 签名验证失败！认证不通过！', true);
              this.log(`详细返回值: ${verifyResult}`, true);
              this.log('可能原因: 签名使用的私钥与验证使用的公钥不匹配，或参数顺序不正确', true);
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
  margin: 20px;
  line-height: 1.6;
  max-width: 800px;
  margin: 0 auto;
}
button {
  background-color: #4CAF50;
  border: none;
  color: white;
  padding: 10px 20px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 10px 0;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.3s;
}
button:hover:not(:disabled) {
  background-color: #45a049;
}
button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
#result {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  min-height: 100px;
  max-height: 400px;
  overflow-y: auto;
}
.error {
  color: #d32f2f;
}
.success {
  color: #2e7d32;
}
.step {
  margin: 20px 0;
  padding: 15px;
  background-color: #fff;
  border-left: 4px solid #4CAF50;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.verification-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
}
</style>