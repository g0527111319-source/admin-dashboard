import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminChatBot from "@/components/admin/AdminChatBot";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <AdminSidebar />
      <main className="lg:mr-72 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <AdminChatBot />
    </div>
  );
}
