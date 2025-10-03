'use client'

type WaterfallDataPoint = {
  label: string
  value: number
  type: 'positive' | 'negative' | 'total'
}

type WaterfallProps = {
  data: WaterfallDataPoint[]
  className?: string
}

export default function Waterfall({ data, className = '' }: WaterfallProps) {
  if (!data || data.length === 0) return null

  // Calculate positions
  let cumulative = 0
  const items = data.map((d) => {
    const start = cumulative
    cumulative += d.type === 'total' ? 0 : d.value
    const end = d.type === 'total' ? d.value : cumulative

    return {
      ...d,
      start,
      end,
      height: Math.abs(d.value),
      isPositive: d.value >= 0
    }
  })

  const max = Math.max(...items.map(i => Math.abs(i.end)))
  const barWidth = 60
  const gap = 20
  const height = 200
  const padding = 20

  return (
    <div className={`overflow-x-auto ${className}`}>
      <svg
        width={(barWidth + gap) * data.length + padding * 2}
        height={height + 80}
        className="min-w-full"
      >
        {items.map((item, idx) => {
          const x = padding + idx * (barWidth + gap)
          const barHeight = (Math.abs(item.value) / max) * height
          const y = padding + height - ((item.end / max) * height)

          const color = item.type === 'total' ? 'fill-slate-700' :
                       item.isPositive ? 'fill-green-500' :
                       'fill-red-500'

          const connectorY = item.type === 'total' ? y + barHeight : y
          const nextItem = items[idx + 1]

          return (
            <g key={idx}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                className={color}
                rx="4"
              />

              {/* Connector to next bar */}
              {nextItem && idx < items.length - 1 && (
                <line
                  x1={x + barWidth}
                  y1={connectorY}
                  x2={x + barWidth + gap}
                  y2={padding + height - ((nextItem.start / max) * height)}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  className="text-slate-300"
                />
              )}

              {/* Value label */}
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                className="text-xs font-semibold fill-slate-700"
              >
                {item.value >= 0 ? '+' : ''}{item.value.toFixed(0)}B
              </text>

              {/* Name label */}
              <text
                x={x + barWidth / 2}
                y={height + padding + 15}
                textAnchor="middle"
                className="text-xs fill-slate-600"
              >
                {item.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

