import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import NavigationBar from '../components/NavigationBar'

interface RechargePackage {
  credits: number
  value: number
  price: number
}

const packages: RechargePackage[] = [
  { credits: 10000, value: 999, price: 999 },
  { credits: 30000, value: 2988, price: 2988 },
]

function CreditRecharge() {
  const navigate = useNavigate()
  const [selectedPackage, setSelectedPackage] = useState<RechargePackage | null>(null)
  const [showQRCode, setShowQRCode] = useState(false)

  const handlePackageSelect = (pkg: RechargePackage) => {
    setSelectedPackage(pkg)
  }

  const handleRecharge = () => {
    if (!selectedPackage) return
    // TODO: 实现支付逻辑
    console.log('充值套餐:', selectedPackage)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <NavigationBar showBackButton={true} activeTab="recharge" />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 标题和副标题 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-purple-500 mb-4">积分充值</h1>
          <p className="text-gray-600 text-lg">剧变时代Agent——专业制作爆款短剧能工具及垂直社区交流平台</p>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* 左侧 - 选择充值套餐 */}
          <div>
            <h2 className="text-2xl font-semibold mb-6 text-purple-600">选择充值套餐</h2>
            <div className="space-y-4">
              {packages.map((pkg, index) => (
                <div
                  key={index}
                  onClick={() => handlePackageSelect(pkg)}
                  className={`bg-gray-50 rounded-lg p-6 cursor-pointer transition-all border-2 ${
                    selectedPackage?.credits === pkg.credits
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-3xl font-bold mb-2">{pkg.credits.toLocaleString()} 积分</div>
                      <div className="text-sm text-gray-600">价值 ¥{pkg.value.toLocaleString()}</div>
                    </div>
                    <div className="text-2xl font-bold text-purple-500">¥{pkg.price.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧 - 支付信息 */}
          <div>
            <h2 className="text-2xl font-semibold mb-6 text-purple-600">支付信息</h2>
            <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-purple-500 min-h-[400px] flex flex-col items-center justify-center">
              {selectedPackage ? (
                <div className="w-full">
                  <div className="text-center mb-8">
                    <div className="text-6xl font-bold text-purple-500 mb-4">¥{selectedPackage.price.toLocaleString()}</div>
                    <div className="text-xl text-gray-700 mb-2">{selectedPackage.credits.toLocaleString()} 积分</div>
                    <div className="text-sm text-gray-600">价值 ¥{selectedPackage.value.toLocaleString()}</div>
                  </div>
                  <button
                    onClick={handleRecharge}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-purple-800 transition-all"
                  >
                    确认充值
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-6xl font-bold text-gray-400 mb-6">¥</div>
                  <div className="text-xl text-gray-600 mb-2">选择充值套餐</div>
                  <div className="text-sm text-gray-500">选择左侧的充值套餐开始充值</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 支付协议 */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-purple-600">支付协议</h3>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li>• 订单超时时间为60秒,超时后订单自动取消,请及时完成支付;</li>
            <li>• 积分为虚拟商品,一经充值,不支持退款;</li>
            <li>• 购买后的积分有效期为365天,到期余量自动清零;</li>
            <li>• 1元人民币对应5个积分。各项目积分消耗在提交任务处有醒目标注,在积分余额处有消耗流水列表。因服务器原因生成失败的返还积分;</li>
            <li>
              • 使用指导,对公支付,开具发票,购买更多积分,咨询节省计划,请联系商务,
              <div className="mt-1">
                <span className="text-purple-600 font-semibold">企业定价&商务合作</span> 微信 <a href="#" onClick={(e) => { e.preventDefault(); setShowQRCode(true); }} className="text-purple-600 hover:text-purple-700 underline">JuBianShiDai_Ai</a>;
              </div>
            </li>
          </ul>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-gray-600 text-sm">点击充值即表示同意</span>
            <a
              href="/payment-service-agreement"
              className="text-blue-400 hover:text-blue-300 text-sm underline"
              onClick={(e) => {
                e.preventDefault()
                navigate('/payment-service-agreement')
              }}
            >
              《支付服务协议》
            </a>
          </div>
        </div>
      </div>

      {/* 微信二维码模态框 */}
      {showQRCode && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn"
          onClick={() => setShowQRCode(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">企业定价&商务合作</h3>
              <button
                onClick={() => setShowQRCode(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="text-center">
              <p className="text-gray-600 mb-4">微信: JuBianShiDai_Ai</p>
              <img
                src="/JuBianShiDai_Ai.jpg"
                alt="微信二维码"
                className="w-full max-w-xs mx-auto rounded-lg border border-gray-200"
                onError={(e) => {
                  console.error('二维码图片加载失败')
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreditRecharge

