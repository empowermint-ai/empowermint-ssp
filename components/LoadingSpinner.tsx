export default function LoadingSpinner() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-[3px] border-orange border-t-transparent animate-spin" />
    </main>
  );
}
