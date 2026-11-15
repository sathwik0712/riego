import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";

// Main application shell layout (sidebar, top bar, bottom nav, responsive content container)
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Fixed desktop left sidebar (hidden on mobile and tablet) */}
      <Sidebar farmerInitial="R" farmerName="Ramesh Kumar" />

      {/* Main layout container (offset by sidebar on desktop) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top bar spanning content area */}
        <TopBar farmerInitial="R" />

        {/* Responsive main content container */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-8 py-3 sm:py-4 lg:py-5 pb-28 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Fixed bottom navigation on phone & tablet (hidden on desktop) */}
      <BottomNav />
    </>
  );
}
