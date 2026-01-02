"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Landing() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("utom_seen_landing");
    if (seen) {
      router.replace("/");
    }
  }, []);

  const enter = () => {
 //   localStorage.setItem("utom_seen_landing", "1");
    setOpen(true);

    setTimeout(() => {
      router.replace("/");
    }, 1200);
  };

  return (
    <>
      <div className="container">
        {/* Vault doors */}
        <div className={`door left ${open ? "leftOpen" : ""}`} />
        <div className={`door right ${open ? "rightOpen" : ""}`} />

        {/* Content */}
        <div className="content">
          <img src="/logo.svg" alt="Utom logo" className="logo" />

          <h1 className="title">Utom.hu</h1>
          <p className="tagline">Belépsz a rendszerbe.</p>

          <button className="button" onClick={enter}>
            Belépek
          </button>
        </div>
      </div>

      <style jsx>{`
        .container {
          position: fixed;
          inset: 0;
          background: black;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .door {
          position: absolute;
          top: 0;
          width: 50%;
          height: 100%;
          background: black;
          transition: transform 1.2s ease-in-out;
          z-index: 10;
        }

        .left {
          left: 0;
        }

        .right {
          right: 0;
        }

        .leftOpen {
          transform: translateX(-100%);
        }

        .rightOpen {
          transform: translateX(100%);
        }

        .content {
          position: relative;
          z-index: 20;
          text-align: center;
          color: white;
        }

        .logo {
          width: 120px;
          margin-bottom: 20px;
        }

        .title {
          font-size: 48px;
          font-weight: 600;
          margin: 0;
        }

        .tagline {
          font-size: 18px;
          opacity: 0.8;
          margin-bottom: 40px;
        }

        .button {
          padding: 12px 32px;
          background: white;
          color: black;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          transition: 0.2s;
        }

        .button:hover {
          background: #e5e5e5;
        }
      `}</style>
    </>
  );
}
