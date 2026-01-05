import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Home from './pages/Home'
import Login from './pages/Login'
import TaskList from './pages/TaskList'
import { AuthService } from './services/auth'
import ScriptInput from './pages/ScriptInput'
import AssetDetails from './pages/AssetDetails'
import ShotManagement from './pages/ShotManagement'
import ImageFusion from './pages/ImageFusion'
import VideoEditing from './pages/VideoEditing'
import TestPage from './pages/TestPage'
import ProjectManagement from './pages/ProjectManagement'
import FragmentManagement from './pages/FragmentManagement'
import FirstLastFrameVideo from './pages/FirstLastFrameVideo'
import CharacterManagement from './pages/CharacterManagement'
import SceneManagement from './pages/SceneManagement'
import ItemManagement from './pages/ItemManagement'
import FusionImageGeneration from './pages/FusionImageGeneration'
import ImageRecreation from './pages/ImageRecreation'
import VoiceCreation from './pages/VoiceCreation'
import PromotionCreation from './pages/PromotionCreation'
import Analytics from './pages/Analytics'
import VideoReview from './pages/VideoReview'
import FragmentDetail from './pages/FragmentDetail'
import CreditRecharge from './pages/CreditRecharge'
import PaymentServiceAgreement from './pages/PaymentServiceAgreement'
import WorksShowcase from './pages/WorksShowcase'
import CommunityVideoDetail from './pages/CommunityVideoDetail'
import { useAlert } from './hooks/useAlert.tsx'

// 受保护的路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      // 先检查是否有 token
      const token = AuthService.getToken()
      if (!token) {
        setIsAuthenticated(false)
        return
      }
      
      // 验证 token
      const authenticated = await AuthService.verifyToken()
      setIsAuthenticated(authenticated)
    }
    
    checkAuth()
    
    // 监听登录状态变化
    const handleAuthChange = () => {
      checkAuth()
    }
    
    window.addEventListener('auth-changed', handleAuthChange)
    
    return () => {
      window.removeEventListener('auth-changed', handleAuthChange)
    }
  }, [])

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  const { AlertComponent } = useAlert()

  // 检测是否为移动设备
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  return (
    <BrowserRouter>
      {AlertComponent}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={isMobile ? <Home /> : <Home />} />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TaskList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/script-input"
          element={
            <ProtectedRoute>
              <ScriptInput />
            </ProtectedRoute>
          }
        />
        <Route
          path="/asset-details"
          element={
            <ProtectedRoute>
              <AssetDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shot-management"
          element={
            <ProtectedRoute>
              <ShotManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/image-fusion"
          element={
            <ProtectedRoute>
              <ImageFusion />
            </ProtectedRoute>
          }
        />
        <Route
          path="/video-editing"
          element={
            <ProtectedRoute>
              <VideoEditing />
            </ProtectedRoute>
          }
        />
        <Route path="/test" element={<TestPage />} />
        <Route
          path="/project-management"
          element={
            <ProtectedRoute>
              <ProjectManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/fragments"
          element={
            <ProtectedRoute>
              <FragmentManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/first-last-frame-video"
          element={
            <ProtectedRoute>
              <FirstLastFrameVideo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/fragments/:fragmentId/detail"
          element={
            <ProtectedRoute>
              <FragmentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/fragments/:fragmentId/review"
          element={
            <ProtectedRoute>
              <VideoReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/characters"
          element={
            <ProtectedRoute>
              <CharacterManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/scenes"
          element={
            <ProtectedRoute>
              <SceneManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/items"
          element={
            <ProtectedRoute>
              <ItemManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/fusion"
          element={
            <ProtectedRoute>
              <FusionImageGeneration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/recreation"
          element={
            <ProtectedRoute>
              <ImageRecreation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/voice"
          element={
            <ProtectedRoute>
              <VoiceCreation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/promotion"
          element={
            <ProtectedRoute>
              <PromotionCreation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/credit-recharge"
          element={
            <ProtectedRoute>
              <CreditRecharge />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-service-agreement"
          element={<PaymentServiceAgreement />}
        />
        <Route
          path="/works"
          element={<WorksShowcase />}
        />
        <Route
          path="/works/:videoId"
          element={<CommunityVideoDetail />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

