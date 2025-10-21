import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 指定.env文件的路径（上一级目录）
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pkg;

// 确保密码是字符串类型
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: String(process.env.DB_PASSWORD), // 确保密码是字符串
    port: process.env.DB_PORT,
});

// 添加连接错误处理和日志记录
pool.on('error', (err) => {
    console.error('数据库连接池错误:', err);
});

// 包装查询函数，添加错误日志
export const query = async (text, params) => {
    try {
        return await pool.query(text, params);
    } catch (error) {
        console.error('数据库查询错误:', {
            query: text,
            params,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};