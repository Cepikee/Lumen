"use client";

import { useUserStore } from "@/store/useUserStore";

export default function ProfileView() {
  const user = useUserStore((s) => s.user); // 🔥 mindig FRISS user

  if (!user) {
    return <div>Betöltés...</div>;
  }

  const premiumActive =
    user.is_premium ||
    (user.premium_until &&
      new Date(user.premium_until).getTime() > Date.now());

  return (
    <div style={{ padding: "20px", maxWidth: "400px" }}>
      <h2 className="mb-3 d-flex align-items-center gap-2">
        Profil

        {premiumActive && (
          <span
            style={{
              background: "gold",
              color: "#333",
              padding: "2px 8px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            ⭐ PREMIUM
          </span>
        )}
      </h2>

      {/* Nickname */}
      <div className="mb-3">
        <strong>Felhasználónév:</strong>
        <div>{user.nickname}</div>
      </div>

      {/* Email */}
      <div className="mb-3">
        <strong>Email:</strong>
        <div>{user.email}</div>
      </div>

      {/* Bio */}
      <div className="mb-3">
        <strong>Bemutatkozás:</strong>
        <div>{user.bio || "—"}</div>
      </div>

      {/* Theme */}
      <div className="mb-3">
        <strong>Téma:</strong>
        <div>
          {user.theme === "system"
            ? "Rendszer"
            : user.theme === "dark"
            ? "Sötét"
            : "Világos"}
        </div>
      </div>

      {/* Premium info */}
      <div className="mb-3">
        <strong>Prémium státusz:</strong>
        <div>
          {premiumActive
            ? `Aktív ${
                user.premium_until
                  ? "(lejár: " +
                    new Date(user.premium_until).toLocaleDateString("hu-HU") +
                    ")"
                  : ""
              }`
            : "Nem prémium felhasználó"}
        </div>
      </div>

      {/* Fiók létrehozva */}
      <div className="mb-3">
        <strong>Fiók létrehozva:</strong>
        <div>
          {user.created_at
            ? new Date(user.created_at).toLocaleString("hu-HU")
            : "N/A"}
        </div>
      </div>

      {/* Email verified */}
      <div className="mb-3">
        <strong>Email megerősítve:</strong>
        <div>{user.email_verified ? "Igen" : "Nem"}</div>
      </div>

      {/* Last login */}
      <div className="mb-3">
        <strong>Utolsó bejelentkezés:</strong>
        <div>
          {user.last_login
            ? new Date(user.last_login).toLocaleString("hu-HU")
            : "N/A"}
        </div>
      </div>

      {/* Role */}
      <div className="mb-3">
        <strong>Szerepkör:</strong>
        <div>{user.role === "admin" ? "Admin" : "Felhasználó"}</div>
      </div>
    </div>
  );
}
