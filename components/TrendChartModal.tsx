"use client";
import { Line } from "react-chartjs-2";
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

  const data = {
    labels: safeHistory.map(h => new Date(h.day).toLocaleDateString("hu-HU")),
    datasets: [
      {
        label: keyword,
        data: safeHistory.map(h => Number(h.freq)),
        borderColor: "#4CAF50",
        fill: false,
        tension: 0.3
      }
    ]
  };

  const options = {
    plugins: {
      legend: { display: true },
      tooltip: { enabled: true }
    },
    scales: {
      x: { title: { display: true, text: "Dátum" } },
      y: { title: { display: true, text: "Előfordulás" } }
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{keyword} – Részletes trend</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Line data={data} options={options} />
      </Modal.Body>
    </Modal>
  );
}
