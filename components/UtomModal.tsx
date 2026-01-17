"use client";

import { Modal } from "react-bootstrap";

type UtomModalProps = {
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
};

export default function UtomModal({ show, onClose, children, title }: UtomModalProps) {
  return (
    <Modal show={show} onHide={onClose} centered>
      {title && (
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
      )}

      <Modal.Body>
        {children}
      </Modal.Body>
    </Modal>
  );
}
