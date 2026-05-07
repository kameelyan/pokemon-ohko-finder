import type { OHKOResult } from '../calc/damage';
import type { GameData } from '../data/types';
import TypeBadge from './TypeBadge';

interface Props {
  results: OHKOResult[];
  data: GameData;
  targetHP: number;
  showPossible: boolean;
}

function effectivenessLabel(x: number): string {
  if (x === 4) return '4×';
  if (x === 2) return '2×';
  if (x === 1) return '1×';
  if (x === 0.5) return '½×';
  if (x === 0.25) return '¼×';
  return `${x}×`;
}

export default function ResultsTable({ results, data, targetHP, showPossible }: Props) {
  const displayed = showPossible ? results : results.filter(r => r.isGuaranteed);

  if (displayed.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#888', marginTop: '40px', fontSize: '18px' }}>
        No {showPossible ? '' : 'guaranteed '}OHKOs found with current settings.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <p style={{ color: '#666', marginBottom: '12px' }}>
        Showing {displayed.length} result{displayed.length !== 1 ? 's' : ''}.
        {!showPossible && ' (Guaranteed OHKOs only — enable "Show possible OHKOs" for more results.)'}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
            <th style={th}>#</th>
            <th style={th}>Attacker</th>
            <th style={th}>Move</th>
            <th style={th}>Type</th>
            <th style={th}>Eff.</th>
            <th style={th}>STAB</th>
            <th style={th}>Damage</th>
            <th style={th}>% HP</th>
            <th style={th}>OHKO</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((r, i) => {
            const moveTypeName = data.typeNames.get(r.move.typeId) ?? '?';
            const minPct = Math.round(r.minDamage / targetHP * 100);
            const maxPct = Math.round(r.maxDamage / targetHP * 100);
            const isGuaranteed = r.isGuaranteed;
            return (
              <tr
                key={`${r.attacker.id}-${r.move.id}`}
                style={{
                  borderBottom: '1px solid #eee',
                  background: isGuaranteed ? '#f0fff4' : '#fffbf0',
                }}
              >
                <td style={td}>
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${r.attacker.id}.png`}
                    alt={r.attacker.name}
                    width={40}
                    height={40}
                    style={{ imageRendering: 'pixelated', display: 'block' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </td>
                <td style={{ ...td, fontWeight: 600 }}>
                  {r.attacker.name}
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    {r.attacker.typeIds.map(tid => data.typeNames.get(tid) ?? '?').map(t => (
                      <TypeBadge key={t} typeName={t} />
                    ))}
                  </div>
                </td>
                <td style={td}>
                  <span style={{ fontWeight: 500 }}>{r.move.name}</span>
                  <div style={{ fontSize: '11px', color: '#888' }}>
                    {r.move.damageClassId === 2 ? '⚔ Physical' : '✨ Special'} · {r.move.power} BP
                  </div>
                </td>
                <td style={td}>
                  <TypeBadge typeName={moveTypeName} />
                </td>
                <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: r.typeEffectiveness > 1 ? '#c03028' : '#555' }}>
                  {effectivenessLabel(r.typeEffectiveness)}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  {r.stab ? <span style={{ color: '#F08030', fontWeight: 700 }}>✓</span> : <span style={{ color: '#ccc' }}>—</span>}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{r.minDamage}–{r.maxDamage}</span>
                  <div style={{ fontSize: '11px', color: '#888' }}>/ {targetHP} HP</div>
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{minPct}–{maxPct}%</span>
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  {isGuaranteed ? (
                    <span style={{
                      background: '#38a169', color: '#fff', padding: '2px 8px',
                      borderRadius: '12px', fontWeight: 700, fontSize: '12px'
                    }}>Always</span>
                  ) : (
                    <span style={{
                      background: '#d69e2e', color: '#fff', padding: '2px 8px',
                      borderRadius: '12px', fontWeight: 700, fontSize: '12px'
                    }}>Possible</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#555',
};

const td: React.CSSProperties = {
  padding: '8px 12px',
  verticalAlign: 'middle',
};
