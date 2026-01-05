import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import NavigationBar from '../components/NavigationBar'

function PaymentServiceAgreement() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <NavigationBar showBackButton={true} activeTab="recharge" />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-500 mb-2">支付服务协议</h1>
          <p className="text-gray-600 text-sm">最后更新时间：2026年1月</p>
        </div>

        {/* 协议内容 */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 space-y-6 text-gray-700 leading-relaxed">
          {/* 前言 */}
          <div>
            <p className="mb-4">
              欢迎使用剧变时代（以下简称"本公司"）提供的支付服务。本支付服务协议（以下简称"本协议"）由剧变时代（母公司：聚赢传媒）与您（以下简称"用户"或"您"）就使用本公司提供的支付服务所订立的协议。
            </p>
            <p className="mb-4">
              在使用本公司的支付服务之前，请您仔细阅读本协议的全部内容。当您点击"确认充值"或进行任何支付操作时，即表示您已充分理解并同意接受本协议的全部内容。如您不同意本协议的任何内容，请立即停止使用本服务。
            </p>
          </div>

          {/* 第一条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第一条 协议双方</h2>
            <p className="mb-2">
              <strong>甲方（服务提供方）：</strong>剧变时代
            </p>
            <p className="mb-2">
              <strong>母公司：</strong>聚赢传媒
            </p>
            <p className="mb-2">
              <strong>乙方（用户）：</strong>使用本公司支付服务的自然人、法人或其他组织
            </p>
          </div>

          {/* 第二条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第二条 服务内容</h2>
            <p className="mb-2">本公司通过其平台为用户提供以下支付服务：</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>在线支付服务</li>
              <li>账户积分充值服务</li>
              <li>积分消费记录查询服务</li>
              <li>其他与支付相关的服务</li>
            </ul>
          </div>

          {/* 第三条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第三条 用户资格</h2>
            <p className="mb-2">使用本支付服务的用户应满足以下条件：</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>具备完全民事行为能力的自然人，或依法设立的法人或其他组织</li>
              <li>已注册并拥有有效的剧变时代账户</li>
              <li>同意遵守本协议及本公司相关服务条款</li>
            </ul>
          </div>

          {/* 第四条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第四条 积分充值规则</h2>
            <div className="space-y-2">
              <p><strong>4.1 积分兑换比例：</strong>1元人民币对应5个积分。</p>
              <p><strong>4.2 订单超时：</strong>订单超时时间为60秒，超时后订单自动取消，请及时完成支付。</p>
              <p><strong>4.3 积分有效期：</strong>购买后的积分有效期为365天，到期余量自动清零。用户应在有效期内使用积分，过期未使用的积分将不予退还。</p>
              <p><strong>4.4 积分消耗：</strong>各项目积分消耗在提交任务处有醒目标注，在积分余额处有消耗流水列表，用户可随时查询。</p>
              <p><strong>4.5 积分返还：</strong>因服务器原因导致生成失败的，本公司将返还相应积分至用户账户。</p>
            </div>
          </div>

          {/* 第五条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第五条 虚拟商品说明</h2>
            <div className="space-y-2">
              <p><strong>5.1 商品性质：</strong>积分为虚拟商品，不具有实物形态，仅用于在剧变时代平台内使用。</p>
              <p><strong>5.2 不支持退款：</strong>积分为虚拟商品，一经充值，不支持退款、转让或兑换为现金。</p>
              <p><strong>5.3 使用限制：</strong>积分仅限在剧变时代平台内使用，不得用于其他用途。</p>
            </div>
          </div>

          {/* 第六条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第六条 账户注册与管理</h2>
            <div className="space-y-2">
              <p><strong>6.1 注册信息：</strong>用户需提供真实、准确、完整的个人或企业信息进行注册。如信息不实，本公司有权拒绝提供服务或终止服务。</p>
              <p><strong>6.2 账户安全：</strong>用户应妥善保管账户信息、密码等，因用户自身原因导致的账户信息泄露、密码丢失或账户被盗用等造成的损失，本公司不承担责任。</p>
              <p><strong>6.3 账户使用：</strong>用户不得将账户转让、出售或出借给他人使用，否则由此产生的损失由用户自行承担。</p>
            </div>
          </div>

          {/* 第七条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第七条 支付服务使用</h2>
            <div className="space-y-2">
              <p><strong>7.1 合规使用：</strong>用户在使用支付服务时，应遵守相关法律法规及本公司的规定，不得利用支付服务进行任何违法、违规或不正当的活动。</p>
              <p><strong>7.2 禁止行为：</strong>用户不得利用支付服务从事洗钱、套现、虚假交易等违法行为，一经发现，本公司有权立即终止服务并保留追究法律责任的权利。</p>
              <p><strong>7.3 支付方式：</strong>用户可通过本公司支持的支付方式完成充值，具体支付方式以平台实际显示为准。</p>
            </div>
          </div>

          {/* 第八条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第八条 费用与税务</h2>
            <div className="space-y-2">
              <p><strong>8.1 服务费用：</strong>本公司有权根据服务内容收取相应费用，具体费用标准以本公司平台公布的为准。本公司保留调整费用标准的权利，调整后的费用标准将在平台公告。</p>
              <p><strong>8.2 税费承担：</strong>用户应自行承担因使用支付服务而产生的税费（如有）。</p>
              <p><strong>8.3 发票开具：</strong>用户如需开具发票，请联系商务合作（微信：JuBianShiDai_Ai）进行申请。</p>
            </div>
          </div>

          {/* 第九条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第九条 服务中断与终止</h2>
            <div className="space-y-2">
              <p><strong>9.1 服务中断：</strong>因系统维护、升级、故障或不可抗力等原因需暂停服务的，本公司将提前公告或及时通知用户。因不可抗力导致的服务中断，本公司不承担责任。</p>
              <p><strong>9.2 服务终止：</strong>如用户违反本协议、相关法律法规或本公司相关规定，本公司有权随时中断或终止向用户提供服务，且不退还已充值的积分。</p>
              <p><strong>9.3 用户终止：</strong>用户可随时停止使用本服务，但已充值的积分不予退还。</p>
            </div>
          </div>

          {/* 第十条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第十条 责任限制</h2>
            <div className="space-y-2">
              <p><strong>10.1 不可抗力：</strong>本公司对因不可抗力（包括但不限于自然灾害、战争、罢工、政府行为、网络故障、系统故障等）导致的服务中断或用户损失不承担责任。</p>
              <p><strong>10.2 第三方原因：</strong>因第三方支付机构、银行、电信运营商等第三方原因导致的服务中断或损失，本公司不承担责任。</p>
              <p><strong>10.3 用户原因：</strong>因用户自身原因（包括但不限于操作失误、账户信息泄露、密码丢失等）导致的损失，本公司不承担责任。</p>
              <p><strong>10.4 责任上限：</strong>本公司的责任上限不超过用户因使用本服务而支付的实际费用总额。</p>
            </div>
          </div>

          {/* 第十一条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第十一条 知识产权</h2>
            <p className="mb-2">
              本服务涉及的所有知识产权（包括但不限于商标、专利、著作权等）均归本公司或相关权利人所有。未经许可，用户不得使用、复制、传播或进行其他侵犯知识产权的行为。
            </p>
          </div>

          {/* 第十二条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第十二条 隐私保护</h2>
            <p className="mb-2">
              本公司将按照《隐私政策》的规定保护用户的个人信息和支付信息。用户使用本服务即表示同意本公司的隐私政策。
            </p>
          </div>

          {/* 第十三条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第十三条 协议修改</h2>
            <div className="space-y-2">
              <p><strong>13.1 修改权利：</strong>本公司有权根据需要修改本协议，修改后的协议将在平台公告或以其他方式通知用户。</p>
              <p><strong>13.2 继续使用：</strong>如用户不同意修改后的协议，应停止使用本服务；如用户继续使用本服务，则视为同意修改后的协议。</p>
            </div>
          </div>

          {/* 第十四条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第十四条 法律适用与争议解决</h2>
            <div className="space-y-2">
              <p><strong>14.1 法律适用：</strong>本协议的订立、生效、解释、履行和争议解决均适用中华人民共和国大陆地区法律法规。</p>
              <p><strong>14.2 争议解决：</strong>因本协议引起的争议，双方应友好协商解决；协商不成的，任何一方均可向本公司所在地有管辖权的人民法院提起诉讼。</p>
            </div>
          </div>

          {/* 第十五条 */}
          <div>
            <h2 className="text-xl font-semibold text-purple-600 mb-3">第十五条 其他</h2>
            <div className="space-y-2">
              <p><strong>15.1 协议生效：</strong>本协议自用户同意并使用本公司支付服务之日起生效。</p>
              <p><strong>15.2 可分割性：</strong>如本协议的任何条款被认定为无效或不可执行，不影响其他条款的效力。</p>
              <p><strong>15.3 完整协议：</strong>本协议构成双方就支付服务达成的完整协议，取代双方此前就同一事项达成的任何口头或书面协议。</p>
              <p><strong>15.4 联系方式：</strong>如您对本协议有任何疑问，可通过以下方式联系我们：</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>商务合作微信：JuBianShiDai_Ai</li>
                <li>企业定价&商务合作：请联系商务微信</li>
              </ul>
            </div>
          </div>

          {/* 签署确认 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              本协议最终解释权归剧变时代（母公司：聚赢传媒）所有
            </p>
          </div>
        </div>

        {/* 返回按钮 */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/credit-recharge')}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            返回充值页面
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaymentServiceAgreement

