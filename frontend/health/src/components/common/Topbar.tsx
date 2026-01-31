import { useLocation, Link, useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import { useAuth } from '../../store/auth'
import { FaBell } from 'react-icons/fa'
import { FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa'
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../i18n/LanguageProvider'
import { useNotifications } from '../../store/notifications'

const titles: Record<string, string> = {
  '/nurse': 'Dashboard',
  '/nurse/patients': 'Manage Patients',
  '/nurse/profile': 'Profile',
  '/nurse/settings': 'Account Settings',
}

// Notification shape is dynamic from store; avoid unused type and provide inline any where needed

export default function Topbar({ onMenu }: { onMenu?: () => void }) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const notifRef = useRef<HTMLDivElement | null>(null)

  const { notifications, markAllRead, markRead } = useNotifications() as any

  const pathname = location.pathname
  const base = Object.keys(titles).find((t) => pathname === t) || '/nurse'
  const title = titles[base]

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (open && menuRef.current && !menuRef.current.contains(target)) {
        setOpen(false)
      }
      if (showNotifications && notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, showNotifications])

  return (
    <header className="bg-white">
      <div className="flex h-16 items-center justify-between px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 md:hidden"
            onClick={onMenu}
            aria-label="Open menu"
          >
            ☰
          </button>
          <Link to="/nurse" className="text-lg font-medium text-gray-700">
            {t(title)}
          </Link>
        </div>
        <div className="relative flex items-center gap-4">
          <div className="relative" ref={notifRef}>
            <button
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-md bg-white text-gray-600 hover:bg-gray-50"
              aria-label={t('Notifications')}
              title={t('Notifications')}
              aria-haspopup="menu"
              aria-expanded={showNotifications}
              onClick={() => setShowNotifications((v) => !v)}
            >
              <FaBell />
              {notifications.filter((n: any) => !n.read).length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                  {notifications.filter((n: any) => !n.read).length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div
                role="menu"
                aria-label={t('Notifications')}
                className="absolute right-0 z-30 mt-2 w-80 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
                  <span className="text-sm font-medium text-gray-700">{t('Notifications')}</span>
                  <div className="flex gap-2">
                    <button onClick={markAllRead} className="text-xs text-purple-600 hover:text-purple-700">{t('Mark all read')}</button>
                    <button
                      onClick={() => {
                        setShowNotifications(false)
                        navigate('/nurse')
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      {t('View all')}
                    </button>
                  </div>
                </div>
                <ul className="max-h-80 overflow-auto" role="list">
                  {notifications.length === 0 && (
                    <li className="px-4 py-6 text-center text-sm text-gray-500">{t('No notifications')}</li>
                  )}
                  {notifications.map((n: any) => (
                    <li
                      key={n.id}
                      className={`group flex gap-3 px-4 py-3 text-sm ${n.read ? 'bg-white' : 'bg-purple-50'} hover:bg-purple-100`}
                    >
                      <span
                        className={`mt-1 h-2 w-2 rounded-full ${n.read ? 'bg-gray-300' : 'bg-purple-600'} group-hover:scale-110 transition-transform`}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-gray-700 font-medium">
                          {n.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{n.time}</div>
                      </div>
                      {!n.read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="self-start rounded px-2 py-1 text-[11px] font-medium bg-white border border-purple-200 text-purple-600 hover:bg-purple-50"
                        >
                          {t('Mark all read').split(' ')[0]}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-3 rounded-md p-1 pr-2 hover:bg-gray-50"
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <Avatar name={user.name} size="sm" src={user.avatarUrl} />
                <div className="hidden leading-tight sm:block text-left">
                  <div className="text-sm font-medium text-gray-700">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
                <span className="ml-1 text-gray-400">▾</span>
              </button>

              {open && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
                >
                  <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100">
                    <Avatar name={user.name} size="sm" src={user.avatarUrl} />
                    <div className="truncate">
                      <div className="text-sm font-medium text-gray-700 truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                  </div>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setOpen(false)
                      navigate('/nurse/profile')
                    }}
                  >
                    <FaUser className="text-gray-500" /> {t('View Profile')}
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setOpen(false)
                      navigate('/nurse/settings')
                    }}
                  >
                    <FaCog className="text-gray-500" /> {t('Account Settings')}
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setOpen(false)
                      logout()
                      navigate('/login', { replace: true })
                    }}
                  >
                    <FaSignOutAlt /> {t('Logout')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
