import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query as db } from '../config/db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 用户注册
router.post('/register', async (req, res) => {
    try {
        const { username, password, email, role } = req.body;
        
        // 验证角色是否合法
        if (!['buyer', 'seller'].includes(role)) {
            return res.status(400).json({ message: '角色无效，只能注册为买家或卖家' });
        }
        
        // 检查用户名是否已存在
        const existingUser = await db('SELECT * FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: '用户名已存在' });
        }
        
        // 密码加密
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 创建用户
        const result = await db(
            'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
            [username, hashedPassword, email, role]
        );
        
        const user = result.rows[0];
        res.status(201).json({ message: '注册成功', user });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ message: '注册失败', error: error.message });
    }
});

// 用户登录（第一步：验证用户名和密码）
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await db('SELECT * FROM users WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 如果是管理员，需要进行USB Key验证
        if (user.role === 'admin') {
            // 查询该管理员是否有对应的密钥信息
            const keyResult = await db('SELECT pub_key_x, pub_key_y FROM admin_keys WHERE admin_id = $1', [user.id]);
            
            // 生成临时token，用于USB Key验证阶段
            const tempToken = jwt.sign(
                { id: user.id, username: user.username, role: user.role, temp: true },
                JWT_SECRET,
                { expiresIn: '5m' } // 临时token有效期5分钟
            );
            
            // 无论是否有密钥信息，都需要进行USB Key验证
            if (keyResult.rows.length > 0) {
                // 有密钥信息，返回数据库中的公钥
                const keyInfo = keyResult.rows[0];
                return res.json({
                    requiresUsbKey: true,
                    tempToken,
                    user: { id: user.id, username: user.username, role: user.role },
                    hasKeyInfo: true,
                    pubKeyX: keyInfo.pub_key_x,
                    pubKeyY: keyInfo.pub_key_y
                });
            } else {
                // 没有密钥信息，使用默认公钥
                return res.json({
                    requiresUsbKey: true,
                    tempToken,
                    user: { id: user.id, username: user.username, role: user.role },
                    hasKeyInfo: false,
                    useDefaultKey: true
                });
            }
        }

        // 非管理员直接登录成功
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ message: '登录失败', error: error.message });
    }
});

// 验证USB Key（第二步：管理员登录的第二阶段）
router.post('/verify-usb-key', async (req, res) => {
    try {
        const { tempToken, challenge, signature, pubKeyX, pubKeyY, pinCode } = req.body;
        
        // 检查必要参数
        if (!tempToken || !challenge || !signature || !pubKeyX || !pubKeyY || !pinCode) {
            return res.status(400).json({ success: false, message: '缺少必要的验证参数' });
        }
        
        // 验证临时token
        let userData;
        try {
            userData = jwt.verify(tempToken, JWT_SECRET);
            // 确保是临时token且是管理员
            if (!userData.temp || userData.role !== 'admin') {
                return res.status(401).json({ success: false, message: '无效的临时凭证' });
            }
        } catch (error) {
            return res.status(401).json({ success: false, message: '临时凭证已过期或无效' });
        }
        
        // 查询用户信息
        const userResult = await db('SELECT * FROM users WHERE id = $1 AND role = $2', [userData.id, 'admin']);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ success: false, message: '管理员用户不存在' });
        }
        
        const user = userResult.rows[0];
        
        // 查询管理员密钥信息
        const keyResult = await db('SELECT pub_key_x, pub_key_y, pin_code FROM admin_keys WHERE admin_id = $1', [user.id]);
        
        // 定义默认公钥和PIN码（与前端保持一致）
        const defaultPubKeyX = 'D5548C7825CBB56150A3506CD57464AF8A1AE0519DFAF3C58221DC810CAF28DD';
        const defaultPubKeyY = '921073768FE3D59CE54E79A49445CF73FED23086537027264D168946D479533E';
        const defaultPinCode = '123'; // 默认PIN码
        
        if (keyResult.rows.length > 0) {
            // 数据库中有密钥信息，使用数据库中的公钥和PIN码
            const keyInfo = keyResult.rows[0];
            
            console.log(`验证管理员 ${user.username} (ID: ${user.id}) 的USB Key`);
            console.log(`输入的PIN码: ${pinCode}`);
            console.log(`数据库PIN码(加密): ${keyInfo.pin_code.substring(0, 20)}...`);
            
            // 验证PIN码
            const isPinValid = await bcrypt.compare(pinCode, keyInfo.pin_code);
            console.log(`PIN码验证结果: ${isPinValid ? '✅ 通过' : '❌ 失败'}`);
            
            if (!isPinValid) {
                return res.status(401).json({ success: false, message: 'PIN码不正确' });
            }
            
            // 验证公钥是否匹配
            console.log(`验证公钥匹配...`);
            console.log(`数据库公钥X: ${keyInfo.pub_key_x}`);
            console.log(`输入的公钥X: ${pubKeyX}`);
            console.log(`数据库公钥Y: ${keyInfo.pub_key_y}`);
            console.log(`输入的公钥Y: ${pubKeyY}`);
            
            const pubKeyXMatch = keyInfo.pub_key_x === pubKeyX;
            const pubKeyYMatch = keyInfo.pub_key_y === pubKeyY;
            console.log(`公钥X匹配: ${pubKeyXMatch ? '✅' : '❌'}`);
            console.log(`公钥Y匹配: ${pubKeyYMatch ? '✅' : '❌'}`);
            
            if (!pubKeyXMatch || !pubKeyYMatch) {
                return res.status(401).json({ success: false, message: 'USB Key公钥不匹配' });
            }
        } else {
            // 数据库中没有密钥信息，使用默认公钥和PIN码
            // 验证PIN码
            if (pinCode !== defaultPinCode) {
                return res.status(401).json({ success: false, message: 'PIN码不正确（请使用默认PIN码）' });
            }
            
            // 验证公钥是否匹配
            if (pubKeyX !== defaultPubKeyX || pubKeyY !== defaultPubKeyY) {
                return res.status(401).json({ success: false, message: 'USB Key公钥不匹配（请使用默认公钥）' });
            }
        }
        
        // 生成正式的JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            message: 'USB Key验证成功',
            token,
            user: { id: user.id, username: user.username, role: user.role }
        });
    } catch (error) {
        console.error('USB Key验证错误:', error);
        res.status(500).json({ success: false, message: '内部服务器错误', error: error.message });
    }
});

export default router;