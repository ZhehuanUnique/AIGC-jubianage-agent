#!/bin/bash

# SSL 证书配置脚本

set -e

echo "配置 SSL 证书..."

# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书
echo "开始获取 SSL 证书..."
echo "请按照提示输入邮箱地址并同意服务条款"
sudo certbot --nginx -d jubianai.cn -d www.jubianai.cn

# 测试自动续期
sudo certbot renew --dry-run

echo "SSL 证书配置完成！"



