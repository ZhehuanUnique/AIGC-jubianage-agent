import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Upload, Loader2 } from 'lucide-react'
import { analyzeScriptText, analyzeScriptFile, segmentScript } from '../services/api'

function ScriptInput() {
  const navigate = useNavigate()
  const [scriptTitle, setScriptTitle] = useState('')
  const [workStyle, setWorkStyle] = useState('真人电影风格')
  const [maxShots, setMaxShots] = useState('')
  const [scriptContent, setScriptContent] = useState('')
  const [showStyleDropdown, setShowStyleDropdown] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const styles = ['真人电影风格', '2d动漫风', '3d动漫风']

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.docx')) {
      setError('请上传 .docx 格式的文件')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      // 调用API分析文件
      const result = await analyzeScriptFile(file)
      
      // 如果返回了剧本内容，填充到文本框
      if (result.scriptContent) {
        setScriptContent(result.scriptContent)
      }

      // 如果没有标题，使用文件名
      const finalTitle = scriptTitle || file.name.replace('.docx', '')
      if (!scriptTitle) {
        setScriptTitle(finalTitle)
      }

      // 调用切分接口
      const segmentResult = await segmentScript({
        scriptContent: result.scriptContent,
        scriptTitle: finalTitle,
      })

      // 传递分析结果和切分结果到下一个页面
      navigate('/asset-details', {
        state: {
          analysisResult: result,
          segments: segmentResult.segments,
          scriptTitle: finalTitle,
          workStyle,
          maxShots,
        },
      })
    } catch (err) {
      // 如果后端服务不可用，使用模拟数据继续流程
      if (err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('网络错误'))) {
        console.warn('后端服务不可用，使用模拟数据继续流程')
        
        // 读取文件内容（简单模拟）
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target?.result as string
          setScriptContent(text.substring(0, 10000)) // 限制长度
          
          if (!scriptTitle) {
            setScriptTitle(file.name.replace('.docx', ''))
          }

          // 生成模拟分析结果和切分结果
          const mockResult = generateMockAnalysis(text)
          const finalTitle = scriptTitle || file.name.replace('.docx', '')
          // 简单的模拟切分：按段落切分
          const mockSegments = text
            .split(/\n\n+/)
            .filter(seg => seg.trim().length > 0)
            .map((seg, index) => ({
              shotNumber: index + 1,
              segment: seg.trim(),
            }))
          
          navigate('/asset-details', {
            state: {
              analysisResult: mockResult,
              segments: mockSegments,
              scriptTitle: finalTitle,
              workStyle,
              maxShots,
              isMock: true,
            },
          })
        }
        reader.readAsText(file)
      } else {
        setError(err instanceof Error ? err.message : '文件分析失败，请稍后重试')
        console.error('文件分析错误:', err)
        setIsAnalyzing(false)
      }
      // 重置文件输入
      e.target.value = ''
    }
  }

  // 生成模拟分析结果（用于后端不可用时）
  const generateMockAnalysis = (content: string) => {
    // 简单的关键词提取作为模拟
    const characters: string[] = []
    const scenes: string[] = []
    const items: string[] = []

    // 提取常见角色名称模式
    const characterPatterns = /[傅苏李王张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程魏苏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤][\u4e00-\u9fa5]{1,2}/g
    const foundCharacters = content.match(characterPatterns)
    if (foundCharacters) {
      characters.push(...Array.from(new Set(foundCharacters)).slice(0, 10))
    }

    // 提取场景关键词
    const sceneKeywords = ['医院', '公司', '咖啡厅', '家', '办公室', '诊室', '走廊', '门口', '街道']
    sceneKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        scenes.push(keyword)
      }
    })

    // 提取物品关键词
    const itemKeywords = ['药', '咖啡', '手机', '文件', '桌子', '椅子', '门', '窗']
    itemKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        items.push(keyword)
      }
    })

    return {
      characters: characters.map(name => ({ name })),
      scenes: scenes.map(name => ({ name })),
      items: items.map(name => ({ name })),
    }
  }

  const handleSubmit = async () => {
    // 验证必填项
    if (!scriptTitle || !scriptContent) {
      setError('请填写剧本标题和剧本内容')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      // 并行调用API分析剧本和切分剧本
      const [analysisResult, segmentResult] = await Promise.all([
        analyzeScriptText({
          scriptContent,
          scriptTitle,
        }),
        segmentScript({
          scriptContent,
          scriptTitle,
        }),
      ])

      // 传递分析结果和切分结果到下一个页面
      navigate('/asset-details', {
        state: {
          analysisResult,
          segments: segmentResult.segments,
          scriptTitle,
          workStyle,
          maxShots,
        },
      })
    } catch (err) {
      // 如果后端服务不可用，使用模拟数据继续流程
      if (err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('网络错误'))) {
        console.warn('后端服务不可用，使用模拟数据继续流程')
        
        // 生成模拟分析结果和切分结果
        const mockResult = generateMockAnalysis(scriptContent)
        // 简单的模拟切分：按段落切分
        const mockSegments = scriptContent
          .split(/\n\n+/)
          .filter(seg => seg.trim().length > 0)
          .map((seg, index) => ({
            shotNumber: index + 1,
            segment: seg.trim(),
          }))
        
        navigate('/asset-details', {
          state: {
            analysisResult: mockResult,
            segments: mockSegments,
            scriptTitle,
            workStyle,
            maxShots,
            isMock: true, // 标记为模拟数据
          },
        })
      } else {
        setError(err instanceof Error ? err.message : '剧本分析失败，请稍后重试')
        console.error('剧本分析错误:', err)
        setIsAnalyzing(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* 导航栏 */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/tasks')}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-pink-500 flex items-center justify-center text-xs font-bold">1</span>
              <span className="border-b-2 border-pink-500">1. 输入剧本(一整集)</span>
            </div>
            <span className="text-gray-400">→</span>
            <div className="px-4 py-2 bg-[#2a2a2a] rounded-lg text-gray-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#2a2a2a] text-gray-400 flex items-center justify-center text-xs font-bold">2</span>
              <span>2. 资产详情</span>
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

        {/* 表单内容 */}
        <div className="space-y-6">
          {/* 剧本标题 */}
          <div>
            <label className="block text-sm mb-2">
              剧本标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={scriptTitle}
              onChange={(e) => setScriptTitle(e.target.value)}
              placeholder="请填写剧本标题"
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* 作品风格 */}
          <div>
            <label className="block text-sm mb-2">作品风格</label>
            <div className="relative">
              <button
                onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg flex items-center justify-between hover:border-purple-500"
              >
                <span>{workStyle}</span>
                <span className="text-gray-400">▼</span>
              </button>
              {showStyleDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg overflow-hidden">
                  {styles.map((style) => (
                    <button
                      key={style}
                      onClick={() => {
                        setWorkStyle(style)
                        setShowStyleDropdown(false)
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-[#2a2a2a]"
                    >
                      {style}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 剧本最大分镜数 */}
          <div>
            <label className="block text-sm mb-2 flex items-center gap-2">
              剧本最大分镜数
              <span className="text-gray-400 cursor-help">(?)</span>
            </label>
            <input
              type="number"
              value={maxShots}
              onChange={(e) => setMaxShots(e.target.value)}
              placeholder="请填写最大分镜数 (最多设置80个分镜的上限)"
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* 剧本内容 */}
          <div>
            <label className="block text-sm mb-2">
              剧本内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              placeholder="请整理好一整集的完整剧本,直接填入"
              rows={12}
              maxLength={10000}
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
            />
            <div className="flex justify-end items-center mt-2">
              <span className="text-gray-400 text-xs">
                {scriptContent.length}/10000
              </span>
            </div>
          </div>

          {/* 上传文件 */}
          <div>
            <div className="relative">
              <input
                type="file"
                accept=".docx"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={isAnalyzing}
              />
              <label
                htmlFor="file-upload"
                className={`flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 ${
                  isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload size={20} />
                <span>{isAnalyzing ? '分析中...' : '上传docx文件'}</span>
              </label>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="px-4 py-3 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isAnalyzing}
              className={`px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all flex items-center gap-2 ${
                isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isAnalyzing && <Loader2 size={20} className="animate-spin" />}
              {isAnalyzing ? '分析中...' : '提交至下一步'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScriptInput

