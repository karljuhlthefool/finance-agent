'use client'

type SparklineProps = {
  data: number[]
  color?: string
  height?: number
  className?: string
}

export default function Sparkline({ 
  data, 
  color = 'blue', 
  height = 32,
  className = '' 
}: SparklineProps) {
  if (!data || data.length === 0) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  // Generate SVG path
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return `${x},${y}`
  })

  const pathData = `M ${points.join(' L ')}`

  // Determine trend
  const trend = data[data.length - 1] > data[0] ? 'up' : 'down'
  const colorClass = color === 'blue' ? 'stroke-blue-500' :
                     color === 'green' ? 'stroke-green-500' :
                     color === 'red' ? 'stroke-red-500' :
                     'stroke-slate-500'

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`${className}`}
      style={{ height: `${height}px`, width: '100%' }}
    >
      <path
        d={pathData}
        fill="none"
        className={colorClass}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export function SparklineWithLabel({ 
  data, 
  label, 
  currentValue,
  trend,
  className = '' 
}: {
  data: number[]
  label: string
  currentValue: string
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}) {
  const trendColor = trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'blue'
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1">
        <div className="text-xs text-slate-600 mb-1">{label}</div>
        <Sparkline data={data} color={trendColor} height={24} />
      </div>
      <div className="text-right">
        <div className={`text-lg font-semibold ${
          trend === 'up' ? 'text-green-600' : 
          trend === 'down' ? 'text-red-600' : 
          'text-slate-900'
        }`}>
          {currentValue}
        </div>
      </div>
    </div>
  )
}

