import React from 'react'
import { FaBell } from 'react-icons/fa'

export default function Topbar({ title = 'Manage Patients' }) {
  return (
    <header className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
      <h2 className="text-xl font-medium text-gray-700">{title}</h2>
      <div className="flex items-center gap-4">
        <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-md bg-white text-gray-600 hover:bg-gray-50">
          <FaBell />
          <span className="absolute -top-0.5 -right-0.5 inline-block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        <div className="flex items-center gap-3">
          <img src="https://avatars.dicebear.com/api/identicon/doctor.svg" alt="avatar" className="h-10 w-10 rounded-full bg-gray-100" />
          <div className="leading-tight">
            <div className="text-sm font-medium text-gray-700">Superadmin</div>
            <div className="text-xs text-gray-500">admin@healthcare.com</div>
          </div>
        </div>
      </div>
    </header>
  )
}
