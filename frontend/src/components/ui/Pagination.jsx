import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export const Pagination = ({
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 20,
  onPageChange,
  onLimitChange,
  limits = [10, 20, 50],
  itemLabel = 'items',
  customSummary,
  className,
}) => {
  const safePage = Math.max(1, Math.min(page, totalPages || 1));
  const from = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const to = Math.min(safePage * limit, total);

  // Generate page numbers with smart ellipsis: [1, '...', 4, 5, 6, '...', 20]
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (page <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
    }

    if (page >= totalPages - 3) {
      return [1, 'ellipsis-left', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'ellipsis-left', page - 1, page, page + 1, 'ellipsis-right', totalPages];
  }, [page, totalPages]);

  if (total === 0) return null;

  return (
    <div
      className={cn(
        'mt-6 flex flex-col items-center justify-between gap-4 border border-white/10 bg-white/[0.02] px-4 py-3 sm:flex-row',
        className,
      )}
    >
      <div className="flex items-center gap-3 font-mono text-[11px] text-text-secondary">
        {customSummary ? (
          <span>{customSummary}</span>
        ) : (
          <span>
            Showing <strong className="font-bold text-text-primary">{from}–{to}</strong> of{' '}
            <strong className="font-bold text-text-primary">{total}</strong> {itemLabel}
          </span>
        )}

        {onLimitChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
            <span className="text-text-dim">Per page:</span>
            <select
              className="select-glass !py-1 !px-2 !text-[11px] !h-7 bg-black"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              {limits.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="ghost-button inline-flex h-8 items-center gap-1 !px-2.5 !text-[11px] disabled:opacity-30 disabled:pointer-events-none"
          title="Previous page"
        >
          <ChevronLeft size={13} />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 font-mono text-[11px] text-text-dim"
                >
                  …
                </span>
              );
            }

            const active = p === page;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={cn(
                  'h-8 min-w-[32px] px-2 font-mono text-[11px] transition-all',
                  active
                    ? 'border border-white bg-white font-bold text-black shadow-sm'
                    : 'border border-white/10 bg-transparent text-text-secondary hover:border-white/30 hover:text-white',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="ghost-button inline-flex h-8 items-center gap-1 !px-2.5 !text-[11px] disabled:opacity-30 disabled:pointer-events-none"
          title="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={13} />
        </button>
      </nav>
    </div>
  );
};
