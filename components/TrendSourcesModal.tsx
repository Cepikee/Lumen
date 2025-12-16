import React, { useState, useEffect } from "react";
import { Modal, Form } from "react-bootstrap";

interface Source {
  title: string;
  url: string;
  source: string;
  date: string;
  summary?: string;
}

interface TrendSourcesModalProps {
  show: boolean;
  onHide: () => void;
  keyword: string;
  sources: Source[];
  defaultPeriod: string; // külső filters.period érték
  onPeriodChange: (keyword: string, period: string) => void; // új API hívás
}

const TrendSourcesModal: React.FC<TrendSourcesModalProps> = ({
  show,
  onHide,
  keyword,
  sources,
  defaultPeriod,
  onPeriodChange,
}) => {
  const [period, setPeriod] = useState(defaultPeriod);

  useEffect(() => {
    setPeriod(defaultPeriod);
  }, [defaultPeriod]);

  function handlePeriodChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newPeriod = e.target.value;
    setPeriod(newPeriod);
    onPeriodChange(keyword, newPeriod);
  }

  // deduplikálás: csak egyedi url+date kombinációk maradnak
  const uniqueSources = sources.filter(
    (src, i, arr) =>
      i === arr.findIndex(s => s.url === src.url && s.date === src.date)
  );

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Kapcsolódó cikkek – {keyword}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Időszak</Form.Label>
          <Form.Select value={period} onChange={handlePeriodChange}>
            <option value="7d">Utolsó 7 nap</option>
            <option value="30d">Utolsó 30 nap</option>
            <option value="all">Minden időszak</option>
          </Form.Select>
        </Form.Group>

        {uniqueSources.length === 0 ? (
          <p>Nincs elérhető forrás ehhez a trendhez.</p>
        ) : (
          <ul className="list-unstyled">
            {uniqueSources.map((src, index) => (
              <li key={`${src.url}-${src.date}-${index}`} className="mb-3">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fw-bold"
                >
                  {src.title}
                </a>
                <br />
                <small className="text-muted">
                  {src.source} –{" "}
                  {new Date(src.date).toLocaleDateString("hu-HU")}
                </small>
                {src.summary && <p className="mt-1">{src.summary}</p>}
              </li>
            ))}
          </ul>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default TrendSourcesModal;
