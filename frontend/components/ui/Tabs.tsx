'use client'

import { ReactNode, useState, createContext, useContext } from 'react'

type TabsContextType = {
  activeTab: string
  setActiveTab: (value: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

type TabsProps = {
  defaultValue: string
  children: ReactNode
  className?: string
}

export function Tabs({ defaultValue, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={`w-full ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

type TabsListProps = {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`flex gap-1 border-b border-slate-200 ${className}`}>
      {children}
    </div>
  )
}

type TabsTriggerProps = {
  value: string
  children: ReactNode
  icon?: string
  count?: number
  className?: string
}

export function TabsTrigger({ value, children, icon, count, className = '' }: TabsTriggerProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')

  const { activeTab, setActiveTab } = context
  const isActive = activeTab === value

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`
        flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all
        border-b-2 -mb-px
        ${isActive 
          ? 'border-blue-500 text-blue-700 bg-blue-50' 
          : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }
        ${className}
      `}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span>{children}</span>
      {count !== undefined && (
        <span className={`
          px-1.5 py-0.5 text-xs rounded-full font-semibold
          ${isActive ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-600'}
        `}>
          {count}
        </span>
      )}
    </button>
  )
}

type TabsContentProps = {
  value: string
  children: ReactNode
  className?: string
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')

  const { activeTab } = context

  if (activeTab !== value) return null

  return (
    <div className={`py-4 ${className}`}>
      {children}
    </div>
  )
}

