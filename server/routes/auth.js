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

// 用户登录
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

export default router; 