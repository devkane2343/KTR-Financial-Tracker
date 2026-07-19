import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Themed dropdown that replaces the native <select>. Native <select> popups are
 * drawn by the OS and ignore CSS — on dark mode they render a stark light menu
 * that clashes with the app surface. This renders the closed control to look
 * exactly like the shared `inputClass` field, and the open menu as a proper
 * `bg-paper` card (matching the AnalyticsView period picker) so every dropdown
 * in the app reads the same in light and dark.
 *
 * Drop-in for the common `<select value onChange>{<option>}</select>` shape:
 *   <Select value={x} onChange={setX} options={[{value,label}, …]} />
 *
 * Behavior parity with a real <select>:
 *   • click-outside and Escape close it (Escape stops propagation so it doesn't
 *     also close an enclosing modal);
 *   • ↑/↓ move the active row, Enter/Space commit, Home/End jump, typing focuses;
 *   • the trigger is a real <button> so it sits in a modal's focus trap and tab order.
 *
 * The menu is portalled to <body> and positioned `fixed` from the trigger's
 * rect. It MUST escape its container: form cards use `overflow-hidden` (for
 * rounded corners) which would clip an in-flow menu, and tab panels carry a
 * `transform` that reparents `position: fixed` — same reason ModalPortal
 * exists. The menu flips above the trigger when there isn't room below, and
 * closes on scroll/resize so it never floats detached from its field.
 */

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  /** Plain-text form of `label`, used for type-ahead and the closed-state text. */
  text?: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Extra classes for the trigger button (e.g. error border, margins). */
  className?: string;
  /** Shown when no option matches `value` (rare — usually value is always set). */
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  /** Optional leading icon inside the trigger (e.g. a calendar glyph). */
  leadingIcon?: React.ReactNode;
}

const asText = (o: SelectOption): string =>
  o.text ?? (typeof o.label === 'string' ? o.label : o.value);

// Mirrors the shared `inputClass` so a Select sits flush next to real inputs.
// `text-left` + `flex` because the trigger is a button, not an input.
const TRIGGER_BASE =
  'w-full flex items-center gap-2 pl-3 pr-9 py-2 text-left bg-paper border rounded-lg ' +
  'text-sm text-ink outline-none transition-all cursor-pointer ' +
  'focus:border-ink/30 focus:ring-2 focus:ring-ink/5 disabled:opacity-50 disabled:cursor-not-allowed';

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  className = '',
  placeholder = 'Select…',
  disabled = false,
  id,
  'aria-label': ariaLabel,
  leadingIcon,
}) => {
  const [open, setOpen] = useState(false);
  // Row highlighted by keyboard/hover; -1 = none. Reset to the selected row on open.
  const [activeIndex, setActiveIndex] = useState(-1);
  // Fixed-position box for the portalled menu, measured from the trigger rect.
  // `drop` = below the trigger, `flip` = above it when there's no room below.
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; width: number; maxH: number; place: 'drop' | 'flip' } | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const controlId = id ?? listboxId + '-btn';

  const selected = options.find((o) => o.value === value) ?? null;
  const selectedIndex = options.findIndex((o) => o.value === value);

  // Type-ahead buffer (e.g. typing "sav" jumps to "Savings"), cleared after a pause.
  const typeahead = useRef({ str: '', at: 0 });

  const commit = (i: number) => {
    const opt = options[i];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  };

  // Open, seeding the active row at the current selection so ↑/↓ start there.
  const openMenu = () => {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled());
    setOpen(true);
  };

  const firstEnabled = () => options.findIndex((o) => !o.disabled);
  const lastEnabled = () => {
    for (let i = options.length - 1; i >= 0; i--) if (!options[i].disabled) return i;
    return -1;
  };
  const step = (from: number, dir: 1 | -1) => {
    let i = from;
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length;
      if (!options[i]?.disabled) return i;
    }
    return from;
  };

  // Measure the trigger and decide where the fixed menu sits. Called on open and
  // whenever the page scrolls/resizes so the menu stays glued to its field.
  const positionMenu = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const gap = 4; // matches the mt-1 the menu used to carry
    const spaceBelow = window.innerHeight - r.bottom - gap;
    const spaceAbove = r.top - gap;
    // Prefer dropping down; flip up only when below is cramped and above is roomier.
    const flip = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxH = Math.min(256, Math.max(120, (flip ? spaceAbove : spaceBelow) - 8));
    setMenuPos({
      left: r.left,
      top: flip ? r.top - gap : r.bottom + gap,
      width: r.width,
      maxH,
      place: flip ? 'flip' : 'drop',
    });
  };

  // Position before paint so the menu never flashes at the wrong spot.
  useLayoutEffect(() => {
    if (open) positionMenu();
    else setMenuPos(null);
  }, [open]);

  // Close on outside click, and reposition (capture phase, so nested scrollers
  // count) on scroll/resize. A scroll far enough to move the trigger offscreen
  // just keeps the menu attached; the outside-click/Escape paths close it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onReflow = () => positionMenu();
    document.addEventListener('mousedown', onDown, true);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open]);

  // Keep the active row scrolled into view as the keyboard moves it.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = menuRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        // Stop the modal's global Escape handler from also firing.
        e.stopPropagation();
        e.preventDefault();
        setOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => step(i < 0 ? -1 : i, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => step(i < 0 ? firstEnabled() : i, -1));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(firstEnabled());
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(lastEnabled());
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0) commit(activeIndex);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        // Type-ahead: accumulate typed chars and jump to the first match.
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const now = e.timeStamp;
          const buf = now - typeahead.current.at < 700 ? typeahead.current.str + e.key : e.key;
          typeahead.current = { str: buf, at: now };
          const match = options.findIndex(
            (o) => !o.disabled && asText(o).toLowerCase().startsWith(buf.toLowerCase()),
          );
          if (match >= 0) setActiveIndex(match);
        }
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        id={controlId}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`${TRIGGER_BASE} ${open ? 'border-ink/30' : 'border-rule'} ${className}`}
      >
        {leadingIcon}
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-ink' : 'text-ink-whisper'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && menuPos &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            id={listboxId}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
            style={{
              position: 'fixed',
              left: menuPos.left,
              // When flipping up, anchor the bottom to the trigger's top so it
              // grows upward regardless of height.
              ...(menuPos.place === 'flip'
                ? { bottom: window.innerHeight - menuPos.top }
                : { top: menuPos.top }),
              // Never narrower than the trigger; grow to fit long labels but stay
              // on-screen. maxHeight is the room measured in the chosen direction.
              minWidth: menuPos.width,
              maxWidth: `min(24rem, calc(100vw - ${menuPos.left}px - 8px))`,
              maxHeight: menuPos.maxH,
            }}
            className="z-[60] w-max overflow-auto bg-paper rounded-xl border border-rule shadow-paper-lift py-1 animate-fade-up"
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              const isActive = i === activeIndex;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  id={`${listboxId}-${i}`}
                  data-idx={i}
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  // mousedown (not click) so committing beats the outside-click handler.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(i);
                  }}
                  onMouseEnter={() => !opt.disabled && setActiveIndex(i)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive ? 'bg-paper-soft' : ''
                  } ${isSelected ? 'text-ink font-medium' : 'text-ink-soft'}`}
                >
                  {/* Full label — wraps rather than truncating so long account
                      names stay readable when the menu is open. */}
                  <span className="min-w-0 break-words whitespace-normal">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-ink" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
};
