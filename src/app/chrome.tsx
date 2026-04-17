import { X } from '@phosphor-icons/react/X'
import { AnimatePresence, m } from 'framer-motion'
import type { ReactNode } from 'react'
import { CONTENT_START_DELAY, EASE_SOFT } from './constants'
import type { PanelCardProps, SideSheetProps } from './types'

export function PageHeader({
  title,
  subtitle,
  delay = CONTENT_START_DELAY,
  actions,
  centerContent,
  className = 'content-header',
}: {
  title: string
  subtitle: ReactNode
  delay?: number
  actions?: ReactNode
  centerContent?: ReactNode
  className?: string
}) {
  return (
    <header className={`page-topbar ${className}`.trim()}>
      <div className="page-topbar-copy">
        <m.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, duration: 0.38, ease: EASE_SOFT }}
        >
          {title}
        </m.h2>
        <m.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.14, duration: 0.38, ease: EASE_SOFT }}
        >
          {subtitle}
        </m.p>
      </div>
      {centerContent ? <div className="page-topbar-center">{centerContent}</div> : null}
      {actions ? <div className="page-topbar-actions">{actions}</div> : null}
    </header>
  )
}

function PanelTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: ReactNode }) {
  return (
    <div className="panel-title">
      <span className="panel-title-icon" aria-hidden>
        {icon}
      </span>
      <div className="panel-title-copy">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  )
}

export function PanelCard({ icon, title, children, className, variants, subtitle, delay }: PanelCardProps) {
  return (
    <m.section
      className={`panel-card${className ? ` ${className}` : ''}`}
      variants={variants}
      initial={delay === undefined ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
      animate={delay === undefined ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={delay === undefined ? undefined : { delay, duration: 0.35, ease: EASE_SOFT }}
    >
      <PanelTitle icon={icon} title={title} subtitle={subtitle} />
      <div className="panel-card-body">{children}</div>
    </m.section>
  )
}

export function SideSheet({
  isOpen,
  sheetKey,
  ariaLabel,
  eyebrow,
  title,
  onClose,
  children,
  footer,
  className,
  panelRef,
}: SideSheetProps) {
  return (
    <AnimatePresence initial={false}>
      {isOpen ? (
        <>
          <m.button
            key={`sidesheet-backdrop-${sheetKey}`}
            type="button"
            className="sidesheet-backdrop"
            aria-label={`Close ${ariaLabel}`}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <m.aside
            key={`sidesheet-panel-${sheetKey}`}
            ref={panelRef}
            className={`settings-sidesheet${className ? ` ${className}` : ''}`}
            aria-label={ariaLabel}
            initial={{ x: 28, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 28, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <header className="sheet-header">
              <div>
                <p className="sheet-eyebrow">{eyebrow}</p>
                <h3>{title}</h3>
              </div>
              <button type="button" className="icon-button" aria-label={`Close ${ariaLabel}`} onClick={onClose}>
                <X size={18} />
              </button>
            </header>
            {children}
            {footer ? <div className="sheet-form-footer">{footer}</div> : null}
          </m.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
