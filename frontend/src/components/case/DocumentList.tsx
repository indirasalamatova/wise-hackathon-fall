import { useState } from 'react'
import { Badge } from '@/components/ui/primitives'
import { Button } from '@/components/ui/Button'
import { docStatusMeta } from '@/components/ui/status'
import { useCase } from '@/store/context'
import type { CaseDocument } from '@/lib/types'
import { PayDialog, RequestDialog, UploadDialog } from './DocumentDialogs'

const actionLabel = { request: 'Request', upload: 'Upload', pay: 'Pay with Wise' } as const
const FEE_EUR = 47

/** Document rows with their actions wired to the request / upload / pay flows. */
export function DocumentList({ documents, showReady = true }: { documents: CaseDocument[]; showReady?: boolean }) {
  const { updateDocument } = useCase()
  const [upload, setUpload] = useState<CaseDocument | null>(null)
  const [request, setRequest] = useState<CaseDocument | null>(null)
  const [pay, setPay] = useState<CaseDocument | null>(null)

  const list = showReady ? documents : documents.filter((d) => d.status !== 'ready')

  return (
    <>
      <ul className="divide-y divide-rose-200">
        {list.map((d) => {
          const meta = docStatusMeta[d.status]
          const action = d.status === 'ready' || d.status === 'checking' ? undefined : d.action
          return (
            <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
              <div className="min-w-0 flex-1 basis-48">
                <p className="text-sm font-semibold text-forest-950">{d.name}</p>
                <p className="truncate text-xs text-muted">{d.status === 'ready' && d.fileName ? d.fileName : d.hint}</p>
              </div>
              <Badge tone={meta.tone} className="min-w-[94px]">
                {meta.label}
              </Badge>
              {action ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-[100px]"
                  onClick={() => (action === 'upload' ? setUpload(d) : action === 'request' ? setRequest(d) : setPay(d))}
                >
                  {actionLabel[action]}
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="min-w-[100px]" onClick={() => setUpload(d)}>
                  Replace
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      <UploadDialog doc={upload} onClose={() => setUpload(null)} />
      <RequestDialog doc={request} onClose={() => setRequest(null)} />
      <PayDialog
        open={!!pay}
        amount={FEE_EUR}
        what="Residence permit renewal fee · HUF 18,000"
        onClose={() => setPay(null)}
        onPaid={(ref) =>
          pay && updateDocument(pay.id, { status: 'ready', fileName: `wise-receipt-${ref}.pdf`, action: undefined })
        }
      />
    </>
  )
}
