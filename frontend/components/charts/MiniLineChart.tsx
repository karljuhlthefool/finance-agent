'use client'

type DataPoint = {
  date: string
  value: number
}

type MiniLineChartProps = {
  data: DataPoint[]
  height?: number
  color?: string
  showPoints?: boolean
  className?: string
}

export default function MiniLineChart({ 
  data, 
  height = 120, 
  color = 'blue',
  showPoints = false,
  className = '' 
}: MiniLineChartProps) {
  if (!data || data.length === 0) return null

  const values = data.map(d => d.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  const width = 100
  const padding = 5

  // Generate points
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = padding + (1 - (d.value - min) / range) * (height - padding * 2)
    return { x, y, value: d.value, date: d.date }
  })

  // Generate path
  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
  ).join(' ')

  const colorClasses = {
    blue: { stroke: 'stroke-blue-500', fill: 'fill-blue-100', points: 'fill-blue-500' },
    green: { stroke: 'stroke-green-500', fill: 'fill-green-100', points: 'fill-green-500' },
    red: { stroke: 'stroke-red-500', fill: 'fill-red-100', points: 'fill-red-500' },
  }

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: `${height}px` }}
      >
        {/* Area under curve */}
        <path
          d={`${pathData} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`}
          className={colors.fill}
          opacity="0.3"
        />
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          className={colors.stroke}
          strokeWidth="2"
        />
        
        {/* Points */}
        {showPoints && points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2"
            className={colors.points}
          />
        ))}
      </svg>
    </div>
  )
}

