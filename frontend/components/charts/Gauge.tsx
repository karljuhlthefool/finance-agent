'use client'

type GaugeProps = {
  value: number
  max?: number
  label?: string
  color?: 'blue' | 'green' | 'red' | 'yellow'
  size?: number
  className?: string
}

export default function Gauge({ 
  value, 
  max = 100, 
  label,
  color = 'blue',
  size = 120,
  className = '' 
}: GaugeProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const angle = (percentage / 100) * 180 - 90 // -90 to 90 degrees

  const colors = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    red: 'text-red-500',
    yellow: 'text-yellow-500',
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={size}
        height={size * 0.6}
        viewBox="0 0 120 72"
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-200"
          strokeLinecap="round"
        />
        
        {/* Foreground arc */}
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className={colors[color]}
          strokeLinecap="round"
          strokeDasharray={`${(percentage / 100) * 157} 157`}
        />
        
        {/* Needle */}
        <g transform={`rotate(${angle} 60 60)`}>
          <line
            x1="60"
            y1="60"
            x2="60"
            y2="20"
            stroke="currentColor"
            strokeWidth="2"
            className="text-slate-700"
          />
          <circle
            cx="60"
            cy="60"
            r="4"
            fill="currentColor"
            className="text-slate-700"
          />
        </g>
      </svg>
      
      <div className="mt-2 text-center">
        <div className={`text-2xl font-bold ${colors[color]}`}>
          {Math.round(percentage)}%
        </div>
        {label && (
          <div className="text-sm text-slate-600">{label}</div>
        )}
      </div>
    </div>
  )
}

export function ComparisonGauge({
  current,
  target,
  label,
  className = ''
}: {
  current: number
  target: number
  label?: string
  className?: string
}) {
  const ratio = current / target
  const color = ratio > 1.2 ? 'red' : ratio > 0.8 ? 'blue' : 'green'
  
  return (
    <div className={className}>
      <Gauge value={current} max={target * 1.5} color={color} />
      <div className="mt-2 text-center">
        <div className="text-xs text-slate-600">
          Current: <span className="font-semibold">${current.toFixed(2)}</span>
        </div>
        <div className="text-xs text-slate-600">
          Target: <span className="font-semibold">${target.toFixed(2)}</span>
        </div>
        {label && <div className="text-sm font-medium text-slate-700 mt-1">{label}</div>}
      </div>
    </div>
  )
}

