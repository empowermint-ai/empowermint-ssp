export default function Home() {
  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-heading text-3xl text-navy mb-2">empowermint</h1>
      <p className="text-text-body mb-8">Smart Study Planner</p>
      <div className="flex gap-3">
        <span className="w-10 h-10 rounded-full bg-orange" />
        <span className="w-10 h-10 rounded-full bg-teal" />
        <span className="w-10 h-10 rounded-full bg-navy" />
        <span className="w-10 h-10 rounded-full bg-purple" />
      </div>
    </main>
  );
}
