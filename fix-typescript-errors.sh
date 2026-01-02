#!/bin/bash
# 修复 TypeScript 编译错误的脚本
# 在服务器上执行: bash fix-typescript-errors.sh

cd /var/www/aigc-agent

echo "开始修复 TypeScript 错误..."

# 1. 修复 ImageSelectionModal.tsx - 删除重复的声明
echo "修复 ImageSelectionModal.tsx..."
# 删除第13行的重复声明（如果存在）
sed -i '/^  const \[currentImageIndex, setCurrentImageIndex\] = useState(0)$/d' src/components/ImageSelectionModal.tsx
# 确保第12行是正确的
sed -i 's/const \[currentImageIndex, setCurrentImageIndex\]/const [_currentImageIndex, setCurrentImageIndex]/g' src/components/ImageSelectionModal.tsx

# 2. 修复 ImageFusion.tsx - 确保 Star 和 Trash2 在导入中
echo "修复 ImageFusion.tsx 导入..."
# 检查导入行，如果没有 Star 和 Trash2，添加它们
if ! grep -q "Star.*Trash2\|Trash2.*Star" src/pages/ImageFusion.tsx; then
  sed -i 's/import { X, Eye\([^}]*\) }/import { X, Eye, Star, Trash2\1 }/g' src/pages/ImageFusion.tsx
fi

# 修复第63行的 setProgress（如果存在且未使用）
sed -i '63s/const \[progress, setProgress\]/const [progress, _setProgress]/' src/pages/ImageFusion.tsx

# 3. 修复 ShotManagement.tsx - 将 char 和 scene 改为 _char 和 _scene
echo "修复 ShotManagement.tsx..."
sed -i 's/associatedCharacters\.map((char, idx)/associatedCharacters.map((_char, idx)/g' src/pages/ShotManagement.tsx
sed -i 's/associatedScenes\.map((scene, idx)/associatedScenes.map((_scene, idx)/g' src/pages/ShotManagement.tsx

# 4. VideoEditing.tsx 中的 Edit 是被使用的，不应该删除
# 检查导入是否正确
if ! grep -q "Edit" src/pages/VideoEditing.tsx | head -1; then
  echo "警告: VideoEditing.tsx 中的 Edit 导入可能有问题，请手动检查"
fi

echo "修复完成！正在重新构建..."
npm run build

# 修复 TypeScript 编译错误的脚本
# 在服务器上执行: bash fix-typescript-errors.sh

cd /var/www/aigc-agent

echo "开始修复 TypeScript 错误..."

# 1. 修复 ImageSelectionModal.tsx - 删除重复的声明
echo "修复 ImageSelectionModal.tsx..."
# 删除第13行的重复声明（如果存在）
sed -i '/^  const \[currentImageIndex, setCurrentImageIndex\] = useState(0)$/d' src/components/ImageSelectionModal.tsx
# 确保第12行是正确的
sed -i 's/const \[currentImageIndex, setCurrentImageIndex\]/const [_currentImageIndex, setCurrentImageIndex]/g' src/components/ImageSelectionModal.tsx

# 2. 修复 ImageFusion.tsx - 确保 Star 和 Trash2 在导入中
echo "修复 ImageFusion.tsx 导入..."
# 检查导入行，如果没有 Star 和 Trash2，添加它们
if ! grep -q "Star.*Trash2\|Trash2.*Star" src/pages/ImageFusion.tsx; then
  sed -i 's/import { X, Eye\([^}]*\) }/import { X, Eye, Star, Trash2\1 }/g' src/pages/ImageFusion.tsx
fi

# 修复第63行的 setProgress（如果存在且未使用）
sed -i '63s/const \[progress, setProgress\]/const [progress, _setProgress]/' src/pages/ImageFusion.tsx

# 3. 修复 ShotManagement.tsx - 将 char 和 scene 改为 _char 和 _scene
echo "修复 ShotManagement.tsx..."
sed -i 's/associatedCharacters\.map((char, idx)/associatedCharacters.map((_char, idx)/g' src/pages/ShotManagement.tsx
sed -i 's/associatedScenes\.map((scene, idx)/associatedScenes.map((_scene, idx)/g' src/pages/ShotManagement.tsx

# 4. VideoEditing.tsx 中的 Edit 是被使用的，不应该删除
# 检查导入是否正确
if ! grep -q "Edit" src/pages/VideoEditing.tsx | head -1; then
  echo "警告: VideoEditing.tsx 中的 Edit 导入可能有问题，请手动检查"
fi

echo "修复完成！正在重新构建..."
npm run build

# 修复 TypeScript 编译错误的脚本
# 在服务器上执行: bash fix-typescript-errors.sh

cd /var/www/aigc-agent

echo "开始修复 TypeScript 错误..."

# 1. 修复 ImageSelectionModal.tsx - 删除重复的声明
echo "修复 ImageSelectionModal.tsx..."
# 删除第13行的重复声明（如果存在）
sed -i '/^  const \[currentImageIndex, setCurrentImageIndex\] = useState(0)$/d' src/components/ImageSelectionModal.tsx
# 确保第12行是正确的
sed -i 's/const \[currentImageIndex, setCurrentImageIndex\]/const [_currentImageIndex, setCurrentImageIndex]/g' src/components/ImageSelectionModal.tsx

# 2. 修复 ImageFusion.tsx - 确保 Star 和 Trash2 在导入中
echo "修复 ImageFusion.tsx 导入..."
# 检查导入行，如果没有 Star 和 Trash2，添加它们
if ! grep -q "Star.*Trash2\|Trash2.*Star" src/pages/ImageFusion.tsx; then
  sed -i 's/import { X, Eye\([^}]*\) }/import { X, Eye, Star, Trash2\1 }/g' src/pages/ImageFusion.tsx
fi

# 修复第63行的 setProgress（如果存在且未使用）
sed -i '63s/const \[progress, setProgress\]/const [progress, _setProgress]/' src/pages/ImageFusion.tsx

# 3. 修复 ShotManagement.tsx - 将 char 和 scene 改为 _char 和 _scene
echo "修复 ShotManagement.tsx..."
sed -i 's/associatedCharacters\.map((char, idx)/associatedCharacters.map((_char, idx)/g' src/pages/ShotManagement.tsx
sed -i 's/associatedScenes\.map((scene, idx)/associatedScenes.map((_scene, idx)/g' src/pages/ShotManagement.tsx

# 4. VideoEditing.tsx 中的 Edit 是被使用的，不应该删除
# 检查导入是否正确
if ! grep -q "Edit" src/pages/VideoEditing.tsx | head -1; then
  echo "警告: VideoEditing.tsx 中的 Edit 导入可能有问题，请手动检查"
fi

echo "修复完成！正在重新构建..."
npm run build



