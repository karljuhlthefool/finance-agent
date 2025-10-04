export function Badge({ children, variant = 'default' }: { 
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error'
}) {
  const colors = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700'
  }
  
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[variant]}`}>
      {children}
    </span>
  )
}
