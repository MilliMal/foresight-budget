interface Props {
  value: number;
  max: number;
  color?: "teal" | "amber" | "red";
  showLabel?: boolean;
}

export function ProgressBar({ value, max, color = "teal", showLabel = true }: Props) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColor =
    color === "amber"
      ? "bg-amber-500"
      : color === "red"
      ? "bg-red-500"
      : "bg-teal-600";

  return (
    <div className="w-full">
      <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-stone-500 mt-1 text-right">{pct.toFixed(0)}%</p>
      )}
    </div>
  );
}
