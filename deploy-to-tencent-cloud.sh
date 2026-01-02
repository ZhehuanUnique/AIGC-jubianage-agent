#!/bin/bash

# 腾讯云 CVM 部署脚本
# 使用方法：在服务器上执行 bash deploy-to-tencent-cloud.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始部署 AIGC 剧变时代 Agent"
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 步骤 1: 更新系统
echo -e "${YELLOW}[1/9] 更新系统...${NC}"
sudo apt update && sudo apt upgrade -y

# 步骤 2: 安装 Node.js (使用 NVM)
echo -e "${YELLOW}[2/9] 安装 Node.js...${NC}"
if ! command -v nvm &> /dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# 重新加载配置
source ~/.bashrc

# 安装 Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# 验证安装
echo -e "${GREEN}Node.js 版本: $(node -v)${NC}"
echo -e "${GREEN}npm 版本: $(npm -v)${NC}"

# 步骤 3: 安装 PM2
echo -e "${YELLOW}[3/9] 安装 PM2...${NC}"
npm install -g pm2

# 步骤 4: 安装 Nginx
echo -e "${YELLOW}[4/9] 安装 Nginx...${NC}"
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# 步骤 5: 安装 Git
echo -e "${YELLOW}[5/9] 安装 Git...${NC}"
sudo apt install git -y

# 步骤 6: 创建项目目录
echo -e "${YELLOW}[6/9] 创建项目目录...${NC}"
sudo mkdir -p /var/www/aigc-agent
sudo chown ubuntu:ubuntu /var/www/aigc-agent

# 步骤 7: 克隆代码
echo -e "${YELLOW}[7/9] 克隆代码...${NC}"
cd /var/www/aigc-agent

if [ -d ".git" ]; then
    echo "代码已存在，拉取最新代码..."
    git pull origin main
else
    echo "克隆代码仓库..."
    git clone https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git .
fi

# 步骤 8: 安装依赖
echo -e "${YELLOW}[8/9] 安装依赖...${NC}"
npm install
cd server
npm install
cd ..

# 步骤 9: 构建前端
echo -e "${YELLOW}[9/9] 构建前端...${NC}"
npm run build

echo -e "${GREEN}=========================================="
echo "环境安装完成！"
echo "==========================================${NC}"
echo ""
echo "下一步操作："
echo "1. 配置环境变量: cd /var/www/aigc-agent/server && nano .env"
echo "2. 启动服务: pm2 start index.js --name aigc-agent"
echo "3. 保存 PM2 配置: pm2 save"
echo "4. 配置 Nginx（参考部署文档）"
echo "5. 配置 SSL 证书"


# 腾讯云 CVM 部署脚本
# 使用方法：在服务器上执行 bash deploy-to-tencent-cloud.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始部署 AIGC 剧变时代 Agent"
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 步骤 1: 更新系统
echo -e "${YELLOW}[1/9] 更新系统...${NC}"
sudo apt update && sudo apt upgrade -y

# 步骤 2: 安装 Node.js (使用 NVM)
echo -e "${YELLOW}[2/9] 安装 Node.js...${NC}"
if ! command -v nvm &> /dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# 重新加载配置
source ~/.bashrc

# 安装 Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# 验证安装
echo -e "${GREEN}Node.js 版本: $(node -v)${NC}"
echo -e "${GREEN}npm 版本: $(npm -v)${NC}"

# 步骤 3: 安装 PM2
echo -e "${YELLOW}[3/9] 安装 PM2...${NC}"
npm install -g pm2

# 步骤 4: 安装 Nginx
echo -e "${YELLOW}[4/9] 安装 Nginx...${NC}"
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# 步骤 5: 安装 Git
echo -e "${YELLOW}[5/9] 安装 Git...${NC}"
sudo apt install git -y

# 步骤 6: 创建项目目录
echo -e "${YELLOW}[6/9] 创建项目目录...${NC}"
sudo mkdir -p /var/www/aigc-agent
sudo chown ubuntu:ubuntu /var/www/aigc-agent

# 步骤 7: 克隆代码
echo -e "${YELLOW}[7/9] 克隆代码...${NC}"
cd /var/www/aigc-agent

if [ -d ".git" ]; then
    echo "代码已存在，拉取最新代码..."
    git pull origin main
else
    echo "克隆代码仓库..."
    git clone https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git .
fi

# 步骤 8: 安装依赖
echo -e "${YELLOW}[8/9] 安装依赖...${NC}"
npm install
cd server
npm install
cd ..

# 步骤 9: 构建前端
echo -e "${YELLOW}[9/9] 构建前端...${NC}"
npm run build

echo -e "${GREEN}=========================================="
echo "环境安装完成！"
echo "==========================================${NC}"
echo ""
echo "下一步操作："
echo "1. 配置环境变量: cd /var/www/aigc-agent/server && nano .env"
echo "2. 启动服务: pm2 start index.js --name aigc-agent"
echo "3. 保存 PM2 配置: pm2 save"
echo "4. 配置 Nginx（参考部署文档）"
echo "5. 配置 SSL 证书"


# 腾讯云 CVM 部署脚本
# 使用方法：在服务器上执行 bash deploy-to-tencent-cloud.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始部署 AIGC 剧变时代 Agent"
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 步骤 1: 更新系统
echo -e "${YELLOW}[1/9] 更新系统...${NC}"
sudo apt update && sudo apt upgrade -y

# 步骤 2: 安装 Node.js (使用 NVM)
echo -e "${YELLOW}[2/9] 安装 Node.js...${NC}"
if ! command -v nvm &> /dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# 重新加载配置
source ~/.bashrc

# 安装 Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# 验证安装
echo -e "${GREEN}Node.js 版本: $(node -v)${NC}"
echo -e "${GREEN}npm 版本: $(npm -v)${NC}"

# 步骤 3: 安装 PM2
echo -e "${YELLOW}[3/9] 安装 PM2...${NC}"
npm install -g pm2

# 步骤 4: 安装 Nginx
echo -e "${YELLOW}[4/9] 安装 Nginx...${NC}"
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# 步骤 5: 安装 Git
echo -e "${YELLOW}[5/9] 安装 Git...${NC}"
sudo apt install git -y

# 步骤 6: 创建项目目录
echo -e "${YELLOW}[6/9] 创建项目目录...${NC}"
sudo mkdir -p /var/www/aigc-agent
sudo chown ubuntu:ubuntu /var/www/aigc-agent

# 步骤 7: 克隆代码
echo -e "${YELLOW}[7/9] 克隆代码...${NC}"
cd /var/www/aigc-agent

if [ -d ".git" ]; then
    echo "代码已存在，拉取最新代码..."
    git pull origin main
else
    echo "克隆代码仓库..."
    git clone https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git .
fi

# 步骤 8: 安装依赖
echo -e "${YELLOW}[8/9] 安装依赖...${NC}"
npm install
cd server
npm install
cd ..

# 步骤 9: 构建前端
echo -e "${YELLOW}[9/9] 构建前端...${NC}"
npm run build

echo -e "${GREEN}=========================================="
echo "环境安装完成！"
echo "==========================================${NC}"
echo ""
echo "下一步操作："
echo "1. 配置环境变量: cd /var/www/aigc-agent/server && nano .env"
echo "2. 启动服务: pm2 start index.js --name aigc-agent"
echo "3. 保存 PM2 配置: pm2 save"
echo "4. 配置 Nginx（参考部署文档）"
echo "5. 配置 SSL 证书"



