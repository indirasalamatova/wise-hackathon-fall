import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Flag } from '@/components/brand/Flag'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Avatar, Card, CardTitle, Field, Input, PageHeader, Toggle } from '@/components/ui/primitives'
import { initials, shortDate } from '@/lib/format'
import type { Settings, User } from '@/lib/types'
import { useAuth, useCase, useToast } from '@/store/context'

function SettingRow({ k, title, hint }: { k: keyof Omit<Settings, 'language'>; title: string; hint?: string }) {
  const { settings, setSetting } = useCase()
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
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, address: user.address })

  return (
    <Dialog open={open} onClose={onClose} title="Edit details" description="Use your name exactly as it appears in your passport.">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          updateUser(form)
          toast('Details saved', 'success')
          onClose()
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="ed-first">
            <Input id="ed-first" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </Field>
          <Field label="Last name" htmlFor="ed-last">
            <Input id="ed-last" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </Field>
        </div>
        <Field label="Address" htmlFor="ed-address">
          <Input id="ed-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </Dialog>
  )
}

export function ProfilePage() {
  const { user, logout } = useAuth()
  const { resetDemo } = useCase()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  if (!user) return null

  const rows: [string, React.ReactNode][] = [
    [
      'Citizenship',
      <span className="flex items-center gap-2">
        <Flag code={user.citizenship} className="h-4 w-[22px]" /> Kazakhstan
      </span>,
    ],
    ['Passport', `•••• ${user.passport.last4} · valid to ${shortDate(user.passport.validUntil, { day: 'numeric', month: 'short', year: 'numeric' })}`],
    ['Address', user.address],
    ['Status', user.status],
    ['Studies', user.studies],
  ]

  const downloadData = () => {
    const blob = new Blob([JSON.stringify({ user, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
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
              <Avatar size="xl" text={initials(user.firstName, user.lastName)} />
              <div>
                <p className="font-display text-xl font-semibold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[13px] text-muted">
                  Member since {shortDate(user.memberSince, { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-[110px_minmax(0,1fr)] gap-y-3.5 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-6">
            <CardTitle>Privacy and data</CardTitle>
            <p className="mt-1 text-sm text-muted">Documents are encrypted and stored in the EU. Download or delete everything at any time.</p>
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

        <div className="flex flex-col gap-4">
          <Card className="p-6">
            <CardTitle className="mb-2">Connected accounts</CardTitle>
            <SettingRow k="wise" title="Wise" hint="Fees, proof of funds and payment history" />
            <SettingRow k="calendar" title="Calendar" hint="Deadlines and appointments added automatically" />
          </Card>
          <Card className="p-6">
            <CardTitle className="mb-2">Notifications</CardTitle>
            <SettingRow k="push" title="Push notifications" />
            <SettingRow k="email" title="Email" hint="Weekly summary and urgent deadlines" />
            <SettingRow k="sms" title="SMS for urgent deadlines" hint="Permit expiry and appointment day only" />
          </Card>
          <button
            type="button"
            onClick={() => {
              resetDemo()
              toast('Demo data reset')
            }}
            className="self-start px-2 text-[13px] text-muted underline underline-offset-2 hover:text-forest-950"
          >
            Reset demo data
          </button>
        </div>
      </div>

      <EditDialog key={String(editing)} open={editing} onClose={() => setEditing(false)} user={user} />

      <Dialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete your account?"
        description="This removes your case, documents and history. It can’t be undone."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(false)}>
            Keep account
          </Button>
          <Button
            variant="accent"
            onClick={() => {
              logout()
              navigate('/')
            }}
          >
            Delete account
          </Button>
        </div>
      </Dialog>
    </>
  )
}
