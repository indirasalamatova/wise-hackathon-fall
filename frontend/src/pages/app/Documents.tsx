import { useState } from 'react'
import { Link } from 'react-router'
import { FileUp, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, PageHeader, Segmented } from '@/components/ui/primitives'
import { DocumentList } from '@/components/case/DocumentList'
import { UploadDialog } from '@/components/case/DocumentDialogs'
import { EXPIRY_WARNING_DAYS, expiryOf } from '@/components/case/expiry'
import { useI18n } from '@/i18n'
import { cn, fileSize } from '@/lib/format'
import { documentCategories, type DocumentCategory } from '@/lib/types'
import { useCase } from '@/store/context'

type Filter = 'all' | 'attention'

export function DocumentsPage() {
  const { documents, forms } = useCase()
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [category, setCategory] = useState<DocumentCategory | 'all'>('all')
  const { t } = useI18n()

  const attention = documents.filter((d) => ['expired', 'soon'].includes(expiryOf(d.expiresOn).state))
  const list = (filter === 'attention' ? attention : documents).filter((d) => category === 'all' || d.category === category)
  const counts = documentCategories.map((c) => [c, documents.filter((d) => d.category === c).length] as const).filter(([, n]) => n > 0)
  const totalSize = documents.reduce((s, d) => s + d.size, 0)

  return (
    <>
      <PageHeader
        eyebrow={
          documents.length ? `${t('docs.onFile', { count: documents.length })} · ${t('docs.needAttention', { count: attention.length })}` : undefined
        }
        title={t('docs.title')}
        subtitle={t('docs.subtitle')}
        aside={
          <Button variant="accent" onClick={() => setUploading(true)}>
            <FileUp className="size-4" aria-hidden /> {t('docs.upload')}
          </Button>
        }
      />

      {documents.length === 0 ? (
        <Card className="grid place-items-center px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-rose-100 text-brick-600">
            <FileUp className="size-6" aria-hidden />
          </span>
          <h2 className="mt-5 text-lg font-semibold">{t('docs.firstTitle')}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">{t('docs.firstBody')}</p>
          <Button variant="accent" className="mt-6" onClick={() => setUploading(true)}>
            {t('docs.upload')}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_272px]">
          <Card className="p-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <Segmented
                label={t('docs.filter')}
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: t('docs.filterAll', { count: documents.length }) },
                  { value: 'attention', label: t('docs.filterAttention', { count: attention.length }) },
                ]}
              />
              <label className="sr-only" htmlFor="doc-filter-category">
                {t('docs.type')}
              </label>
              <select
                id="doc-filter-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory | 'all')}
                className="h-9 rounded-full border-2 border-rose-200 bg-white px-3 text-[13px] font-semibold outline-none focus:border-forest-950"
              >
                <option value="all">{t('docs.allTypes')}</option>
                {documentCategories.map((c) => (
                  <option key={c} value={c}>
                    {t(`docCategory.${c}`)}
                  </option>
                ))}
              </select>
            </div>
            {list.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">
                {filter === 'attention' ? t('docs.nothingExpires', { days: EXPIRY_WARNING_DAYS }) : t('docs.noneOfType')}
              </p>
            ) : (
              <DocumentList documents={list} />
            )}
          </Card>

          <aside className="flex flex-col gap-4">
            <Card className="p-6">
              <CardTitle>{t('docs.byType')}</CardTitle>
              <ul className="mt-3 flex flex-col gap-1">
                {counts.map(([c, n]) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => setCategory(category === c ? 'all' : c)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-blush',
                        category === c && 'bg-rose-100 font-semibold',
                      )}
                    >
                      {t(`docCategory.${c}`)} <span className="text-muted">{n}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-rose-200 pt-3 text-[13px] text-muted">{t('docs.stored', { size: fileSize(totalSize) })}</p>
            </Card>

            {forms.length > 0 && (
              <Card className="p-6">
                <CardTitle>{t('docs.forms')}</CardTitle>
                <ul className="mt-3 flex flex-col gap-1">
                  {forms.map((f) => {
                    const missing = f.fields.filter((x) => x.status === 'missing').length
                    return (
                      <li key={f.id}>
                        <Link to={`/app/forms/${f.id}`} className="block rounded-lg px-2 py-1.5 hover:bg-blush">
                          <span className="block truncate text-sm font-semibold">{f.title}</span>
                          <span className="text-xs text-muted">{missing ? t('docs.fieldsToComplete', { count: missing }) : t('docs.allFilled')}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )}

            <div className="flex flex-col gap-3 px-2 text-[13px] text-muted">
              <p className="flex items-center gap-2">
                <Lock className="size-4 shrink-0" aria-hidden /> {t('docs.private')}
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="size-4 shrink-0" aria-hidden /> {t('docs.onlyYou')}
              </p>
            </div>
          </aside>
        </div>
      )}

      <UploadDialog open={uploading} onClose={() => setUploading(false)} />
    </>
  )
}
