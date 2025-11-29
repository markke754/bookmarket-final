// 生成安全的JWT密钥脚本
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 在ES模块中获取当前文件和目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 生成64字节(512位)的随机密钥，然后转换为十六进制字符串
const generateSecureKey = () => {
  // 生成64字节的随机数据，确保足够的熵
  const randomBytes = crypto.randomBytes(64);
  // 转换为十六进制字符串，长度为128个字符
  return randomBytes.toString('hex');
};

// 更新.env文件中的JWT_SECRET
const updateEnvFile = (newSecret) => {
  const envPath = path.resolve(__dirname, '../.env');
  
  try {
    // 读取当前的.env文件内容
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // 替换JWT_SECRET行
    const updatedContent = envContent.replace(
      /^JWT_SECRET=.*/m,
      `JWT_SECRET=${newSecret}`
    );
    
    // 写回.env文件
    fs.writeFileSync(envPath, updatedContent, 'utf8');
    console.log('✅ JWT密钥已成功更新！');
    console.log(`新密钥: ${newSecret}`);
    return newSecret;
  } catch (error) {
    console.error('❌ 更新.env文件时出错:', error.message);
    throw error;
  }
};

// 执行生成和更新
const newSecret = generateSecureKey();
updateEnvFile(newSecret);