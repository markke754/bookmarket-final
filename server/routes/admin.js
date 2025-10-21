import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken } from '../middleware/auth.js';
import { query as db } from '../config/db.js';
import { AppError } from '../middleware/error.js';

const router = express.Router();

// 创建管理员账号（仅限管理员）
router.post('/register', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return next(new AppError('只有管理员可以创建新的管理员账号', 403));
        }
        
        const { username, password, email } = req.body;
        
        // 检查用户名是否已存在
        const existingUser = await db('SELECT * FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            return next(new AppError('用户名已存在', 400));
        }
        
        // 密码加密
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 创建管理员用户
        const result = await db(
            'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
            [username, hashedPassword, email, 'admin']
        );
        
        const user = result.rows[0];
        res.status(201).json({ 
            success: true,
            message: '管理员账号创建成功', 
            user 
        });
    } catch (error) {
        next(error);
    }
});

// 获取所有用户（仅限管理员）
router.get('/users', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return next(new AppError('只有管理员可以查看所有用户', 403));
        }
        
        const result = await db(
            'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
        );
        
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// 更新用户状态（仅限管理员）
router.put('/users/:id/status', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return next(new AppError('只有管理员可以更新用户状态', 403));
        }
        
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['active', 'suspended'].includes(status)) {
            return next(new AppError('无效的用户状态', 400));
        }
        
        // 确保不是在修改自己的状态
        if (parseInt(id) === req.user.id) {
            return next(new AppError('不能修改自己的状态', 400));
        }
        
        // 首先检查用户是否存在
        const userResult = await db('SELECT * FROM users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) {
            return next(new AppError('用户不存在', 404));
        }
        
        // 添加状态字段到数据库（如果尚未添加）
        try {
            await db('ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'active\'');
        } catch (error) {
            console.error('添加状态字段失败:', error);
        }
        
        // 更新用户状态
        await db(
            'UPDATE users SET status = $1 WHERE id = $2',
            [status, id]
        );
        
        res.json({ message: '用户状态已更新' });
    } catch (error) {
        next(error);
    }
});

// 获取所有订单（仅限管理员）
router.get('/orders', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return next(new AppError('只有管理员可以查看所有订单', 403));
        }
        
        const result = await db(
            `SELECT o.id, o.buyer_id, o.book_id, o.quantity, o.total_price, o.status, 
                o.created_at, b.title as book_title, u1.username as buyer_name, 
                u2.username as seller_name
            FROM orders o
            JOIN books b ON o.book_id = b.id
            JOIN users u1 ON o.buyer_id = u1.id
            JOIN users u2 ON b.seller_id = u2.id
            ORDER BY o.created_at DESC`
        );
        
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// 获取系统统计信息（仅限管理员）
router.get('/stats', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return next(new AppError('只有管理员可以查看系统统计', 403));
        }
        
        // 获取用户统计
        const userStats = await db(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN role = 'buyer' THEN 1 END) as buyers,
                COUNT(CASE WHEN role = 'seller' THEN 1 END) as sellers,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
            FROM users
        `);
        
        // 获取订单统计
        const orderStats = await db(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(total_price) as total_sales,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
            FROM orders
        `);
        
        // 获取图书统计
        const bookStats = await db(`
            SELECT 
                COUNT(*) as total_books,
                SUM(stock) as total_stock,
                AVG(price) as avg_price
            FROM books
        `);
        
        // 获取最近注册的用户
        const recentUsers = await db(`
            SELECT id, username, email, role, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        // 获取最近的订单
        const recentOrders = await db(`
            SELECT o.id, o.total_price, o.status, o.created_at, 
                u.username as buyer_name, b.title as book_title
            FROM orders o
            JOIN users u ON o.buyer_id = u.id
            JOIN books b ON o.book_id = b.id
            ORDER BY o.created_at DESC
            LIMIT 5
        `);
        
        res.json({
            userStats: userStats.rows[0],
            orderStats: orderStats.rows[0],
            bookStats: bookStats.rows[0],
            recentUsers: recentUsers.rows,
            recentOrders: recentOrders.rows
        });
    } catch (error) {
        next(error);
    }
});

// 发布公告（仅限管理员）
router.post('/announcements', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return next(new AppError('只有管理员可以发布公告', 403));
        }
        
        const { content } = req.body;
        
        if (!content || content.trim() === '') {
            return next(new AppError('公告内容不能为空', 400));
        }
        
        // 创建公告表（如果不存在）
        await db(`
            CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                admin_id INTEGER REFERENCES users(id)
            )
        `);
        
        // 插入新公告
        const result = await db(
            'INSERT INTO announcements (content, admin_id) VALUES ($1, $2) RETURNING id, content, created_at',
            [content, req.user.id]
        );
        
        const announcement = result.rows[0];
        res.status(201).json({ 
            success: true,
            message: '公告发布成功', 
            announcement 
        });
    } catch (error) {
        next(error);
    }
});

// 获取所有公告
router.get('/announcements', async (req, res, next) => {
    try {
        // 确保表存在
        await db(`
            CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                admin_id INTEGER REFERENCES users(id)
            )
        `);
        
        const result = await db(`
            SELECT a.id, a.content, a.created_at, u.username as admin_username
            FROM announcements a
            LEFT JOIN users u ON a.admin_id = u.id
            ORDER BY a.created_at DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// 删除用户（仅限管理员）
router.delete('/users/:id', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return next(new AppError('只有管理员可以删除用户', 403));
        }
        
        const { id } = req.params;
        
        // 确保不是在删除自己
        if (parseInt(id) === req.user.id) {
            return next(new AppError('不能删除自己的账号', 400));
        }
        
        // 首先检查用户是否存在
        const userResult = await db('SELECT * FROM users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) {
            return next(new AppError('用户不存在', 404));
        }
        
        // 检查用户角色，防止删除其他管理员
        const user = userResult.rows[0];
        if (user.role === 'admin' && req.user.id !== user.id) {
            return next(new AppError('不能删除其他管理员账号', 403));
        }
        
        // 删除用户
        await db('DELETE FROM users WHERE id = $1', [id]);
        
        res.json({ 
            success: true,
            message: '用户已成功删除' 
        });
    } catch (error) {
        next(error);
    }
});

export default router; 