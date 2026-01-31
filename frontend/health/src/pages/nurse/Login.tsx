import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../store/auth'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import { useLanguage } from '../../i18n/LanguageProvider'

export default function Login() {
  const { login } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('nurse@example.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      window.location.href = '/nurse'
    } catch (err) {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">{t('Nurse Sign In')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('Access your nursing dashboard')}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label={t('Email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label={t('Password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="text-sm text-red-600">{t(error)}</div>}
        <Button type="submit" block disabled={loading}>
          {loading ? t('Signing in…') : t('Sign In')}
        </Button>
      </form>
    </div>
  )
}
