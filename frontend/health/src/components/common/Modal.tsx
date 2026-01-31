import type { ReactNode } from 'react'

export default function Modal({ open, title, children, footer, onClose }: { open: boolean; title?: string; children: ReactNode; footer?: ReactNode; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      {/* Scrollable modal container with constrained height */}
      <div className="pointer-events-auto absolute inset-x-0 top-4 md:top-12 mx-auto w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
        {title ? (
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900">{title}</div>
        ) : null}
        <div className="px-5 py-4 space-y-4">{children}</div>
        {footer ? <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  )
}
