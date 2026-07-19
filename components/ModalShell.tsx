import React from 'react';
import { useModal } from '../lib/useModal';
import { ModalPortal } from './ModalPortal';

/**
 * Reusable dialog shell: renders the dark scrim + centered panel and wires in
 * the shared accessibility behavior (Escape close, backdrop-click close, focus
 * trap, body-scroll lock, focus restore) via useModal — so inline modals that
 * would otherwise each re-implement this get it for free and consistently.
 *
 * Pass the dialog body as children; ModalShell provides the backdrop and the
 * `role="dialog"` panel. `label` is the accessible name; `panelClassName` fully
 * controls the panel surface classes (including its own max-height / overflow —
 * the shell imposes neither, so a self-scrolling `flex flex-col` panel keeps
 * working). `closable=false` disables Escape + backdrop dismissal.
 */
interface ModalShellProps {
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  panelClassName?: string;
  closable?: boolean;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  onClose,
  label,
  children,
  panelClassName = 'bg-white rounded-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto',
  closable = true,
}) => {
  const panelRef = useModal<HTMLDivElement>(onClose, { escapeClosable: closable });

  // Only a backdrop press+release that both begin and end on the backdrop closes
  // it — so drag-selecting text inside the panel and releasing over the backdrop
  // doesn't dismiss the dialog.
  const backdropDown = React.useRef(false);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/60 flex items-center justify-center z-50 p-4"
        onMouseDown={(e) => { backdropDown.current = e.target === e.currentTarget; }}
        onClick={(e) => {
          if (closable && e.target === e.currentTarget && backdropDown.current) onClose();
          backdropDown.current = false;
        }}
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className={`${panelClassName} focus:outline-none`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </ModalPortal>
  );
};
