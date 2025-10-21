import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, '..', 'logs');

// 确保日志目录存在
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// 日志级别
const LogLevel = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

// 当前环境
const ENV = process.env.NODE_ENV || 'development';

// 获取当前时间字符串
const getTimeStamp = () => {
    return new Date().toISOString();
};

// 格式化日志信息
const formatLogMessage = (level, message, meta = {}) => {
    return {
        timestamp: getTimeStamp(),
        level,
        message,
        env: ENV,
        ...meta
    };
};

// 将日志写入文件
const writeToFile = (level, message) => {
    try {
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(logsDir, `${date}.log`);
        const logEntry = `${JSON.stringify(message)}\n`;
        
        fs.appendFileSync(logFile, logEntry);
    } catch (err) {
        console.error('写入日志文件失败:', err);
    }
};

// 日志实现
const logger = {
    error: (message, meta = {}) => {
        const logMessage = formatLogMessage(LogLevel.ERROR, message, meta);
        console.error(`[${logMessage.timestamp}] [${logMessage.level}] ${message}`, meta);
        writeToFile(LogLevel.ERROR, logMessage);
    },
    
    warn: (message, meta = {}) => {
        const logMessage = formatLogMessage(LogLevel.WARN, message, meta);
        console.warn(`[${logMessage.timestamp}] [${logMessage.level}] ${message}`, meta);
        writeToFile(LogLevel.WARN, logMessage);
    },
    
    info: (message, meta = {}) => {
        const logMessage = formatLogMessage(LogLevel.INFO, message, meta);
        console.info(`[${logMessage.timestamp}] [${logMessage.level}] ${message}`, meta);
        writeToFile(LogLevel.INFO, logMessage);
    },
    
    debug: (message, meta = {}) => {
        // 只在开发环境下输出debug日志
        if (ENV === 'production') return;
        
        const logMessage = formatLogMessage(LogLevel.DEBUG, message, meta);
        console.debug(`[${logMessage.timestamp}] [${logMessage.level}] ${message}`, meta);
        writeToFile(LogLevel.DEBUG, logMessage);
    },
    
    // 请求日志中间件
    requestLogger: (req, res, next) => {
        const start = Date.now();
        const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        res.on('finish', () => {
            const duration = Date.now() - start;
            const logMessage = {
                requestId,
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                userAgent: req.headers['user-agent'],
                ip: req.ip || req.connection.remoteAddress
            };
            
            if (res.statusCode >= 400) {
                logger.warn(`${req.method} ${req.originalUrl} ${res.statusCode}`, logMessage);
            } else {
                logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, logMessage);
            }
        });
        
        next();
    }
};

export default logger; 