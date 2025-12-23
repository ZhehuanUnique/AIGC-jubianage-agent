import { useState } from 'react'
import { Upload, Loader2, CheckCircle, XCircle, FileText } from 'lucide-react'
import { analyzeScriptText, analyzeScriptFile, type ScriptAnalysisResult } from '../services/api'

function TestPage() {
  const [scriptContent, setScriptContent] = useState('')
  const [scriptTitle, setScriptTitle] = useState('测试剧本')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<ScriptAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  // 示例剧本
  const exampleScript = `第一场

日/内 医院诊室

（医生坐在诊桌前，傅北川坐在对面）

医生：根据检查结果，你的情况不太乐观。这种药很贵，但能延长你的生命。

傅北川：（沉默片刻）多少钱？

医生：一个疗程需要十万。

（傅北川起身离开）

第二场

日/外 公司门口

（苏绵绵站在公司门口，看到傅北川出来）

苏绵绵：北川，你还好吗？

傅北川：没事，我们走吧。

（两人走向咖啡厅）

第三场

日/内 咖啡厅

（傅北川和苏绵绵坐在窗边，桌上放着两杯咖啡）

苏绵绵：你真的要放弃治疗吗？

傅北川：（看着窗外的街道）我不想拖累任何人。

（傅北川拿出手机，看着屏幕上的照片）`

  const handleAnalyzeText = async () => {
    if (!scriptContent.trim()) {
      setError('请输入剧本内容')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setResult(null)

    try {
      const analysisResult = await analyzeScriptText({
        scriptContent,
        scriptTitle,
      })
      setResult(analysisResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.docx')) {
      setError('请上传 .docx 格式的文件')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setResult(null)
    setUploadedFileName(file.name)

    try {
      const analysisResult = await analyzeScriptFile(file)
      setResult(analysisResult)
      // 如果返回了剧本内容，显示在文本框中
      if (analysisResult.scriptContent) {
        setScriptContent(analysisResult.scriptContent)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件分析失败')
    } finally {
      setIsAnalyzing(false)
      e.target.value = ''
    }
  }

  const loadExample = () => {
    setScriptContent(exampleScript)
    setError(null)
    setResult(null)
  }

  const clearAll = () => {
    setScriptContent('')
    setScriptTitle('测试剧本')
    setResult(null)
    setError(null)
    setUploadedFileName(null)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">剧本分析测试页面</h1>
          <p className="text-gray-400">测试剧本分析功能，自动提取角色、场景、物品</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：输入区域 */}
          <div className="space-y-4">
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-semibold mb-4">输入剧本</h2>

              {/* 剧本标题 */}
              <div className="mb-4">
                <label className="block text-sm mb-2">剧本标题（可选）</label>
                <input
                  type="text"
                  value={scriptTitle}
                  onChange={(e) => setScriptTitle(e.target.value)}
                  placeholder="测试剧本"
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* 文件上传 */}
              <div className="mb-4">
                <label className="block text-sm mb-2">上传 .docx 文件</label>
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
                    className={`flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 ${
                      isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload size={20} />
                    <span>{uploadedFileName || '选择文件'}</span>
                  </label>
                </div>
              </div>

              {/* 剧本内容 */}
              <div className="mb-4">
                <label className="block text-sm mb-2">剧本内容</label>
                <textarea
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                  placeholder="请输入剧本内容，或点击下方按钮加载示例..."
                  rows={15}
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 resize-none font-mono text-sm"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-400 text-xs">
                    {scriptContent.length} 字符
                  </span>
                  <button
                    onClick={loadExample}
                    className="text-purple-400 hover:text-purple-300 text-sm"
                  >
                    加载示例剧本
                  </button>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={handleAnalyzeText}
                  disabled={isAnalyzing || !scriptContent.trim()}
                  className={`flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 ${
                    isAnalyzing || !scriptContent.trim()
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      分析中...
                    </>
                  ) : (
                    <>
                      <FileText size={20} />
                      开始分析
                    </>
                  )}
                </button>
                <button
                  onClick={clearAll}
                  className="px-4 py-3 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-colors"
                >
                  清空
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：结果区域 */}
          <div className="space-y-4">
            {/* 错误提示 */}
            {error && (
              <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-300">
                  <XCircle size={20} />
                  <span className="font-semibold">错误</span>
                </div>
                <p className="mt-2 text-red-200">{error}</p>
              </div>
            )}

            {/* 分析结果 */}
            {result && (
              <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="text-green-500" size={24} />
                  <h2 className="text-xl font-semibold">分析结果</h2>
                </div>

                {/* 角色 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-purple-400">
                    角色 ({result.characters.length})
                  </h3>
                  {result.characters.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {result.characters.map((char, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded text-sm"
                        >
                          {char.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">未识别到角色</p>
                  )}
                </div>

                {/* 场景 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-blue-400">
                    场景 ({result.scenes.length})
                  </h3>
                  {result.scenes.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {result.scenes.map((scene, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded text-sm"
                        >
                          {scene.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">未识别到场景</p>
                  )}
                </div>

                {/* 物品 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-green-400">
                    物品 ({result.items.length})
                  </h3>
                  {result.items.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {result.items.map((item, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded text-sm"
                        >
                          {item.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">未识别到物品</p>
                  )}
                </div>

                {/* JSON 显示 */}
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                    查看原始JSON数据
                  </summary>
                  <pre className="mt-2 p-4 bg-[#0a0a0a] border border-gray-700 rounded text-xs overflow-auto max-h-64">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}

            {/* 空状态 */}
            {!result && !error && !isAnalyzing && (
              <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 text-center">
                <FileText className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400">
                  输入剧本内容或上传文件，然后点击"开始分析"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* API状态提示 */}
        <div className="mt-6 bg-[#1a1a1a] rounded-lg p-4 border border-gray-800">
          <p className="text-sm text-gray-400">
            💡 提示：确保后端服务已启动（http://localhost:3002），并且已配置正确的API密钥
          </p>
        </div>
      </div>
    </div>
  )
}

export default TestPage

