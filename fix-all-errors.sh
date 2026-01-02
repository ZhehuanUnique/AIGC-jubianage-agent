#!/bin/bash
# 完整修复所有 TypeScript 错误的脚本
# 在服务器上执行: bash fix-all-errors.sh

cd /var/www/aigc-agent

echo "========================================="
echo "开始修复所有 TypeScript 错误..."
echo "========================================="

# 1. 修复 ImageSelectionModal.tsx
echo "1. 修复 ImageSelectionModal.tsx..."
# 删除第13行的重复声明
sed -i '13d' src/components/ImageSelectionModal.tsx
# 确保第12行使用 _currentImageIndex
sed -i '12s/const \[currentImageIndex, setCurrentImageIndex\]/const [_currentImageIndex, setCurrentImageIndex]/' src/components/ImageSelectionModal.tsx
# 删除 index 参数
sed -i 's/images\.map((image, index) =>/images.map((image) =>/g' src/components/ImageSelectionModal.tsx
echo "   ✓ ImageSelectionModal.tsx 修复完成"

# 2. 修复 ImageFusion.tsx
echo "2. 修复 ImageFusion.tsx..."
# 确保导入包含 Star 和 Trash2
if ! grep -q "Star.*Trash2\|Trash2.*Star" src/pages/ImageFusion.tsx | head -1; then
  sed -i '3s/import { X, Eye\([^}]*\) }/import { X, Eye, Star, Trash2\1 }/' src/pages/ImageFusion.tsx
  sed -i '3s/import { X, Eye }/import { X, Eye, Star, Trash2 }/' src/pages/ImageFusion.tsx
fi
# 修复第63行的 setProgress（如果存在）
sed -i '63s/const \[progress, setProgress\] = useState(100)/const [progress, _setProgress] = useState(100)/' src/pages/ImageFusion.tsx
echo "   ✓ ImageFusion.tsx 修复完成"

# 3. 修复 ShotManagement.tsx
echo "3. 修复 ShotManagement.tsx..."
# 将 char 改为 _char
sed -i 's/associatedCharacters\.map((char, idx)/associatedCharacters.map((_char, idx)/g' src/pages/ShotManagement.tsx
# 将 scene 改为 _scene
sed -i 's/associatedScenes\.map((scene, idx)/associatedScenes.map((_scene, idx)/g' src/pages/ShotManagement.tsx
echo "   ✓ ShotManagement.tsx 修复完成"

# 4. VideoEditing.tsx 中的 Edit 是被使用的，确保导入正确
echo "4. 检查 VideoEditing.tsx..."
if ! grep -q "import.*Edit" src/pages/VideoEditing.tsx | head -1; then
  sed -i '3s/import { X, Download\([^}]*\) }/import { X, Download, Edit\1 }/' src/pages/VideoEditing.tsx
fi
echo "   ✓ VideoEditing.tsx 检查完成"

echo "========================================="
echo "所有修复完成！正在重新构建..."
echo "========================================="
npm run build

# 完整修复所有 TypeScript 错误的脚本
# 在服务器上执行: bash fix-all-errors.sh

cd /var/www/aigc-agent

echo "========================================="
echo "开始修复所有 TypeScript 错误..."
echo "========================================="

# 1. 修复 ImageSelectionModal.tsx
echo "1. 修复 ImageSelectionModal.tsx..."
# 删除第13行的重复声明
sed -i '13d' src/components/ImageSelectionModal.tsx
# 确保第12行使用 _currentImageIndex
sed -i '12s/const \[currentImageIndex, setCurrentImageIndex\]/const [_currentImageIndex, setCurrentImageIndex]/' src/components/ImageSelectionModal.tsx
# 删除 index 参数
sed -i 's/images\.map((image, index) =>/images.map((image) =>/g' src/components/ImageSelectionModal.tsx
echo "   ✓ ImageSelectionModal.tsx 修复完成"

# 2. 修复 ImageFusion.tsx
echo "2. 修复 ImageFusion.tsx..."
# 确保导入包含 Star 和 Trash2
if ! grep -q "Star.*Trash2\|Trash2.*Star" src/pages/ImageFusion.tsx | head -1; then
  sed -i '3s/import { X, Eye\([^}]*\) }/import { X, Eye, Star, Trash2\1 }/' src/pages/ImageFusion.tsx
  sed -i '3s/import { X, Eye }/import { X, Eye, Star, Trash2 }/' src/pages/ImageFusion.tsx
fi
# 修复第63行的 setProgress（如果存在）
sed -i '63s/const \[progress, setProgress\] = useState(100)/const [progress, _setProgress] = useState(100)/' src/pages/ImageFusion.tsx
echo "   ✓ ImageFusion.tsx 修复完成"

# 3. 修复 ShotManagement.tsx
echo "3. 修复 ShotManagement.tsx..."
# 将 char 改为 _char
sed -i 's/associatedCharacters\.map((char, idx)/associatedCharacters.map((_char, idx)/g' src/pages/ShotManagement.tsx
# 将 scene 改为 _scene
sed -i 's/associatedScenes\.map((scene, idx)/associatedScenes.map((_scene, idx)/g' src/pages/ShotManagement.tsx
echo "   ✓ ShotManagement.tsx 修复完成"

# 4. VideoEditing.tsx 中的 Edit 是被使用的，确保导入正确
echo "4. 检查 VideoEditing.tsx..."
if ! grep -q "import.*Edit" src/pages/VideoEditing.tsx | head -1; then
  sed -i '3s/import { X, Download\([^}]*\) }/import { X, Download, Edit\1 }/' src/pages/VideoEditing.tsx
fi
echo "   ✓ VideoEditing.tsx 检查完成"

echo "========================================="
echo "所有修复完成！正在重新构建..."
echo "========================================="
npm run build

# 完整修复所有 TypeScript 错误的脚本
# 在服务器上执行: bash fix-all-errors.sh

cd /var/www/aigc-agent

echo "========================================="
echo "开始修复所有 TypeScript 错误..."
echo "========================================="

# 1. 修复 ImageSelectionModal.tsx
echo "1. 修复 ImageSelectionModal.tsx..."
# 删除第13行的重复声明
sed -i '13d' src/components/ImageSelectionModal.tsx
# 确保第12行使用 _currentImageIndex
sed -i '12s/const \[currentImageIndex, setCurrentImageIndex\]/const [_currentImageIndex, setCurrentImageIndex]/' src/components/ImageSelectionModal.tsx
# 删除 index 参数
sed -i 's/images\.map((image, index) =>/images.map((image) =>/g' src/components/ImageSelectionModal.tsx
echo "   ✓ ImageSelectionModal.tsx 修复完成"

# 2. 修复 ImageFusion.tsx
echo "2. 修复 ImageFusion.tsx..."
# 确保导入包含 Star 和 Trash2
if ! grep -q "Star.*Trash2\|Trash2.*Star" src/pages/ImageFusion.tsx | head -1; then
  sed -i '3s/import { X, Eye\([^}]*\) }/import { X, Eye, Star, Trash2\1 }/' src/pages/ImageFusion.tsx
  sed -i '3s/import { X, Eye }/import { X, Eye, Star, Trash2 }/' src/pages/ImageFusion.tsx
fi
# 修复第63行的 setProgress（如果存在）
sed -i '63s/const \[progress, setProgress\] = useState(100)/const [progress, _setProgress] = useState(100)/' src/pages/ImageFusion.tsx
echo "   ✓ ImageFusion.tsx 修复完成"

# 3. 修复 ShotManagement.tsx
echo "3. 修复 ShotManagement.tsx..."
# 将 char 改为 _char
sed -i 's/associatedCharacters\.map((char, idx)/associatedCharacters.map((_char, idx)/g' src/pages/ShotManagement.tsx
# 将 scene 改为 _scene
sed -i 's/associatedScenes\.map((scene, idx)/associatedScenes.map((_scene, idx)/g' src/pages/ShotManagement.tsx
echo "   ✓ ShotManagement.tsx 修复完成"

# 4. VideoEditing.tsx 中的 Edit 是被使用的，确保导入正确
echo "4. 检查 VideoEditing.tsx..."
if ! grep -q "import.*Edit" src/pages/VideoEditing.tsx | head -1; then
  sed -i '3s/import { X, Download\([^}]*\) }/import { X, Download, Edit\1 }/' src/pages/VideoEditing.tsx
fi
echo "   ✓ VideoEditing.tsx 检查完成"

echo "========================================="
echo "所有修复完成！正在重新构建..."
echo "========================================="
npm run build



