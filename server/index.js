import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { query as db } from './config/db.js';

// 引入路由
import authRoutes from './routes/auth.js';
import booksRoutes from './routes/books.js';
import ordersRoutes from './routes/orders.js';
import sellerRoutes from './routes/seller.js';
import adminRoutes from './routes/admin.js';

// 引入中间件
import { authenticateToken } from './middleware/auth.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import verifyTimestamp from './middleware/timestamp.js';
import logger from './utils/logger.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置文件上传
const uploadsDir = path.join(__dirname, 'uploads');

// 确保上传目录存在并有正确权限
try {
    if (!fs.existsSync(uploadsDir)) {
        console.log(`创建上传目录: ${uploadsDir}`);
        fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
    } else {
        console.log(`上传目录已存在: ${uploadsDir}`);
        // 检查目录权限
        try {
            // 尝试写入测试文件确认权限
            const testFile = path.join(uploadsDir, '.test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            console.log('上传目录权限正常');
        } catch (permErr) {
            console.error('上传目录权限问题:', permErr);
            // 尝试修复权限
            try {
                fs.chmodSync(uploadsDir, 0o755);
                console.log('已修复上传目录权限');
            } catch (fixErr) {
                console.error('无法修复上传目录权限:', fixErr);
            }
        }
    }
} catch (err) {
    console.error('设置上传目录时出错:', err);
}

// 配置multer存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log('Multer存储目标目录:', uploadsDir);
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        console.log('处理上传文件:', file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        
        // 根据请求路径确定文件前缀
        let prefix = 'file-';
        if (req.path.includes('/books')) {
            prefix = 'book-';
        } else if (req.path.includes('/payment-codes')) {
            prefix = 'payment-';
        }
        
        const filename = prefix + uniqueSuffix + ext;
        console.log('生成的文件名:', filename);
        cb(null, filename);
    }
});

// 创建multer实例
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 限制5MB
    },
    fileFilter: function (req, file, cb) {
        console.log('文件过滤:', file.originalname, file.mimetype);
        // 只接受图片文件
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            console.log('文件类型不被接受:', file.originalname);
            return cb(new Error('只允许上传图片文件！'), false);
        }
        console.log('文件类型被接受');
        cb(null, true);
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer错误处理
        console.error('Multer错误:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: '文件大小超过限制(5MB)' });
        }
        return res.status(400).json({ message: '文件上传失败', error: err.message });
    } else if (err) {
        // 其他错误
        console.error('服务器错误:', err);
        return res.status(500).json({ message: '服务器错误', error: err.message });
    }
    next();
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 提供静态文件访问
// 注意：静态文件路径必须是绝对路径
const uploadsAbsolutePath = path.join(__dirname, 'uploads');
console.log('静态文件服务路径:', uploadsAbsolutePath);
app.use('/uploads', express.static(uploadsAbsolutePath));

// 添加一个路由用于测试静态文件访问
app.get('/api/check-static-path', (req, res) => {
  const testImagePath = req.query.path || '/uploads/test.jpg';
  res.json({
    requestedPath: testImagePath,
    absolutePathForServer: path.join(__dirname, testImagePath.replace(/^\/uploads\//, '')),
    uploadsDirectory: uploadsAbsolutePath,
    exists: fs.existsSync(path.join(__dirname, testImagePath.replace(/^\/uploads\//, ''))),
    directoryContents: fs.existsSync(uploadsAbsolutePath) ? 
      fs.readdirSync(uploadsAbsolutePath).slice(0, 20) : []
  });
});

// API路由 - 除了认证和健康检查外，其他API都需要时间戳验证
app.use('/api', authRoutes); // 登录注册路由不需要时间戳验证
app.use('/api/books', verifyTimestamp, booksRoutes);
app.use('/api/orders', verifyTimestamp, ordersRoutes);
app.use('/api/seller', verifyTimestamp, sellerRoutes);
app.use('/api/admin', verifyTimestamp, adminRoutes);

// 添加图书封面上传路由
app.post('/api/books/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '没有接收到文件' });
    }
    
    // 完整的文件路径
    const filePath = `/uploads/${req.file.filename}`;
    console.log('收到文件上传:', {
      原始文件名: req.file.originalname,
      存储文件名: req.file.filename,
      MIME类型: req.file.mimetype,
      大小: req.file.size,
      保存路径: filePath
    });
    
    // 返回文件路径
    return res.status(200).json({
      message: '文件上传成功',
      path: filePath,
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('文件上传处理错误:', error);
    return res.status(500).json({ message: '文件上传失败', error: error.message });
  }
});

// 公共路由
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 根路径处理 - 用于前端页面访问
app.get('/', (req, res) => {
    res.json({
        message: 'BookMarket后端API服务',
        status: 'running',
        available_endpoints: [
            '/api/health',
            '/api/books',
            '/api/orders',
            '/api/seller',
            '/api/admin'
        ],
        frontend_available_at: 'http://localhost:5173'
    });
});

// 测试上传目录配置
app.get('/api/test-uploads', (req, res) => {
    const directories = {
        workingDirectory: process.cwd(),
        uploadsPath: path.join(__dirname, 'uploads'),
        uploadsExists: fs.existsSync(path.join(__dirname, 'uploads')),
        files: []
    };
    
    try {
        if (directories.uploadsExists) {
            directories.files = fs.readdirSync(path.join(__dirname, 'uploads')).map(file => {
                return {
                    name: file,
                    fullPath: `/uploads/${file}`
                };
            });
        }
    } catch (error) {
        directories.error = error.message;
    }
    
    res.json(directories);
});

// 测试静态文件访问
app.get('/test-static', (req, res) => {
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
        files
    });
});

// 404错误处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// 启动服务器，监听所有网络接口以允许从外部访问
app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
});

// 处理未捕获的异常
process.on('uncaughtException', err => {
    logger.error('未捕获的异常', { error: err.message, stack: err.stack });
    console.error('未捕获的异常:', err);
    
    // 给进程一些时间来完成日志记录
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的Promise拒绝', { reason, promise });
    console.error('未处理的Promise拒绝:', reason);
});