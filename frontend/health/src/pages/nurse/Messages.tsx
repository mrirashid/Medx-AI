import { useEffect, useState } from 'react'
import Card, { CardBody, CardHeader } from '../../components/common/Card'
import { getConversations } from '../../services/nurse'
import type { ConversationItem } from '../../services/nurse'
import { useLanguage } from '../../i18n/LanguageProvider'

export default function Messages() {
  const [convs, setConvs] = useState<ConversationItem[]>([])
  const { t } = useLanguage()

  useEffect(() => {
    getConversations().then(setConvs)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{t('Messages')}</h2>
        <p className="text-sm text-slate-600">{t('Communication with team and patients')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="text-sm font-medium text-slate-700">{t('Conversations')}</div>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {convs.map((c) => (
                <li key={c.id} className="rounded-md p-2 hover:bg-slate-100">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-slate-600">{c.preview}</div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="text-sm font-medium text-slate-700">{t('Thread')}</div>
          </CardHeader>
          <CardBody>
            <div className="h-80 rounded-md border border-slate-200 p-3">{t('Select a conversation to view.')}</div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
