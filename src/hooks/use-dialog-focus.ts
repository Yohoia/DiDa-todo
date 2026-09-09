"use client";

import { useRef } from "react";

/** Restore focus for controlled dialogs whose openers live in another feature. */
export function useDialogFocus() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus() {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus(event: Event) {
      event.preventDefault();
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      if (opener.current?.isConnected && opener.current !== document.body) opener.current.focus();
      else document.querySelector<HTMLButtonElement>("[data-quick-add]")?.focus();
    },
  };
}
