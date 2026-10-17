import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Avatar, Card, CardTitle, Field, Input, PageHeader, Toggle } from '@/components/ui/primitives'
import { useI18n, type Key } from '@/i18n'
import type { ProfilePatch, Settings, User } from '@/lib/types'
import { useAuth, useCase, useToast } from '@/store/context'

const fields: { key: keyof ProfilePatch & keyof User; label: Key; placeholder: Key }[] = [
  { key: 'fullName', label: 'profile.field.fullName', placeholder: 'profile.field.fullName.ph' },
  { key: 'citizenship', label: 'profile.field.citizenship', placeholder: 'profile.field.citizenship.ph' },
  { key: 'passport', label: 'profile.field.passport', placeholder: 'profile.field.passport.ph' },
  { key: 'address', label: 'profile.field.address', placeholder: 'profile.field.address.ph' },
  { key: 'residenceStatus', label: 'profile.field.residenceStatus', placeholder: 'profile.field.residenceStatus.ph' },
  { key: 'studies', label: 'profile.field.studies', placeholder: 'profile.field.studies.ph' },
]

function SettingRow({ k, title, hint }: { k: keyof Settings; title: string; hint?: string }) {
  const { settings, setSetting } = useAuth()
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <p className="text-[15px] font-semibold">{title}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <Toggle checked={settings[k]} onChange={(v) => setSetting(k, v)} label={title} />
    </div>
  )
}

function EditDialog({ open, onClose, user }: { open: boolean; onClose: () => void; user: User }) {
  const { updateUser } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f.key, String(user[f.key] ?? '')])) as Record<string, string>)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} title={t('profile.edit')} description={t('profile.editDescription')}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setSaving(true)
          setError(null)
          try {
            await updateUser(form as ProfilePatch)
            toast(t('profile.saved'), 'success')
            onClose()
          } catch (err) {
            setError(err instanceof Error ? err.message : t('profile.saveFailed'))
          } finally {
            setSaving(false)
          }
        }}
      >
        {fields.map((f) => (
          <Field key={f.key} label={t(f.label)} htmlFor={`ed-${f.key}`}>
            <Input
              id={`ed-${f.key}`}
              value={form[f.key]}
              placeholder={t(f.placeholder)}
              required={f.key === 'fullName'}
              maxLength={f.key === 'fullName' ? 120 : 200}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          </Field>
        ))}
        {error && (
          <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm text-brick-700">
            {error}
          </p>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={saving}>
            {t('profile.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

export function ProfilePage() {
  const { user, logout, deleteAccount } = useAuth()
  const { documents, tasks, payments } = useCase()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const { t, locale } = useI18n()
  if (!user) return null

  const downloadData = () => {
    const data = { exportedAt: new Date().toISOString(), profile: user, tasks, documents, payments }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'unbound-my-data.json'
    a.click()
    URL.revokeObjectURL(a.href)
    toast(t('profile.downloading'))
  }

  return (
    <>
      <PageHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        aside={
          <Button variant="outline" onClick={() => setEditing(true)}>
            {t('profile.edit')}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Avatar size="xl" text={user.initials} src={user.pictureUrl} />
              <div className="min-w-0">
                <p className="font-display truncate text-xl font-semibold">{user.fullName}</p>
                <p className="truncate text-[13px] text-muted">
                  {t('profile.memberSince', { email: user.email, date: new Date(user.memberSince).toLocaleDateString(locale, { month: 'long', year: 'numeric' }) })}
                </p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-[120px_minmax(0,1fr)] gap-y-3.5 text-sm">
              {fields.slice(1).map((f) => (
                <div key={f.key} className="contents">
                  <dt className="text-muted">{t(f.label)}</dt>
                  <dd className={user[f.key] ? 'font-semibold' : 'text-muted/70'}>
                    {String(user[f.key] || '') || (
                      <button type="button" onClick={() => setEditing(true)} className="underline underline-offset-2 hover:text-forest-950">
                        {t('common.add')}
                      </button>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-6">
            <CardTitle>{t('profile.privacy')}</CardTitle>
            <p className="mt-1 text-sm text-muted">{t('profile.privacyBody')}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={downloadData}>
                {t('profile.download')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout()
                  navigate('/')
                }}
              >
                {t('profile.logOut')}
              </Button>
              <Button variant="accent" size="sm" onClick={() => setDeleting(true)}>
                {t('profile.deleteAccount')}
              </Button>
            </div>
          </Card>
        </div>

        <Card className="h-fit p-6">
          <CardTitle className="mb-2">{t('profile.notifications')}</CardTitle>
          <SettingRow k="push" title={t('profile.push')} />
          <SettingRow k="email" title={t('profile.email')} hint={t('profile.emailHint')} />
          <SettingRow k="sms" title={t('profile.sms')} hint={t('profile.smsHint')} />
        </Card>
      </div>

      <EditDialog key={String(editing)} open={editing} onClose={() => setEditing(false)} user={user} />

      <Dialog
        open={deleting}
        onClose={() => !deleteBusy && setDeleting(false)}
        title={t('profile.deleteTitle')}
        description={t('profile.deleteBody', { count: documents.length })}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(false)} disabled={deleteBusy}>
            {t('profile.keep')}
          </Button>
          <Button
            variant="accent"
            loading={deleteBusy}
            onClick={async () => {
              setDeleteBusy(true)
              try {
                await deleteAccount()
                navigate('/')
                toast(t('profile.deleted'))
              } catch (e) {
                setDeleteBusy(false)
                toast(e instanceof Error ? e.message : t('profile.deleteFailed'), 'error')
              }
            }}
          >
            {t('profile.deleteAccount')}
          </Button>
        </div>
      </Dialog>
    </>
  )
}
