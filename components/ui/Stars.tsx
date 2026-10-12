import { StarIcon } from "./Icon";

export function Stars({ count, size = 20, animate = false }: { count: number; size?: number; animate?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <StarIcon
          key={i}
          filled={i <= count}
          size={size}
          className={animate && i <= count ? "star-pop" : undefined}
          // Stagger the pop-in.
          {...(animate ? { style: { animationDelay: `${150 + i * 160}ms` } } : {})}
        />
      ))}
    </span>
  );
}
