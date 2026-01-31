import { useEffect, useState } from 'react'
import Card, { CardBody, CardHeader } from '../../components/common/Card'
import { getSchedule } from '../../services/nurse'
import type { ScheduleItem } from '../../services/nurse'
import { useLanguage } from '../../i18n/LanguageProvider'

export default function Schedule() {
  const [items, setItems] = useState<ScheduleItem[]>([])
  const { t } = useLanguage()

  useEffect(() => {
    getSchedule().then(setItems)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{t('Schedule')}</h2>
        <p className="text-sm text-slate-600">{t('Your shifts and appointments')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="text-sm font-medium text-slate-700">{t('Today')}</div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-md border border-slate-200 p-3">
                <div className="text-sm font-medium text-slate-800">{it.title}</div>
                <div className="text-xs text-slate-600">{it.time} • {t('Ward')} {it.ward}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
