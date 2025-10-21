import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query as db } from '../config/db.js';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 指定.env文件的路径（上两级目录）
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// 管理员账号信息
const adminUser = {
  username: 'admin',
  password: 'admin123',
  email: 'admin@example.com',
  role: 'admin'
};

async function createAdmin() {
  try {
    console.log('开始创建管理员账号...');
    
    // 检查用户名是否已存在
    const existingUser = await db('SELECT * FROM users WHERE username = $1', [adminUser.username]);
    
    if (existingUser.rows.length > 0) {
      console.log(`用户名 "${adminUser.username}" 已存在，无需创建新的管理员账号。`);
      return;
    }
    
    // 密码加密
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);
    
    // 创建管理员用户
    const result = await db(
      'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [adminUser.username, hashedPassword, adminUser.email, adminUser.role]
    );
    
    const user = result.rows[0];
    console.log('管理员账号创建成功!');
    console.log('用户信息:', user);
    
  } catch (error) {
    console.error('创建管理员账号失败:', error);
  } finally {
    process.exit(0);
  }
}

// 执行创建管理员的操作
createAdmin(); 