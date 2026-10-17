import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Avatar, Card, CardTitle, Field, Input, PageHeader, Toggle } from '@/components/ui/primitives'
import type { ProfilePatch, Settings, User } from '@/lib/types'
import { useAuth, useCase, useToast } from '@/store/context'

const fields: { key: keyof ProfilePatch & keyof User; label: string; placeholder: string }[] = [
  { key: 'fullName', label: 'Full name', placeholder: 'As in your passport' },
  { key: 'citizenship', label: 'Citizenship', placeholder: 'e.g. Kazakhstan' },
  { key: 'passport', label: 'Passport', placeholder: 'e.g. ends 4417, valid to Mar 2031' },
  { key: 'address', label: 'Address', placeholder: 'e.g. Budapest VIII, Hungary' },
  { key: 'residenceStatus', label: 'Status', placeholder: 'e.g. Residence permit for study, to Jan 2027' },
  { key: 'studies', label: 'Studies or work', placeholder: 'e.g. BSc Business Informatics, to Jun 2029' },
]

function SettingRow({ k, title, hint }: { k: keyof Omit<Settings, 'language'>; title: string; hint?: string }) {
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

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} title="Edit details" description="Only you see these. The assistant uses them to answer about your case.">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setSaving(true)
          setError(null)
          try {
            await updateUser(form as ProfilePatch)
            toast('Details saved', 'success')
            onClose()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Details weren’t saved. Try again.')
          } finally {
            setSaving(false)
          }
        }}
      >
        {fields.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`ed-${f.key}`}>
            <Input
              id={`ed-${f.key}`}
              value={form[f.key]}
              placeholder={f.placeholder}
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
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save changes
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
  if (!user) return null

  const downloadData = () => {
    const data = { exportedAt: new Date().toISOString(), profile: user, tasks, documents, payments }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'unbound-my-data.json'
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Your data is downloading')
  }

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="My profile"
        aside={
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit details
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
                  {user.email} · member since {new Date(user.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-[120px_minmax(0,1fr)] gap-y-3.5 text-sm">
              {fields.slice(1).map((f) => (
                <div key={f.key} className="contents">
                  <dt className="text-muted">{f.label}</dt>
                  <dd className={user[f.key] ? 'font-semibold' : 'text-muted/70'}>
                    {String(user[f.key] || '') || (
                      <button type="button" onClick={() => setEditing(true)} className="underline underline-offset-2 hover:text-forest-950">
                        Add
                      </button>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-6">
            <CardTitle>Privacy and data</CardTitle>
            <p className="mt-1 text-sm text-muted">Download everything we hold about you, or delete your account and all your files.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={downloadData}>
                Download my data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout()
                  navigate('/')
                }}
              >
                Log out
              </Button>
              <Button variant="accent" size="sm" onClick={() => setDeleting(true)}>
                Delete account
              </Button>
            </div>
          </Card>
        </div>

        <Card className="h-fit p-6">
          <CardTitle className="mb-2">Notifications</CardTitle>
          <SettingRow k="push" title="Push notifications" />
          <SettingRow k="email" title="Email" hint="Weekly summary and urgent deadlines" />
          <SettingRow k="sms" title="SMS for urgent deadlines" hint="Document expiry and appointment day only" />
        </Card>
      </div>

      <EditDialog key={String(editing)} open={editing} onClose={() => setEditing(false)} user={user} />

      <Dialog
        open={deleting}
        onClose={() => !deleteBusy && setDeleting(false)}
        title="Delete your account?"
        description={`This deletes your profile, ${documents.length} document${documents.length === 1 ? '' : 's'}, tasks and payment history. It can’t be undone.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(false)} disabled={deleteBusy}>
            Keep account
          </Button>
          <Button
            variant="accent"
            loading={deleteBusy}
            onClick={async () => {
              setDeleteBusy(true)
              try {
                await deleteAccount()
                navigate('/')
                toast('Your account was deleted')
              } catch (e) {
                setDeleteBusy(false)
                toast(e instanceof Error ? e.message : 'Account wasn’t deleted. Try again.', 'error')
              }
            }}
          >
            Delete account
          </Button>
        </div>
      </Dialog>
    </>
  )
}
