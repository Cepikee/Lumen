export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style jsx global>{`
        body {
          background: linear-gradient(135deg, rgba(0,153,255,0.12), rgba(0,204,153,0.12)) !important;
          background-attachment: fixed;
        }
      `}</style>

      <div className="premium-wrapper">
        {children}
      </div>
    </>
  );
}
