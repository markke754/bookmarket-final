// 时间戳验证中间件 - 防止重放攻击

/**
 * 时间戳验证中间件
 * 验证请求中的时间戳是否有效且未过期
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const verifyTimestamp = (req, res, next) => {
  // 配置项 - 可以从环境变量或配置文件中读取
  const TIMESTAMP_EXPIRY = process.env.TIMESTAMP_EXPIRY || 30000; // 默认30秒过期
  
  try {
    // 从请求头中获取时间戳
    const timestamp = req.headers['x-request-timestamp'];
    
    // 检查时间戳是否存在
    if (!timestamp) {
      return res.status(401).json({
        success: false,
        message: '时间戳缺失，请在请求头中添加x-request-timestamp'
      });
    }
    
    // 转换为数字
    const requestTime = parseInt(timestamp, 10);
    
    // 检查时间戳格式是否有效
    if (isNaN(requestTime)) {
      return res.status(401).json({
        success: false,
        message: '无效的时间戳格式'
      });
    }
    
    // 获取当前服务器时间
    const currentTime = Date.now();
    
    // 计算时间差
    const timeDiff = Math.abs(currentTime - requestTime);
    
    // 检查时间戳是否过期
    if (timeDiff > TIMESTAMP_EXPIRY) {
      return res.status(401).json({
        success: false,
        message: '请求已过期，请重新发送请求',
        details: {
          currentTime,
          requestTime,
          expiryTime: TIMESTAMP_EXPIRY
        }
      });
    }
    
    // 时间戳验证通过，继续处理请求
    next();
  } catch (error) {
    console.error('时间戳验证错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 使用ES模块导出
export default verifyTimestamp;
