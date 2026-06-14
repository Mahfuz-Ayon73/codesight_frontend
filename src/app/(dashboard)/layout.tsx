import Navbar from "@/components/navbar/navbar";
import Sidebar from "@/components/sidebar/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Fixed navbar */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14">
        <Navbar />
      </header>

      {/* Fixed sidebar */}
      <aside className="fixed top-14 left-0 bottom-0 z-20 w-52">
        <Sidebar />
      </aside>

      {/* Scrollable content — offset by navbar height and sidebar width */}
      <main className="pt-14 pl-52 min-h-screen bg-white">
        <div className="p-6 pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}
