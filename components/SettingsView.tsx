"use client";

type User = {
  id: number;
  email: string;
};

export default function SettingsView({ user }: { user: User }) {
  return (
    <div style={{ padding: "20px", maxWidth: "400px" }}>
      <h2 className="mb-3">Beállítások</h2>

      <p className="text-muted">
        Itt fognak megjelenni a fiókbeállítások, például:
      </p>

      <ul>
        <li>Jelszó módosítása</li>
        <li>PIN módosítása</li>
        <li>Értesítések</li>
        <li>Téma (dark/light)</li>
        <li>Email módosítása</li>
      </ul>

      <p className="mt-3">
        <strong>Bejelentkezve mint:</strong> {user.email}
      </p>
    </div>
  );
}
