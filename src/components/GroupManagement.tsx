import { useState, useEffect } from 'react'
import { X, Plus, Users, Trash2, UserPlus, Loader2, Edit2, Key, Eye, EyeOff } from 'lucide-react'
import { alertSuccess, alertError } from '../utils/alert'
import { AuthService } from '../services/auth'

interface Group {
  id: number
  name: string
  description?: string
  created_by?: number
  creator_username?: string
  member_count?: number
  created_at?: string
  share_password?: string
}

interface GroupMember {
  user_id: number
  username: string
  display_name?: string
  role: string
  joined_at: string
}

interface User {
  id: number
  username: string
  display_name?: string
}

interface GroupManagementProps {
  users: User[]
  onUpdate?: () => void
}

function GroupManagement({ users, onUpdate }: GroupManagementProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null)
  
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupDescription, setEditGroupDescription] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  
  // 密码管理状态
  const [sharePassword, setSharePassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // 检查是否是管理员
  const isAdmin = currentUser?.username === 'Chiefavefan' || currentUser?.username === 'jubian888'

  // 生产环境使用相对路径，开发环境使用完整URL
  const API_BASE_URL = (() => {
    if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
    const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
    return isProduction ? '' : 'http://localhost:3002'
  })()

  // 获取 token
  const getToken = () => {
    return localStorage.getItem('auth_token') || ''
  }

  // 加载小组列表
  const loadGroups = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      })
      const result = await response.json()
      if (result.success) {
        setGroups(result.data || [])
      }
    } catch (error) {
      console.error('加载小组列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 加载小组成员
  const loadGroupMembers = async (groupId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      })
      const result = await response.json()
      if (result.success && result.data.members) {
        setGroupMembers(result.data.members)
      }
    } catch (error) {
      console.error('加载小组成员失败:', error)
    }
  }

  // 检查当前用户是否是小组组长
  const isGroupLeader = (group: Group): boolean => {
    if (!currentUser) return false
    // 管理员可以管理所有小组
    if (isAdmin) return true
    // 检查是否是组长（通过成员列表中的 role 判断）
    const member = groupMembers.find(m => m.username === currentUser.username)
    return member?.role === 'leader'
  }

  // 加载小组共享密码
  const loadGroupPassword = async (groupId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/share-password`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      })
      const result = await response.json()
      if (result.success) {
        setSharePassword(result.data?.password || '')
      }
    } catch (error) {
      console.error('加载小组密码失败:', error)
    }
  }

  // 保存小组共享密码
  const handleSavePassword = async () => {
    if (!selectedGroup) return
    
    setSavingPassword(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${selectedGroup.id}/share-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ password: sharePassword }),
      })
      
      const result = await response.json()
      if (result.success) {
        alertSuccess('共享密码已保存！')
        setShowPasswordModal(false)
      } else {
        alertError(result.error || '保存失败')
      }
    } catch (error) {
      console.error('保存密码失败:', error)
      alertError('保存失败，请稍后重试')
    } finally {
      setSavingPassword(false)
    }
  }

  // 打开密码管理弹窗
  const handleManagePassword = async (group: Group) => {
    setSelectedGroup(group)
    await loadGroupMembers(group.id)
    await loadGroupPassword(group.id)
    setShowPasswordModal(true)
  }

  useEffect(() => {
    loadGroups()
    // 获取当前用户信息
    const user = AuthService.getCurrentUser()
    if (user) {
      setCurrentUser({ username: user.username })
    }
  }, [])

  // 创建小组
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      alert('请输入小组名称')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || undefined,
        }),
      })

      const result = await response.json()
      if (result.success) {
        alertSuccess('小组创建成功！')
        setShowCreateModal(false)
        setNewGroupName('')
        setNewGroupDescription('')
        loadGroups()
        if (onUpdate) onUpdate()
      } else {
        alertError(`创建失败: ${result.error}`)
      }
    } catch (error) {
      console.error('创建小组失败:', error)
      alertError('创建小组失败，请稍后重试')
    }
  }

  // 添加用户到小组
  const handleAddMember = async () => {
    if (!selectedGroup || !selectedUserId) {
      alert('请选择小组和用户')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${selectedGroup.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          userId: selectedUserId,
        }),
      })

      const result = await response.json()
      if (result.success) {
        alertSuccess('用户已添加到小组！')
        setShowAddMemberModal(false)
        setSelectedUserId(null)
        loadGroupMembers(selectedGroup.id)
        loadGroups()
        if (onUpdate) onUpdate()
      } else {
        alertError(`添加失败: ${result.error}`)
      }
    } catch (error) {
      console.error('添加用户到小组失败:', error)
      alertError('添加用户失败，请稍后重试')
    }
  }

  // 从小组移除用户
  const handleRemoveMember = async (groupId: number, userId: number) => {
    if (!confirm('确定要从小组中移除该用户吗？')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        alertSuccess('用户已从小组移除')
        loadGroupMembers(groupId)
        loadGroups()
        if (onUpdate) onUpdate()
      } else {
        alertError(`移除失败: ${result.error}`)
      }
    } catch (error) {
      console.error('移除用户失败:', error)
      alertError('移除用户失败，请稍后重试')
    }
  }

  // 查看小组详情
  const handleViewDetail = async (group: Group) => {
    setSelectedGroup(group)
    await loadGroupMembers(group.id)
    setShowDetailModal(true)
  }

  // 编辑小组
  const handleEditGroup = (group: Group) => {
    setSelectedGroup(group)
    setEditGroupName(group.name)
    setEditGroupDescription(group.description || '')
    setShowEditModal(true)
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!selectedGroup || !editGroupName.trim()) {
      alertError('请输入小组名称')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: editGroupName.trim(),
          description: editGroupDescription.trim() || undefined,
        }),
      })

      const result = await response.json()
      if (result.success) {
        alertSuccess('小组信息已更新！')
        setShowEditModal(false)
        setSelectedGroup(null)
        loadGroups()
        if (onUpdate) onUpdate()
      } else {
        alertError(`更新失败: ${result.error}`)
      }
    } catch (error) {
      console.error('更新小组失败:', error)
      alertError('更新小组失败，请稍后重试')
    }
  }

  // 删除小组
  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('确定要删除该小组吗？小组中的项目不会被删除。')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        alertSuccess('小组已删除')
        loadGroups()
        if (onUpdate) onUpdate()
      } else {
        alertError(`删除失败: ${result.error}`)
      }
    } catch (error) {
      console.error('删除小组失败:', error)
      alertError('删除小组失败，请稍后重试')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users size={20} />
          小组管理
        </h3>
        <button
          onClick={() => {
            setNewGroupName('')
            setNewGroupDescription('')
            setShowCreateModal(true)
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus size={18} />
          新建小组
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-purple-600" size={32} />
        </div>
      ) : (
        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无小组，点击"新建小组"创建
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewDetail(group)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{group.name}</h4>
                    {group.description && (
                      <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      创建者: {group.creator_username || '未知'} | 
                      成员数: {group.member_count || 0}
                    </p>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {isAdmin && (
                      <button
                        onClick={() => handleEditGroup(group)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
                      >
                        <Edit2 size={14} />
                        编辑
                      </button>
                    )}
                    <button
                      onClick={() => handleManagePassword(group)}
                      className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 flex items-center gap-1"
                    >
                      <Key size={14} />
                      共享密码
                    </button>
                    <button
                      onClick={() => {
                        setSelectedGroup(group)
                        loadGroupMembers(group.id)
                        setShowAddMemberModal(true)
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                    >
                      <UserPlus size={14} />
                      添加成员
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 创建小组弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">创建小组</h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">
                  <span className="text-red-500">*</span> 小组名称
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="请输入小组名称"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">小组描述</label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="请输入小组描述（可选）"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 小组详情弹窗 */}
      {showDetailModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">小组详情</h3>
              <button onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg mb-2">{selectedGroup.name}</h4>
                {selectedGroup.description && (
                  <p className="text-sm text-gray-600 mb-2">{selectedGroup.description}</p>
                )}
                <p className="text-xs text-gray-500">
                  创建者: {selectedGroup.creator_username || '未知'}
                </p>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">小组成员：</p>
                {groupMembers.length === 0 ? (
                  <p className="text-sm text-gray-500">暂无成员</p>
                ) : (
                  <div className="space-y-2">
                    {groupMembers.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <span>{member.display_name || member.username}</span>
                          {member.role === 'owner' && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              组长
                            </span>
                          )}
                          {member.role === 'member' && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              组员
                            </span>
                          )}
                        </div>
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => {
                              handleRemoveMember(selectedGroup.id, member.user_id)
                              loadGroupMembers(selectedGroup.id)
                            }}
                            className="text-red-600 hover:text-red-700 text-xs"
                          >
                            移除
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑小组弹窗 */}
      {showEditModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">编辑小组</h3>
              <button onClick={() => {
                setShowEditModal(false)
                setSelectedGroup(null)
              }}>
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">
                  <span className="text-red-500">*</span> 小组名称
                </label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="请输入小组名称"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">小组描述</label>
                <textarea
                  value={editGroupDescription}
                  onChange={(e) => setEditGroupDescription(e.target.value)}
                  placeholder="请输入小组描述（可选）"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedGroup(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加成员弹窗 */}
      {showAddMemberModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">添加成员到 "{selectedGroup.name}"</h3>
              <button onClick={() => {
                setShowAddMemberModal(false)
                setSelectedGroup(null)
                setSelectedUserId(null)
              }}>
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">
                  <span className="text-red-500">*</span> 选择用户
                </label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                >
                  <option value="">请选择用户</option>
                  {users
                    .filter(user => {
                      // 过滤掉已经在小组中的用户
                      if (!groupMembers.length) return true
                      return !groupMembers.some(m => m.user_id === user.id)
                    })
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.display_name || user.username} ({user.username})
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setSelectedGroup(null)
                    setSelectedUserId(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUserId}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 共享密码管理弹窗 */}
      {showPasswordModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Key size={20} />
                管理共享密码 - {selectedGroup.name}
              </h3>
              <button onClick={() => {
                setShowPasswordModal(false)
                setSelectedGroup(null)
                setSharePassword('')
                setShowPassword(false)
              }}>
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p>设置共享密码后，其他小组成员可以通过输入此密码来访问本小组的项目文件夹。</p>
                <p className="mt-2 text-yellow-600">⚠️ 只有小组组长和管理员可以修改密码。</p>
              </div>
              
              <div>
                <label className="block text-sm mb-2 font-medium">共享密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    placeholder="输入共享密码（留空则禁用共享）"
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setSelectedGroup(null)
                    setSharePassword('')
                    setShowPassword(false)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleSavePassword}
                  disabled={savingPassword}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存密码'
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

export default GroupManagement

