import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

// 确保上传目录存在
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
}

// 配置multer存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
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
        cb(null, filename);
    }
});

// 文件过滤器，只接受图片
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('只允许上传图片文件！'), false);
    }
};

// 创建multer实例
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 限制5MB
    },
    fileFilter: fileFilter
});

// 删除文件函数
export const deleteFile = (filePath) => {
    if (!filePath) return;

    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
        try {
            fs.unlinkSync(fullPath);
            return true;
        } catch (err) {
            console.error('删除文件失败:', err);
            return false;
        }
    }
    return false;
};

export { upload, uploadsDir }; 