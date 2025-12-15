"use client";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import type { ChartOptions, ScriptableLineSegmentContext } from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip);

type HistoryPoint = { day: string; freq: number };

interface Props {
  history: HistoryPoint[];
  period: string;
  startDate?: string;
  endDate?: string;
}
export default function SparklineDetailed({ history, period, startDate, endDate }: Props) {
  const [localPeriod, setLocalPeriod] = useState(period);
  const [localStart, setLocalStart] = useState(startDate || "");
  const [localEnd, setLocalEnd] = useState(endDate || "");

  // Ha kívül változik a szűrő, belül is tükrözzük
  useEffect(() => {
    setLocalPeriod(period);
    setLocalStart(startDate || "");
    setLocalEnd(endDate || "");
  }, [period, startDate, endDate]);

  
  // Szűrés
  // Szűrés
function filterHistory(): HistoryPoint[] {
  if (localPeriod === "custom" && localStart && localEnd) {
    const from = new Date(localStart + "T00:00:00");
    const to = new Date(localEnd + "T23:59:59");
    return history.filter((h) => {
      const d = new Date(h.day + "T00:00:00");
      return d >= from && d <= to;
    });
  }
  // 🔧 mindig tömböt adunk vissza
  return filterByPeriod(history, localPeriod) ?? [];
}

// itt már biztosan tömb lesz
let filtered: HistoryPoint[] = filterHistory();


  // 🔧 Ha csak egy pont van, duplikáljuk, hogy legyen vonal
  if (filtered.length === 1) {
    const only = filtered[0];
    filtered = [
      { day: only.day, freq: only.freq },
      { day: only.day, freq: only.freq }
    ];
  }
  // Chart adatok
  const labels = filtered.map(h =>
    new Date(h.day + "T00:00:00").toLocaleDateString("hu-HU")
  );
  const dataPoints = filtered.map(h => h.freq);

  const pointColors = dataPoints.map((val, i) => {
    if (i === 0) return "#999";
    if (val > dataPoints[i - 1]) return "#22c55e";
    if (val < dataPoints[i - 1]) return "#ef4444";
    return "#f59e0b";
  });

  const data = {
    labels,
    datasets: [
      {
        data: dataPoints,
        pointBackgroundColor: pointColors,
        pointBorderColor: "#222",
        pointBorderWidth: 0.5,
        fill: false,
        tension: 0.25,
        segment: {
          borderColor: (ctx: ScriptableLineSegmentContext) => {
            const i = ctx.p0DataIndex;
            const curr = dataPoints[i];
            const next = dataPoints[i + 1];
            if (next > curr) return "#22c55e";
            if (next < curr) return "#ef4444";
            return "#f59e0b";
          },
          borderWidth: 2
        }
      }
    ]
  };

  const options: ChartOptions<"line"> = {
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (context) {
            const date = String(context.label);
            const value = (context.parsed as { y: number }).y;
            const icon = getTrendIcon(context.dataIndex, dataPoints);
            const short = getTrendLabel(context.dataIndex, dataPoints);
            const note = getInterpretation(context.dataIndex, dataPoints);
            return `${date} — ${value}× ${icon} ${short}\n${note}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        ticks: {
          color: "#888",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6
        },
        title: {
          display: true,
          text: "Dátum",
          color: "#777",
          font: { size: 11 }
        },
        grid: { display: false }
      },
      y: {
        display: true,
        ticks: {
          color: "#888",
          stepSize: 1,
          precision: 0
        },
        title: {
          display: true,
          text: "Előfordulás (db)",
          color: "#777",
          font: { size: 11 }
        },
        grid: { color: "rgba(0,0,0,0.06)" }
      }
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 6,
        hoverBackgroundColor: "#000"
      }
    },
    animation: {
      duration: 600,
      easing: "easeOutQuad" as const
    },
    responsive: true,
    maintainAspectRatio: false
  };

  const total = dataPoints.reduce((a, b) => a + b, 0);
  const average = (total / Math.max(1, dataPoints.length)).toFixed(2);

  return (
    <div className="d-flex flex-column gap-3 p-2">
      {/* Időszakos szűrő */}
      <div className="d-flex flex-column align-items-end gap-2">
        <div className="d-flex align-items-center">
          <label className="small text-secondary me-2">Időszak:</label>
          <select
            className="form-select form-select-sm w-auto"
            value={localPeriod}
            onChange={(e) => setLocalPeriod(e.target.value)}
          >
            <option value="24h">24 óra</option>
            <option value="3d">3 nap</option>
            <option value="7d">7 nap</option>
            <option value="30d">30 nap</option>
            <option value="365d">365 nap (idei év)</option> {/* 🔧 új opció */}
            <option value="all">Teljes időszak</option>
            <option value="custom">Egyedi</option>
          </select>
        </div>

        {localPeriod === "custom" && (
          <div className="d-flex align-items-center gap-2">
            <input
              type="date"
              className="form-control form-control-sm w-auto"
              value={localStart}
              onChange={(e) => setLocalStart(e.target.value)}
            />
            <span>–</span>
            <input
              type="date"
              className="form-control form-control-sm w-auto"
              value={localEnd}
              onChange={(e) => setLocalEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Grafikon vagy üzenet */}
      <div style={{ width: "100%", height: "260px" }}>
        {filtered.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <p className="text-muted text-center mt-4">Nincs adat az adott időszakban.</p>
        )}
      </div>

      {/* Alsó sor: legenda + ministat */}
      {filtered.length > 0 && (
        <div className="d-flex justify-content-between flex-wrap gap-2 small text-secondary">
          <div className="d-flex align-items-center gap-3">
            <span className="d-inline-flex align-items-center gap-1">
              <span style={{ color: "#22c55e" }}>●</span> Emelkedés
            </span>
            <span className="d-inline-flex align-items-center gap-1">
              <span style={{ color: "#ef4444" }}>●</span> Csökkenés
            </span>
            <span className="d-inline-flex align-items-center gap-1">
              <span style={{ color: "#f59e0b" }}>●</span> Változatlan
            </span>
          </div>

          <div>
            Összes: {total} db • Átlag: {average} db/nap
          </div>
        </div>
      )}
    </div>
  );
}


/* ——— Segédfüggvények ——— */

function filterByPeriod(history: HistoryPoint[], period: string) {
  const now = new Date();
  let from: Date;

  if (period === "24h") {
    from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (period === "3d") {
    from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  } else if (period === "7d") {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "30d") {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === "365d") {
    from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  } else {
  return history;
}

return history.filter(h => {
  const d = new Date(h.day + "T00:00:00");
  return d >= from && d <= now;
});
}



function getTrendIcon(index: number, data: number[]) {
  if (index === 0) return "➖";
  if (data[index] > data[index - 1]) return "📈";
  if (data[index] < data[index - 1]) return "📉";
  return "➖";
}

function getTrendLabel(index: number, data: number[]) {
  if (index === 0) return "(kezdő)";
  if (data[index] > data[index - 1]) return "(emelkedés)";
  if (data[index] < data[index - 1]) return "(csökkenés)";
  return "(változatlan)";
}

function getInterpretation(index: number, data: number[]) {
  if (index === 0) return "Kiindulópont a trendhez.";
  if (data[index] > data[index - 1]) return "Fokozódó figyelem ezen a napon.";
  if (data[index] < data[index - 1]) return "Csökkenő aktivitás ezen a napon.";
  return "Nincs változás az előző naphoz képest.";
}

