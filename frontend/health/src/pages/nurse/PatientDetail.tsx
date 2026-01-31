import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useLanguage } from '../../i18n/LanguageProvider'
import Card, { CardBody, CardHeader } from '../../components/common/Card'
import Button from '../../components/common/Button'
import { getPatientDetail } from '../../services/nurse'

export default function PatientDetail() {
  const { id = '' } = useParams()
  const { t } = useLanguage()
  const [vitals, setVitals] = useState<{ label: string; value: string }[]>([])

  useEffect(() => {
    if (id) getPatientDetail(id).then((d) => setVitals(d.vitals))
  }, [id])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t('Patient')} {id}</h2>
          <p className="text-sm text-slate-600">{t('Overview and recent activity')}</p>
        </div>
        <Link to="/nurse/patients" className="text-sm text-slate-600 hover:text-slate-900">
          {t('Back to list')}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="text-sm font-medium text-slate-700">Vitals</div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {vitals.map((v) => (
                <div key={v.label} className="rounded-md border border-slate-200 p-3">
                  <div className="text-xs text-slate-600">{t(v.label)}</div>
                  <div className="text-lg font-semibold text-slate-900">{v.value}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-700">Actions</div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <Button className="w-full">Record Vitals</Button>
              <Button variant="secondary" className="w-full">
                Administer Medication
              </Button>
              <Button variant="ghost" className="w-full">
                Add Notes
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
