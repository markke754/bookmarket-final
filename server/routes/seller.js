import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { upload, deleteFile } from '../utils/upload.js';
import { query as db } from '../config/db.js';
import { AppError } from '../middleware/error.js';

const router = express.Router();

// 获取卖家收款码
router.get('/payment-codes', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'seller') {
            return next(new AppError('只有卖家可以查看收款码', 403));
        }
        
        const result = await db(
            'SELECT type, image_url FROM payment_codes WHERE seller_id = $1',
            [req.user.id]
        );
        
        const paymentCodes = {};
        result.rows.forEach(code => {
            paymentCodes[code.type] = code.image_url;
        });
        
        res.json(paymentCodes);
    } catch (error) {
        next(error);
    }
});

// 上传支付码
router.post('/payment-codes', authenticateToken, upload.single('file'), async (req, res, next) => {
    try {
        if (req.user.role !== 'seller') {
            return next(new AppError('只有卖家可以设置支付码', 403));
        }
        
        if (!req.file) {
            return next(new AppError('未收到文件', 400));
        }
        
        // 获取支付码类型，默认为支付宝
        const type = req.body.type || 'alipay';
        
        if (!['alipay', 'wechat'].includes(type)) {
            return next(new AppError('支付码类型无效，必须是alipay或wechat', 400));
        }
        
        const image_url = `/uploads/${req.file.filename}`;
        console.log('收到支付码上传:', req.file, '类型:', type);
        
        // 查找是否已存在该类型的支付码
        const existingCode = await db(
            'SELECT * FROM payment_codes WHERE seller_id = $1 AND type = $2',
            [req.user.id, type]
        );
        
        // 如果已存在，则更新记录
        if (existingCode.rows.length > 0) {
            // 删除旧图片文件
            if (existingCode.rows[0].image_url) {
                deleteFile(existingCode.rows[0].image_url);
            }
            
            await db(
                'UPDATE payment_codes SET image_url = $1, updated_at = NOW() WHERE seller_id = $2 AND type = $3',
                [image_url, req.user.id, type]
            );
            
            console.log(`已更新${type}收款码，卖家ID:${req.user.id}`);
        } else {
            // 否则，添加新记录
            await db(
                'INSERT INTO payment_codes (seller_id, type, image_url) VALUES ($1, $2, $3)',
                [req.user.id, type, image_url]
            );
            
            console.log(`已添加${type}收款码，卖家ID:${req.user.id}`);
        }
        
        // 返回文件路径
        return res.status(200).json({
            message: '支付码上传成功',
            path: image_url
        });
    } catch (error) {
        console.error('上传支付码失败:', error);
        next(new AppError('上传支付码失败: ' + error.message, 500));
    }
});

// 删除收款码
router.delete('/payment-codes/:type', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'seller') {
            return next(new AppError('只有卖家可以删除收款码', 403));
        }

        const { type } = req.params;

        if (!['alipay', 'wechat'].includes(type)) {
            return next(new AppError('收款码类型无效', 400));
        }

        // 查找当前收款码
        const existingCode = await db(
            'SELECT * FROM payment_codes WHERE seller_id = $1 AND type = $2',
            [req.user.id, type]
        );

        if (existingCode.rows.length === 0) {
            return next(new AppError('收款码不存在', 404));
        }

        // 删除图片文件
        if (existingCode.rows[0].image_url) {
            deleteFile(existingCode.rows[0].image_url);
        }

        // 删除数据库记录
        await db(
            'DELETE FROM payment_codes WHERE seller_id = $1 AND type = $2',
            [req.user.id, type]
        );

        res.json({ message: '收款码删除成功' });
    } catch (error) {
        next(error);
    }
});

// 获取卖家的销售统计
router.get('/stats', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'seller') {
            return next(new AppError('只有卖家可以访问销售统计', 403));
        }

        // 获取总销售额
        const totalSalesResult = await db(
            `SELECT SUM(o.total_price) as total_sales
             FROM orders o
             JOIN books b ON o.book_id = b.id
             WHERE b.seller_id = $1 AND o.status != 'cancelled'`,
            [req.user.id]
        );

        // 获取销售订单数
        const orderCountResult = await db(
            `SELECT COUNT(*) as order_count
             FROM orders o
             JOIN books b ON o.book_id = b.id
             WHERE b.seller_id = $1 AND o.status != 'cancelled'`,
            [req.user.id]
        );

        // 获取图书销售排行
        const topBooksResult = await db(
            `SELECT b.id, b.title, COUNT(o.id) as order_count, SUM(o.quantity) as total_quantity, SUM(o.total_price) as total_sales
             FROM orders o
             JOIN books b ON o.book_id = b.id
             WHERE b.seller_id = $1 AND o.status != 'cancelled'
             GROUP BY b.id, b.title
             ORDER BY total_sales DESC
             LIMIT 5`,
            [req.user.id]
        );

        // 获取月度销售趋势
        const monthlySalesResult = await db(
            `SELECT TO_CHAR(o.created_at, 'YYYY-MM') as month, SUM(o.total_price) as sales
             FROM orders o
             JOIN books b ON o.book_id = b.id
             WHERE b.seller_id = $1 AND o.status != 'cancelled'
             GROUP BY month
             ORDER BY month DESC
             LIMIT 12`,
            [req.user.id]
        );

        res.json({
            totalSales: totalSalesResult.rows[0]?.total_sales || 0,
            orderCount: orderCountResult.rows[0]?.order_count || 0,
            topBooks: topBooksResult.rows,
            monthlySales: monthlySalesResult.rows
        });
    } catch (error) {
        next(error);
    }
});

// 获取卖家图书列表
router.get('/books', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'seller') {
            return next(new AppError('只有卖家可以访问自己的图书', 403));
        }
        
        console.log('获取卖家图书，卖家ID:', req.user.id);
        
        const result = await db(
            'SELECT * FROM books WHERE seller_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        
        res.json({ books: result.rows });
    } catch (error) {
        console.error('获取卖家图书失败:', error);
        next(new AppError('获取图书列表失败: ' + error.message, 500));
    }
});

// 获取卖家订单
router.get('/orders', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'seller') {
            return next(new AppError('只有卖家可以查看自己的订单', 403));
        }
        
        console.log('获取卖家订单，卖家ID:', req.user.id);
        
        const result = await db(
            `SELECT o.*, b.title as book_title, u.username as buyer_username
             FROM orders o
             JOIN books b ON o.book_id = b.id
             JOIN users u ON o.buyer_id = u.id
             WHERE b.seller_id = $1
             ORDER BY o.created_at DESC`,
            [req.user.id]
        );
        
        // 格式化订单数据
        const orders = result.rows.map(order => ({
            id: order.id,
            book: { id: order.book_id, title: order.book_title },
            buyer: { id: order.buyer_id, username: order.buyer_username },
            quantity: order.quantity,
            total_price: order.total_price,
            status: order.status,
            payment_method: order.payment_method,
            created_at: order.created_at
        }));
        
        res.json({ orders });
    } catch (error) {
        console.error('获取卖家订单失败:', error);
        next(new AppError('获取订单列表失败: ' + error.message, 500));
    }
});

export default router; 