import express from 'express';
import jwt from 'jsonwebtoken';
import { query as db } from '../config/db.js';

const router = express.Router();

// 创建认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: '未提供认证令牌' });
    }
    
    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: '认证令牌无效' });
    }
};

// 确认支付订单
router.post('/confirm', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'buyer') {
            return res.status(403).json({ message: '只有买家可以支付订单' });
        }

        const { paymentMethod, selectedSeller, cartItems } = req.body;

        if (!paymentMethod || !selectedSeller || !cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: '参数不完整' });
        }

        // 事务开始
        await db('BEGIN');

        // 遍历购物车项，创建订单
        for (const item of cartItems) {
            // 获取图书信息，主要是检查库存
            const bookResult = await db(
                'SELECT * FROM books WHERE id = $1 FOR UPDATE',
                [item.id]
            );

            if (bookResult.rows.length === 0) {
                await db('ROLLBACK');
                return res.status(404).json({ message: `图书ID ${item.id} 不存在` });
            }

            const book = bookResult.rows[0];
            
            // 检查库存是否足够
            if (book.stock < item.quantity) {
                await db('ROLLBACK');
                return res.status(400).json({ message: `图书《${book.title}》库存不足，当前库存: ${book.stock}` });
            }

            // 创建订单
            await db(
                'INSERT INTO orders (buyer_id, book_id, quantity, total_price, status, payment_method) VALUES ($1, $2, $3, $4, $5, $6)',
                [req.user.id, item.id, item.quantity, item.price * item.quantity, 'paid', paymentMethod]
            );

            // 更新库存
            await db(
                'UPDATE books SET stock = stock - $1 WHERE id = $2',
                [item.quantity, item.id]
            );
        }

        // 事务提交
        await db('COMMIT');

        res.json({ message: '订单支付成功' });
    } catch (error) {
        await db('ROLLBACK');
        console.error('支付订单失败:', error);
        res.status(500).json({ message: '支付订单失败', error: error.message });
    }
});

// 获取买家订单历史
router.get('/buyer', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        console.log('获取买家订单请求开始 ====');
        console.log('用户信息:', {
            id: req.user.id,
            role: req.user.role,
            username: req.user.username
        });
        console.log('查询参数:', { page, limit, offset });
        
        if (req.user.role !== 'buyer') {
            console.log('权限检查失败：用户角色不是买家');
            return res.status(403).json({ 
                message: '只有买家可以查看自己的订单历史',
                currentRole: req.user.role 
            });
        }

        try {
            // 获取总订单数
            const countResult = await db(
                `SELECT COUNT(*) FROM orders WHERE buyer_id = $1`,
                [req.user.id]
            );
            
            // 检查查询结果是否有效
            if (!countResult || !countResult.rows || countResult.rows.length === 0) {
                console.log('订单数量查询结果无效');
                return res.json({
                    orders: [],
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: 0
                });
            }
            
            const total = parseInt(countResult.rows[0].count);
            const pages = Math.ceil(total / limit);
            
            console.log('订单总数:', total);
            
            // 如果没有订单，直接返回空结果
            if (total === 0) {
                console.log('用户没有订单，返回空列表');
                return res.json({
                    orders: [],
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: 0
                });
            }

            // 获取订单详情
            const query = `
                SELECT o.id, o.quantity, o.total_price, o.status, o.created_at,
                       b.id as book_id, b.title as book_title, b.author as book_author, b.image_url as book_image,
                       u.username as seller_name, u.id as seller_id
                FROM orders o
                JOIN books b ON o.book_id = b.id
                JOIN users u ON b.seller_id = u.id
                WHERE o.buyer_id = $1
                ORDER BY o.created_at DESC
                LIMIT $2 OFFSET $3`;
                
            console.log('执行查询:', {
                query,
                params: [req.user.id, limit, offset]
            });

            const ordersResult = await db(query, [req.user.id, limit, offset]);
            console.log('查询结果数量:', ordersResult?.rows?.length || 0);
            
            // 检查结果是否有效
            if (!ordersResult || !ordersResult.rows) {
                console.log('订单查询结果无效');
                return res.json({
                    orders: [],
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages
                });
            }

            // 格式化返回数据
            const orders = ordersResult.rows.map(order => {
                try {
                    return {
                        id: order.id,
                        quantity: order.quantity,
                        total_price: order.total_price,
                        status: order.status,
                        created_at: order.created_at,
                        book: {
                            id: order.book_id,
                            title: order.book_title,
                            author: order.book_author,
                            image_url: order.book_image
                        },
                        seller: {
                            id: order.seller_id,
                            username: order.seller_name
                        }
                    };
                } catch (mapError) {
                    console.error('格式化订单数据时出错:', mapError);
                    // 返回一个基本的对象
                    return {
                        id: order.id || 0,
                        error: true,
                        message: '订单数据格式化失败'
                    };
                }
            });

            console.log('获取买家订单请求完成 ====');
            
            res.json({
                orders,
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages
            });
        } catch (dbError) {
            console.error('数据库查询失败:', dbError);
            // 数据库查询错误，返回空结果
            return res.json({
                orders: [],
                total: 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: 0,
                db_error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            });
        }
    } catch (error) {
        console.error('获取买家订单列表失败:', error);
        console.error('错误堆栈:', error.stack);
        
        // 返回500错误改为返回200成功但有空数据，避免客户端显示错误
        res.json({ 
            orders: [],
            total: 0,
            page: 1,
            limit: 10,
            pages: 0,
            error: true,
            message: '获取订单列表失败，请稍后重试',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 保留旧的路由以保持兼容性
router.get('/history', authenticateToken, (req, res) => {
    // 重定向到新的买家订单路由
    router.handle(req, res, '/buyer');
});

// 获取卖家的订单列表
router.get('/seller', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'seller') {
            return res.status(403).json({ message: '只有卖家可以查看自己的销售订单' });
        }

        const ordersResult = await db(
            `SELECT o.id, o.quantity, o.total_price, o.status, o.created_at, o.payment_method,
             b.title as book_title, b.id as book_id,
             u.username as buyer_name
             FROM orders o
             JOIN books b ON o.book_id = b.id
             JOIN users u ON o.buyer_id = u.id
             WHERE b.seller_id = $1
             ORDER BY o.created_at DESC`,
            [req.user.id]
        );

        res.json(ordersResult.rows);
    } catch (error) {
        console.error('获取销售订单失败:', error);
        res.status(500).json({ message: '获取销售订单失败', error: error.message });
    }
});

// 新增: 获取卖家支付信息
router.post('/prepare', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'buyer') {
            return res.status(403).json({ message: '只有买家可以获取支付信息' });
        }

        const { items } = req.body;
        
        console.log('收到的商品数据:', items);
        
        if (!items || items.length === 0) {
            return res.status(400).json({ message: '购物车为空' });
        }

        // 验证所有图书是否从同一卖家
        const bookIds = items.map(item => item.id);
        console.log('提取的图书ID:', bookIds);
        
        if (!bookIds.length) {
            return res.status(400).json({ 
                success: false,
                message: '购物车商品数据格式无效' 
            });
        }
        
        const booksResult = await db(
            'SELECT b.id, b.seller_id, u.username as seller_name FROM books b JOIN users u ON b.seller_id = u.id WHERE b.id = ANY($1::int[])',
            [bookIds]
        );

        if (booksResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: '图书不存在' 
            });
        }

        const sellerId = booksResult.rows[0].seller_id;
        const sellerName = booksResult.rows[0].seller_name;

        // 确保所有图书来自同一卖家
        const differentSeller = booksResult.rows.find(book => book.seller_id !== sellerId);
        if (differentSeller) {
            return res.status(400).json({ 
                success: false,
                message: '一次只能购买同一卖家的图书' 
            });
        }

        // 获取卖家的收款码
        const paymentCodesResult = await db(
            'SELECT type, image_url FROM payment_codes WHERE seller_id = $1',
            [sellerId]
        );

        const paymentCodes = {};
        paymentCodesResult.rows.forEach(code => {
            paymentCodes[code.type] = code.image_url;
        });

        // 更规范的响应结构
        res.json({
            success: true,
            data: {
                seller: {
                    id: sellerId,
                    name: sellerName
                },
                payment_methods: {
                    alipay: paymentCodes.alipay || null,
                    wechat: paymentCodes.wechat || null
                }
            }
        });
    } catch (error) {
        console.error('获取支付信息失败:', error);
        res.status(500).json({ 
            success: false,
            message: '获取支付信息失败', 
            error: error.message 
        });
    }
});

// 更新订单状态（卖家）
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'seller') {
            return res.status(403).json({ message: '只有卖家可以更新订单状态' });
        }

        const { id } = req.params;
        const { status } = req.body;

        // 验证状态有效性
        const validStatuses = ['paid', 'shipped', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: '无效的订单状态' });
        }

        // 验证订单是否属于该卖家
        const orderCheck = await db(
            `SELECT o.id FROM orders o
             JOIN books b ON o.book_id = b.id
             WHERE o.id = $1 AND b.seller_id = $2`,
            [id, req.user.id]
        );

        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ message: '订单不存在或不属于您' });
        }

        // 更新订单状态
        await db(
            'UPDATE orders SET status = $1 WHERE id = $2',
            [status, id]
        );

        res.json({ message: '订单状态已更新' });
    } catch (error) {
        console.error('更新订单状态失败:', error);
        res.status(500).json({ message: '更新订单状态失败', error: error.message });
    }
});

export default router; 