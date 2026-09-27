'use client';
/** The household's gate code, drawn like the painted plate on the gate itself. */
export default function GatePlate({ code, size = 'lg' }: { code: string; size?: 'lg' | 'sm' }) {
  const big = size === 'lg';
  return (
    <div
      className={`relative inline-block rounded-lg border-4 border-ink bg-vest text-ink ${big ? 'px-7 py-4' : 'px-3 py-1'}`}
      aria-label={code}
    >
      {big && ['left-1.5 top-1.5', 'right-1.5 top-1.5', 'left-1.5 bottom-1.5', 'right-1.5 bottom-1.5'].map((p) => (
        <span key={p} className={`absolute ${p} h-2 w-2 rounded-full bg-ink/70`} />
      ))}
      <span className={`font-bold tracking-wider ${big ? 'text-4xl' : 'text-base'}`}>{code}</span>
    </div>
  );
}
