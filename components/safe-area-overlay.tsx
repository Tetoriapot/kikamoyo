export function SafeAreaOverlay({
  inset,
  label = '安全域',
}: {
  inset?: { top: number; right: number; bottom: number; left: number };
  label?: string;
}) {
  if (!inset) return null;
  return (
    <div
      aria-hidden="true"
      data-export-ignore="true"
      className="pointer-events-none absolute z-[3] rounded-md border-2 border-dashed border-white/90 shadow-[0_0_0_9999px_rgb(15_23_42/10%)]"
      style={{
        top: `${inset.top * 100}%`,
        right: `${inset.right * 100}%`,
        bottom: `${inset.bottom * 100}%`,
        left: `${inset.left * 100}%`,
      }}
    >
      <span className="absolute left-2 top-2 rounded bg-black/65 px-2 py-1 text-[11px] font-semibold text-white">
        {label}
      </span>
    </div>
  );
}
