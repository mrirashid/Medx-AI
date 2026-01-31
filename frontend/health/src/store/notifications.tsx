import React, { createContext, useContext, useState, useCallback } from 'react'
import { useLanguage } from '../i18n/LanguageProvider'

export type AppNotification = {
  id: string
  title: string
  time: string // relative or timestamp string
  read: boolean
  type: 'patient' | 'lab' | 'med' | 'message' | 'system'
}

type NotificationsContextValue = {
  notifications: AppNotification[]
  add: (n: Omit<AppNotification, 'id' | 'read' | 'time'> & { time?: string }) => void
  markAllRead: () => void
  markRead: (id: string) => void
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<AppNotification[]>([
    { id: 'seed-1', title: t('New patient admitted'), time: '2m', read: false, type: 'patient' },
    { id: 'seed-2', title: t('Lab result available'), time: '10m', read: false, type: 'lab' },
  ])

  const add = useCallback((n: Omit<AppNotification, 'id' | 'read' | 'time'> & { time?: string }) => {
    setNotifications(prev => [
      { id: `n-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, title: n.title, type: n.type, time: n.time || 'now', read: false },
      ...prev
    ])
  }, [])

  const markAllRead = useCallback(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))), [])
  const markRead = useCallback((id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)), [])

  return (
    <NotificationsContext.Provider value={{ notifications, add, markAllRead, markRead }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
