import { cn } from '../../utils/cn.js';

// Railway Platform / Signal Empty State.
// Clear indicator when waiting for data, scores, or team actions.

export const Empty = ({ icon: Icon, title, description, action, className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-5 px-6 py-16 text-center',
      'rounded-[4px] border border-border-mid bg-bg-surface-1/70 backdrop-blur-sm fade-in shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
      className,
    )}
  >
    {Icon && (
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-txp-yellow/20 blur-xl" />
        <div className="relative rounded-[4px] border border-txp-yellow/30 bg-bg-surface-2 p-4 text-txp-yellow shadow-[0_0_16px_-4px_rgba(245,184,0,0.4)]">
          <Icon size={28} strokeWidth={1.8} />
        </div>
      </div>
    )}
    <div className="max-w-md space-y-2">
      <div className="font-cond text-[22px] font-black uppercase tracking-[0.06em] text-text-primary">
        {title}
      </div>
      {description && (
        <p className="font-sans text-[13px] leading-relaxed text-text-secondary">{description}</p>
      )}
    </div>
    {action && <div className="mt-2">{action}</div>}
  </div>
);
