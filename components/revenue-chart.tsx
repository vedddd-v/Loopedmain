"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface RevenueChartProps {
  data: {
    date: string
    amount: number
  }[]
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const [chartData, setChartData] = useState(data)

  useEffect(() => {
    // Format dates for display
    const formattedData = data.map((item) => ({
      ...item,
      formattedDate: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }))

    setChartData(formattedData)
  }, [data])

  // Calculate moving average for trend line
  const calculateMovingAverage = (data, window = 7) => {
    if (!data || data.length === 0) return []

    return data.map((item, index) => {
      const start = Math.max(0, index - Math.floor(window / 2))
      const end = Math.min(data.length - 1, index + Math.floor(window / 2))
      const windowData = data.slice(start, end + 1)
      const sum = windowData.reduce((acc, curr) => acc + curr.amount, 0)

      return {
        ...item,
        trend: sum / windowData.length,
      }
    })
  }

  const dataWithTrend = calculateMovingAverage(chartData)

  // Custom tooltip to show date and amount
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="font-medium">{payload[0].payload.formattedDate || payload[0].payload.date}</p>
          <p className="text-emerald-600">Commission: ${payload[0].value.toFixed(2)}</p>
          {payload[1] && <p className="text-blue-600">Trend: ${payload[1].value.toFixed(2)}</p>}
        </div>
      )
    }

    return null
  }

  // Format y-axis ticks as currency
  const formatYAxis = (value) => {
    return `$${value}`
  }

  // Determine tick interval based on data length
  const getTickInterval = () => {
    if (chartData.length <= 7) return 1
    if (chartData.length <= 30) return Math.ceil(chartData.length / 7)
    return Math.ceil(chartData.length / 10)
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={dataWithTrend} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="formattedDate"
          interval={getTickInterval()}
          angle={-45}
          textAnchor="end"
          height={70}
          tick={{ fontSize: 12 }}
        />
        <YAxis tickFormatter={formatYAxis} width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 6 }}
          name="Daily Commission"
        />
        <Line type="monotone" dataKey="trend" stroke="#3b82f6" strokeWidth={2} dot={false} name="Trend (7-day avg)" />
      </LineChart>
    </ResponsiveContainer>
  )
}
