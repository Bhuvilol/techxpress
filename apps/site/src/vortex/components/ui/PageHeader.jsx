import { cn } from '../../utils/cn.js';

// Station Departure Board Header.
// Bold Condensed typography matching Indian Railways signage,
// paired with an illuminated LED status kicker and optional actions.

export const PageHeader = ({ kicker, title, description, actions, className }) => (
  <header
    className={cn(
      'mb-6 pb-5 sm:mb-10 sm:pb-8 flex flex-col gap-4 sm:gap-6 border-b border-border-dim md:flex-row md:items-end md:justify-between fade-in',
      className,
    )}
  >
    <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
      {kicker && (
        <div className="kicker !text-[11px] sm:!text-[12px]">
          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-txp-yellow animate-pulse-soft shadow-[0_0_8px_#f5b800]" />
          <span>{kicker}</span>
        </div>
      )}
      <h1 className="font-cond text-[28px] sm:text-[36px] font-black uppercase tracking-[0.04em] text-text-primary md:text-[46px] leading-[1]">
        {title}
      </h1>
      {description && (
        <p className="max-w-2xl font-sans text-[13px] sm:text-[14px] leading-relaxed text-text-secondary">
          {description}
        </p>
      )}
    </div>
    {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 md:w-auto">{actions}</div>}
  </header>
);
