import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X, Plus, Trash2, Upload } from 'lucide-react'
import type { ScriptAnalysisResult, ScriptSegment } from '../services/api'

interface Asset {
  id: string
  name: string
  type: 'character' | 'scene' | 'item'
  selectionMethod: string
  imageUrl?: string // 上传的图片URL
}

interface LocationState {
  analysisResult?: ScriptAnalysisResult
  segments?: ScriptSegment[]
  scriptTitle?: string
  workStyle?: string
  maxShots?: string
  isMock?: boolean // 标记是否为模拟数据
}

function AssetDetails() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  // 从路由state中获取分析结果，如果没有则使用默认值
  const initialCharacters: Asset[] = state?.analysisResult?.characters.map((char, index) => ({
    id: `char-${index}`,
    name: char.name,
    type: 'character' as const,
    selectionMethod: '通过角色选择器',
  })) || [
    { id: '1', name: '傅北川', type: 'character', selectionMethod: '通过角色选择器' },
    { id: '2', name: '苏绵绵', type: 'character', selectionMethod: '通过角色选择器' },
  ]

  const initialScenes: Asset[] = state?.analysisResult?.scenes.map((scene, index) => ({
    id: `scene-${index}`,
    name: scene.name,
    type: 'scene' as const,
    selectionMethod: '通过场景选择器',
  })) || [
    { id: '1', name: '日/内 公司等候区', type: 'scene', selectionMethod: '通过场景选择器' },
  ]

  const initialItems: Asset[] = state?.analysisResult?.items.map((item, index) => ({
    id: `item-${index}`,
    name: item.name,
    type: 'item' as const,
    selectionMethod: '通过物品选择器',
  })) || [
    { id: '1', name: '咖啡', type: 'item', selectionMethod: '通过物品选择器' },
  ]

  const [characters, setCharacters] = useState<Asset[]>(initialCharacters)
  const [scenes, setScenes] = useState<Asset[]>(initialScenes)
  const [items, setItems] = useState<Asset[]>(initialItems)

  // 如果从上一页没有传递数据，使用默认数据继续流程
  useEffect(() => {
    if (!state) {
      console.warn('未检测到分析结果，使用默认数据继续流程')
    }
    
    // 如果是模拟数据，显示提示
    if (state?.isMock) {
      console.info('⚠️ 当前使用模拟数据（后端服务未运行）')
    }
  }, [state])

  const addAsset = (type: 'character' | 'scene' | 'item') => {
    const newAsset: Asset = {
      id: Date.now().toString(),
      name: '',
      type,
      selectionMethod: type === 'character' ? '通过角色选择器' : type === 'scene' ? '通过场景选择器' : '通过物品选择器',
    }
    if (type === 'character') {
      setCharacters([...characters, newAsset])
    } else if (type === 'scene') {
      setScenes([...scenes, newAsset])
    } else {
      setItems([...items, newAsset])
    }
  }

  const removeAsset = (type: 'character' | 'scene' | 'item', id: string) => {
    if (type === 'character') {
      setCharacters(characters.filter((c) => c.id !== id))
    } else if (type === 'scene') {
      setScenes(scenes.filter((s) => s.id !== id))
    } else {
      setItems(items.filter((i) => i.id !== id))
    }
  }

  const updateAssetName = (type: 'character' | 'scene' | 'item', id: string, name: string) => {
    if (type === 'character') {
      setCharacters(characters.map((c) => (c.id === id ? { ...c, name } : c)))
    } else if (type === 'scene') {
      setScenes(scenes.map((s) => (s.id === id ? { ...s, name } : s)))
    } else {
      setItems(items.map((i) => (i.id === id ? { ...i, name } : i)))
    }
  }

  const updateSelectionMethod = (type: 'character' | 'scene' | 'item', id: string, method: string) => {
    if (type === 'character') {
      setCharacters(characters.map((c) => (c.id === id ? { ...c, selectionMethod: method } : c)))
    } else if (type === 'scene') {
      setScenes(scenes.map((s) => (s.id === id ? { ...s, selectionMethod: method } : s)))
    } else {
      setItems(items.map((i) => (i.id === id ? { ...i, selectionMethod: method } : i)))
    }
  }

  const handleImageUpload = (type: 'character' | 'scene' | 'item', id: string, file: File) => {
    // 创建本地预览URL
    const imageUrl = URL.createObjectURL(file)
    
    if (type === 'character') {
      setCharacters(characters.map((c) => (c.id === id ? { ...c, imageUrl } : c)))
    } else if (type === 'scene') {
      setScenes(scenes.map((s) => (s.id === id ? { ...s, imageUrl } : s)))
    } else {
      setItems(items.map((i) => (i.id === id ? { ...i, imageUrl } : i)))
    }
  }

  const handleSubmit = () => {
    navigate('/shot-management', {
      state: {
        segments: state?.segments || [],
        scriptTitle: state?.scriptTitle,
        workStyle: state?.workStyle,
      },
    })
  }

  return (
    <div className="h-screen bg-[#0a0a0a] text-white overflow-hidden flex flex-col">
        <div className="flex-1 flex flex-col max-w-full mx-auto p-6 overflow-hidden">
        {/* 模拟模式提示 */}
        {state?.isMock && (
          <div className="mb-4 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg p-3">
            <p className="text-yellow-300 text-sm">
              ⚠️ 当前为模拟模式（后端服务未运行），显示的是模拟数据。启动后端服务后可获得真实分析结果。
            </p>
          </div>
        )}
        
        {/* 导航栏 */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/script-input')}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="px-4 py-2 bg-green-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">✓</span>
              <span>1. 输入剧本(一整集)</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-pink-500 flex items-center justify-center text-xs font-bold">2</span>
              <span className="border-b-2 border-pink-500">2. 资产详情</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="px-4 py-2 bg-[#2a2a2a] rounded-lg text-gray-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#2a2a2a] text-gray-400 flex items-center justify-center text-xs font-bold">3</span>
              <span>3. 分镜管理</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="px-4 py-2 bg-[#2a2a2a] rounded-lg text-gray-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#2a2a2a] text-gray-400 flex items-center justify-center text-xs font-bold">4</span>
              <span>4. 融图管理</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="px-4 py-2 bg-[#2a2a2a] rounded-lg text-gray-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#2a2a2a] text-gray-400 flex items-center justify-center text-xs font-bold">5</span>
              <span>5. 视频编辑</span>
            </div>
          </div>
        </div>

        {/* 三个竖向列块 */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* 角色列 */}
          <div className="flex-1 flex flex-col border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1a1a]">
              <h2 className="text-xl font-semibold">角色</h2>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm">
                  <Upload size={16} />
                  <span>批量上传</span>
                </button>
                <button
                  onClick={() => addAsset('character')}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1 text-sm"
                >
                  <Plus size={16} />
                  添加
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <input
                      type="text"
                      value={char.name}
                      onChange={(e) => updateAssetName('character', char.id, e.target.value)}
                      placeholder="角色名称"
                      className="flex-1 px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded text-sm focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => removeAsset('character', char.id)}
                      className="text-gray-400 hover:text-red-500 ml-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <select
                    value={char.selectionMethod}
                    onChange={(e) => updateSelectionMethod('character', char.id, e.target.value)}
                    className="w-full px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded text-sm mb-3 focus:outline-none focus:border-purple-500"
                  >
                    <option>通过角色选择器</option>
                    <option>通过本地上传</option>
                  </select>
                  <div className="relative w-full h-32 bg-[#0a0a0a] border border-gray-700 rounded overflow-hidden">
                    {char.imageUrl ? (
                      <>
                        <img
                          src={char.imageUrl}
                          alt={char.name || '角色图片'}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            if (char.imageUrl) {
                              URL.revokeObjectURL(char.imageUrl)
                            }
                            setCharacters(characters.map((c) => (c.id === char.id ? { ...c, imageUrl: undefined } : c)))
                          }}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <label className="w-full h-full flex items-center justify-center cursor-pointer hover:border-purple-500">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file && char.selectionMethod === '通过本地上传') {
                              handleImageUpload('character', char.id, file)
                            }
                          }}
                        />
                        <div className="text-center">
                          <Plus size={24} className="mx-auto mb-2 text-gray-400" />
                          <span className="text-gray-400 text-sm">新增</span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 场景列 */}
          <div className="flex-1 flex flex-col border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1a1a]">
              <h2 className="text-xl font-semibold">场景</h2>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm">
                  <Upload size={16} />
                  <span>批量上传</span>
                </button>
                <button
                  onClick={() => addAsset('scene')}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1 text-sm"
                >
                  <Plus size={16} />
                  添加
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {scenes.map((scene) => (
                <div
                  key={scene.id}
                  className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <input
                      type="text"
                      value={scene.name}
                      onChange={(e) => updateAssetName('scene', scene.id, e.target.value)}
                      placeholder="场景名称"
                      className="flex-1 px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded text-sm focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => removeAsset('scene', scene.id)}
                      className="text-gray-400 hover:text-red-500 ml-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <select
                    value={scene.selectionMethod}
                    onChange={(e) => updateSelectionMethod('scene', scene.id, e.target.value)}
                    className="w-full px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded text-sm mb-3 focus:outline-none focus:border-purple-500"
                  >
                    <option>通过场景选择器</option>
                    <option>通过本地上传</option>
                  </select>
                  <div className="relative w-full h-32 bg-[#0a0a0a] border border-gray-700 rounded overflow-hidden">
                    {scene.imageUrl ? (
                      <>
                        <img
                          src={scene.imageUrl}
                          alt={scene.name || '场景图片'}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            if (scene.imageUrl) {
                              URL.revokeObjectURL(scene.imageUrl)
                            }
                            setScenes(scenes.map((s) => (s.id === scene.id ? { ...s, imageUrl: undefined } : s)))
                          }}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <label className="w-full h-full flex items-center justify-center cursor-pointer hover:border-purple-500">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file && scene.selectionMethod === '通过本地上传') {
                              handleImageUpload('scene', scene.id, file)
                            }
                          }}
                        />
                        <div className="text-center">
                          <Plus size={24} className="mx-auto mb-2 text-gray-400" />
                          <span className="text-gray-400 text-sm">新增</span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 物品列 */}
          <div className="flex-1 flex flex-col border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1a1a]">
              <h2 className="text-xl font-semibold">物品</h2>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm">
                  <Upload size={16} />
                  <span>批量上传</span>
                </button>
                <button
                  onClick={() => addAsset('item')}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1 text-sm"
                >
                  <Plus size={16} />
                  添加
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateAssetName('item', item.id, e.target.value)}
                      placeholder="物品名称"
                      className="flex-1 px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded text-sm focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => removeAsset('item', item.id)}
                      className="text-gray-400 hover:text-red-500 ml-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <select
                    value={item.selectionMethod}
                    onChange={(e) => updateSelectionMethod('item', item.id, e.target.value)}
                    className="w-full px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded text-sm mb-3 focus:outline-none focus:border-purple-500"
                  >
                    <option>通过物品选择器</option>
                    <option>通过本地上传</option>
                  </select>
                  <div className="relative w-full h-32 bg-[#0a0a0a] border border-gray-700 rounded overflow-hidden">
                    {item.imageUrl ? (
                      <>
                        <img
                          src={item.imageUrl}
                          alt={item.name || '物品图片'}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            if (item.imageUrl) {
                              URL.revokeObjectURL(item.imageUrl)
                            }
                            setItems(items.map((i) => (i.id === item.id ? { ...i, imageUrl: undefined } : i)))
                          }}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <label className="w-full h-full flex items-center justify-center cursor-pointer hover:border-purple-500">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file && item.selectionMethod === '通过本地上传') {
                              handleImageUpload('item', item.id, file)
                            }
                          }}
                        />
                        <div className="text-center">
                          <Plus size={24} className="mx-auto mb-2 text-gray-400" />
                          <span className="text-gray-400 text-sm">新增</span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-between mt-4">
          <button className="px-6 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a]">
            刷新资产 (不消耗积分)
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700"
          >
            提交至下一步 (消耗10积分)
          </button>
        </div>
      </div>
    </div>
  )
}

export default AssetDetails

