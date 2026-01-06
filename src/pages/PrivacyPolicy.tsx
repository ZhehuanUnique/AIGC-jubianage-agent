import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

function PrivacyPolicy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          <span>返回</span>
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">隐私政策</h1>

        <div className="prose max-w-none text-gray-700 space-y-6">
          <div>
            <p className="text-sm text-gray-500 mb-4">
              生效日期：2024年1月1日<br />
              最后更新：2024年1月1日
            </p>
            <p className="mb-4">
              聚赢传媒有限公司（以下简称"我们"或"公司"）非常重视用户的隐私保护，因此制定了本《隐私政策》（以下简称"本政策"）。本政策适用于剧变时代AI（以下简称"本产品"或"本服务"）提供的所有服务。
            </p>
            <p className="mb-4">
              在使用本产品前，请您务必仔细阅读并充分理解本政策，特别是以粗体/粗体下划线标识的条款，您应重点阅读，在确认充分理解并同意后使用相关服务。如果您不同意本政策的内容，将可能导致本产品无法正常运行，或者无法达到我们拟达到的服务效果，您应当立即停止访问/使用本产品。
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">一、我们如何收集和使用您的个人信息</h2>
            <p className="mb-4">
              我们会出于本政策所述的以下目的，收集和使用您的个人信息：
            </p>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-4">1.1 帮助您完成注册及登录</h3>
            <p className="mb-4">
              为便于我们为您提供服务，您需要提供基本注册或登录信息，包括手机号码、电子邮箱地址，并创建您的账号、用户名和密码。
            </p>
            <p className="mb-4">
              在部分单项服务中，如果您仅需使用浏览、搜索等基本服务，您不需要注册成为我们的用户及提供上述信息。
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-4">1.2 向您提供产品和服务</h3>
            <p className="mb-4">
              1.2.1 您向我们提供的信息
            </p>
            <p className="mb-4 ml-4">
              为使用或更好地使用我们的产品和服务，您可能还需要提供其他信息，例如：您创建的项目信息、上传的素材、创作的内容等。
            </p>
            <p className="mb-4">
              1.2.2 我们在您使用服务过程中收集的信息
            </p>
            <p className="mb-4 ml-4">
              为向您提供更契合您需求的页面展示和搜索结果、了解产品适配性、识别账号异常状态，我们会收集关于您使用的服务以及使用方式的信息并将这些信息进行关联，这些信息包括：
            </p>
            <ul className="list-disc ml-8 mb-4 space-y-2">
              <li>设备信息：我们会根据您在软件安装及使用中授予的具体权限，接收并记录您所使用的设备相关信息（例如设备型号、操作系统版本、设备设置、唯一设备标识符等软硬件特征信息）、设备所在位置相关信息（例如IP地址、GPS位置以及能够提供相关信息的Wi-Fi接入点、蓝牙和基站等传感器信息）。</li>
              <li>日志信息：当您使用我们的网站或客户端提供的服务时，我们会自动收集您对我们服务的详细使用情况，作为有关网络日志保存。例如您的搜索查询内容、IP地址、浏览器的类型、电信运营商、使用的语言、访问日期和时间及您访问的网页记录等。</li>
              <li>位置信息：当您使用与位置有关的服务时，我们可能会记录您设备所在的位置信息，以便为您提供相关服务。</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-4">1.3 为您提供安全保障</h3>
            <p className="mb-4">
              为提高您使用我们及我们关联公司、合作伙伴提供服务的安全性，保护您或其他用户或公众的人身财产安全免遭侵害，更好地预防钓鱼网站、欺诈、网络漏洞、计算机病毒、网络攻击、网络侵入等安全风险，更准确地识别违反法律法规或剧变时代AI相关协议规则的情况，我们可能使用或整合您的用户信息、设备信息、有关网络日志以及我们关联公司、合作伙伴取得您授权或依据法律共享的信息，来综合判断您账号及交易风险、进行身份验证、检测及防范安全事件，并依法采取必要的记录、审计、分析、处置措施。
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-4">1.4 其他用途</h3>
            <p className="mb-4">
              我们将信息用于本政策未载明的其他用途，或者将基于特定目的收集而来的信息用于其他目的时，会事先征求您的同意。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">二、我们如何使用Cookie和同类技术</h2>
            <p className="mb-4">
              2.1 Cookie
            </p>
            <p className="mb-4 ml-4">
              为确保产品正常运转、为您获得更轻松的访问体验、向您推荐您可能感兴趣的内容，我们会在您的计算机或移动设备上存储名为Cookie的小数据文件。Cookie通常包含标识符、站点名称以及一些号码和字符。借助于Cookie，网站能够存储您的偏好或购物车内的商品等数据。
            </p>
            <p className="mb-4">
              2.2 网站信标和像素标签
            </p>
            <p className="mb-4 ml-4">
              除Cookie外，我们还会在网站上使用网站信标和像素标签等其他同类技术。例如，我们向您发送的电子邮件可能含有链接至我们网站内容的地址链接，如果您点击该链接，我们则会跟踪此次点击，帮助我们了解您的产品或服务偏好，以便于我们主动改善客户服务体验。网站信标通常是一种嵌入到网站或电子邮件中的透明图像。借助于电子邮件中的像素标签，我们能够获知电子邮件是否被打开。如果您不希望自己的活动以这种方式被追踪，则可以随时从我们的寄信名单中退订。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">三、我们如何共享、转让、公开披露您的个人信息</h2>
            <p className="mb-4">
              3.1 共享
            </p>
            <p className="mb-4">
              我们不会与剧变时代AI服务提供者以外的公司、组织和个人共享您的个人信息，但以下情况除外：
            </p>
            <ul className="list-disc ml-8 mb-4 space-y-2">
              <li>在获取明确同意的情况下共享：获得您的明确同意后，我们会与其他方共享您的个人信息。</li>
              <li>在法定情形下的共享：我们可能会根据法律法规规定、诉讼争议解决需要，或按行政、司法机关依法提出的要求，对外共享您的个人信息。</li>
              <li>与授权合作伙伴共享：仅为实现本政策中声明的目的，我们的某些服务将由授权合作伙伴提供。我们可能会与合作伙伴共享您的某些个人信息，以提供更好的客户服务和用户体验。我们仅会出于合法、正当、必要、特定、明确的目的共享您的个人信息，并且只会共享提供服务所必要的个人信息。</li>
            </ul>
            <p className="mb-4">
              3.2 转让
            </p>
            <p className="mb-4">
              我们不会将您的个人信息转让给任何公司、组织和个人，但以下情况除外：
            </p>
            <ul className="list-disc ml-8 mb-4 space-y-2">
              <li>在获取明确同意的情况下转让：获得您的明确同意后，我们会向其他方转让您的个人信息。</li>
              <li>在涉及合并、收购或破产清算时，如涉及到个人信息转让，我们会在要求新的持有您个人信息的公司、组织继续受本政策的约束，否则我们将要求该公司、组织重新向您征求授权同意。</li>
            </ul>
            <p className="mb-4">
              3.3 公开披露
            </p>
            <p className="mb-4">
              我们仅会在以下情况下，公开披露您的个人信息：
            </p>
            <ul className="list-disc ml-8 mb-4 space-y-2">
              <li>获得您明确同意后</li>
              <li>基于法律的披露：在法律、法律程序、诉讼或政府主管部门强制性要求的情况下，我们可能会公开披露您的个人信息</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">四、我们如何保护您的个人信息</h2>
            <p className="mb-4">
              4.1 我们已使用符合业界标准的安全防护措施保护您提供的个人信息，防止数据遭到未经授权访问、公开披露、使用、修改、损坏或丢失。我们会采取一切合理可行的措施，保护您的个人信息。
            </p>
            <p className="mb-4">
              4.2 我们会采取一切合理可行的措施，确保未收集无关的个人信息。我们只会在达成本政策所述目的所需的期限内保留您的个人信息，除非需要延长保留期或受到法律的允许。
            </p>
            <p className="mb-4">
              4.3 互联网并非绝对安全的环境，而且电子邮件、即时通讯、及与其他用户的交流方式并未加密，我们强烈建议您不要通过此类方式发送个人信息。请使用复杂密码，协助我们保证您的账号安全。
            </p>
            <p className="mb-4">
              4.4 互联网环境并非百分之百安全，我们将尽力确保或担保您发送给我们的任何信息的安全性。如果我们的物理、技术、或管理防护设施遭到破坏，导致信息被非授权访问、公开披露、篡改、或毁坏，导致您的合法权益受损，我们将承担相应的法律责任。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">五、您的权利</h2>
            <p className="mb-4">
              按照中国相关的法律、法规、标准，以及其他国家、地区的通行做法，我们保障您对自己的个人信息行使以下权利：
            </p>
            <p className="mb-4">
              <strong>5.1 访问您的个人信息</strong>
            </p>
            <p className="mb-4 ml-4">
              您有权访问您的个人信息，法律法规规定的例外情况除外。
            </p>
            <p className="mb-4">
              <strong>5.2 更正您的个人信息</strong>
            </p>
            <p className="mb-4 ml-4">
              当您发现我们处理的关于您的个人信息有错误时，您有权要求我们做出更正。
            </p>
            <p className="mb-4">
              <strong>5.3 删除您的个人信息</strong>
            </p>
            <p className="mb-4 ml-4">
              在以下情形中，您可以向我们提出删除个人信息的请求：
            </p>
            <ul className="list-disc ml-8 mb-4 space-y-2">
              <li>如果我们处理个人信息的行为违反法律法规</li>
              <li>如果我们收集、使用您的个人信息，却未征得您的同意</li>
              <li>如果我们处理个人信息的行为违反了与您的约定</li>
              <li>如果您不再使用我们的产品或服务，或您注销了账号</li>
              <li>如果我们不再为您提供产品或服务</li>
            </ul>
            <p className="mb-4">
              <strong>5.4 改变您授权同意的范围</strong>
            </p>
            <p className="mb-4 ml-4">
              每个业务功能需要一些基本的个人信息才能得以完成。对于额外收集的个人信息的收集和使用，您可以随时给予或收回您的授权同意。
            </p>
            <p className="mb-4">
              <strong>5.5 个人信息主体注销账户</strong>
            </p>
            <p className="mb-4 ml-4">
              您随时可注销此前注册的账户。在注销账户之后，我们将停止为您提供产品或服务，并依据您的要求，删除您的个人信息，法律法规另有规定的除外。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">六、我们如何处理儿童的个人信息</h2>
            <p className="mb-4">
              我们的产品、网站和服务主要面向成人。如果没有父母或监护人的同意，儿童不得创建自己的用户账户。
            </p>
            <p className="mb-4">
              对于经父母同意而收集儿童个人信息的情况，我们只会在受到法律允许、父母或监护人明确同意或者保护儿童所必要的情况下使用或公开披露此信息。
            </p>
            <p className="mb-4">
              如果我们发现自己在未事先获得可证实的父母同意的情况下收集了儿童的个人信息，则会设法尽快删除相关数据。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">七、您的个人信息如何在全球范围转移</h2>
            <p className="mb-4">
              原则上，我们在中华人民共和国境内收集和产生的个人信息，将存储在中华人民共和国境内。
            </p>
            <p className="mb-4">
              由于我们通过遍布全球的资源和服务器提供产品或服务，这意味着，在获得您的授权同意后，您的个人信息可能会被转移到您使用产品或服务所在国家/地区的境外管辖区，或者受到来自这些管辖区的访问。
            </p>
            <p className="mb-4">
              此类管辖区可能设有不同的数据保护法，甚至未设立相关法律。在此类情况下，我们会确保您的个人信息得到在中华人民共和国境内足够同等的保护。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">八、本政策如何更新</h2>
            <p className="mb-4">
              我们可能适时会对本政策进行调整或变更，本政策的任何更新将以标注更新时间的方式公布在我们的网站上，除法律法规或监管规定另有强制性规定外，经调整或变更的内容一经通知或公布后的7日后生效。
            </p>
            <p className="mb-4">
              如您在政策调整或变更后继续使用我们提供的任一服务或访问我们相关网站的，我们相信这代表您已充分阅读、理解并接受修改后的政策并受其约束。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">九、如何联系我们</h2>
            <p className="mb-4">
              如果您对本政策有任何疑问、意见或建议，通过以下方式与我们联系：
            </p>
            <p className="mb-4">
              公司名称：聚赢传媒有限公司<br />
              产品名称：剧变时代AI<br />
              邮箱：privacy@jubianshidai.com<br />
              地址：中国
            </p>
            <p className="mb-4">
              我们将在15个工作日内回复您的请求。
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy

