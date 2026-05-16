import { useEffect, useRef, useState, useCallback } from 'react';

export interface TourStep {
  id: string;
  title: string;
  content: React.ReactNode;
  target: string | null; // CSS selector for the highlighted element
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface Props {
  steps: TourStep[];
  onDone: () => void;
}

interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 10; // padding around spotlight element
const CARD_WIDTH = 340;
const CARD_GAP = 14; // gap between spotlight and card

export default function GuidedTour({ steps, onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const [spot, setSpot] = useState<SpotRect | null>(null);
  const [ready, setReady] = useState(false);       // card + spotlight per-step visibility
  const [overlayUp, setOverlayUp] = useState(false); // overlay fades in once and stays
  const cardRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const stepTimerRef = useRef<number>(0);

  const step = steps[idx];
  const isFirst = idx === 0;
  const isLast = idx === steps.length - 1;

  // Fade out first, then switch content + reposition, then fade back in.
  // The 200ms delay matches the 180ms opacity transition so the card is fully
  // invisible before its content or position changes.
  const goToStep = (newIdx: number) => {
    clearTimeout(stepTimerRef.current);
    setReady(false);
    stepTimerRef.current = window.setTimeout(() => setIdx(newIdx), 144);
  };

  const recalc = useCallback(() => {
    if (!step.target) {
      setSpot(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setSpot(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setSpot({
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    });
  }, [step.target]);

  useEffect(() => {
    // ready is already false (set by goToStep before idx changed).
    // Scroll target into view, measure, then reveal.
    if (step.target) {
      const el = document.querySelector(step.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        animRef.current = window.setTimeout(() => { recalc(); setReady(true); }, 350);
        return () => clearTimeout(animRef.current);
      }
    }
    recalc();
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, [idx, step.target, recalc]);

  useEffect(() => {
    const onResize = () => recalc();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [recalc]);

  // Fade the overlay in once on mount — it stays up for the whole tour
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOverlayUp(true));
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(stepTimerRef.current);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
      if (e.key === 'ArrowRight' && !isLast) goToStep(idx + 1);
      if (e.key === 'ArrowLeft' && !isFirst) goToStep(idx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, isFirst, isLast, onDone]);

  // ── Card positioning ──────────────────────────────────────────────────────
  function getCardStyle(): React.CSSProperties {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!spot) {
      // Centered
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: CARD_WIDTH,
        zIndex: 10002,
      };
    }

    const placement = step.placement ?? 'bottom';
    const spotBottom = spot.top + spot.height;
    const spotRight  = spot.left + spot.width;
    const spotCenterX = spot.left + spot.width / 2;
    const spotCenterY = spot.top + spot.height / 2;

    const cardEl = cardRef.current;
    const cardH = cardEl ? cardEl.offsetHeight : 180;
    const top =
      placement === 'bottom' ? Math.min(spotBottom + CARD_GAP, vh - 200)
      : placement === 'top'   ? Math.max(8, spot.top - CARD_GAP - cardH)
      :                         Math.max(8, Math.min(spotCenterY - 80, vh - 200)); // right | left

    const left =
      placement === 'right' ? Math.min(spotRight + CARD_GAP, vw - CARD_WIDTH - 8)
      : placement === 'left'  ? Math.max(8, spot.left - CARD_GAP - CARD_WIDTH)
      :                         Math.max(8, Math.min(spotCenterX - CARD_WIDTH / 2, vw - CARD_WIDTH - 8)); // top | bottom

    return {
      position: 'fixed',
      top,
      left,
      width: CARD_WIDTH,
      zIndex: 10002,
    };
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onDone}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 9999,
          pointerEvents: 'auto',
          opacity: overlayUp ? 1 : 0,
          transition: 'opacity 0.13s ease',
        }}
      />

      {/* Spotlight cutout */}
      {spot && (
        <div
          style={{
            position: 'fixed',
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            borderRadius: 6,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
            zIndex: 10000,
            pointerEvents: 'none',
            outline: '2px solid rgba(255,255,255,0.5)',
            opacity: ready ? 1 : 0,
            transition: 'opacity 0.13s ease, top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease',
          }}
        />
      )}

      {/* Tour card */}
      <div
        ref={cardRef}
        // eslint-disable-next-line react-hooks/refs -- cardRef.current is intentionally read for self-measurement; null on first render, effect re-triggers with real height
        style={{ ...getCardStyle(), opacity: ready ? 1 : 0, transition: 'opacity 0.13s ease' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>
              {step.title}
            </span>
            <button
              onClick={onDone}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                width: 24, height: 24,
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              title="Close tour"
            >✕</button>
          </div>

          {/* Body */}
          <div style={{ padding: '16px', fontSize: '13.5px', color: '#444', lineHeight: 1.55 }}>
            {step.content}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Step dots */}
            <div style={{ display: 'flex', gap: 5 }}>
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToStep(i)}
                  style={{
                    width: i === idx ? 18 : 8,
                    height: 8,
                    borderRadius: 4,
                    border: 'none',
                    background: i === idx ? '#e53e3e' : '#ddd',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'width 0.2s, background 0.2s',
                  }}
                />
              ))}
            </div>

            {/* Nav buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {!isFirst && (
                <button
                  onClick={() => goToStep(idx - 1)}
                  style={{
                    padding: '6px 14px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    background: '#fff',
                    color: '#555',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
              )}
              {isLast ? (
                <button
                  onClick={onDone}
                  style={{
                    padding: '6px 16px',
                    border: 'none',
                    borderRadius: 6,
                    background: '#e53e3e',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Done ✓
                </button>
              ) : (
                <button
                  onClick={() => goToStep(idx + 1)}
                  style={{
                    padding: '6px 16px',
                    border: 'none',
                    borderRadius: 6,
                    background: '#e53e3e',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
