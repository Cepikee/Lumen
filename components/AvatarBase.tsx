type AvatarBaseProps = { avatarUrl: string | null; };
export default function AvatarBase({ avatarUrl }: AvatarBaseProps) {
  return (
    <div
      style={{
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
    </div>
  );
}
