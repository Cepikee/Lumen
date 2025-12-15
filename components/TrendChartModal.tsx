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
  const data = {
    labels: history.map(h => new Date(h.day).toLocaleDateString("hu-HU")),
    datasets: [
      {
        label: keyword,
        data: history.map(h => h.freq),
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
