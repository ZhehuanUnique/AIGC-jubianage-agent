#!/bin/bash

# Nginx 配置脚本

set -e

echo "配置 Nginx..."

# 创建 Nginx 配置文件
sudo tee /etc/nginx/sites-available/aigc-agent > /dev/null <<'EOF'
server {
    listen 80;
    server_name jubianai.cn www.jubianai.cn;

    # 前端静态文件
    location / {
        root /var/www/aigc-agent/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 增加超时时间
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/aigc-agent/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用配置
sudo ln -sf /etc/nginx/sites-available/aigc-agent /etc/nginx/sites-enabled/

# 删除默认配置（如果存在）
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx

echo "Nginx 配置完成！"


# Nginx 配置脚本

set -e

echo "配置 Nginx..."

# 创建 Nginx 配置文件
sudo tee /etc/nginx/sites-available/aigc-agent > /dev/null <<'EOF'
server {
    listen 80;
    server_name jubianai.cn www.jubianai.cn;

    # 前端静态文件
    location / {
        root /var/www/aigc-agent/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 增加超时时间
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/aigc-agent/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用配置
sudo ln -sf /etc/nginx/sites-available/aigc-agent /etc/nginx/sites-enabled/

# 删除默认配置（如果存在）
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx

echo "Nginx 配置完成！"


# Nginx 配置脚本

set -e

echo "配置 Nginx..."

# 创建 Nginx 配置文件
sudo tee /etc/nginx/sites-available/aigc-agent > /dev/null <<'EOF'
server {
    listen 80;
    server_name jubianai.cn www.jubianai.cn;

    # 前端静态文件
    location / {
        root /var/www/aigc-agent/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 增加超时时间
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/aigc-agent/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用配置
sudo ln -sf /etc/nginx/sites-available/aigc-agent /etc/nginx/sites-enabled/

# 删除默认配置（如果存在）
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx

echo "Nginx 配置完成！"



