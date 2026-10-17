import { useState } from 'react'
import { FileImage, FileText, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/primitives'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { fileSize, shortDate } from '@/lib/format'
import type { CaseDocument } from '@/lib/types'
import { useCase, useToast } from '@/store/context'
import { AnalysisPanel } from './AnalysisPanel'
import { expiryOf } from './expiry'

/** Uploaded documents with open (inline preview in a new tab) and delete. */
export function DocumentList({ documents, compact = false }: { documents: CaseDocument[]; compact?: boolean }) {
  const { openDocument, deleteDocument } = useCase()
  const { toast } = useToast()
  const [confirm, setConfirm] = useState<CaseDocument | null>(null)
  const [deleting, setDeleting] = useState(false)

  return (
    <>
      <ul className="divide-y divide-rose-200">
        {documents.map((d) => {
          const expiry = expiryOf(d.expiresOn)
          const Icon = d.contentType.startsWith('image/') ? FileImage : FileText
          return (
            <li key={d.id} className="flex flex-wrap items-start gap-x-3.5 gap-y-2 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-brick-600">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate text-sm font-semibold text-forest-950">{d.title}</p>
                <p className="truncate text-xs text-muted">
                  {d.category} · {compact ? shortDate(d.uploadedAt.slice(0, 10)) : `${d.fileName} · ${fileSize(d.size)} · uploaded ${shortDate(d.uploadedAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </p>
                {!compact && <AnalysisPanel doc={d} />}
              </div>
              {expiry.state !== 'none' && <Badge tone={expiry.tone}>{expiry.label}</Badge>}
              <Button variant="outline" size="sm" onClick={() => openDocument(d)}>
                Open
              </Button>
              {!compact && (
                <button
                  type="button"
                  onClick={() => setConfirm(d)}
                  aria-label={`Delete ${d.title}`}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-forest-950/70 hover:bg-rose-100 hover:text-brick-600"
                >
                  <Trash2 className="size-[17px]" />
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <Dialog
        open={!!confirm}
        onClose={() => !deleting && setConfirm(null)}
        title={`Delete ${confirm?.title ?? 'document'}?`}
        description="The file is removed from storage. This can’t be undone."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirm(null)} disabled={deleting}>
            Keep it
          </Button>
          <Button
            variant="accent"
            loading={deleting}
            onClick={async () => {
              if (!confirm) return
              setDeleting(true)
              try {
                await deleteDocument(confirm.id)
                toast(`${confirm.title} deleted`)
                setConfirm(null)
              } catch (e) {
                toast(e instanceof Error ? e.message : 'Delete failed. Try again.', 'error')
              } finally {
                setDeleting(false)
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  )
}
