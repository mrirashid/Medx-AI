import { Outlet } from 'react-router-dom'

export default function AuthLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {children ?? <Outlet />}
      </div>
    </div>
  )
}
