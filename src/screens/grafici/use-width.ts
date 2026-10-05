import { useEffect, useRef, useState } from "react";

/** The width of an element in CSS pixels, kept up to date: charts are drawn at the size they have, as the prototype does. */
export function useWidth<E extends HTMLElement>(fallback = 320) {
  const ref = useRef<E>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(240, Math.floor(el.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}
