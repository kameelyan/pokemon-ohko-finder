import { useState } from 'react';

interface Props {
  children: React.ReactNode;
  content: React.ReactNode;
  maxWidth?: number;
  side?: 'top' | 'bottom'; // hint only — auto-flip takes precedence
}

export default function Tooltip({ children, content, maxWidth = 280 }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  if (!content) return <>{children}</>;

  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={e => setPos({ x: e.clientX, y: e.clientY })}
      onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <TooltipPortal x={pos.x} y={pos.y} maxWidth={maxWidth}>
          {content}
        </TooltipPortal>
      )}
    </span>
  );
}

function TooltipPortal({
  x, y, maxWidth, children,
}: {
  x: number; y: number; maxWidth: number; children: React.ReactNode;
}) {
  // Offset from cursor; flip upward if near bottom of viewport
  const gap = 14;
  const tipHeight = 120; // rough estimate to avoid overflow
  const flipUp = y + tipHeight + gap > window.innerHeight;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x + gap, window.innerWidth - maxWidth - 8),
    top: flipUp ? y - tipHeight - gap : y + gap,
    background: '#1e2030',
    color: '#f0f0f0',
    padding: '8px 11px',
    borderRadius: '8px',
    fontSize: '12px',
    lineHeight: 1.5,
    maxWidth,
    width: 'max-content',
    zIndex: 99999,
    pointerEvents: 'none',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    whiteSpace: 'normal',
    textAlign: 'left',
  };

  // Render directly into a fixed-position div at root level via an inline portal
  return (
    <span
      style={style}
      // Escape the stacking context by being rendered as fixed — React renders
      // this in place but CSS fixed positioning ignores all ancestor overflow.
    >
      {children}
    </span>
  );
}
