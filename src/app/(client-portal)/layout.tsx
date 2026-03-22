export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf9f7] to-white" dir="rtl">
      {children}
    </div>
  );
}
