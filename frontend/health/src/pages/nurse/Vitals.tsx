import { useEffect, useState } from 'react'
import Card, { CardBody, CardHeader } from '../../components/common/Card'
import { getVitals } from '../../services/nurse'
import type { VitalsEntry } from '../../services/nurse'
import { useLanguage } from '../../i18n/LanguageProvider'

export default function Vitals() {
  const [rows, setRows] = useState<VitalsEntry[]>([])
  const { t } = useLanguage()

  useEffect(() => {
    getVitals().then(setRows)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{t('Vitals')}</h2>
        <p className="text-sm text-slate-600">{t('Record and review patient vitals')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="text-sm font-medium text-slate-700">{t('Recent Entries')}</div>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="px-3 py-2">{t('Patient')}</th>
                  <th className="px-3 py-2">{t('Temp')}</th>
                  <th className="px-3 py-2">{t('BP')}</th>
                  <th className="px-3 py-2">{t('Pulse')}</th>
                  <th className="px-3 py-2">{t('SpO₂')}</th>
                  <th className="px-3 py-2">{t('Time')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="px-3 py-2">{r.patient}</td>
                    <td className="px-3 py-2">{r.temp}</td>
                    <td className="px-3 py-2">{r.bp}</td>
                    <td className="px-3 py-2">{r.pulse}</td>
                    <td className="px-3 py-2">{r.spo2}</td>
                    <td className="px-3 py-2">{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
