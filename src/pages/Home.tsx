import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[#0a0a0a] gap-6">
      <button
        onClick={() => navigate('/tasks')}
        className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl font-semibold rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
      >
        剧变时代Agent
      </button>
      <button
        onClick={() => navigate('/test')}
        className="px-6 py-3 bg-[#1a1a1a] border border-gray-700 text-white text-sm font-medium rounded-lg hover:bg-[#2a2a2a] hover:border-purple-500 transition-all"
      >
        测试页面
      </button>
    </div>
  )
}

export default Home

