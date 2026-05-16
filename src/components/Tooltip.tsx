import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  children: React.ReactNode;
  content: React.ReactNode;
  maxWidth?: number;
  side?: 'top' | 'bottom';
}

export default function Tooltip({ children, content, maxWidth = 280 }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !content) return;

    const onEnter = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    const onMove  = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    const onLeave = () => setPos(null);

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mousemove',  onMove);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mousemove',  onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [content]);

  return (
    <span ref={wrapperRef} style={{ display: 'inline-block' }}>
      {children}
      {pos && content && createPortal(
        <TooltipBox x={pos.x} y={pos.y} maxWidth={maxWidth}>
          {content}
        </TooltipBox>,
        document.body
      )}
    </span>
  );
}

function TooltipBox({
  x, y, maxWidth, children,
}: {
  x: number; y: number; maxWidth: number; children: React.ReactNode;
}) {
  const gap = 14;
  const left = Math.min(x + gap, window.innerWidth - maxWidth - 8);
  const approxHeight = 80;
  const tooLow = y + approxHeight + gap > window.innerHeight;
  const top = tooLow ? y - approxHeight - gap : y + gap;

  return (
    <span style={{
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
    }}>
      {children}
    </span>
  );
}
