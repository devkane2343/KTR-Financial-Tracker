import { useEffect, useRef } from 'react';

/**
 * Shared modal-dialog behavior so every overlay in the app is keyboard- and
 * screen-reader-safe without each one re-implementing it. Handles the three
 * things a hand-rolled `fixed inset-0` overlay almost always forgets:
 *
 *   1. Body scroll lock  — the page behind the scrim must not scroll while a
 *      dialog is open (compensates for the scrollbar so content doesn't shift).
 *   2. Focus management   — moves focus into the dialog on open and restores it
 *      to whatever was focused before (the trigger) on close.
 *   3. Focus trap         — Tab / Shift+Tab cycle within the dialog instead of
 *      escaping to the page underneath, and Escape closes.
 *
 * Usage: attach the returned ref to the dialog's panel element (the surface,
 * not the backdrop). `onClose` is called on Escape; pass `escapeClosable=false`
 * to disable that (e.g. mid-write). Returns the ref so the caller can also use
 * it for its own measurements if needed.
 */
export function useModal<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void,
  opts: { escapeClosable?: boolean; active?: boolean } = {},
) {
  const { escapeClosable = true, active = true } = opts;
  const panelRef = useRef<T | null>(null);
  // Keep the latest onClose without re-running the effect (and re-locking scroll)
  // every render — the effect should run once per open/close, not per keystroke.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const escapeRef = useRef(escapeClosable);
  escapeRef.current = escapeClosable;

  useEffect(() => {
    // Only engage while the modal is actually open. Lets an always-mounted modal
    // (one that renders null when closed) toggle behavior via `active` without
    // locking scroll or trapping focus while it's hidden.
    if (!active) return;
    const panel = panelRef.current;
    // The element that had focus before the dialog opened — restored on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // --- Body scroll lock (with scrollbar-width compensation) ----------------
    const { body, documentElement: html } = document;
    const scrollbarW = window.innerWidth - html.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;

    // --- Move focus into the dialog ------------------------------------------
    // Prefer an element that opted in with autoFocus / [data-autofocus]; else the
    // first focusable; else the panel itself (needs tabIndex=-1 on the panel).
    const focusables = () =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null || el === document.activeElement)
        : [];

    // Don't yank focus away from a field the browser already auto-focused
    // (inputs with autoFocus fire before this effect); only pull focus in if it
    // isn't already inside the panel.
    if (panel && !panel.contains(document.activeElement)) {
      const preferred = panel.querySelector<HTMLElement>('[data-autofocus]');
      const target = preferred ?? focusables()[0] ?? panel;
      // rAF so the element is laid out (animate-fade-up) before we focus it.
      requestAnimationFrame(() => target?.focus());
    }

    // --- Key handling: Escape to close, Tab to trap --------------------------
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (escapeRef.current) { e.stopPropagation(); onCloseRef.current(); }
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = focusables();
      if (items.length === 0) { e.preventDefault(); panel.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const focused = document.activeElement as HTMLElement;
      // Wrap at the edges; if focus somehow sits outside the panel, pull it back.
      if (e.shiftKey) {
        if (focused === first || !panel.contains(focused)) { e.preventDefault(); last.focus(); }
      } else {
        if (focused === last || !panel.contains(focused)) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
      // Restore focus to the trigger so keyboard users keep their place.
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [active]);

  return panelRef;
}
