import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import TaskList from './pages/TaskList'
import ScriptInput from './pages/ScriptInput'
import AssetDetails from './pages/AssetDetails'
import ShotManagement from './pages/ShotManagement'
import ImageFusion from './pages/ImageFusion'
import VideoEditing from './pages/VideoEditing'
import TestPage from './pages/TestPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/script-input" element={<ScriptInput />} />
        <Route path="/asset-details" element={<AssetDetails />} />
        <Route path="/shot-management" element={<ShotManagement />} />
        <Route path="/image-fusion" element={<ImageFusion />} />
        <Route path="/video-editing" element={<VideoEditing />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

