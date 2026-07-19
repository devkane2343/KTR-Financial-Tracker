import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders its children into a portal at document.body.
 *
 * Why this is required (not just tidy): tab panels carry
 * `will-change: transform` + a transform animation (.tab-panel-active in
 * index.html). A transformed ancestor becomes the containing block for any
 * `position: fixed` descendant — so a modal's `fixed inset-0` overlay resolves
 * against the TAB PANEL's box, not the viewport, and its full-screen scrim ends
 * up clipped to a band in the middle of the page. Portalling the overlay to
 * <body> escapes that ancestor so `fixed inset-0` covers the real viewport.
 */
export const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Guard against SSR / first paint: only portal once the document body exists.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
};
