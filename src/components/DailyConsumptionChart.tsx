import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { UserApi, type DailyConsumption } from '../services/userApi'
import { Loader2 } from 'lucide-react'

interface DailyConsumptionChartProps {
  startDate?: string
  endDate?: string
}

function DailyConsumptionChart({ startDate, endDate }: DailyConsumptionChartProps) {
  const [data, setData] = useState<DailyConsumption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [startDate, endDate])

  const loadData = async () => {
    setLoading(true)
    try {
      const trend = await UserApi.getDailyConsumption(startDate, endDate)
      setData(trend)
    } catch (error) {
      console.error('加载每日消耗趋势失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 h-64 flex items-center justify-center">
        <p className="text-gray-500">暂无数据</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value)
              return `${date.getMonth() + 1}/${date.getDate()}`
            }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}k`
              }
              return value.toString()
            }}
          />
          <Tooltip 
            formatter={(value: number) => [`${value.toFixed(2)} 积分`, '消耗积分']}
            labelFormatter={(label) => `日期: ${label}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="totalPoints" 
            stroke="#9333ea" 
            strokeWidth={2}
            name="消耗积分"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default DailyConsumptionChart


