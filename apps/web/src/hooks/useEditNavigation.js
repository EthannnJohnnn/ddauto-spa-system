import { useEffect, useRef } from 'react';

export function useEditNavigation(editingValue) {
  const editRegionRef = useRef(null);

  useEffect(() => {
    if (!editingValue) return undefined;
    const frame = requestAnimationFrame(() => {
      const region = editRegionRef.current;
      if (!region) return;
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      region.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      region
        .querySelector('input:not([type="hidden"]), select, textarea, button')
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [editingValue]);

  return editRegionRef;
}
