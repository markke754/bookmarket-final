import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 认证中间件
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: '未提供认证令牌' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: '认证令牌无效' });
    }
};

// 角色验证中间件
export const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: '未认证用户' });
        }
        
        if (roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ message: '没有权限执行此操作' });
        }
    };
};

// 卖家权限中间件
export const isSeller = (req, res, next) => {
    return checkRole(['seller'])(req, res, next);
};

// 买家权限中间件
export const isBuyer = (req, res, next) => {
    return checkRole(['buyer'])(req, res, next);
};

// 管理员权限中间件
export const isAdmin = (req, res, next) => {
    return checkRole(['admin'])(req, res, next);
}; 