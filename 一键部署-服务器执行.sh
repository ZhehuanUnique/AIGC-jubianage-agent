#!/bin/bash

# 腾讯云 CVM 一键部署脚本
# 在服务器上执行: bash 一键部署-服务器执行.sh

set -e

echo "=========================================="
echo "AIGC 剧变时代 Agent - 腾讯云部署"
echo "=========================================="
echo ""

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 步骤 1: 更新系统
echo -e "${YELLOW}[1/11] 更新系统...${NC}"
sudo apt update && sudo apt upgrade -y
echo -e "${GREEN}✓ 系统更新完成${NC}"
echo ""

# 步骤 2: 安装 Node.js (NVM)
echo -e "${YELLOW}[2/11] 安装 Node.js...${NC}"
if ! command -v nvm &> /dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

echo -e "${GREEN}✓ Node.js $(node -v) 安装完成${NC}"
echo ""

# 步骤 3: 安装 PM2
echo -e "${YELLOW}[3/11] 安装 PM2...${NC}"
npm install -g pm2
echo -e "${GREEN}✓ PM2 安装完成${NC}"
echo ""

# 步骤 4: 安装 Nginx
echo -e "${YELLOW}[4/11] 安装 Nginx...${NC}"
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
echo -e "${GREEN}✓ Nginx 安装完成${NC}"
echo ""

# 步骤 5: 安装 Git
echo -e "${YELLOW}[5/11] 安装 Git...${NC}"
sudo apt install git -y
echo -e "${GREEN}✓ Git 安装完成${NC}"
echo ""

# 步骤 6: 创建项目目录
echo -e "${YELLOW}[6/11] 创建项目目录...${NC}"
sudo mkdir -p /var/www/aigc-agent
sudo chown ubuntu:ubuntu /var/www/aigc-agent
echo -e "${GREEN}✓ 目录创建完成${NC}"
echo ""

# 步骤 7: 克隆代码
echo -e "${YELLOW}[7/11] 克隆代码...${NC}"
cd /var/www/aigc-agent

if [ -d ".git" ]; then
    echo "代码已存在，拉取最新代码..."
    git pull origin main
else
    echo "克隆代码仓库..."
    git clone https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git .
fi
echo -e "${GREEN}✓ 代码克隆完成${NC}"
echo ""

# 步骤 8: 安装依赖
echo -e "${YELLOW}[8/11] 安装依赖（这可能需要几分钟）...${NC}"
npm install
cd server
npm install
cd ..
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

# 步骤 9: 构建前端
echo -e "${YELLOW}[9/11] 构建前端（这可能需要几分钟）...${NC}"
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# 步骤 10: 配置环境变量提示
echo -e "${YELLOW}[10/11] 配置环境变量${NC}"
echo -e "${BLUE}请手动配置环境变量：${NC}"
echo "1. cd /var/www/aigc-agent/server"
echo "2. cp env.example .env"
echo "3. nano .env"
echo ""
echo -e "${BLUE}必须配置的变量：${NC}"
echo "- PORT=3002"
echo "- DASHSCOPE_API_KEY=你的通义千问API密钥"
echo "- DATABASE_URL=你的Supabase连接字符串"
echo "- COS_SECRET_ID=你的腾讯云SecretId"
echo "- COS_SECRET_KEY=你的腾讯云SecretKey"
echo "- COS_REGION=ap-guangzhou"
echo "- COS_BUCKET=你的存储桶名称"
echo "- JWT_SECRET=生成一个随机字符串"
echo ""
read -p "配置完成后按 Enter 继续..."

# 步骤 11: 配置 Nginx
echo -e "${YELLOW}[11/11] 配置 Nginx...${NC}"

# 创建 Nginx 配置
sudo tee /etc/nginx/sites-available/aigc-agent > /dev/null <<'EOF'
server {
    listen 80;
    server_name jubianai.cn www.jubianai.cn;

    location / {
        root /var/www/aigc-agent/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/aigc-agent/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用配置
sudo ln -sf /etc/nginx/sites-available/aigc-agent /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo -e "${GREEN}✓ Nginx 配置完成${NC}"
echo ""

# 完成提示
echo -e "${GREEN}=========================================="
echo "环境安装完成！"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}下一步操作：${NC}"
echo ""
echo "1. 配置环境变量："
echo "   cd /var/www/aigc-agent/server"
echo "   nano .env"
echo ""
echo "2. 启动后端服务："
echo "   pm2 start index.js --name aigc-agent"
echo "   pm2 save"
echo "   pm2 startup  # 按照提示执行 sudo 命令"
echo ""
echo "3. 配置 SSL 证书（可选）："
echo "   sudo apt install certbot python3-certbot-nginx -y"
echo "   sudo certbot --nginx -d jubianai.cn -d www.jubianai.cn"
echo ""
echo "4. 配置防火墙："
echo "   sudo ufw allow 22/tcp"
echo "   sudo ufw allow 80/tcp"
echo "   sudo ufw allow 443/tcp"
echo "   sudo ufw enable"
echo ""
echo "5. 验证部署："
echo "   pm2 status"
echo "   curl http://localhost:3002/health"
echo "   curl http://localhost"
echo ""


# 腾讯云 CVM 一键部署脚本
# 在服务器上执行: bash 一键部署-服务器执行.sh

set -e

echo "=========================================="
echo "AIGC 剧变时代 Agent - 腾讯云部署"
echo "=========================================="
echo ""

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 步骤 1: 更新系统
echo -e "${YELLOW}[1/11] 更新系统...${NC}"
sudo apt update && sudo apt upgrade -y
echo -e "${GREEN}✓ 系统更新完成${NC}"
echo ""

# 步骤 2: 安装 Node.js (NVM)
echo -e "${YELLOW}[2/11] 安装 Node.js...${NC}"
if ! command -v nvm &> /dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

echo -e "${GREEN}✓ Node.js $(node -v) 安装完成${NC}"
echo ""

# 步骤 3: 安装 PM2
echo -e "${YELLOW}[3/11] 安装 PM2...${NC}"
npm install -g pm2
echo -e "${GREEN}✓ PM2 安装完成${NC}"
echo ""

# 步骤 4: 安装 Nginx
echo -e "${YELLOW}[4/11] 安装 Nginx...${NC}"
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
echo -e "${GREEN}✓ Nginx 安装完成${NC}"
echo ""

# 步骤 5: 安装 Git
echo -e "${YELLOW}[5/11] 安装 Git...${NC}"
sudo apt install git -y
echo -e "${GREEN}✓ Git 安装完成${NC}"
echo ""

# 步骤 6: 创建项目目录
echo -e "${YELLOW}[6/11] 创建项目目录...${NC}"
sudo mkdir -p /var/www/aigc-agent
sudo chown ubuntu:ubuntu /var/www/aigc-agent
echo -e "${GREEN}✓ 目录创建完成${NC}"
echo ""

# 步骤 7: 克隆代码
echo -e "${YELLOW}[7/11] 克隆代码...${NC}"
cd /var/www/aigc-agent

if [ -d ".git" ]; then
    echo "代码已存在，拉取最新代码..."
    git pull origin main
else
    echo "克隆代码仓库..."
    git clone https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git .
fi
echo -e "${GREEN}✓ 代码克隆完成${NC}"
echo ""

# 步骤 8: 安装依赖
echo -e "${YELLOW}[8/11] 安装依赖（这可能需要几分钟）...${NC}"
npm install
cd server
npm install
cd ..
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

# 步骤 9: 构建前端
echo -e "${YELLOW}[9/11] 构建前端（这可能需要几分钟）...${NC}"
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# 步骤 10: 配置环境变量提示
echo -e "${YELLOW}[10/11] 配置环境变量${NC}"
echo -e "${BLUE}请手动配置环境变量：${NC}"
echo "1. cd /var/www/aigc-agent/server"
echo "2. cp env.example .env"
echo "3. nano .env"
echo ""
echo -e "${BLUE}必须配置的变量：${NC}"
echo "- PORT=3002"
echo "- DASHSCOPE_API_KEY=你的通义千问API密钥"
echo "- DATABASE_URL=你的Supabase连接字符串"
echo "- COS_SECRET_ID=你的腾讯云SecretId"
echo "- COS_SECRET_KEY=你的腾讯云SecretKey"
echo "- COS_REGION=ap-guangzhou"
echo "- COS_BUCKET=你的存储桶名称"
echo "- JWT_SECRET=生成一个随机字符串"
echo ""
read -p "配置完成后按 Enter 继续..."

# 步骤 11: 配置 Nginx
echo -e "${YELLOW}[11/11] 配置 Nginx...${NC}"

# 创建 Nginx 配置
sudo tee /etc/nginx/sites-available/aigc-agent > /dev/null <<'EOF'
server {
    listen 80;
    server_name jubianai.cn www.jubianai.cn;

    location / {
        root /var/www/aigc-agent/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/aigc-agent/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用配置
sudo ln -sf /etc/nginx/sites-available/aigc-agent /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo -e "${GREEN}✓ Nginx 配置完成${NC}"
echo ""

# 完成提示
echo -e "${GREEN}=========================================="
echo "环境安装完成！"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}下一步操作：${NC}"
echo ""
echo "1. 配置环境变量："
echo "   cd /var/www/aigc-agent/server"
echo "   nano .env"
echo ""
echo "2. 启动后端服务："
echo "   pm2 start index.js --name aigc-agent"
echo "   pm2 save"
echo "   pm2 startup  # 按照提示执行 sudo 命令"
echo ""
echo "3. 配置 SSL 证书（可选）："
echo "   sudo apt install certbot python3-certbot-nginx -y"
echo "   sudo certbot --nginx -d jubianai.cn -d www.jubianai.cn"
echo ""
echo "4. 配置防火墙："
echo "   sudo ufw allow 22/tcp"
echo "   sudo ufw allow 80/tcp"
echo "   sudo ufw allow 443/tcp"
echo "   sudo ufw enable"
echo ""
echo "5. 验证部署："
echo "   pm2 status"
echo "   curl http://localhost:3002/health"
echo "   curl http://localhost"
echo ""


# 腾讯云 CVM 一键部署脚本
# 在服务器上执行: bash 一键部署-服务器执行.sh

set -e

echo "=========================================="
echo "AIGC 剧变时代 Agent - 腾讯云部署"
echo "=========================================="
echo ""

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 步骤 1: 更新系统
echo -e "${YELLOW}[1/11] 更新系统...${NC}"
sudo apt update && sudo apt upgrade -y
echo -e "${GREEN}✓ 系统更新完成${NC}"
echo ""

# 步骤 2: 安装 Node.js (NVM)
echo -e "${YELLOW}[2/11] 安装 Node.js...${NC}"
if ! command -v nvm &> /dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

echo -e "${GREEN}✓ Node.js $(node -v) 安装完成${NC}"
echo ""

# 步骤 3: 安装 PM2
echo -e "${YELLOW}[3/11] 安装 PM2...${NC}"
npm install -g pm2
echo -e "${GREEN}✓ PM2 安装完成${NC}"
echo ""

# 步骤 4: 安装 Nginx
echo -e "${YELLOW}[4/11] 安装 Nginx...${NC}"
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
echo -e "${GREEN}✓ Nginx 安装完成${NC}"
echo ""

# 步骤 5: 安装 Git
echo -e "${YELLOW}[5/11] 安装 Git...${NC}"
sudo apt install git -y
echo -e "${GREEN}✓ Git 安装完成${NC}"
echo ""

# 步骤 6: 创建项目目录
echo -e "${YELLOW}[6/11] 创建项目目录...${NC}"
sudo mkdir -p /var/www/aigc-agent
sudo chown ubuntu:ubuntu /var/www/aigc-agent
echo -e "${GREEN}✓ 目录创建完成${NC}"
echo ""

# 步骤 7: 克隆代码
echo -e "${YELLOW}[7/11] 克隆代码...${NC}"
cd /var/www/aigc-agent

if [ -d ".git" ]; then
    echo "代码已存在，拉取最新代码..."
    git pull origin main
else
    echo "克隆代码仓库..."
    git clone https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git .
fi
echo -e "${GREEN}✓ 代码克隆完成${NC}"
echo ""

# 步骤 8: 安装依赖
echo -e "${YELLOW}[8/11] 安装依赖（这可能需要几分钟）...${NC}"
npm install
cd server
npm install
cd ..
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

# 步骤 9: 构建前端
echo -e "${YELLOW}[9/11] 构建前端（这可能需要几分钟）...${NC}"
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# 步骤 10: 配置环境变量提示
echo -e "${YELLOW}[10/11] 配置环境变量${NC}"
echo -e "${BLUE}请手动配置环境变量：${NC}"
echo "1. cd /var/www/aigc-agent/server"
echo "2. cp env.example .env"
echo "3. nano .env"
echo ""
echo -e "${BLUE}必须配置的变量：${NC}"
echo "- PORT=3002"
echo "- DASHSCOPE_API_KEY=你的通义千问API密钥"
echo "- DATABASE_URL=你的Supabase连接字符串"
echo "- COS_SECRET_ID=你的腾讯云SecretId"
echo "- COS_SECRET_KEY=你的腾讯云SecretKey"
echo "- COS_REGION=ap-guangzhou"
echo "- COS_BUCKET=你的存储桶名称"
echo "- JWT_SECRET=生成一个随机字符串"
echo ""
read -p "配置完成后按 Enter 继续..."

# 步骤 11: 配置 Nginx
echo -e "${YELLOW}[11/11] 配置 Nginx...${NC}"

# 创建 Nginx 配置
sudo tee /etc/nginx/sites-available/aigc-agent > /dev/null <<'EOF'
server {
    listen 80;
    server_name jubianai.cn www.jubianai.cn;

    location / {
        root /var/www/aigc-agent/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/aigc-agent/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用配置
sudo ln -sf /etc/nginx/sites-available/aigc-agent /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo -e "${GREEN}✓ Nginx 配置完成${NC}"
echo ""

# 完成提示
echo -e "${GREEN}=========================================="
echo "环境安装完成！"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}下一步操作：${NC}"
echo ""
echo "1. 配置环境变量："
echo "   cd /var/www/aigc-agent/server"
echo "   nano .env"
echo ""
echo "2. 启动后端服务："
echo "   pm2 start index.js --name aigc-agent"
echo "   pm2 save"
echo "   pm2 startup  # 按照提示执行 sudo 命令"
echo ""
echo "3. 配置 SSL 证书（可选）："
echo "   sudo apt install certbot python3-certbot-nginx -y"
echo "   sudo certbot --nginx -d jubianai.cn -d www.jubianai.cn"
echo ""
echo "4. 配置防火墙："
echo "   sudo ufw allow 22/tcp"
echo "   sudo ufw allow 80/tcp"
echo "   sudo ufw allow 443/tcp"
echo "   sudo ufw enable"
echo ""
echo "5. 验证部署："
echo "   pm2 status"
echo "   curl http://localhost:3002/health"
echo "   curl http://localhost"
echo ""



