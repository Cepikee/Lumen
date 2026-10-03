import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";

interface StatsType {
  totalCount?: number;
  dailyAvg?: number;
  peakDate?: string;
  peakValue?: number;
  isRecurring?: boolean;
  first_seen?: string;
  last_seen?: string;
  minValue?: number;
  medianValue?: number;
  spikeLength?: number;
  growth?: number;
}

interface SpikeModalProps {
  topic: string;
  index: number | null; // 🔥 engedjük a null értéket
  show: boolean;
  onClose: () => void;
  initialStats?: Partial<StatsType>;
}

export default function SpikeModal({ topic, index, show, onClose, initialStats }: SpikeModalProps) {
  const [stats, setStats] = useState<StatsType>(initialStats ?? {});
  const [error, setError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const finiteNumber = (value: unknown) => {
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const getClassName = (i: number | null) => {
    if (i == null) return "badge pending"; // Besorolás alatt
    if (i <= 3) return "badge green";
    if (i <= 5) return "badge teal";
    if (i <= 7) return "badge blue";
    if (i <= 9) return "badge purple";
    return "badge flame-wind";
  };

  const formatDate = (iso: string | undefined) =>
    iso && !Number.isNaN(new Date(iso).getTime())
      ? new Date(iso).toLocaleDateString("hu-HU", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—";

  useEffect(() => {
    const controller = new AbortController();
    // The modal is reused for different topics. Do not show the previous
    // topic's result while the new request is in flight.
    setStats(initialStats ?? {});
    setError(null);
    if (show) {
      (async () => {
        try {
          const res = await fetch(`/api/trends/stats?keyword=${encodeURIComponent(topic)}`, {
            signal: controller.signal,
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`API hiba: ${res.status} ${text}`);
          }
          const data = await res.json();
          if (!data || typeof data !== "object" || !data.stats || typeof data.stats !== "object") {
            throw new Error("Érvénytelen statisztikai válasz");
          }
          setStats(prev => ({ ...prev, ...data.stats }));
          setError(null);
        } catch (err: any) {
          if (err?.name === "AbortError") return;
          console.error("Hiba az API hívásnál:", err);
          setError("Nem sikerült betölteni az adatokat.");
        }
      })();
    }
    return () => controller.abort();
  }, [show, topic]);

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">
          {topic} – Részletes Spike elemzés
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="d-flex flex-column gap-3 p-2">
        {/* Badge */}
        <div className="text-center">
          <span className={getClassName(index)}>
            {index === null
              ? "Besorolás alatt"
              : `Spike — Index ${index} ${index === 10 ? "🔥" : ""}`}
          </span>
        </div>

        {/* Hibaüzenet */}
        {error && (
          <div className="alert alert-danger p-2 text-center mb-0">
            {error}
          </div>
        )}

        {/* Statisztikai összegzés */}
        {!error && (
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <div className="card card-sm border-0">
                <div className="card-body py-2 px-3">
                  <div className="small text-secondary">Összes</div>
                  <div className="fw-semibold">{stats.totalCount ?? "—"} db</div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card card-sm border-0">
                <div className="card-body py-2 px-3">
                  <div className="small text-secondary">Átlag</div>
                  <div className="fw-semibold">
                    {finiteNumber(stats.dailyAvg) != null
                      ? finiteNumber(stats.dailyAvg)!.toFixed(1)
                      : "—"} db/nap
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card card-sm border-0">
                <div className="card-body py-2 px-3">
                  <div className="small text-secondary">Csúcsnap</div>
                  <div className="fw-semibold">
                    {stats.peakDate
                      ? `${formatDate(stats.peakDate)} (${stats.peakValue} db)`
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Új mezők */}
        {!error && (
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <div className="card card-sm border-0">
                <div className="card-body py-2 px-3">
                  <div className="small text-secondary">Minimum</div>
                  <div className="fw-semibold">
                    {stats.minValue != null ? `${stats.minValue} db` : "—"}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card card-sm border-0">
                <div className="card-body py-2 px-3">
                  <div className="small text-secondary">Medián</div>
                  <div className="fw-semibold">
                    {stats.medianValue != null ? `${stats.medianValue} db` : "—"}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card card-sm border-0">
                <div className="card-body py-2 px-3">
                  <div className="small text-secondary">Spike hossza</div>
                  <div className="fw-semibold">
                    {stats.spikeLength != null ? `${stats.spikeLength} nap` : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Időtartam */}
        {!error && (stats.first_seen || stats.last_seen) && (
          <div className="text-center small text-secondary">
            Időtartam:{" "}
            <span className="fw-semibold">
              {formatDate(stats.first_seen)} – {formatDate(stats.last_seen)}
            </span>
          </div>
        )}

        

        {/* Magyarázat blokk */}
        {showExplanation && (
          <div className="alert alert-secondary mt-3 text-start small">
            <h6>Magyarázat</h6>
            <ul className="mb-0">
              <li><strong>Összes:</strong> Az adott kulcsszó összes előfordulása a teljes időszak alatt.</li>
              <li><strong>Átlag:</strong> A napi átlagos előfordulás a teljes időszakban.</li>
              <li><strong>Csúcsnap:</strong> Az a nap, amikor a kulcsszó a legtöbbször szerepelt.</li>
              <li><strong>Minimum:</strong> A legkisebb napi előfordulás.</li>
              <li><strong>Medián:</strong> A tipikus napi érték, a középső érték az összes nap között.</li>
              <li><strong>Spike hossza:</strong> Hány nap volt, amikor a kulcsszó kiugróan gyakran szerepelt (az átlagosnál legalább kétszer többször).</li>
              <li><strong>Időtartam:</strong> Az első és utolsó előfordulás közötti időszak.</li>
              </ul>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="info" size="sm" onClick={() => setShowExplanation(!showExplanation)}>
          Magyarázat
        </Button>
        <Button variant="light" size="sm" onClick={onClose}>
          Bezárás
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
