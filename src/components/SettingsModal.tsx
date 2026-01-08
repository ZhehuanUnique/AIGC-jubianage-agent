import { useState, useEffect } from 'react'
import { X, Settings as SettingsIcon } from 'lucide-react'
import { getUserSettings, saveUserSettings, UserSettings } from '../services/settingsService'
import { alertSuccess, alertError } from '../utils/alert'
import ToggleSwitch from './ToggleSwitch'
import RadioButton from './RadioButton'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<UserSettings>(getUserSettings())
  const [isSaving, setIsSaving] = useState(false)

  // 当模态框打开时，重新加载设置
  useEffect(() => {
    if (isOpen) {
      setSettings(getUserSettings())
    }
  }, [isOpen])

  const handleSave = () => {
    setIsSaving(true)
    try {
      saveUserSettings(settings)
      alertSuccess('设置已保存', '成功')
      onClose()
    } catch (error) {
      alertError('保存设置失败，请重试', '错误')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (window.confirm('确定要重置所有设置为默认值吗？')) {
      const defaultSettings = getUserSettings()
      // 重置为默认值
      setSettings({
        jianying: {
          autoCreateProject: false,
          autoImportVideos: false,
          importLocation: 'material',
        },
        photoshop: {
          autoCreateProject: false,
          autoImportPoster: false,
        },
        videoReview: {
          defaultMode: 'preview',
        },
        workflow: {
          enterKeySubmit: false,
        },
        firstLastFrame: {
          bottomBarMode: 'auto',
        },
      })
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-800">个性化设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-8">
          {/* 剪映设置 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              剪映设置
            </h3>
            
            <div className="space-y-4 pl-4">
              <div className="flex items-center justify-between gap-4 cursor-pointer group">
                <div className="flex-1">
                  <div className="font-medium text-gray-700 group-hover:text-gray-900">
                    自动新建项目
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    点击"导入剪映"时，自动在剪映中新建项目
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.jianying.autoCreateProject}
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      jianying: {
                        ...settings.jianying,
                        autoCreateProject: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4 cursor-pointer group">
                <div className="flex-1">
                  <div className={`font-medium ${settings.jianying.autoCreateProject ? 'text-gray-700 group-hover:text-gray-900' : 'text-gray-400'}`}>
                    自动导入分镜视频
                  </div>
                  <div className={`text-sm mt-1 ${settings.jianying.autoCreateProject ? 'text-gray-500' : 'text-gray-400'}`}>
                    自动将所有生成的分镜视频导入到新建的项目中
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.jianying.autoImportVideos}
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      jianying: {
                        ...settings.jianying,
                        autoImportVideos: checked,
                      },
                    })
                  }
                  disabled={!settings.jianying.autoCreateProject}
                />
              </div>

              {/* 导入位置选择 */}
              <div className={`pl-4 space-y-1 ${settings.jianying.autoImportVideos && settings.jianying.autoCreateProject ? '' : 'opacity-50 pointer-events-none'}`}>
                <div className="text-sm font-medium text-gray-700 mb-2">导入位置：</div>
                <RadioButton
                  name="importLocation"
                  value="material"
                  checked={settings.jianying.importLocation === 'material'}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      jianying: {
                        ...settings.jianying,
                        importLocation: 'material',
                      },
                    })
                  }
                  label="素材库"
                  description="视频将导入到剪映的素材面板，方便后续手动添加到轨道"
                  disabled={!settings.jianying.autoImportVideos || !settings.jianying.autoCreateProject}
                  color="blue"
                />
                <RadioButton
                  name="importLocation"
                  value="track"
                  checked={settings.jianying.importLocation === 'track'}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      jianying: {
                        ...settings.jianying,
                        importLocation: 'track',
                      },
                    })
                  }
                  label="时间轴轨道"
                  description="视频将直接添加到时间轴轨道，按顺序排列"
                  disabled={!settings.jianying.autoImportVideos || !settings.jianying.autoCreateProject}
                  color="blue"
                />
              </div>
            </div>
          </div>

          {/* 工作流设置 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              工作流设置
            </h3>
            
            <div className="space-y-4 pl-4">
              <div className="flex items-center justify-between gap-4 cursor-pointer group">
                <div className="flex-1">
                  <div className="font-medium text-gray-700 group-hover:text-gray-900">
                    Enter键代替鼠标点击"下一步"
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    开启后，在五步骤流程中按Enter键可提交到下一步，按Ctrl+Enter换行（在文本输入框中）
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.workflow?.enterKeySubmit || false}
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      workflow: {
                        ...settings.workflow,
                        enterKeySubmit: checked,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* 首尾帧生视频设置 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              首尾帧生视频设置
            </h3>
            
            <div className="space-y-4 pl-4">
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700 mb-2">底部输入栏模式：</div>
                <RadioButton
                  name="bottomBarMode"
                  value="auto"
                  checked={settings.firstLastFrame?.bottomBarMode === 'auto'}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      firstLastFrame: {
                        ...settings.firstLastFrame,
                        bottomBarMode: 'auto',
                      },
                    })
                  }
                  label="自动收缩"
                  description="滚动页面时底部输入栏自动收缩为小按钮，鼠标悬停时展开"
                  color="green"
                />
                <RadioButton
                  name="bottomBarMode"
                  value="fixed"
                  checked={settings.firstLastFrame?.bottomBarMode === 'fixed'}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      firstLastFrame: {
                        ...settings.firstLastFrame,
                        bottomBarMode: 'fixed',
                      },
                    })
                  }
                  label="固定显示"
                  description="底部输入栏始终完整显示，不会自动收缩"
                  color="green"
                />
              </div>
            </div>
          </div>

          {/* Photoshop 设置 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Photoshop 设置
            </h3>
            
            <div className="space-y-4 pl-4">
              <div className="flex items-center justify-between gap-4 cursor-pointer group">
                <div className="flex-1">
                  <div className="font-medium text-gray-700 group-hover:text-gray-900">
                    自动新建项目
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    点击"导入PS"时，自动在 Photoshop 中新建项目
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.photoshop.autoCreateProject}
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      photoshop: {
                        ...settings.photoshop,
                        autoCreateProject: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4 cursor-pointer group">
                <div className="flex-1">
                  <div className={`font-medium ${settings.photoshop.autoCreateProject ? 'text-gray-700 group-hover:text-gray-900' : 'text-gray-400'}`}>
                    自动导入海报图
                  </div>
                  <div className={`text-sm mt-1 ${settings.photoshop.autoCreateProject ? 'text-gray-500' : 'text-gray-400'}`}>
                    自动将海报图导入到新建项目的最上面的图层
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.photoshop.autoImportPoster}
                  onChange={(checked) =>
                    setSettings({
                      ...settings,
                      photoshop: {
                        ...settings.photoshop,
                        autoImportPoster: checked,
                      },
                    })
                  }
                  disabled={!settings.photoshop.autoCreateProject}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
          >
            重置为默认
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal


