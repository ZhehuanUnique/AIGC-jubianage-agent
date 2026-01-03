# 使用 SSH 更新 GitHub 仓库
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "使用 SSH 更新 GitHub 仓库" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/6] 检查当前远程仓库配置..." -ForegroundColor Yellow
git remote -v
Write-Host ""

Write-Host "[2/6] 切换到 SSH 方式..." -ForegroundColor Yellow
git remote set-url origin git@github.com:ZhehuanUnique/AIGC-jubianage-agent.git
Write-Host "✅ 已切换到 SSH 方式" -ForegroundColor Green
Write-Host ""

Write-Host "[3/6] 验证远程仓库配置..." -ForegroundColor Yellow
git remote -v
Write-Host ""

Write-Host "[4/6] 检查 Git 状态..." -ForegroundColor Yellow
git status --short
Write-Host ""

Write-Host "[5/6] 添加所有更改..." -ForegroundColor Yellow
git add -A
Write-Host "✅ 已添加所有更改" -ForegroundColor Green
Write-Host ""

Write-Host "[6/6] 提交并推送..." -ForegroundColor Yellow
$commitResult = git commit -m "style: 更新积分充值页面 - 改为白色背景，调整价格为¥999起，更新品牌名称为剧变时代Agent; feat: 添加 Kling 可灵视频生成服务支持"
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  没有需要提交的更改或提交失败" -ForegroundColor Yellow
} else {
    Write-Host $commitResult
}
Write-Host ""

Write-Host "推送到 GitHub (SSH)..." -ForegroundColor Yellow
if (git push origin main) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ 代码已成功推送到 GitHub!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "最新提交:" -ForegroundColor Cyan
    git log --oneline -1
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ 推送失败" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因:" -ForegroundColor Yellow
    Write-Host "  1. SSH 密钥未配置或未添加到 GitHub"
    Write-Host "  2. 网络连接问题"
    Write-Host "  3. 权限问题"
    Write-Host ""
    Write-Host "请检查:" -ForegroundColor Yellow
    Write-Host "  - SSH 密钥是否已添加到 GitHub"
    Write-Host "  - 测试连接: ssh -T git@github.com"
    Write-Host ""
}

