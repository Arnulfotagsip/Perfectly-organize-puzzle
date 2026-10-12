/** Brand mark: a 3×3 tray where the last tile is gliding into place. */
export function LogoMark({ size = 64 }: { size?: number }) {
  const tiles = [
    ["#b9a6e8", 0, 0], ["#9fd8c4", 1, 0], ["#f6b8a6", 2, 0],
    ["#a9cdef", 0, 1], ["#f6dc8c", 1, 1], ["#b9a6e8", 2, 1],
    ["#f6b8a6", 0, 2], ["#9fd8c4", 1, 2],
  ] as const;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="16" fill="#fffdf8" stroke="#eadfcf" strokeWidth="2" />
      {tiles.map(([c, x, y], i) => (
        <rect key={i} x={9 + x * 16} y={9 + y * 16} width="13" height="13" rx="4" fill={c} />
      ))}
      <rect x="41" y="41" width="13" height="13" rx="4" fill="none" stroke="#c9bfb1" strokeWidth="1.5" strokeDasharray="3 2.5" />
      <rect x="46" y="44" width="13" height="13" rx="4" fill="#a9cdef" transform="rotate(14 52 50)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${className}`}>
      Perfectly <span className="text-primary">Organized</span>
    </span>
  );
}
