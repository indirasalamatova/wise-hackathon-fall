import { useState } from 'react'
import { Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { Card, CardTitle, PageHeader, Progress, Segmented } from '@/components/ui/primitives'
import { DocumentList } from '@/components/case/DocumentList'
import { useCase } from '@/store/context'

type Filter = 'todo' | 'ready' | 'all'

export function DocumentsPage() {
  const { documents } = useCase()
  const [filter, setFilter] = useState<Filter>('todo')
  const ready = documents.filter((d) => d.status === 'ready')
  const todo = documents.filter((d) => d.status !== 'ready')
  const list = filter === 'todo' ? todo : filter === 'ready' ? ready : documents
  const failed = documents.filter((d) => d.status === 'rejected')

  return (
    <>
      <PageHeader
        eyebrow={`${todo.length} to do · ${ready.length} ready`}
        title="Documents"
        subtitle="Upload once. We check every file against your case before the office does."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_288px]">
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Permit renewal</CardTitle>
            <Segmented
              label="Filter documents"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'todo', label: `To do (${todo.length})` },
                { value: 'ready', label: 'Ready' },
                { value: 'all', label: 'All' },
              ]}
            />
          </div>
          {list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              {filter === 'todo' ? 'Every document is ready. You can submit on Enter Hungary.' : 'No documents ready yet. Start with the ones marked missing.'}
            </p>
          ) : (
            <DocumentList documents={list} />
          )}
        </Card>

        <aside className="flex flex-col gap-4">
          <Card className="p-6">
            <CardTitle>Progress</CardTitle>
            <Progress value={(ready.length / documents.length) * 100} className="mt-4" label="Documents ready" />
            <p className="mt-2 text-[13px] text-muted">
              {ready.length} of {documents.length} documents ready
            </p>
            {failed.length > 0 && (
              <p className="mt-4 rounded-xl bg-rose-100 px-3.5 py-2.5 text-[13px] text-brick-700">
                {failed.map((f) => f.name).join(', ')} {failed.length === 1 ? 'needs' : 'need'} a new file.
              </p>
            )}
          </Card>

          <Card tone="dark" className="p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-rose-300" aria-hidden /> What the AI check looks at
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-[13px] text-rose-300">
              <li>Names match your passport exactly</li>
              <li>Issue dates are inside the required window</li>
              <li>Policies and leases cover the full permit period</li>
              <li>Scans are readable and every page is there</li>
            </ul>
          </Card>

          <div className="flex flex-col gap-3 px-2 text-[13px] text-muted">
            <p className="flex items-center gap-2">
              <Lock className="size-4 shrink-0" aria-hidden /> Encrypted, stored in the EU
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0" aria-hidden /> Shared only with offices you approve
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}
