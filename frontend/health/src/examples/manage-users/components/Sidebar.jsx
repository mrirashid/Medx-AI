import React from 'react'
import { FaHome, FaUsers, FaSignOutAlt } from 'react-icons/fa'

export default function Sidebar({ active = 'patients' }) {
  const items = [
    { key: 'dashboard', label: 'Dashboard', icon: <FaHome /> },
    { key: 'patients', label: 'Manage Patients', icon: <FaUsers /> },
  ]

  return (
    <aside className="flex h-screen w-64 flex-col bg-[#06224A] text-white">
      <div className="px-6 py-8">
        <div className="text-2xl font-semibold">Logo</div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {items.map((it) => (
          <a
            key={it.key}
            href="#"
            className={`group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
              active === it.key ? 'bg-[#0D6EFD]/20 text-white' : 'text-white hover:bg-white/5'
            }`}
          >
            <span className="text-lg text-white">{it.icon}</span>
            <span className="text-white">{it.label}</span>
          </a>
        ))}
      </nav>

      <div className="px-4 py-6">
        <button className="flex w-full items-center gap-3 rounded-md bg-transparent px-3 py-2 text-sm text-white hover:bg-white/5">
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
