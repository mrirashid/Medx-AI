import { useEffect, useState } from 'react'
import Card, { CardBody, CardHeader } from '../../components/common/Card'
import { getMedicationsToday } from '../../services/nurse'
import type { MedicationItem } from '../../services/nurse'
import { useLanguage } from '../../i18n/LanguageProvider'

export default function Medications() {
  const [items, setItems] = useState<MedicationItem[]>([])
  const { t } = useLanguage()

  useEffect(() => {
    getMedicationsToday().then(setItems)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{t('Medications')}</h2>
        <p className="text-sm text-slate-600">{t('Scheduled and administered medications')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="text-sm font-medium text-slate-700">{t('Today')}</div>
        </CardHeader>
        <CardBody>
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">{it.drug} {it.dose}</div>
                  <div className="text-xs text-slate-600">{t('Patient')} {it.patientId} • {it.schedule}</div>
                </div>
                <span className="text-xs text-slate-500">{it.time}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}
