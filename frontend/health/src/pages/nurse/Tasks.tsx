import { useEffect, useState } from 'react'
import Card, { CardBody, CardHeader } from '../../components/common/Card'
import Button from '../../components/common/Button'
import { getTasks } from '../../services/nurse'
import type { TaskItem } from '../../services/nurse'
import { useLanguage } from '../../i18n/LanguageProvider'

export default function Tasks() {
  const [items, setItems] = useState<TaskItem[]>([])
  const { t } = useLanguage()

  useEffect(() => {
    getTasks().then(setItems)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t('Tasks')}</h2>
          <p className="text-sm text-slate-600">{t('Nursing tasks and checklists')}</p>
        </div>
        <Button variant="primary">{t('Add Task')}</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="text-sm font-medium text-slate-700">{t('Open Tasks')}</div>
        </CardHeader>
        <CardBody>
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">{it.title}</div>
                  <div className="text-xs text-slate-600">{it.meta}</div>
                </div>
                <Button variant="secondary" size="sm">
                  {t('Mark Done')}
                </Button>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}
