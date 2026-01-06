import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

function UserAgreement() {
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

        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">用户协议</h1>

        <div className="prose max-w-none text-gray-700 space-y-6">
          <div>
            <p className="text-sm text-gray-500 mb-4">
              生效日期：2024年1月1日<br />
              最后更新：2024年1月1日
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">一、协议的范围</h2>
            <p className="mb-4">
              1.1 本协议是您与剧变时代AI（以下简称"我们"或"本平台"）之间关于您使用剧变时代AI服务所订立的协议。
            </p>
            <p className="mb-4">
              1.2 本协议描述您与我们之间关于"服务"使用的权利义务。"服务"是指由聚赢传媒有限公司（以下简称"母公司"）及其关联公司提供的剧变时代AI服务，包括但不限于剧变时代AI网站、客户端以及相关服务。
            </p>
            <p className="mb-4">
              1.3 本协议内容同时包括《隐私政策》，且您在使用我们某一特定服务时，该服务可能会另有单独的协议、相关业务规则等（以下统称为"单独协议"）。上述内容一经正式发布，即为本协议不可分割的组成部分，您同样应当遵守。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">二、关于本服务</h2>
            <p className="mb-4">
              2.1 本服务的内容
            </p>
            <p className="mb-4 ml-4">
              本服务内容是指剧变时代AI向用户提供的AI驱动的短剧创作工具及垂直社区交流平台（以下简称"本服务"），包括但不限于：
            </p>
            <ul className="list-disc ml-8 mb-4 space-y-2">
              <li>AI辅助剧本创作工具</li>
              <li>视频生成与编辑功能</li>
              <li>角色与场景管理</li>
              <li>作品展示与社区交流</li>
              <li>其他相关服务</li>
            </ul>
            <p className="mb-4">
              2.2 本服务的形式
            </p>
            <p className="mb-4 ml-4">
              您可能通过计算机、手机等终端以客户端、网页等形式使用本服务，具体以我们实际提供的为准。我们会根据实际情况选择提供或终止提供上述某种形式，并不断丰富您使用本服务的终端、形式等。
            </p>
            <p className="mb-4">
              2.3 本服务许可的范围
            </p>
            <p className="mb-4 ml-4">
              2.3.1 我们给予您一项个人的、不可转让及非排他性的许可，以使用本服务。您可以为非商业目的在单一台终端设备上安装、使用、显示、运行本服务。
            </p>
            <p className="mb-4 ml-4">
              2.3.2 您可以为使用本服务及服务内容的目的复制本服务的一个副本，仅用作备份。备份副本必须包含原软件中含有的所有著作权信息。
            </p>
            <p className="mb-4 ml-4">
              2.3.3 本条及本协议其他条款未明示授权的其他一切权利仍由我们保留，您在行使这些权利时须另外取得我们的书面许可。我们如果未行使前述任何权利，并不构成对该权利的放弃。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">三、用户的账号</h2>
            <p className="mb-4">
              3.1 您在使用本服务前需要注册一个账号。账号应当使用手机号码绑定注册，请您使用尚未与剧变时代AI账号绑定的手机号码，以及未被剧变时代AI根据本协议封禁的手机号码注册剧变时代AI账号。剧变时代AI可以根据用户需求或产品需要对账号注册和绑定的方式进行变更，而无须事先通知您。
            </p>
            <p className="mb-4">
              3.2 剧变时代AI账号的所有权归剧变时代AI公司所有，用户完成申请注册手续后，仅获得剧变时代AI账号的使用权，且该使用权仅属于初始申请注册人，禁止赠与、借用、租用、转让或售卖。剧变时代AI因经营需要，有权回收用户的剧变时代AI账号。
            </p>
            <p className="mb-4">
              3.3 用户应当妥善保管账号信息及账号密码的安全，用户需要对注册账号以及密码下的行为承担法律责任。用户同意在任何情况下不向他人透露账号及密码信息。当在您怀疑他人在使用您的账号时，您应立即通知剧变时代AI公司。
            </p>
            <p className="mb-4">
              3.4 用户注册剧变时代AI账号后如果长期不登录该账号，剧变时代AI有权回收该账号，以免造成资源浪费，由此带来的任何损失均由用户自行承担。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">四、用户行为规范</h2>
            <p className="mb-4">
              4.1 用户在使用本服务时，必须遵守以下原则：
            </p>
            <ul className="list-disc ml-8 mb-4 space-y-2">
              <li>遵守中华人民共和国相关法律法规</li>
              <li>遵守所有与网络服务有关的网络协议、规定和程序</li>
              <li>不得为任何非法目的而使用本服务</li>
              <li>不得以任何形式使用本服务侵犯剧变时代AI的商业利益</li>
              <li>不得利用本服务进行任何可能对互联网正常运转造成不利影响的行为</li>
              <li>不得利用本服务上传、展示、传播任何虚假、骚扰性、中伤他人、辱骂性、恐吓性、庸俗淫秽或其他任何非法的信息资料</li>
              <li>不得侵犯其他任何第三方的专利权、著作权、商标权、名誉权或其他任何合法权益</li>
            </ul>
            <p className="mb-4">
              4.2 用户不得利用本服务制作、上载、复制、发布、传播或者转载如下内容：
            </p>
            <ul className="list-disc ml-8 mb-4 space-y-2">
              <li>反对宪法所确定的基本原则的</li>
              <li>危害国家安全，泄露国家秘密，颠覆国家政权，破坏国家统一的</li>
              <li>损害国家荣誉和利益的</li>
              <li>煽动民族仇恨、民族歧视，破坏民族团结的</li>
              <li>破坏国家宗教政策，宣扬邪教和封建迷信的</li>
              <li>散布谣言，扰乱社会秩序，破坏社会稳定的</li>
              <li>散布淫秽、色情、赌博、暴力、凶杀、恐怖或者教唆犯罪的</li>
              <li>侮辱或者诽谤他人，侵害他人合法权益的</li>
              <li>含有法律、行政法规禁止的其他内容的信息</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">五、知识产权声明</h2>
            <p className="mb-4">
              5.1 剧变时代AI是本服务的知识产权权利人。本服务的一切著作权、商标权、专利权、商业秘密等知识产权，以及与本服务相关的所有信息内容（包括但不限于文字、图片、音频、视频、图表、界面设计、版面框架、有关数据或电子文档等）均受中华人民共和国法律法规和相应的国际条约保护，剧变时代AI享有上述知识产权。
            </p>
            <p className="mb-4">
              5.2 未经剧变时代AI书面同意，您不得为任何营利性或非营利性的目的自行实施、利用、转让上述知识产权，剧变时代AI保留追究上述未经许可行为的权利。
            </p>
            <p className="mb-4">
              5.3 用户在本服务中创作的内容，其知识产权归用户所有。用户同意授予剧变时代AI及其关联公司对用户创作内容的使用权，包括但不限于展示、推广、分析等用途。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">六、隐私保护</h2>
            <p className="mb-4">
              6.1 保护用户隐私是剧变时代AI的一项基本政策，剧变时代AI保证不对外公开或向第三方提供单个用户的注册资料及用户在使用网络服务时存储在剧变时代AI的非公开内容，但下列情况除外：
            </p>
            <ul className="list-disc ml-8 mb-4 space-y-2">
              <li>事先获得用户的明确授权</li>
              <li>根据有关的法律法规要求</li>
              <li>按照相关政府主管部门的要求</li>
              <li>为维护社会公众的利益</li>
              <li>为维护剧变时代AI的合法权益</li>
            </ul>
            <p className="mb-4">
              6.2 剧变时代AI可能会与第三方合作向用户提供相关的网络服务，在此情况下，如该第三方同意承担与剧变时代AI同等的保护用户隐私的责任，则剧变时代AI可将用户的注册资料等提供给该第三方。
            </p>
            <p className="mb-4">
              6.3 在不透露单个用户隐私资料的前提下，剧变时代AI有权对整个用户数据库进行分析并对用户数据库进行商业上的利用。
            </p>
            <p className="mb-4">
              6.4 更多隐私保护相关内容，请参见《隐私政策》。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">七、免责声明</h2>
            <p className="mb-4">
              7.1 用户明确同意其使用剧变时代AI服务所存在的风险完全由其自己承担；因其使用剧变时代AI服务而产生的一切后果也由其自己承担，剧变时代AI对用户不承担任何责任。
            </p>
            <p className="mb-4">
              7.2 剧变时代AI不担保网络服务一定能满足用户的要求，也不担保网络服务不会中断，对网络服务的及时性、安全性、准确性也都不作担保。
            </p>
            <p className="mb-4">
              7.3 剧变时代AI不保证为向用户提供便利而设置的外部链接的准确性和完整性，同时，对于该等外部链接指向的不由剧变时代AI实际控制的任何网页上的内容，剧变时代AI不承担任何责任。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">八、协议修改</h2>
            <p className="mb-4">
              8.1 剧变时代AI有权在必要时修改本协议条款。协议条款一旦发生变动，将会在相关页面上提示修改内容。
            </p>
            <p className="mb-4">
              8.2 如果不同意剧变时代AI对本协议相关条款所做的修改，用户有权停止使用网络服务。如果用户继续使用网络服务，则视为用户接受剧变时代AI对本协议相关条款所做的修改。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">九、法律适用、管辖与其他</h2>
            <p className="mb-4">
              9.1 本协议的订立、执行和解释及争议的解决均应适用中华人民共和国法律。
            </p>
            <p className="mb-4">
              9.2 如双方就本协议内容或其执行发生任何争议，双方应尽量友好协商解决；协商不成时，任何一方均可向剧变时代AI所在地的人民法院提起诉讼。
            </p>
            <p className="mb-4">
              9.3 剧变时代AI未行使或执行本协议任何权利或规定，不构成对前述权利或权利之放弃。
            </p>
            <p className="mb-4">
              9.4 如本协议中的任何条款无论因何种原因完全或部分无效或不具有执行力，本协议的其余条款仍应有效并且有约束力。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">十、联系我们</h2>
            <p className="mb-4">
              如果您对本协议有任何疑问、意见或建议，可以通过以下方式联系我们：
            </p>
            <p className="mb-4">
              公司名称：聚赢传媒有限公司<br />
              产品名称：剧变时代AI<br />
              邮箱：support@jubianshidai.com<br />
              地址：中国
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default UserAgreement

