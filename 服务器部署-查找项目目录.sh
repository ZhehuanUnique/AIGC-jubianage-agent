#!/bin/bash

# 查找项目目录的脚本

echo "正在查找 AIGC-jubianage-agent 项目目录..."
echo ""

# 检查常见位置
LOCATIONS=(
    "/home/ubuntu/AIGC-jubianage-agent"
    "$HOME/AIGC-jubianage-agent"
    "~/AIGC-jubianage-agent"
    "/root/AIGC-jubianage-agent"
    "/opt/AIGC-jubianage-agent"
    "/var/www/AIGC-jubianage-agent"
)

FOUND=false

for location in "${LOCATIONS[@]}"; do
    # 展开 ~ 路径
    expanded_location="${location/#\~/$HOME}"
    
    if [ -d "$expanded_location" ]; then
        echo "✅ 找到项目目录: $expanded_location"
        echo ""
        echo "使用以下命令进入目录："
        echo "  cd $expanded_location"
        echo ""
        echo "或者如果项目在/root目录，使用："
        echo "  sudo su -"
        echo "  cd /root/AIGC-jubianage-agent"
        FOUND=true
        break
    fi
done

if [ "$FOUND" = false ]; then
    echo "❌ 未找到项目目录"
    echo ""
    echo "请手动查找项目目录："
    echo "  find / -name 'AIGC-jubianage-agent' -type d 2>/dev/null"
    echo ""
    echo "或者检查当前目录："
    echo "  pwd"
    echo "  ls -la"
fi

