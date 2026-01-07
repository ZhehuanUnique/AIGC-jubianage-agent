import { useState, useEffect } from 'react'
import SidebarNavigation from '../components/SidebarNavigation'
import { Users, TrendingUp, Plus, Trash2, Loader2 } from 'lucide-react'
import { UserApi, type User, type ConsumptionRanking } from '../services/userApi'
import DailyConsumptionChart from '../components/DailyConsumptionChart'
import UserLogsModal from '../components/UserLogsModal'
import GroupManagement from '../components/GroupManagement'
import { AuthService } from '../services/auth'
import { alert, alertError, alertWarning } from '../utils/alert'
import HamsterLoader from '../components/HamsterLoader'

function Analytics() {
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'consumption'>('users')
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null)
  
  // 检查当前用户是否为超级管理员
  const isSuperAdmin = currentUser?.username === 'Chiefavefan'
  // 检查当前用户是否为管理员（超级管理员或高级管理员）
  const isAdmin = currentUser?.username === 'Chiefavefan' || currentUser?.username === 'jubian888'
  
  // 用户管理状态
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  
  // 消耗统计状态
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [ranking, setRanking] = useState<ConsumptionRanking[]>([])
  const [loadingRanking, setLoadingRanking] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedUsername, setSelectedUsername] = useState<string>('')
  const [showRealCost, setShowRealCost] = useState(false) // 是否显示真实成本
  const [showLogsModal, setShowLogsModal] = useState(false)
  
  // 删除确认弹窗状态
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null)
  const [deleteUsername, setDeleteUsername] = useState<string>('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  // 获取当前用户信息
  useEffect(() => {
    const user = AuthService.getCurrentUser()
    setCurrentUser(user)
  }, [])

  // 加载用户列表
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers()
    }
  }, [activeTab])

  // 加载消耗排名
  useEffect(() => {
    if (activeTab === 'consumption') {
      loadRanking()
    }
  }, [activeTab, startDate, endDate, showRealCost])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const userList = await UserApi.getAllUsers()
      // 隐藏超级管理员（Chiefavefan）
      const filteredUsers = userList.filter(user => user.username !== 'Chiefavefan')
      setUsers(filteredUsers)
    } catch (error) {
      console.error('加载用户列表失败:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadRanking = async () => {
    setLoadingRanking(true)
    try {
      const rankingData = await UserApi.getConsumptionRanking(startDate, endDate, showRealCost)
      setRanking(rankingData)
    } catch (error) {
      console.error('加载消耗排名失败:', error)
    } finally {
      setLoadingRanking(false)
    }
  }

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword) {
      alert('请输入用户名和密码', 'warning')
      return
    }
    try {
      await UserApi.createUser(newUsername, newPassword, newDisplayName || undefined)
      setNewUsername('')
      setNewPassword('')
      setNewDisplayName('')
      setShowUserModal(false)
      loadUsers()
    } catch (error: any) {
      alertError(error.message || '创建用户失败')
    }
  }

  // 检查是否可以删除用户
  const canDeleteUser = (user: User): boolean => {
    // 超级管理员可以删除所有用户（除了自己）
    if (isSuperAdmin) {
      return user.username !== 'Chiefavefan'
    }
    
    // 高级管理员只能删除普通用户，不能删除其他管理员
    if (isAdmin) {
      // 不能删除超级管理员
      if (user.username === 'Chiefavefan') {
        return false
      }
      // 不能删除高级管理员
      if (user.username === 'jubian888') {
        return false
      }
      // 可以删除普通用户
      return true
    }
    
    // 普通用户不能删除任何人
    return false
  }

  const handleDeleteClick = (user: User) => {
    // 检查权限
    if (!canDeleteUser(user)) {
      alertWarning('您没有权限删除该用户')
      return
    }
    
    // 打开删除确认弹窗
    setDeleteUserId(user.id)
    setDeleteUsername(user.username)
    setDeletePassword('')
    setShowDeleteModal(true)
  }

  const handleDeleteUser = async () => {
    if (!deleteUserId || !deletePassword) {
      alert('请输入密码', 'warning')
      return
    }

    setDeleting(true)
    try {
      await UserApi.deleteUser(deleteUserId, deletePassword)
      setShowDeleteModal(false)
      setDeleteUserId(null)
      setDeleteUsername('')
      setDeletePassword('')
      loadUsers()
      alert('用户已删除', 'success')
    } catch (error: any) {
      // 输错密码不显示具体错误信息
      alertError('删除用户失败')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleUserStatus = async (user: User) => {
    if (!isSuperAdmin) {
      alertWarning('只有超级管理员可以修改用户状态')
      return
    }
    try {
      await UserApi.updateUser(user.id, { isActive: !user.isActive })
      loadUsers()
    } catch (error: any) {
      alertError(error.message || '更新用户状态失败')
    }
  }

  // 格式化日期为 YYYY/MM/DD
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return '2025/12/28' // 默认日期
    }
    try {
      const date = new Date(dateString)
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        return '2025/12/28' // 如果日期无效，返回默认日期
      }
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}/${month}/${day}`
    } catch {
      return '2025/12/28' // 默认日期
    }
  }

  const handleViewLogs = (userId: number, username: string) => {
    setSelectedUserId(userId)
    setSelectedUsername(username)
    setShowLogsModal(true)
  }

  const colors = ['bg-blue-500', 'bg-pink-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500']

  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <SidebarNavigation activeTab="analytics" />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold">数据分析</h2>
        </div>
        <div className="flex-1 p-6">
          {/* 标签页 */}
          <div className="flex gap-4 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users size={18} />
              用户管理
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('groups')}
                className={`px-4 py-2 flex items-center gap-2 ${
                  activeTab === 'groups'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users size={18} />
                小组管理
              </button>
            )}
            <button
              onClick={() => setActiveTab('consumption')}
              className={`px-4 py-2 flex items-center gap-2 ${
                activeTab === 'consumption'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp size={18} />
              消耗统计
            </button>
          </div>

          {/* 小组管理 */}
          {activeTab === 'groups' && isAdmin && (
            <GroupManagement
              users={users}
              onUpdate={() => {
                // 可以在这里刷新用户列表或其他数据
              }}
            />
          )}

          {/* 用户管理 */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">用户管理</h3>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setNewUsername('')
                      setNewPassword('')
                      setNewDisplayName('')
                      setShowUserModal(true)
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Plus size={18} />
                    新建用户
                  </button>
                )}
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <HamsterLoader size={10} />
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-white border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">用户名</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">显示名称</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">状态</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">创建时间</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-100">
                          <td className="px-4 py-3 text-sm">{user.id}</td>
                          <td className="px-4 py-3 text-sm">{user.username}</td>
                          <td className="px-4 py-3 text-sm">{user.displayName}</td>
                          <td className="px-4 py-3 text-sm">
                            {isSuperAdmin ? (
                              <button
                                onClick={() => handleToggleUserStatus(user)}
                                className={`px-2 py-1 rounded text-xs transition-colors ${
                                  user.isActive 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                              >
                                {user.isActive ? '正常' : '禁用'}
                              </button>
                            ) : (
                              <span className={`px-2 py-1 rounded text-xs ${
                                user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {user.isActive ? '正常' : '禁用'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {canDeleteUser(user) ? (
                                <button
                                  onClick={() => handleDeleteClick(user)}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
                                >
                                  <Trash2 size={14} />
                                  删除
                                </button>
                              ) : (
                                <span className="px-3 py-1 bg-gray-300 text-gray-500 rounded text-sm flex items-center gap-1 cursor-not-allowed">
                                  <Trash2 size={14} />
                                  删除
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 消耗统计 */}
          {activeTab === 'consumption' && (
            <div className="space-y-6">
              {/* 日期选择和管理员切换按钮 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">开始日期:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">结束日期:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                {/* 管理员查看真实开销按钮 */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowRealCost(!showRealCost)
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      showRealCost
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {showRealCost ? '显示积分' : '查看真实开销'}
                  </button>
                )}
              </div>

              {/* 每日消耗趋势 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">每日消耗趋势</h3>
                <DailyConsumptionChart startDate={startDate} endDate={endDate} />
              </div>

              {/* 成员消耗排名 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">成员消耗排名</h3>
                {loadingRanking ? (
                  <div className="flex items-center justify-center py-8">
                    <HamsterLoader size={10} />
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-white border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">排名</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">用户</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            {showRealCost ? '总消耗(元)' : '总消耗(积分)'}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranking.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              暂无数据
                            </td>
                          </tr>
                        ) : (
                          ranking.map((item, index) => (
                            <tr key={item.userId} className="border-b border-gray-200 hover:bg-gray-100">
                              <td className="px-4 py-3 text-sm">{item.rank}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-full ${colors[index % colors.length]} flex items-center justify-center text-white text-xs`}>
                                    {item.displayName[0] || item.username[0]}
                                  </div>
                                  <span className="text-sm">{item.displayName || item.username}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {showRealCost 
                                  ? `¥${item.totalConsumption.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
                                  : `${item.totalConsumption.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 积分`
                                }
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleViewLogs(item.userId, item.displayName || item.username)}
                                  className="px-4 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                  查看
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 新建用户模态框 */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowUserModal(false)}>
          <div
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4">新建用户</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="请输入用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="请输入密码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  显示名称
                </label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="请输入显示名称（可选）"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 操作日志模态框 */}
      {showLogsModal && selectedUserId && (
        <UserLogsModal
          isOpen={showLogsModal}
          onClose={() => {
            setShowLogsModal(false)
            setSelectedUserId(null)
            setSelectedUsername('')
          }}
          userId={selectedUserId}
          username={selectedUsername}
        />
      )}

      {/* 删除确认模态框 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4 text-red-600">删除用户</h3>
            <div className="mb-4">
              <p className="text-gray-700 mb-2">确定要删除用户 <span className="font-semibold">{deleteUsername}</span> 吗？</p>
              <p className="text-sm text-gray-500">此操作不可恢复，请谨慎操作。</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  请输入密码确认 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="请输入您的密码"
                  disabled={deleting}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !deleting && deletePassword) {
                      handleDeleteUser()
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteUserId(null)
                    setDeleteUsername('')
                    setDeletePassword('')
                  }}
                  disabled={deleting}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleting || !deletePassword}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <HamsterLoader size={3} />
                      <span>删除中...</span>
                    </>
                  ) : (
                    '确认删除'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Analytics
