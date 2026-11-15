// LoadingCard component: Placeholder card shown while data is loading
// Displays soft pulsing placeholder bars matching the standard rounded-3xl p-6 card style

export default function LoadingCard() {
  return (
    <div
      aria-label="Loading..."
      className="w-full bg-white rounded-3xl p-6 shadow-sm border border-[#DCD6C0] animate-pulse flex flex-col gap-4"
    >
      {/* Top row placeholder */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-6 w-1/3 bg-[#E7E2D1] rounded-lg" />
        <div className="h-6 w-20 bg-[#E7E2D1] rounded-full" />
      </div>

      {/* Middle content placeholders */}
      <div className="space-y-2.5 pt-2">
        <div className="h-4 w-3/4 bg-[#E7E2D1] rounded-md" />
        <div className="h-4 w-1/2 bg-[#E7E2D1] rounded-md" />
      </div>

      {/* Bottom action placeholder */}
      <div className="pt-4 mt-auto">
        <div className="h-10 w-full bg-[#E7E2D1] rounded-xl" />
      </div>
    </div>
  );
}
