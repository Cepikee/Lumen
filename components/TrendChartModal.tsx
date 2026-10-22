"use client";
import SparklineDetailed from "./SparklineDetailed";
import { Modal } from "react-bootstrap";

export default function TrendChartModal({
  show,
  onHide,
  keyword,
  history
}: {
  show: boolean;
  onHide: () => void;
  keyword: string;
  history: { day: string; freq: number }[];
}) {
  const safeHistory = (Array.isArray(history) ? history : []).filter((point) => {
    if (!point || typeof point !== "object") return false;
    if (typeof point.day !== "string" || point.day.trim().length === 0) return false;
    const timestamp = new Date(point.day).getTime();
    const frequency = Number(point.freq);
    return Number.isFinite(timestamp) && Number.isFinite(frequency) && frequency >= 0;
  });

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{keyword} – Részletes trend</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <SparklineDetailed history={safeHistory} period="all" />
      </Modal.Body>
    </Modal>
  );
}
