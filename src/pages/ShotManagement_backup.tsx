import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X, ChevronDown, ChevronUp, Plus, Trash2, HelpCircle } from 'lucide-react'
import type { ScriptSegment } from '../services/api'

interface Shot {
  id: number
  shotNumber: number
  description: string
  prompt: string
  segment: string // 对应片段
  style: string
  sceneDescription: string
  visualFocus: string
  model: string
  aspectRatio: string
  quantity: number
  isExpanded: boolean
  associatedCharacters: string[]
  associatedScenes: string[]
  associatedItems: string[]
  pose?: string
  thumbnailImage?: string
}

interface LocationState {
  segments?: ScriptSegment[]
  scriptTitle?: string
  workStyle?: string
}

function ShotManagement() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  // 根据segments初始化shots
  const initializeShots = (segments: ScriptSegment[]): Shot[] => {
    if (!segments || segments.length === 0) {
      // 如果没有segments，使用默认数�?      return [
        {
          id: 1,
          shotNumber: 1,
          description: '场景建立镜头,展示清净峰的仙境氛围,云雾缭绕,仙鹤飞过�?,
          prompt: '三维动漫�?画面描述:清净峰山�?云海翻腾,几只优雅的仙鹤从画面中飞�?远处的宫殿若隐若�?阳光透过云层洒下金色光辉。视觉重�?观众视线聚焦于飞过的仙鹤和云海的壮丽景象,通过引导线构图突出仙境的飘渺感。整体呈现明亮、圣洁的白色与金色调。构�?Composition): 引导线构图。景�?Shot Scale): 大远�?Extreme Long Shot)。机�?Camera Position): 轴线顶机位。角�?Angle): 俯视(High Angle)。镜头类�?Lens Type): 广角镜头(Wide-Angle Lens)。光�?Lighting): 柔和的顺�?Soft Front Light)。色彩情�?Color Emotion): 明亮圣洁的白色与金色�?营造仙境氛围�?,
          segment: '场景建立镜头,展示清净峰的仙境氛围,云雾缭绕,仙鹤飞过�?,
          style: '三维动漫�?,
          sceneDescription: '清净峰山�?云海翻腾,几只优雅的仙鹤从画面中飞�?远处的宫殿若隐若�?阳光透过云层洒下金色光辉�?,
          visualFocus: '观众视线聚焦于飞过的仙鹤和云海的壮丽景象,通过引导线构图突出仙境的飘渺感。整体呈现明亮、圣洁的白色与金色调�?,
          model: 'volcengine-video-3.0-pro',
          aspectRatio: '16:9',
          quantity: 1,
          isExpanded: false,
          associatedCharacters: ['角色1', '角色2'],
          associatedScenes: ['场景1'],
          associatedItems: [],
          thumbnailImage: '/placeholder-image.jpg',
        },
      ]
    }

    // 根据segments创建shots
    return segments.map((seg, index) => ({
      id: index + 1,
      shotNumber: seg.shotNumber,
      description: '', // 初始为空，用户可以填�?      prompt: '', // 初始为空，用户可以填�?      segment: seg.segment, // 对应片段
      style: state?.workStyle || '三维动漫�?,
      sceneDescription: '',
      visualFocus: '',
      model: 'volcengine-video-3.0-pro',
      aspectRatio: '16:9',
      quantity: 1,
      isExpanded: false,
      associatedCharacters: [],
      associatedScenes: [],
      associatedItems: [],
      thumbnailImage: '/placeholder-image.jpg',
    }))
  }

  const [shots, setShots] = useState<Shot[]>(() => initializeShots(state?.segments || []))

  // 当segments变化时，更新shots
  useEffect(() => {
    if (state?.segments && state.segments.length > 0) {
      setShots(initializeShots(state.segments))
    }
  }, [state?.segments])

  const toggleShot = (id: number) => {
    setShots(shots.map((shot) => (shot.id === id ? { ...shot, isExpanded: !shot.isExpanded } : shot)))
  }

  const handleSubmit = () => {
    navigate('/image-fusion')
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* 导航�?*/}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/asset-details')}
            className="text-gray-600 hover:text-gray-900"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">�?/span>
              <span>1. 输入剧本(一整集)</span>
            </div>
            <span className="text-gray-600">�?/span>
            <div className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">�?/span>
              <span>2. 资产详情</span>
            </div>
            <span className="text-gray-600">�?/span>
            <div className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-pink-500 flex items-center justify-center text-xs font-bold">3</span>
              <span className="border-b-2 border-pink-500">3. 分镜管理</span>
            </div>
            <span className="text-gray-600">�?/span>
            <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">4</span>
              <span>4. 融图管理</span>
            </div>
            <span className="text-gray-600">�?/span>
            <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">5</span>
              <span>5. 视频编辑</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold">分镜列表(点击分镜面板可展开/折叠)</h2>
        </div>

        <div className="space-y-4">
          {shots.map((shot) => {
            // 截断融图提示词用于显�?            const truncatedPrompt = shot.prompt.length > 80 ? shot.prompt.substring(0, 80) + '...' : shot.prompt
            
            return (
              <div
                key={shot.id}
                className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleShot(shot.id)}
                >
                  {!shot.isExpanded ? (
                    // 未展开状态：显示图片、模型、数量、分镜描述、融图提示词
                    <div className="flex items-center gap-4">
                      {/* 左侧：图片缩略图 */}
                      <div className="w-24 h-16 bg-white rounded border border-gray-300 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {shot.thumbnailImage ? (
                          <img src={shot.thumbnailImage} alt={`分镜${shot.shotNumber}`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-500 text-xs">图片</span>
                        )}
                      </div>
                      
                      {/* 中间：分镜标题和融图提示�?*/}
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-lg font-semibold">分镜{shot.shotNumber}</h3>
                          <span className="text-purple-400 text-sm relative group cursor-pointer">
                            融图提示�? {truncatedPrompt}
                            {/* Hover tooltip显示完整提示�?*/}
                            <span className="absolute left-0 top-full mt-2 w-96 p-3 bg-white border border-gray-300 rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all text-xs text-gray-900 whitespace-pre-wrap break-words">
                              {shot.prompt}
                            </span>
                          </span>
                        </div>
                      </div>
                      
                      {/* 右侧：模型、数量、分镜描述信息块 */}
                      <div className="bg-white border border-gray-300 rounded-lg p-3 flex-shrink-0 min-w-[200px]">
                        <div className="mb-2">
                          <span className="text-xs text-gray-600">模型:</span>
                          <span className="ml-2 text-xs">{shot.model}</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-xs text-gray-600">数量:</span>
                          <span className="ml-2 text-xs text-red-500">{shot.quantity}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">分镜描述:</span>
                          <p className="mt-1 text-xs text-gray-700 line-clamp-2">{shot.description}</p>
                        </div>
                      </div>
                      
                      <ChevronDown className="text-gray-600 flex-shrink-0" />
                    </div>
                  ) : (
                    // 展开状态：只显示分镜标题和箭头
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">分镜{shot.shotNumber}</h3>
                      <ChevronUp className="text-gray-600" />
                    </div>
                  )}
                </div>

              {shot.isExpanded && (
                <div className="p-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* 左侧：融图提示词和对应片�?*/}
                    <div className="space-y-4">
                      {/* 融图提示�?*/}
                      <div>
                        <label className="block text-sm mb-2 flex items-center gap-2">
                          <span className="text-red-500">*</span> 融图提示�?                        </label>
                        <textarea
                          value={shot.prompt}
                          onChange={(e) =>
                            setShots(
                              shots.map((s) => (s.id === shot.id ? { ...s, prompt: e.target.value } : s))
                            )
                          }
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none text-sm text-gray-700"
                          rows={8}
                          placeholder="请输入融图提示词..."
                        />
                      </div>
                      
                      {/* 对应片段 */}
                      <div>
                        <label className="block text-sm mb-2 flex items-center gap-2">
                          对应片段
                        </label>
                        <div className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {shot.segment || '暂无对应片段'}
                        </div>
                      </div>
                    </div>
                    
                    {/* 右侧：模型、数量、分镜描述等信息 */}
                    <div className="space-y-4">
                      <div className="bg-white border border-gray-300 rounded-lg p-4">
                        <div className="mb-3">
                          <span className="text-sm text-gray-600">模型:</span>
                          <span className="ml-2 text-sm">{shot.model}</span>
                        </div>
                        <div className="mb-3">
                          <span className="text-sm text-gray-600">数量:</span>
                          <span className="ml-2 text-sm text-red-500">{shot.quantity}</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">分镜描述:</span>
                          <p className="mt-1 text-sm text-gray-700">{shot.description || '暂无描述'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 可编辑字�?*/}
                  <div className="space-y-6">
                    {/* 分镜描述 */}
                    <div>
                      <label className="block text-sm mb-2 flex items-center gap-2">
                        <span className="text-red-500">*</span> 分镜描述
                      </label>
                      <textarea
                        value={shot.description}
                        onChange={(e) =>
                          setShots(
                            shots.map((s) =>
                              s.id === shot.id ? { ...s, description: e.target.value } : s
                            )
                          )
                        }
                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                        rows={3}
                      />
                    </div>

                    {/* 图片比例、模型、数�?*/}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm mb-2">图片比例(尺寸)</label>
                        <select
                          value={shot.aspectRatio}
                          onChange={(e) => {
                            const newRatio = e.target.value
                            // 同步修改所有分镜的图片比例（修改分�?时，所有分镜都同步�?                            setShots((prevShots) =>
                              prevShots.map((s) => ({
                                ...s,
                                aspectRatio: newRatio,
                              }))
                            )
                          }}
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                        >
                          <option>16:9</option>
                          <option>9:16</option>
                          <option>1:1</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm mb-2 flex items-center gap-2">
                          <span className="text-red-500">*</span> 模型
                          <HelpCircle size={16} className="text-gray-600 cursor-help" />
                        </label>
                        <select
                          value={shot.model}
                          onChange={(e) =>
                            setShots(
                              shots.map((s) => (s.id === shot.id ? { ...s, model: e.target.value } : s))
                            )
                          }
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                        >
                          <option>即梦-3.0Pro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm mb-2 flex items-center gap-2">
                          <span className="text-red-500">*</span> 数量
                          <HelpCircle size={16} className="text-gray-600 cursor-help" />
                        </label>
                        <select
                          value={shot.quantity}
                          onChange={(e) =>
                            setShots(
                              shots.map((s) =>
                                s.id === shot.id ? { ...s, quantity: parseInt(e.target.value) } : s
                              )
                            )
                          }
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                        </select>
                      </div>
                    </div>

                  </div>

                  {/* 关联角色 */}
                  <div>
                    <label className="block text-sm mb-2 flex items-center gap-2">
                      关联角色
                      <HelpCircle size={16} className="text-gray-600 cursor-help" />
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {shot.associatedCharacters.map((char, idx) => (
                        <div
                          key={idx}
                          className="relative w-20 h-20 bg-white border border-gray-300 rounded"
                        >
                          <button className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-gray-900 text-xs">
                            ×
                          </button>
                        </div>
                      ))}
                      <button className="w-20 h-20 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-purple-500">
                        <div className="text-center">
                          <Plus size={20} className="mx-auto mb-1 text-gray-600" />
                          <span className="text-gray-600 text-xs">新增</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 关联物品 */}
                  <div>
                    <label className="block text-sm mb-2 flex items-center gap-2">
                      关联物品
                      <HelpCircle size={16} className="text-gray-600 cursor-help" />
                    </label>
                    <div className="flex gap-2">
                      <button className="w-20 h-20 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-purple-500">
                        <div className="text-center">
                          <Plus size={20} className="mx-auto mb-1 text-gray-600" />
                          <span className="text-gray-600 text-xs">新增</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 姿�?*/}
                  <div>
                    <label className="block text-sm mb-2 flex items-center gap-2">
                      姿�?                      <HelpCircle size={16} className="text-gray-600 cursor-help" />
                    </label>
                    <button className="w-20 h-20 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-purple-500">
                      <div className="text-center">
                        <Plus size={20} className="mx-auto mb-1 text-gray-600" />
                        <span className="text-gray-600 text-xs">选择并编辑上�?/span>
                      </div>
                    </button>
                  </div>

                  {/* 关联场景 */}
                  <div>
                    <label className="block text-sm mb-2 flex items-center gap-2">
                      关联场景
                      <HelpCircle size={16} className="text-gray-600 cursor-help" />
                    </label>
                    <div className="flex gap-2">
                      {shot.associatedScenes.map((scene, idx) => (
                        <div
                          key={idx}
                          className="relative w-20 h-20 bg-white border border-gray-300 rounded"
                        >
                          <button className="absolute -top-2 -right-2 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center text-gray-900 text-xs">
                            ×
                          </button>
                        </div>
                      ))}
                      <button className="w-20 h-20 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-purple-500">
                        <div className="text-center">
                          <Plus size={20} className="mx-auto mb-1 text-gray-600" />
                          <span className="text-gray-600 text-xs">新增</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )
          })}
        </div>

        {/* 提交按钮 */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-gray-900 rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
          >
            提交至下一�?          </button>
        </div>
      </div>
    </div>
  )
}

export default ShotManagement

