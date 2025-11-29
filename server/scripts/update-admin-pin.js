import bcrypt from 'bcryptjs';
import { query as db } from '../config/db.js';

async function updateAdminPin() {
    try {
        // 这里设置要更新的管理员用户名和新PIN码
        const username = 'admin'; // 修改为您的管理员用户名
        const newPinCode = '123'; // 修改为您想要的PIN码
        
        console.log(`正在为用户 ${username} 更新PIN码...`);
        
        // 查找管理员用户
        const userResult = await db('SELECT id, username, role FROM users WHERE username = $1', [username]);
        
        if (userResult.rows.length === 0) {
            console.error(`错误: 用户 ${username} 不存在`);
            process.exit(1);
        }
        
        const user = userResult.rows[0];
        
        if (user.role !== 'admin') {
            console.error(`错误: 用户 ${username} 不是管理员`);
            process.exit(1);
        }
        
        console.log(`找到管理员用户: ${user.username} (ID: ${user.id})`);
        
        // 加密PIN码
        const hashedPinCode = await bcrypt.hash(newPinCode, 10);
        console.log(`PIN码已加密: ${hashedPinCode.substring(0, 20)}...`);
        
        // 检查是否已有密钥信息
        const keyResult = await db('SELECT * FROM admin_keys WHERE admin_id = $1', [user.id]);
        
        if (keyResult.rows.length > 0) {
            // 更新现有的PIN码
            await db(
                'UPDATE admin_keys SET pin_code = $1, updated_at = CURRENT_TIMESTAMP WHERE admin_id = $2',
                [hashedPinCode, user.id]
            );
            console.log(`✅ 成功更新管理员 ${username} 的PIN码为: ${newPinCode}`);
            
            // 显示公钥信息
            const keyInfo = keyResult.rows[0];
            console.log('\n当前密钥信息:');
            console.log(`  公钥X: ${keyInfo.pub_key_x}`);
            console.log(`  公钥Y: ${keyInfo.pub_key_y}`);
        } else {
            console.log(`警告: 管理员 ${username} 还没有密钥信息`);
            console.log('您需要先创建密钥信息，或者将使用默认配置登录');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('更新PIN码失败:', error);
        process.exit(1);
    }
}

updateAdminPin();


