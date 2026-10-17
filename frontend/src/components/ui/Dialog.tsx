import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/format'

/** Native <dialog>: focus trap, Esc and backdrop handled by the browser. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const { t } = useI18n()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-lg rounded-card border border-rose-200 bg-white p-0 text-forest-950',
        'backdrop:bg-forest-950/55 backdrop:backdrop-blur-[2px] open:animate-pop-in',
        className,
      )}
    >
      {open && (
        <div className="p-6 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id="dialog-title" className="text-lg font-semibold">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="-m-1 grid size-9 shrink-0 place-items-center rounded-full hover:bg-rose-100"
            >
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
