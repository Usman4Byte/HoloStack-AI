"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({ open, title, description, confirmLabel, destructive = false, onConfirm, onCancel }: { open: boolean; title: string; description: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" onCancel={event => { event.preventDefault(); onCancel(); }}>
    <span className="eyebrow">PLEASE CONFIRM</span>
    <h2 id="confirm-dialog-title">{title}</h2>
    <p id="confirm-dialog-description">{description}</p>
    <div className="confirm-dialog-actions"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="button" className={destructive ? "button-danger" : ""} onClick={onConfirm}>{confirmLabel}</Button></div>
  </dialog>;
}
