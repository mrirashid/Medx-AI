import React from 'react'
import { FaEye, FaEdit, FaTrash } from 'react-icons/fa'

function StatusBadge({ status }) {
  if (status === 'Active') return <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">● {status}</span>
  return <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">● {status}</span>
}

export default function PatientTable({ patients = [], onEdit, onToggle, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-gray-600">
          <tr>
            <th className="px-4 py-3 text-left">Patient Name</th>
            <th className="px-4 py-3 text-left">Email</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.id} className="border-t border-gray-200 hover:bg-gray-50">
              <td className="px-4 py-3">{p.name}</td>
              <td className="px-4 py-3 text-gray-600">{p.email}</td>
              <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-4 text-sm">
                  <button onClick={() => onEdit?.(p)} className="text-blue-600 hover:underline inline-flex items-center gap-2"><FaEdit /> Edit</button>
                  <button onClick={() => onToggle?.(p)} className={`inline-flex items-center gap-2 ${p.status === 'Active' ? 'text-red-600' : 'text-green-600'}`}>{p.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => onDelete?.(p)} className="text-red-500">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
