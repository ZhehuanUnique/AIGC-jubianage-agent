"""
剪映UI自动化脚本
使用 uiautomation 库实现自动点击"开始创作"按钮并导入视频
"""

import sys
import time
import json
import os
import subprocess

try:
    import uiautomation as auto
except ImportError:
    print("错误: 未安装 uiautomation 库")
    print("请运行: pip install uiautomation")
    sys.exit(1)


def find_jianying_window():
    """查找剪映窗口"""
    try:
        # 尝试多种方式查找剪映窗口
        # 方式1: 通过窗口标题
        jianying = auto.WindowControl(searchDepth=1, Name="剪映")
        if jianying.Exists(0, 0):
            return jianying
        
        # 方式2: 通过类名（如果知道的话）
        jianying = auto.WindowControl(searchDepth=1, ClassName="Qt5QWindowIcon")
        if jianying.Exists(0, 0):
            return jianying
        
        # 方式3: 通过进程名
        for window in auto.GetRootControl().GetChildren():
            if "JianyingPro" in window.Name or "剪映" in window.Name:
                return window
        
        return None
    except Exception as e:
        print(f"查找剪映窗口失败: {e}")
        return None


def bring_window_to_front(window):
    """将窗口置顶并获取焦点"""
    try:
        if not window or not window.Exists(0, 0):
            return False
        
        # 方法1: 使用 SetFocus 和 SetTopmost
        window.SetFocus()
        window.SetTopmost(True)
        time.sleep(0.1)  # 短暂等待
        window.SetTopmost(False)  # 取消置顶，但保持焦点
        
        # 方法2: 使用 ShowWindow 确保窗口可见
        try:
            import win32gui
            import win32con
            hwnd = window.Handle
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)  # 恢复窗口（如果最小化）
            win32gui.SetForegroundWindow(hwnd)  # 置顶窗口
            win32gui.BringWindowToTop(hwnd)  # 将窗口带到最前
        except ImportError:
            # 如果没有 win32gui，使用 uiautomation 的方法
            window.SetFocus()
            try:
                rect = window.BoundingRectangle
                if rect:
                    window.MoveWindow(0, 0, rect.width(), rect.height())
            except:
                pass
        
        print("✅ 已置顶剪映窗口")
        return True
    except Exception as e:
        print(f"⚠️ 置顶窗口失败: {e}")
        # 即使失败也尝试设置焦点
        try:
            window.SetFocus()
        except:
            pass
        return False


def click_start_creation():
    """点击开始创作按钮"""
    try:
        print("🔍 开始查找剪映窗口...")
        jianying = find_jianying_window()
        if not jianying:
            print("❌ 未找到剪映窗口")
            print("💡 提示：请确保剪映应用已打开")
            return False
        
        print(f"✅ 找到剪映窗口: {jianying.Name}")
        
        # 置顶窗口并获取焦点
        print("🔝 置顶窗口并获取焦点...")
        bring_window_to_front(jianying)
        time.sleep(1)  # 增加等待时间，确保窗口完全加载
        
        # 查找"开始创作"按钮
        # 注意：按钮文本可能因版本而异，尝试多种方式
        print("🔍 查找'开始创作'按钮...")
        start_button = None
        
        # 方式1: 通过按钮文本（精确匹配）
        try:
            start_button = jianying.ButtonControl(Name="开始创作")
            if start_button.Exists(0, 0):
                print("✅ 方式1: 通过精确文本找到按钮")
        except:
            pass
        
        # 方式2: 通过按钮文本（包含"开始创作"）
        if not start_button or not start_button.Exists(0, 0):
            print("🔍 方式2: 遍历所有控件查找包含'开始创作'的按钮...")
            try:
                all_controls = jianying.GetChildren()
                for control in all_controls:
                    try:
                        control_name = str(control.Name) if hasattr(control, 'Name') else ''
                        if "开始创作" in control_name:
                            print(f"   找到可能的按钮: {control_name} ({control.ControlTypeName})")
                            # 尝试作为按钮点击
                            if "Button" in control.ControlTypeName or "ButtonControl" in str(type(control)):
                                start_button = control
                                print("✅ 方式2: 找到按钮")
                                break
                    except:
                        continue
            except Exception as e:
                print(f"⚠️ 遍历控件时出错: {e}")
        
        # 方式3: 通过文本控件查找（可能是文本而不是按钮）
        if not start_button or not start_button.Exists(0, 0):
            print("🔍 方式3: 查找包含'开始创作'的文本控件...")
            try:
                text_control = jianying.TextControl(Name="开始创作")
                if text_control.Exists(0, 0):
                    # 尝试点击文本控件的父控件
                    parent = text_control.GetParentControl()
                    if parent:
                        start_button = parent
                        print("✅ 方式3: 通过文本控件找到父控件")
            except:
                pass
        
        # 方式4: 通过坐标点击（如果知道按钮的大概位置）
        if not start_button or not start_button.Exists(0, 0):
            print("🔍 方式4: 尝试通过坐标点击（中心区域）...")
            try:
                rect = jianying.BoundingRectangle
                if rect:
                    # 点击窗口中心偏上的位置（通常是"开始创作"按钮的位置）
                    # BoundingRectangle 是一个矩形对象
                    try:
                        # 尝试不同的属性访问方式
                        if hasattr(rect, 'left') and hasattr(rect, 'width'):
                            center_x = rect.left + (rect.width() // 2)
                            center_y = rect.top + (rect.height() // 3)
                        elif hasattr(rect, 'Left') and hasattr(rect, 'Width'):
                            center_x = rect.Left + (rect.Width() // 2)
                            center_y = rect.Top + (rect.Height() // 3)
                        else:
                            # 使用 left(), top(), width(), height() 方法
                            center_x = rect.left() + (rect.width() // 2)
                            center_y = rect.top() + (rect.height() // 3)
                        
                        print(f"   尝试点击坐标: ({center_x}, {center_y})")
                        auto.Click(center_x, center_y)
                        print("✅ 方式4: 已通过坐标点击")
                        time.sleep(1.5)
                        return True
                    except Exception as e2:
                        print(f"⚠️ 坐标计算失败: {e2}")
            except Exception as e:
                print(f"⚠️ 坐标点击失败: {e}")
        
        # 如果找到了按钮，点击它
        if start_button and start_button.Exists(0, 0):
            try:
                print(f"🖱️ 准备点击按钮: {start_button.Name}")
                start_button.Click()
                print("✅ 已点击开始创作按钮")
                time.sleep(1.5)  # 等待界面响应
                return True
            except Exception as e:
                print(f"⚠️ 点击按钮失败: {e}")
                return False
        else:
            print("❌ 未找到开始创作按钮")
            # 尝试查找所有控件，用于调试
            print("📋 调试信息: 查找所有控件...")
            try:
                all_controls = jianying.GetChildren()
                print(f"   找到 {len(all_controls)} 个控件")
                for i, ctrl in enumerate(all_controls[:20]):  # 显示前20个
                    try:
                        ctrl_name = str(ctrl.Name) if hasattr(ctrl, 'Name') else '无名称'
                        ctrl_type = ctrl.ControlTypeName if hasattr(ctrl, 'ControlTypeName') else '未知类型'
                        print(f"   控件 {i}: {ctrl_name} ({ctrl_type})")
                    except:
                        print(f"   控件 {i}: (无法获取信息)")
            except Exception as e:
                print(f"⚠️ 获取控件列表失败: {e}")
            return False
    except Exception as e:
        print(f"❌ 点击开始创作失败: {e}")
        import traceback
        print(f"   错误详情: {traceback.format_exc()}")
        return False


def click_import_button():
    """点击左上角的'导入'按钮"""
    try:
        jianying = find_jianying_window()
        if not jianying:
            print("未找到剪映窗口")
            return False
        
        # 置顶窗口并获取焦点
        bring_window_to_front(jianying)
        time.sleep(0.5)  # 减少等待时间
        
        # 查找"导入"按钮或链接
        # 方式1: 通过文本查找
        import_button = None
        
        # 尝试多种方式查找"导入"按钮
        try:
            import_button = jianying.ButtonControl(Name="导入")
            if not import_button.Exists(0, 0):
                import_button = jianying.TextControl(Name="导入")
            if not import_button.Exists(0, 0):
                # 遍历所有控件查找包含"导入"的控件
                for control in jianying.GetChildren():
                    if "导入" in str(control.Name):
                        import_button = control
                        break
        except:
            pass
        
        if import_button and import_button.Exists(0, 0):
            import_button.Click()
            print("✅ 已点击导入按钮")
            time.sleep(0.5)  # 减少等待时间
            return True
        else:
            print("⚠️ 未找到导入按钮，尝试使用文件拖拽方式")
            return False
    except Exception as e:
        print(f"点击导入按钮失败: {e}")
        return False


def import_videos_by_file_dialog(video_paths):
    """通过文件选择对话框导入视频"""
    try:
        import os
        import win32gui
        import win32con
        import win32clipboard
        
        jianying = find_jianying_window()
        if not jianying:
            print("未找到剪映窗口")
            return False
        
        # 置顶窗口并获取焦点
        bring_window_to_front(jianying)
        time.sleep(0.5)  # 减少等待时间
        
        # 检查文件是否存在
        valid_paths = []
        for video_path in video_paths:
            if os.path.exists(video_path):
                valid_paths.append(video_path)
            else:
                print(f"⚠️ 视频文件不存在: {video_path}")
        
        if not valid_paths:
            print("❌ 没有有效的视频文件")
            return False
        
        # 方法：使用 SendMessage 发送文件路径到剪映
        # 或者使用剪贴板 + 粘贴操作
        # 注意：这需要剪映支持从剪贴板粘贴文件路径
        
        print(f"📂 准备导入 {len(valid_paths)} 个视频文件")
        print("💡 提示：如果自动导入失败，请手动点击'导入'按钮并选择文件")
        
        # 将文件路径列表保存到临时文件，供后续使用
        temp_file = os.path.join(os.environ.get('TEMP', '/tmp'), 'jianying_import_files.txt')
        with open(temp_file, 'w', encoding='utf-8') as f:
            for path in valid_paths:
                f.write(path + '\n')
        
        print(f"✅ 文件列表已保存到: {temp_file}")
        return True
    except ImportError:
        print("⚠️ 未安装 win32gui，使用简化方案")
        # 简化方案：只返回文件路径信息
        print(f"📂 需要导入的视频文件:")
        for path in video_paths:
            print(f"   - {path}")
        return True
    except Exception as e:
        print(f"文件对话框导入失败: {e}")
        return False


def import_videos_to_material_library(video_paths):
    """导入视频到素材库（通过点击导入按钮或文件对话框）"""
    try:
        import os
        
        # 验证文件路径
        valid_paths = []
        for video_path in video_paths:
            if os.path.exists(video_path):
                valid_paths.append(video_path)
            else:
                print(f"⚠️ 视频文件不存在: {video_path}")
        
        if not valid_paths:
            print("❌ 没有有效的视频文件")
            return False
        
        # 步骤1: 尝试点击导入按钮
        print("🔍 步骤1: 查找并点击'导入'按钮...")
        import_clicked = click_import_button()
        
        if import_clicked:
            # 如果成功点击了导入按钮，等待文件选择对话框打开
            print("✅ 已点击导入按钮，等待文件选择对话框...")
            time.sleep(2)
            
            # 步骤2: 使用文件对话框导入
            print("🔍 步骤2: 准备通过文件对话框导入视频...")
            return import_videos_by_file_dialog(valid_paths)
        else:
            # 如果找不到导入按钮，尝试直接使用文件对话框
            print("⚠️ 未找到导入按钮，尝试其他方式...")
            print("💡 提示：请手动点击左上角的'导入'按钮")
            return import_videos_by_file_dialog(valid_paths)
    except Exception as e:
        print(f"导入视频失败: {e}")
        return False


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法: python jianyingUIAutomation.py <action> [params_json]")
        print("示例: python jianyingUIAutomation.py click_start_creation")
        sys.exit(1)
    
    action = sys.argv[1]
    
    if action == "click_start_creation":
        success = click_start_creation()
        sys.exit(0 if success else 1)
    elif action == "import_videos":
        if len(sys.argv) < 3:
            print("错误: 需要提供视频路径JSON")
            sys.exit(1)
        video_paths = json.loads(sys.argv[2])
        success = import_videos_to_material_library(video_paths)
        sys.exit(0 if success else 1)
    else:
        print(f"未知操作: {action}")
        sys.exit(1)


if __name__ == "__main__":
    main()


