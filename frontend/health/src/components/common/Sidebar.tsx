import { NavLink } from 'react-router-dom'
import { FaHome, FaUsers, FaSignOutAlt } from 'react-icons/fa'
import { useAuth } from '../../store/auth'
import { useLanguage } from '../../i18n/LanguageProvider'

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { logout } = useAuth()
  const { t } = useLanguage()
  const items = [
    { key: 'dashboard', to: '/nurse', label: t('Dashboard'), icon: <FaHome className="h-5 w-5" /> },
    { key: 'patients', to: '/nurse/patients', label: t('Manage Patients'), icon: <FaUsers className="h-5 w-5" /> },
  ]

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col bg-[#041939] text-white">
      <div className="px-6 py-6">
        <div className="text-2xl font-semibold tracking-tight">{t('Logo')}</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3" aria-label={t('Primary Navigation')} role="navigation">
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.key}>
              <NavLink
                to={it.to}
                onClick={onNavigate}
                {...(it.key === 'dashboard' ? { end: true } : {})}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#7B5CFF]/40 ${
                        isActive
                          ? 'bg-gradient-to-r from-[#0F1E47] to-[#102A5A] text-white'
                          : 'text-white hover:bg-white/5'
                  }`
                }
              >
                {/* Left indicator bar with subtle glow */}
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-full w-[3px] rounded-l-xl bg-transparent shadow-none transition-all duration-300 group-aria-[current=page]:bg-[#7B5CFF] group-aria-[current=page]:shadow-[0_0_6px_2px_rgba(123,92,255,0.5)] group-hover:bg-[#7B5CFF]/40 group-hover:shadow-[0_0_4px_1px_rgba(123,92,255,0.4)]"
                />
                {/* Icon container (no cloneElement needed) */}
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1B2C52] shadow-inner shadow-black/40 transition-colors duration-200 group-aria-[current=page]:bg-[#1B2C52]/90 group-aria-[current=page]:shadow-[inset_0_0_0_1px_rgba(123,92,255,0.5)] group-hover:bg-[#1B2C52]/80 !text-white">
                  {it.icon}
                </span>
                {/* Label */}
                <span className="truncate group-aria-[current=page]:font-semibold !text-white drop-shadow">
                  {it.label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-4 py-6 mt-auto border-t border-white/10">
        <button
          className="group flex w-full items-center gap-3 rounded-xl bg-transparent px-4 py-3 text-sm font-medium text-white transition-colors hover:text-[#7B5CFF] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          onClick={logout}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 group-hover:bg-white/15 text-white group-hover:text-[#7B5CFF]">
            <FaSignOutAlt className="h-5 w-5" />
          </span>
          <span className="truncate">{t('Logout')}</span>
        </button>
      </div>
    </aside>
  )
}
