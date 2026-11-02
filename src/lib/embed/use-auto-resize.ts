"use client";

import { useEffect, type RefObject } from "react";

export function useAutoResize(ref: RefObject<HTMLElement | null>, hostOrigin: string | null) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.parent === window) return; // page ouverte hors iframe

    let target = "*";
    try {
      if (hostOrigin) target = new URL(hostOrigin).origin;
    } catch {
      // host invalide : on garde "*", la hauteur n'est pas une donnée sensible
    }

    const send = () =>
      window.parent.postMessage({ type: "daisy:resize", height: el.offsetHeight }, target);

    window.parent.postMessage({ type: "daisy:ready" }, target);
    const observer = new ResizeObserver(send);
    observer.observe(el);
    send();

    return () => observer.disconnect();
  }, [ref, hostOrigin]);
}