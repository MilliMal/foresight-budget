export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="h-4 bg-stone-200 rounded w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex justify-between items-center">
          <div className="h-3 bg-stone-100 rounded w-1/2" />
          <div className="h-3 bg-stone-100 rounded w-16" />
        </div>
      ))}
    </div>
  );
}
