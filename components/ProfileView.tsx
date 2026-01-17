"use client";

type User = {
  id: number;
  email: string;
  created_at?: string; // ha van ilyen mező
};

export default function ProfileView({ user }: { user: User }) {
  return (
    <div style={{ padding: "20px", maxWidth: "400px" }}>
      <h2 className="mb-3">Profil</h2>

      <div className="mb-3">
        <strong>Email:</strong>
        <div>{user.email}</div>
      </div>

      <div className="mb-3">
        <strong>Fiók létrehozva:</strong>
        <div>
          {user.created_at
            ? new Date(user.created_at).toLocaleString("hu-HU")
            : "N/A"}
        </div>
      </div>
    </div>
  );
}
