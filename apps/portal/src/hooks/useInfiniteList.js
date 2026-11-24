import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Offset-paged list that loads more as a sentinel scrolls into view.
//
//   const list = useInfiniteList(
//     ({ offset, limit }) => api.get('/x', { query: { offset, limit, search } }),
//     [search],
//     { pageSize: 20 },
//   );
//   <div ref={list.setRootEl} className="overflow-y-auto">…
//     {list.items.map(...)}
//     <div ref={list.setSentinelEl} />
//   </div>
//
// The fetcher must resolve to { users|items, total, hasMore, ...extra }.
// `deps` changing resets to page one. Responses from an older reset are
// dropped, and items are de-duplicated by id (the ranking can shift while
// someone scrolls). No refetch-on-focus: re-downloading pages on every
// focus is exactly the load this hook exists to avoid.

export const useInfiniteList = (fetchPage, deps = [], { pageSize = 20, itemsKey = 'items' } = {}) => {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, hasMore: true, extra: {} });
  const [loading, setLoading] = useState(true);       // first page
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Latest fetcher without re-running effects (updated after render).
  const fetchRef = useRef(fetchPage);
  useLayoutEffect(() => { fetchRef.current = fetchPage; });
  const generation = useRef(0);
  const inFlight = useRef(false);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);

  // Callback refs (state, not useRef) so the observer re-attaches when the
  // nodes mount, and render code can read the returned object freely.
  const [root, setRoot] = useState(null);
  const [sentinel, setSentinel] = useState(null);

  // Fetch one page. State is only set inside the promise callbacks, so the
  // reset effect below can call this without a synchronous setState.
  const fetchInto = useCallback((reset) => {
    const gen = reset ? ++generation.current : generation.current;
    const offset = reset ? 0 : offsetRef.current;
    inFlight.current = true;
    return Promise.resolve()
      .then(() => fetchRef.current({ offset, limit: pageSize }))
      .then((res) => {
        if (gen !== generation.current) return; // superseded by a newer reset
        const { total = 0, hasMore = false, ...rest } = res ?? {};
        const page = rest[itemsKey] ?? [];
        const extra = { ...rest };
        delete extra[itemsKey];
        offsetRef.current = offset + page.length;
        hasMoreRef.current = hasMore;
        setItems((prev) => {
          if (reset) return page;
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...page.filter((i) => !seen.has(i.id))];
        });
        setMeta({ total, hasMore, extra });
      })
      .catch((err) => {
        if (gen === generation.current) setError(err);
      })
      .finally(() => {
        if (gen === generation.current) {
          inFlight.current = false;
          setLoading(false);
          setLoadingMore(false);
        }
      });
  }, [pageSize, itemsKey]);

  // Next page (observer / Retry). No-op while a page is in flight or at the end.
  const loadMore = useCallback(() => {
    if (inFlight.current || !hasMoreRef.current) return;
    setLoadingMore(true);
    setError(null);
    fetchInto(false);
  }, [fetchInto]);

  // Start over from page one (Retry when nothing has loaded yet).
  const reload = useCallback(() => {
    offsetRef.current = 0;
    hasMoreRef.current = true;
    setLoading(true);
    setError(null);
    fetchInto(true);
  }, [fetchInto]);

  // Inputs changed → show the first-page loading state right away, in the
  // same render (React's "adjust state when a prop changes" pattern).
  const depsKey = JSON.stringify(deps);
  const [prevKey, setPrevKey] = useState(depsKey);
  if (prevKey !== depsKey) {
    setPrevKey(depsKey);
    setItems([]);
    setLoading(true);
    setError(null);
  }

  // Reset to page one whenever the inputs change.
  useEffect(() => {
    offsetRef.current = 0;
    hasMoreRef.current = true;
    fetchInto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Load the next page when the sentinel nears the bottom of the scroll root.
  useEffect(() => {
    if (!sentinel) return undefined;
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) loadMore(); },
      { root, rootMargin: '0px 0px 300px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [root, sentinel, loadMore, items.length]);

  return {
    items,
    total: meta.total,
    hasMore: meta.hasMore,
    extra: meta.extra,
    loading,
    loadingMore,
    error,
    loadMore,
    reload,
    setRootEl: setRoot,
    setSentinelEl: setSentinel,
  };
};
