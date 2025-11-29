import { query as db } from '../config/db.js';

async function checkAdminKeys() {
    try {
        console.log('========== 检查所有管理员密钥信息 ==========\n');
        
        // 查询所有管理员
        const adminsResult = await db('SELECT id, username, email, created_at FROM users WHERE role = $1', ['admin']);
        
        if (adminsResult.rows.length === 0) {
            console.log('没有找到管理员用户');
            process.exit(0);
        }
        
        console.log(`找到 ${adminsResult.rows.length} 个管理员:\n`);
        
        for (const admin of adminsResult.rows) {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`管理员: ${admin.username}`);
            console.log(`ID: ${admin.id}`);
            console.log(`邮箱: ${admin.email}`);
            console.log(`创建时间: ${admin.created_at}`);
            
            // 查询密钥信息
            const keyResult = await db('SELECT * FROM admin_keys WHERE admin_id = $1', [admin.id]);
            
            if (keyResult.rows.length > 0) {
                const keyInfo = keyResult.rows[0];
                console.log(`\n✅ 有密钥信息:`);
                console.log(`  公钥X: ${keyInfo.pub_key_x}`);
                console.log(`  公钥Y: ${keyInfo.pub_key_y}`);
                console.log(`  PIN码(加密): ${keyInfo.pin_code.substring(0, 30)}...`);
                console.log(`  创建时间: ${keyInfo.created_at}`);
                console.log(`  更新时间: ${keyInfo.updated_at}`);
                console.log(`\n  登录时需要输入PIN码进行验证`);
            } else {
                console.log(`\n❌ 没有密钥信息`);
                console.log(`  将使用默认配置:`);
                console.log(`    用户名: bookstore`);
                console.log(`    PIN码: 123`);
                console.log(`    公钥: 默认公钥`);
            }
            console.log('');
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        process.exit(0);
    } catch (error) {
        console.error('检查失败:', error);
        process.exit(1);
    }
}

checkAdminKeys();


