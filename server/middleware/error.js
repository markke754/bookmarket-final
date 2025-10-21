import logger from '../utils/logger.js';

// 自定义错误类
export class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// 404错误处理
export const notFoundHandler = (req, res, next) => {
    const error = new AppError(`找不到资源: ${req.originalUrl}`, 404);
    next(error);
};

// 通用错误处理中间件
export const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || '服务器内部错误';
    
    // 记录错误日志
    logger.error('应用程序错误', {
        statusCode: err.statusCode,
        message: err.message,
        stack: err.stack,
        path: req.originalUrl,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query
    });
    
    // 判断环境，开发环境返回详细错误信息
    const isDev = process.env.NODE_ENV === 'development';
    
    // 构建错误响应
    const errorResponse = {
        success: false,
        status: err.statusCode,
        message: err.message,
        ...isDev && { stack: err.stack }
    };
    
    // Multer文件大小错误处理
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            status: 413,
            message: '文件大小超出限制，最大允许5MB'
        });
    }
    
    // 处理数据库唯一性约束错误
    if (err.code === '23505') { // PostgreSQL唯一性约束错误码
        return res.status(409).json({
            success: false,
            status: 409,
            message: '资源已存在，存在唯一性冲突'
        });
    }
    
    // 处理JWT错误
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            status: 401,
            message: '无效的认证令牌'
        });
    }
    
    // 处理JWT过期错误
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            status: 401,
            message: '认证令牌已过期，请重新登录'
        });
    }
    
    res.status(err.statusCode).json(errorResponse);
}; 