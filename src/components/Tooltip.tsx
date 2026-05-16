import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

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
  const ref = useRef<HTMLSpanElement>(null);
  // Start invisible so we can measure actual height before committing position
  const [measured, setMeasured] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (ref.current) {
      const h = ref.current.offsetHeight;
      setHeight(h);
      setFlipUp(y + h + 14 > window.innerHeight);
      setMeasured(true);
    }
  }, [y]);

  const gap = 14;
  const left = Math.min(x + gap, window.innerWidth - maxWidth - 8);
  const top = flipUp ? y - height - gap : y + gap;

  const style: React.CSSProperties = {
    position: 'fixed',
    left,
    top,
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
    // Hidden until measured to avoid flash of wrong position
    opacity: measured ? 1 : 0,
  };

  return createPortal(
    <span ref={ref} style={style}>{children}</span>,
    document.body
  );
}
