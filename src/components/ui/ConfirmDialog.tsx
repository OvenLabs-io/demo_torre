import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onCancel }: Props) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width={440}
      footer={
        <>
          <div className="flex-1" />
          <Button onClick={onCancel}>Cancelar</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[12px] leading-relaxed text-body">{message}</div>
    </Modal>
  );
}
