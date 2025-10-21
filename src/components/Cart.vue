getImageUrl(image) {
  if (!image) {
    console.warn('图片路径为空');
    return `${this.apiUrl}/uploads/default-book.jpg`;
  }
  
  // 如果已经是完整URL，直接返回
  if (image.startsWith('http')) {
    return image;
  }
  
  // 默认图片特殊处理
  if (image === 'default-book.jpg') {
    return `${this.apiUrl}/uploads/default-book.jpg`;
  }
  
  // 规范化路径
  let normalizedPath = image;
  
  // 移除开头的斜杠
  normalizedPath = normalizedPath.replace(/^\/+/, '');
  
  // 确保路径以uploads开头
  if (!normalizedPath.startsWith('uploads/')) {
    normalizedPath = `uploads/${normalizedPath}`;
  }
  
  // 添加开头的斜杠
  normalizedPath = `/${normalizedPath}`;
  
  // 构建完整URL
  const fullUrl = `${this.apiUrl}${normalizedPath}`;
  console.log('购物车图片URL:', fullUrl);
  
  return fullUrl;
} 