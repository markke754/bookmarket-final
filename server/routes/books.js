import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { query as db } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload, deleteFile } from '../utils/upload.js';
import { AppError } from '../middleware/error.js';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

// 确保上传目录存在
if (!fs.existsSync(uploadsDir)) {
    console.log(`创建上传目录: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 创建一个默认的图书封面图片，如果不存在
const defaultBookCover = path.join(uploadsDir, 'default-book.jpg');
if (!fs.existsSync(defaultBookCover)) {
    try {
        // 从公共目录复制一个默认图片，如果有的话
        const publicDefaultImg = path.join(__dirname, '..', 'public', 'default-book.jpg');
        if (fs.existsSync(publicDefaultImg)) {
            fs.copyFileSync(publicDefaultImg, defaultBookCover);
            console.log('已创建默认图书封面');
        } else {
            console.log('未找到默认图书封面源文件');
        }
    } catch (err) {
        console.error('创建默认图书封面失败:', err);
    }
}

const router = express.Router();

// 测试静态文件访问
router.get('/test-static', (req, res) => {
    console.log('测试静态文件访问');
    console.log('上传目录:', uploadsDir);
    console.log('目录是否存在:', fs.existsSync(uploadsDir));
    
    const files = fs.readdirSync(uploadsDir).map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        console.log(`文件: ${file}, 路径: ${filePath}, 大小: ${stats.size}, 权限: ${stats.mode}`);
        return {
            name: file,
            path: filePath,
            size: stats.size,
            isDirectory: stats.isDirectory(),
            lastModified: stats.mtime,
            permissions: stats.mode
        };
    });
    
    res.json({
        message: '静态文件测试',
        uploadsDir,
        files,
        testUrl: '/uploads/test.txt'
    });
});

// 检查静态路径是否可访问
router.get('/check-static-path', (req, res) => {
    const { path: pathToCheck } = req.query;
    console.log('检查静态路径:', pathToCheck);
    
    let filePath;
    if (pathToCheck) {
        // 去除路径中的../等安全隐患
        const normalizedPath = pathToCheck
            .replace(/^\/+uploads/, 'uploads')
            .replace(/^uploads/, 'uploads');
        
        filePath = path.join(__dirname, '..', normalizedPath);
        console.log('规范化后的路径:', filePath);
    } else {
        // 默认检查test.txt
        filePath = path.join(uploadsDir, 'test.txt');
        console.log('默认检查路径:', filePath);
    }
    
    const exists = fs.existsSync(filePath);
    console.log('文件是否存在:', exists);
    
    const stats = exists ? fs.statSync(filePath) : null;
    if (stats) {
        console.log('文件信息:', {
            size: stats.size,
            isFile: stats.isFile(),
            permissions: stats.mode,
            lastModified: stats.mtime
        });
    }
    
    res.json({
        path: pathToCheck || '/uploads/test.txt',
        normalizedFilePath: filePath,
        exists,
        isFile: stats ? stats.isFile() : false,
        size: stats ? stats.size : 0,
        lastModified: stats ? stats.mtime : null,
        permissions: stats ? stats.mode : null
    });
});

// 获取所有图书
// 获取公开图书列表
router.get('/public', async (req, res, next) => {
    try {
        console.log('获取公开图书列表');
        const result = await db('SELECT id, title, author, price, stock, image_url, category FROM books WHERE stock > 0 ORDER BY created_at DESC');
        res.json({ 
            books: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('获取公开图书失败:', error);
        next(new AppError('获取公开图书失败', 500));
    }
});

// 获取所有图书(支持分页和过滤)
router.get('/', async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search, category, sort } = req.query;
        console.log('获取图书列表，参数:', { page, limit, search, category, sort });
        
        // 构建查询条件
        let query = 'SELECT id, title, author, price, stock, image_url, category FROM books WHERE stock > 0';
        const params = [];
        
        // 添加搜索条件
        if (search) {
            query += ' AND (title ILIKE $1 OR author ILIKE $1)';
            params.push(`%${search}%`);
        }
        
        // 添加分类过滤
        if (category) {
            query += params.length ? ' AND category = $' + (params.length + 1) : ' AND category = $1';
            params.push(category);
        }
        
        // 计算总数
        const countQuery = query.replace('SELECT id, title, author, price, stock, image_url, category', 'SELECT COUNT(*)');
        const countResult = await db(countQuery, params);
        const total = parseInt(countResult.rows[0].count);
        
        // 添加排序
        if (sort) {
            switch(sort) {
                case 'price_asc':
                    query += ' ORDER BY price ASC';
                    break;
                case 'price_desc':
                    query += ' ORDER BY price DESC';
                    break;
                case 'newest':
                    query += ' ORDER BY created_at DESC';
                    break;
                default:
                    query += ' ORDER BY created_at DESC';
            }
        } else {
            query += ' ORDER BY created_at DESC';
        }
        
        // 添加分页
        const offset = (page - 1) * limit;
        query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);
        
        console.log('执行查询:', query, params);
        const result = await db(query, params);
        
        res.json({
            books: result.rows,
            total: total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('获取图书列表失败:', error);
        next(new AppError('获取图书列表失败: ' + error.message, 500));
    }
});

// 获取所有图书分类
router.get('/categories', async (req, res, next) => {
    try {
        console.log('获取所有图书分类');
        const result = await db('SELECT DISTINCT category FROM books WHERE category IS NOT NULL');
        const categories = result.rows.map(row => row.category).filter(Boolean);
        
        // 添加一些默认分类
        const defaultCategories = ['小说', '文学', '历史', '科技', '经济', '艺术', '教育', '生活', '计算机', '外语'];
        const allCategories = [...new Set([...categories, ...defaultCategories])];
        
        res.json({ categories: allCategories });
    } catch (error) {
        console.error('获取图书分类失败:', error);
        next(new AppError('获取图书分类失败: ' + error.message, 500));
    }
});

// 获取单本图书
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db('SELECT * FROM books WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return next(new AppError('图书不存在', 404));
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        next(new AppError('获取图书详情失败', 500));
    }
});

// 添加图书(卖家)
router.post('/', authenticateToken, upload.single('image'), async (req, res, next) => {
    try {
        if (req.user.role !== 'seller') {
            return next(new AppError('只有卖家可以添加图书', 403));
        }
        
        const { title, author, price, stock, description, category, image_url } = req.body;
        
        // 确定图片URL - 优先使用上传的文件，如果没有则使用表单中的image_url
        let finalImageUrl = null;
        
        if (req.file) {
            // 如果有文件上传，使用上传的文件路径
            finalImageUrl = `/uploads/${req.file.filename}`;
        } else if (image_url) {
            // 如果没有文件上传但有image_url字段，使用image_url
            finalImageUrl = image_url;
        }
        
        // 记录图片路径信息
        console.log('添加图书 - 图片路径:', {
            原始文件名: req.file?.originalname,
            存储文件名: req.file?.filename,
            表单中的image_url: image_url,
            最终使用的image_url: finalImageUrl
        });
        
        const result = await db(
            'INSERT INTO books (title, author, price, stock, seller_id, description, category, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [title, author, price, stock, req.user.id, description || null, category || null, finalImageUrl]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(new AppError('添加图书失败: ' + error.message, 500));
    }
});

// 更新图书(卖家)
router.put('/:id', authenticateToken, upload.single('image'), async (req, res, next) => {
    try {
        if (req.user.role !== 'seller') {
            return next(new AppError('只有卖家可以更新图书', 403));
        }
        
        const { id } = req.params;
        const { title, author, price, stock, description, category, image_url } = req.body;
        
        // 检查是否是该书的卖家
        const bookCheck = await db('SELECT * FROM books WHERE id = $1', [id]);
        if (bookCheck.rows.length === 0) {
            return next(new AppError('图书不存在', 404));
        }
        
        if (bookCheck.rows[0].seller_id !== req.user.id) {
            return next(new AppError('只能更新自己的图书', 403));
        }
        
        // 确定图片URL
        let finalImageUrl = bookCheck.rows[0].image_url;
        
        // 如果上传了新图片，删除旧图片并更新
        if (req.file) {
            if (finalImageUrl) {
                deleteFile(finalImageUrl);
            }
            finalImageUrl = `/uploads/${req.file.filename}`;
        } else if (image_url && image_url !== finalImageUrl) {
            // 如果提供了新的image_url且与当前不同
            if (finalImageUrl) {
                deleteFile(finalImageUrl);
            }
            finalImageUrl = image_url;
        }
        
        console.log('更新图书 - 图片路径:', {
            原始图片: bookCheck.rows[0].image_url,
            表单中的image_url: image_url,
            上传的文件: req.file?.filename,
            最终使用的image_url: finalImageUrl
        });
        
        const result = await db(
            'UPDATE books SET title = $1, author = $2, price = $3, stock = $4, description = $5, image_url = $6, category = $7 WHERE id = $8 RETURNING *',
            [title, author, price, stock, description, finalImageUrl, category || null, id]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        next(new AppError('更新图书失败: ' + error.message, 500));
    }
});

// 删除图书(卖家)
router.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'seller') {
            return next(new AppError('只有卖家可以删除图书', 403));
        }
        
        const { id } = req.params;
        
        // 检查是否是该书的卖家
        const bookCheck = await db('SELECT * FROM books WHERE id = $1', [id]);
        if (bookCheck.rows.length === 0) {
            return next(new AppError('图书不存在', 404));
        }
        
        if (bookCheck.rows[0].seller_id !== req.user.id) {
            return next(new AppError('只能删除自己的图书', 403));
        }
        
        // 删除图书相关图片
        if (bookCheck.rows[0].image_url) {
            deleteFile(bookCheck.rows[0].image_url);
        }
        
        await db('DELETE FROM books WHERE id = $1', [id]);
        
        res.json({ message: '图书删除成功' });
    } catch (error) {
        next(new AppError('删除图书失败: ' + error.message, 500));
    }
});

// 管理员删除图书
router.delete('/admin/:id', authenticateToken, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return next(new AppError('只有管理员可以删除任意图书', 403));
        }
        
        const { id } = req.params;
        
        // 检查图书是否存在
        const bookCheck = await db('SELECT * FROM books WHERE id = $1', [id]);
        if (bookCheck.rows.length === 0) {
            return next(new AppError('图书不存在', 404));
        }
        
        // 删除图书相关图片
        if (bookCheck.rows[0].image_url) {
            deleteFile(bookCheck.rows[0].image_url);
        }
        
        await db('DELETE FROM books WHERE id = $1', [id]);
        
        res.json({
            success: true,
            message: '图书已成功删除'
        });
    } catch (error) {
        next(new AppError('删除图书失败: ' + error.message, 500));
    }
});

// 文件上传
router.post('/upload', authenticateToken, upload.single('file'), async (req, res, next) => {
    try {
        console.log('收到文件上传请求');
        console.log('文件信息:', req.file);
        
        if (!req.file) {
            throw new AppError('没有上传文件', 400);
        }
        
        // 验证文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            throw new AppError('不支持的文件类型，请上传JPG、PNG或GIF格式的图片', 400);
        }
        
        // 生成文件名
        const timestamp = Date.now();
        const extension = req.file.originalname.split('.').pop();
        const filename = `book-${timestamp}-${Math.floor(Math.random() * 1000000000)}.${extension}`;
        console.log('生成的文件名:', filename);
        
        // 保存文件
        const filePath = path.join(uploadsDir, filename);
        console.log('目标文件路径:', filePath);
        
        await fs.promises.rename(req.file.path, filePath);
        console.log('文件保存成功');
        
        // 验证文件是否真的保存了
        const stats = fs.statSync(filePath);
        console.log('保存后的文件信息:', {
            size: stats.size,
            permissions: stats.mode,
            lastModified: stats.mtime
        });
        
        // 返回相对路径，不包含开头的斜杠
        const responsePath = `uploads/${filename}`;
        console.log('返回的路径:', responsePath);
        
        res.json({ 
            success: true, 
            path: responsePath 
        });
    } catch (error) {
        console.error('文件上传失败:', error);
        next(new AppError('文件上传失败: ' + error.message, 500));
    }
});

// 验证图书是否存在
router.post('/validate', async (req, res, next) => {
    try {
        const { bookIds } = req.body;
        
        if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
            return res.status(400).json({ message: '参数错误: 需要提供图书ID数组' });
        }
        
        // 找出所有存在的图书ID
        const result = await db('SELECT id FROM books WHERE id = ANY($1::int[])', [bookIds]);
        
        const existingIds = result.rows.map(row => row.id);
        
        // 找出不存在的图书ID
        const invalidIds = bookIds.filter(id => !existingIds.includes(id));
        
        res.json({
            valid: invalidIds.length === 0,
            invalidBooks: invalidIds,
            message: invalidIds.length > 0 ? '部分图书不存在' : '所有图书都存在'
        });
    } catch (error) {
        console.error('验证图书失败:', error);
        next(new AppError('验证图书失败: ' + error.message, 500));
    }
});

export default router;