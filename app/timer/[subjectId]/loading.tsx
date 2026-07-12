export default function Loading() {
  return (
    <main
      className="h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0d0d0d' }}
    >
      <div className="w-6 h-6 rounded-full border-[3px] border-orange border-t-transparent animate-spin" />
    </main>
  );
}
