export default function AvatarPremium({ avatarUrl }: { avatarUrl: string }) {
  return (
    <div
      className="premium-avatar"
      style={{
        position: "relative",
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        overflow: "hidden",
        backgroundColor: "#444",
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="avatar"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#555" }} />
      )}

      {/* Korona */}
      <div
        style={{
          position: "absolute",
          top: "-6px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "14px",
          height: "14px",
          backgroundImage: "url('/icons/crown.svg')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />
    </div>
  );
}
