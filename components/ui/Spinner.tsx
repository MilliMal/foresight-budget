export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const cls = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-10 h-10" : "w-6 h-6";
  return (
    <div
      className={`${cls} border-2 border-stone-200 border-t-teal-700 rounded-full animate-spin`}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  );
}
