-- 添加管理员密钥表
CREATE TABLE IF NOT EXISTS admin_keys (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pub_key_x VARCHAR(100) NOT NULL,
    pub_key_y VARCHAR(100) NOT NULL,
    pin_code VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (admin_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_admin_keys_admin_id ON admin_keys(admin_id);