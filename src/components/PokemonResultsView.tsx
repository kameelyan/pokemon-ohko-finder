import { useState } from 'react';
import type { PokemonOHKOResult, OHKOMoveInfo } from '../calc/damage';
import { calcStat } from '../calc/damage';
import type { GameData, Pokemon } from '../data/types';
import TypeBadge from './TypeBadge';
import Tooltip from './Tooltip';

function CategoryIcon({ damageClassId }: { damageClassId: number }) {
  const [failed, setFailed] = useState(false);
  const isPhysical = damageClassId === 2;
  const label = isPhysical ? 'Physical' : 'Special';
  const src = `https://play.pokemonshowdown.com/sprites/categories/${label}.png`;

  if (failed) {
    return (
      <span style={{ fontSize: '11px', color: isPhysical ? '#c05000' : '#5060c0' }}>
        {isPhysical ? 'Phys' : 'Spec'}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={label}
      title={label}
      height={18}
      style={{ verticalAlign: 'middle', display: 'block' }}
      onError={() => setFailed(true)}
    />
  );
}

interface Props {
  results: PokemonOHKOResult[];
  targetNames: string[];
  targetSpeeds: number[];
  data: GameData;
  showPossible: boolean;
}

/** Full base-stat grid shown in the Pokémon header tooltip */
function StatTooltipContent({ pokemon }: { pokemon: Pokemon }) {
  const { hp, atk, def, spa, spd, spe } = pokemon.stats;
  const total = hp + atk + def + spa + spd + spe;
  const rows: [string, number][] = [
    ['HP', hp], ['Atk', atk], ['Def', def],
    ['SpA', spa], ['SpD', spd], ['Spe', spe],
  ];
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '13px' }}>{pokemon.name} — Base Stats</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px 12px' }}>
        {rows.map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: '#aaa' }}>{label}</span>
            <span style={{ fontWeight: 700, color: statColor(val) }}>{val}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #333', marginTop: '5px', paddingTop: '5px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#aaa' }}>Total</span>
        <span style={{ fontWeight: 700 }}>{total}</span>
      </div>
    </div>
  );
}

function statColor(val: number): string {
  if (val >= 120) return '#68d391';
  if (val >= 90) return '#f6e05e';
  if (val >= 60) return '#f6ad55';
  return '#fc8181';
}

export default function PokemonResultsView({ results, targetNames, targetSpeeds, data, showPossible }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const expandAll = () => setExpandedIds(new Set(results.map(r => r.pokemon.id)));
  const collapseAll = () => setExpandedIds(new Set());

  if (results.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#888', marginTop: '32px', fontSize: '16px' }}>
        No{showPossible ? '' : ' guaranteed'} OHKOs found with current settings.
        {!showPossible && (
          <div style={{ marginTop: '8px', fontSize: '14px' }}>
            Try enabling "Show possible OHKOs" to see lucky-roll results.
          </div>
        )}
      </div>
    );
  }

  const guaranteed = results.filter(r => r.allGuaranteed);
  const possible = results.filter(r => !r.allGuaranteed);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
          <strong>{guaranteed.length}</strong> Pokémon with guaranteed OHKOs
          {showPossible && possible.length > 0 && <>, <strong>{possible.length}</strong> more with possible OHKOs</>}.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={expandAll} style={btnStyle}>Expand all</button>
          <button onClick={collapseAll} style={btnStyle} disabled={expandedIds.size === 0}>Collapse all</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {results.map(result => {
          const { pokemon, movesPerTarget, allGuaranteed } = result;
          const isExpanded = expandedIds.has(pokemon.id);
          const typeNames = pokemon.typeIds.map(tid => data.typeNames.get(tid) ?? '?');

          const moveCounts = movesPerTarget.map(moves => ({
            guaranteed: moves.filter(m => m.isGuaranteed).length,
            total: moves.length,
          }));

          const attackerSpe = calcStat(pokemon.stats.spe, 0);

          return (
            <div
              key={pokemon.id}
              style={{
                border: `1px solid ${allGuaranteed ? '#c6f6d5' : '#fef3c7'}`,
                borderRadius: '10px',
                background: '#fff',
              }}
            >
              {/* Clickable header */}
              <div
                onClick={() => toggle(pokemon.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 14px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: allGuaranteed ? '#f0fff4' : '#fffbf0',
                  flexWrap: 'wrap',
                  rowGap: '4px',
                }}
              >
                <span style={{
                  fontSize: '11px', color: '#aaa',
                  transform: isExpanded ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s',
                  display: 'inline-block', width: '12px', flexShrink: 0,
                }}>▶</span>

                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
                  alt={pokemon.name}
                  width={36} height={36}
                  style={{ imageRendering: 'pixelated', marginTop: '-2px' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />

                {/* Name with stat tooltip */}
                <Tooltip content={<StatTooltipContent pokemon={pokemon} />} maxWidth={220}>
                  <span style={{
                    fontWeight: 700, fontSize: '15px', minWidth: '120px',
                    borderBottom: '1px dashed #ccc', cursor: 'help',
                  }}>
                    {pokemon.name}
                  </span>
                </Tooltip>

                <div style={{ display: 'flex', gap: '3px' }}>
                  {typeNames.map(t => <TypeBadge key={t} typeName={t} />)}
                </div>

                {/* Ability chips */}
                {pokemon.abilities.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {pokemon.abilities.map(ability => (
                      <Tooltip
                        key={ability.name}
                        content={
                          <div>
                            <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                              {ability.name}
                              {ability.isHidden && (
                                <span style={{ marginLeft: '6px', fontSize: '10px', color: '#a78bfa', fontWeight: 600 }}>Hidden</span>
                              )}
                            </div>
                            {ability.description
                              ? <div style={{ color: '#ccc' }}>{ability.description}</div>
                              : <div style={{ color: '#777', fontStyle: 'italic' }}>No description available</div>
                            }
                          </div>
                        }
                        maxWidth={240}
                      >
                        <span style={{
                          background: ability.isHidden ? '#f3f0ff' : '#f0f0f0',
                          border: `1px solid ${ability.isHidden ? '#c4b5fd' : '#e0e0e0'}`,
                          color: ability.isHidden ? '#6d28d9' : '#444',
                          borderRadius: '5px',
                          padding: '1px 7px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'help',
                          whiteSpace: 'nowrap',
                        }}>
                          {ability.name}
                        </span>
                      </Tooltip>
                    ))}
                  </div>
                )}

                <StatChip label="Atk" value={pokemon.stats.atk} />
                <StatChip label="SpA" value={pokemon.stats.spa} />
                <StatChip label="BST" value={
                  pokemon.stats.hp + pokemon.stats.atk + pokemon.stats.def +
                  pokemon.stats.spa + pokemon.stats.spd + pokemon.stats.spe
                } />

                {/* Speed chip with per-target comparison badges */}
                <Tooltip
                  content={
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: '5px' }}>Speed (uninvested L50)</div>
                      <div style={{ marginBottom: '4px' }}>This: {attackerSpe}</div>
                      {targetSpeeds.map((ts, i) => {
                        const faster = attackerSpe > ts;
                        const tied = attackerSpe === ts;
                        return (
                          <div key={i} style={{ color: faster ? '#68d391' : tied ? '#f6e05e' : '#fc8181' }}>
                            {targetNames[i]}: {ts} {faster ? '▲ faster' : tied ? '= tied' : '▼ slower'}
                          </div>
                        );
                      })}
                    </div>
                  }
                  maxWidth={200}
                >
                  <span style={{
                    background: '#f0f0f0', borderRadius: '5px', padding: '2px 7px',
                    fontSize: '12px', fontWeight: 600, cursor: 'help',
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                  }}>
                    Spe <span style={{ color: '#333' }}>{pokemon.stats.spe}</span>
                    {targetSpeeds.length > 0 && (() => {
                      const allFaster = targetSpeeds.every(ts => attackerSpe > ts);
                      const allSlower = targetSpeeds.every(ts => attackerSpe < ts);
                      const allTied   = targetSpeeds.every(ts => attackerSpe === ts);
                      if (allFaster) return <span style={{ color: '#38a169', fontSize: '11px' }}>▲</span>;
                      if (allSlower) return <span style={{ color: '#e53e3e', fontSize: '11px' }}>▼</span>;
                      if (allTied)   return <span style={{ color: '#d69e2e', fontSize: '11px' }}>═</span>;
                      return <span style={{ color: '#888', fontSize: '11px' }}>~</span>;
                    })()}
                  </span>
                </Tooltip>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {moveCounts.map((mc, i) => (
                    <div key={i} style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase' }}>
                        vs {targetNames[i]}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: mc.guaranteed > 0 ? '#38a169' : '#d69e2e' }}>
                        {mc.guaranteed > 0
                          ? `${mc.guaranteed} guaranteed`
                          : `${mc.total} possible`}
                      </div>
                    </div>
                  ))}
                  <StatusBadge allGuaranteed={allGuaranteed} />
                </div>
              </div>

              {/* Expanded: move tables per target */}
              {isExpanded && (
                <div style={{
                  borderTop: `1px solid ${allGuaranteed ? '#c6f6d5' : '#fef3c7'}`,
                  display: 'flex',
                  flexWrap: 'wrap',
                }}>
                  {movesPerTarget.map((moves, ti) => (
                    <div
                      key={ti}
                      style={{
                        flex: '1 1 300px',
                        borderRight: ti < movesPerTarget.length - 1 ? '1px solid #eee' : 'none',
                        padding: '12px 16px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>
                        vs {targetNames[ti]} ({moves[0]?.targetHP ?? '?'} HP)
                      </div>
                      <MoveTable
                        moves={moves}
                        data={data}
                        totalTargets={movesPerTarget.length}
                        targetNames={targetNames}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MoveTable({ moves, data, totalTargets, targetNames }: {
  moves: OHKOMoveInfo[];
  data: GameData;
  totalTargets: number;
  targetNames: string[];
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #eee' }}>
          <th style={th}>Move</th>
          <th style={th}>Type</th>
          <th style={{ ...th, textAlign: 'center' }}>BP</th>
          <th style={{ ...th, textAlign: 'center' }}>Acc</th>
          <th style={{ ...th, textAlign: 'center' }}>Cat</th>
          <th style={{ ...th, textAlign: 'right' }}>Damage</th>
          <th style={{ ...th, textAlign: 'right' }}>% HP</th>
          <th style={{ ...th, textAlign: 'center' }}>EVs</th>
          <th style={{ ...th, textAlign: 'center' }}>OHKO</th>
        </tr>
      </thead>
      <tbody>
        {moves.map(m => {
          const typeName = data.typeNames.get(m.move.typeId) ?? '?';
          const minPct = Math.round(m.minDamage / m.targetHP * 100);
          const maxPct = Math.round(m.maxDamage / m.targetHP * 100);
          return (
            <tr key={m.move.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
              <td style={{ ...td, fontWeight: 600 }}>
                {/* Move name with description tooltip */}
                <Tooltip
                  content={m.move.description
                    ? <>{m.move.description}</>
                    : null}
                  maxWidth={260}
                  side="bottom"
                >
                  <span style={{
                    borderBottom: m.move.description ? '1px dashed #ccc' : 'none',
                    cursor: m.move.description ? 'help' : 'default',
                  }}>
                    {m.move.name}
                  </span>
                </Tooltip>
                {m.stab && (
                  <span style={{ marginLeft: '4px', fontSize: '10px', color: '#dd6b20', fontWeight: 700 }}>STAB</span>
                )}
                {totalTargets > 1 && m.coveredTargetIndices.length > 1 && (
                  <Tooltip
                    content={
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                          KOs {m.coveredTargetIndices.length === totalTargets ? 'all' : m.coveredTargetIndices.length} targets
                        </div>
                        {m.coveredTargetIndices.map(i => (
                          <div key={i} style={{ color: '#aaa' }}>• {targetNames[i]}</div>
                        ))}
                      </div>
                    }
                  >
                    <span style={{
                      marginLeft: '5px',
                      background: m.coveredTargetIndices.length === totalTargets ? '#6b46c1' : '#2b6cb0',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      cursor: 'help',
                      whiteSpace: 'nowrap',
                    }}>
                      {m.coveredTargetIndices.length === totalTargets ? '★ All targets' : `KOs ${m.coveredTargetIndices.length}`}
                    </span>
                  </Tooltip>
                )}
              </td>
              <td style={td}><TypeBadge typeName={typeName} /></td>
              <td style={{ ...td, textAlign: 'center', color: '#777' }}>{m.move.power}</td>
              <td style={{ ...td, textAlign: 'center' }}>
                {m.accuracy === null
                  ? <Tooltip content="Always hits — bypasses accuracy checks" side="bottom">
                      <span style={{ color: '#38a169', fontWeight: 700, fontSize: '12px', cursor: 'help' }}>—</span>
                    </Tooltip>
                  : <span style={{
                      color: m.accuracy === 100 ? '#555' : m.accuracy >= 85 ? '#d69e2e' : '#e53e3e',
                      fontWeight: m.accuracy < 100 ? 700 : 400,
                    }}>
                      {m.accuracy}%
                    </span>
                }
              </td>
              <td style={{ ...td, textAlign: 'center' }}>
                <CategoryIcon damageClassId={m.move.damageClassId} />
              </td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>
                {m.minDamage}–{m.maxDamage}
              </td>
              <td style={{ ...td, textAlign: 'right', color: '#555' }}>
                {minPct}–{maxPct}%
              </td>
              <td style={{ ...td, textAlign: 'center' }}>
                <Tooltip
                  content={m.evNeeded === 0
                    ? 'No EV investment needed'
                    : `Needs ${m.evNeeded} EVs in ${m.move.damageClassId === 2 ? 'Attack' : 'Sp. Atk'}`}
                  side="bottom"
                >
                  <span style={{
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'help',
                    color: m.evNeeded === 0 ? '#38a169' : m.evNeeded <= 128 ? '#d69e2e' : '#e53e3e',
                  }}>
                    {m.evNeeded === 0 ? '0' : m.evNeeded}
                  </span>
                </Tooltip>
              </td>
              <td style={{ ...td, textAlign: 'center' }}>
                {m.isGuaranteed
                  ? <span style={guaranteedBadge}>✓</span>
                  : <span style={possibleBadge}>~</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <span style={{ background: '#f0f0f0', borderRadius: '5px', padding: '2px 7px', fontSize: '12px', fontWeight: 600 }}>
      {label} <span style={{ color: '#333' }}>{value}</span>
    </span>
  );
}

function StatusBadge({ allGuaranteed }: { allGuaranteed: boolean }) {
  return allGuaranteed ? (
    <span style={{ background: '#38a169', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
      Guaranteed
    </span>
  ) : (
    <span style={{ background: '#d69e2e', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
      Possible
    </span>
  );
}

const th: React.CSSProperties = {
  padding: '5px 8px', textAlign: 'left', fontWeight: 700,
  fontSize: '11px', textTransform: 'uppercase', color: '#aaa', letterSpacing: '0.04em',
};
const td: React.CSSProperties = { padding: '5px 8px', verticalAlign: 'middle' };
const guaranteedBadge: React.CSSProperties = {
  background: '#c6f6d5', color: '#276749', borderRadius: '4px',
  padding: '1px 6px', fontWeight: 700, fontSize: '12px',
};
const possibleBadge: React.CSSProperties = {
  background: '#fef3c7', color: '#92400e', borderRadius: '4px',
  padding: '1px 6px', fontWeight: 700, fontSize: '12px',
};
const btnStyle: React.CSSProperties = {
  padding: '5px 12px', fontSize: '12px', border: '1px solid #ddd',
  borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#555',
};
