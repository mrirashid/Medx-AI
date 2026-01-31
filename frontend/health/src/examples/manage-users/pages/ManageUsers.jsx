import React, { useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import PatientTable from '../components/UserTable'
import { FaSearch, FaFilter, FaPlus } from 'react-icons/fa'
import { useLanguage } from '../../../i18n/LanguageProvider'

const initialPatients = Array.from({ length: 12 }).map((_, i) => ({
  id: String(i + 1),
  name: `Patient ${i + 1}`,
  email: `patient${i + 1}@example.com`,
  status: i % 3 === 0 ? 'Inactive' : 'Active',
}))

export default function ManagePatients() {
  const [patients, setPatients] = useState(initialPatients)
  const [q, setQ] = useState('')
  const { t } = useLanguage()

  const filtered = useMemo(() => {
    const term = q.toLowerCase()
    return patients.filter((p) => p.name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term))
  }, [patients, q])

  function handleEdit(p) {
    alert('Edit ' + p.name)
  }
  function handleToggle(p) {
    setPatients((prev) => prev.map(x => x.id === p.id ? { ...x, status: x.status === 'Active' ? 'Inactive' : 'Active' } : x))
  }
  function handleDelete(p) {
    if (!confirm('Delete patient?')) return
    setPatients((prev) => prev.filter(x => x.id !== p.id))
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 bg-[#F5F6FA]">
        <Topbar />
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
          <div className="panel panel-padding">
            <div className="mb-8 flex items-start justify-between gap-6">
              <div>
                <h1 className="text-2xl font-medium text-gray-700">{t('Manage Patients')}</h1>
                <p className="mt-3 text-sm text-gray-500">{t('Search and manage patient records')}</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="inline-flex items-center gap-2 rounded bg-white px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50"><FaFilter /> {t('Filters')}</button>
                <button className="inline-flex items-center gap-2 rounded bg-[#0D6EFD] px-3 py-2 text-sm font-medium text-white hover:bg-[#0b5fd4]"><FaPlus /> {t('New Patient')}</button>
              </div>
            </div>

            <div className="mb-6 flex items-center gap-4">
              <div className="flex w-full max-w-md items-center gap-2 rounded bg-white px-3 py-2 shadow-sm">
                <FaSearch className="text-gray-400" />
                <input className="w-full text-sm text-gray-700 outline-none" placeholder={t('Search patients by name, email ...')} value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>

            <PatientTable patients={filtered} onEdit={handleEdit} onToggle={handleToggle} onDelete={handleDelete} />

            <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
              <button className="px-2">{t('Previous')}</button>
              <div className="mx-4 flex items-center gap-2"><button className="px-2">1</button><button className="px-2">2</button><button className="px-2">3</button></div>
              <button className="px-2">{t('Next')}</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
