export default function ProgressStrip({ completedFlags }: { completedFlags: boolean[] }) {
  return (
    <div className="flex gap-[5px]">
      {Array.from({ length: 5 }).map((_, i) => {
        const done = completedFlags[i] ?? false;
        return (
          <span
            key={i}
            className={`flex-1 h-[6px] rounded-[3px] ${done ? 'bg-teal' : 'bg-line'}`}
          />
        );
      })}
    </div>
  );
}
