#!/bin/bash

# PM2 服务监控脚本
# 定期检查服务状态，如果服务停止则自动重启
# 建议通过 cron 每 5 分钟运行一次

LOG_FILE="/home/ubuntu/.pm2/logs/monitor.log"
SERVICE_NAME="aigc-agent"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查服务是否在运行
check_service() {
    if pm2 list | grep -q "$SERVICE_NAME.*online"; then
        return 0
    else
        return 1
    fi
}

# 检查端口是否被占用
check_port() {
    if lsof -i :3002 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 检查 API 是否响应
check_api() {
    if curl -s --max-time 5 http://localhost:3002/api/health > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 重启服务
restart_service() {
    log "正在重启服务 $SERVICE_NAME..."
    cd /var/www/aigc-agent/server
    
    if [ -f "ecosystem.config.js" ]; then
        pm2 restart ecosystem.config.js
    else
        pm2 restart "$SERVICE_NAME"
    fi
    
    sleep 5
    
    if check_service && check_port && check_api; then
        log "✅ 服务重启成功"
        return 0
    else
        log "❌ 服务重启失败，尝试完全重启..."
        pm2 stop "$SERVICE_NAME" 2>/dev/null
        pm2 delete "$SERVICE_NAME" 2>/dev/null
        sleep 2
        
        if [ -f "ecosystem.config.js" ]; then
            pm2 start ecosystem.config.js
        else
            pm2 start index.js --name "$SERVICE_NAME" --autorestart --max-memory-restart 1G
        fi
        
        pm2 save
        sleep 5
        
        if check_service && check_port && check_api; then
            log "✅ 服务完全重启成功"
            return 0
        else
            log "❌ 服务完全重启失败"
            return 1
        fi
    fi
}

# 主逻辑
main() {
    log "开始检查服务状态..."
    
    # 检查服务状态
    if ! check_service; then
        log "⚠️  服务未在 PM2 中运行"
        restart_service
        exit $?
    fi
    
    # 检查端口
    if ! check_port; then
        log "⚠️  端口 3002 未被占用"
        restart_service
        exit $?
    fi
    
    # 检查 API
    if ! check_api; then
        log "⚠️  API 无响应"
        restart_service
        exit $?
    fi
    
    log "✅ 服务运行正常"
    exit 0
}

main





