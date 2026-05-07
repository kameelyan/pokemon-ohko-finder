import { useState } from 'react';
import type { MoveOHKOGroup } from '../calc/damage';
import type { GameData } from '../data/types';
import TypeBadge from './TypeBadge';

interface Props {
  groups: MoveOHKOGroup[];
  data: GameData;
  showPossible: boolean;
}

function effLabel(x: number) {
  if (x === 4) return { text: '4×', color: '#7B2D8B' };
  if (x === 2) return { text: '2×', color: '#c53030' };
  if (x === 1) return { text: '1×', color: '#555' };
  if (x === 0.5) return { text: '½×', color: '#2b6cb0' };
  return { text: `${x}×`, color: '#555' };
}

export default function MoveGroupsView({ groups, data, showPossible }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (moveId: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(moveId)) next.delete(moveId);
      else next.add(moveId);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(groups.map(g => g.move.id)));
  const collapseAll = () => setExpandedIds(new Set());

  if (groups.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#888', marginTop: '32px', fontSize: '16px' }}>
        No {showPossible ? '' : 'guaranteed '}OHKOs found with current settings.
      </div>
    );
  }

  const expandedCount = expandedIds.size;

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '12px', flexWrap: 'wrap', gap: '8px',
      }}>
        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
          {groups.length} move{groups.length !== 1 ? 's' : ''} can {showPossible ? 'potentially ' : ''}OHKO
          {groups[0]?.targetInfo.length === 2 ? ' both targets' : ' this Pokémon'}.
          {!showPossible && ' (Guaranteed only — enable "Show possible OHKOs" for more.)'}
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={expandAll} style={btnStyle}>Expand all</button>
          <button onClick={collapseAll} style={btnStyle} disabled={expandedCount === 0}>Collapse all</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {groups.map(group => {
          const isExpanded = expandedIds.has(group.move.id);
          const isPhysical = group.move.damageClassId === 2;
          const statLabel = isPhysical ? 'Atk' : 'SpA';
          const totalPokemon = group.stabPokemon.length + group.noStabPokemon.length;

          return (
            <div
              key={group.move.id}
              style={{
                border: '1px solid #e8e8e8',
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              {/* Clickable header row */}
              <div
                onClick={() => toggleExpand(group.move.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: isExpanded ? '#fafafa' : '#fff',
                  flexWrap: 'wrap',
                  rowGap: '6px',
                }}
              >
                {/* Chevron */}
                <span style={{
                  fontSize: '12px', color: '#aaa',
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s',
                  display: 'inline-block',
                  width: '14px', flexShrink: 0,
                }}>▶</span>

                {/* Move name */}
                <span style={{ fontWeight: 700, fontSize: '15px', minWidth: '120px' }}>
                  {group.move.name}
                </span>

                <TypeBadge typeName={group.typeName} />

                <span style={{
                  fontSize: '11px', color: '#777',
                  background: '#eee', borderRadius: '4px', padding: '1px 6px'
                }}>
                  {isPhysical ? '⚔ Phys' : '✨ Spec'}
                </span>

                <span style={{
                  fontSize: '11px', color: '#777',
                  background: '#eee', borderRadius: '4px', padding: '1px 6px'
                }}>
                  {group.move.power} BP
                </span>

                {/* Per-target effectiveness badges */}
                {group.targetInfo.map((ti, i) => {
                  const eff = effLabel(ti.effectiveness);
                  return (
                    <span key={i} style={{
                      fontSize: '12px', fontWeight: 700, color: eff.color,
                      background: `${eff.color}18`, borderRadius: '4px', padding: '1px 7px',
                    }}>
                      {group.targetInfo.length > 1 ? `${ti.name}: ` : ''}{eff.text}
                    </span>
                  );
                })}

                {/* Stat thresholds */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {group.minStatStab !== null && (
                    <StatThreshold label={`${statLabel} w/ STAB`} value={group.minStatStab} color="#dd6b20" />
                  )}
                  {group.minStatNoStab !== null && (
                    <StatThreshold label={`${statLabel} no STAB`} value={group.minStatNoStab} color="#3182ce" />
                  )}
                  {showPossible && group.minStatStab === null && group.minStatStabPossible !== null && (
                    <StatThreshold label={`${statLabel} w/ STAB`} value={group.minStatStabPossible} color="#dd6b20" muted />
                  )}
                  {showPossible && group.minStatNoStab === null && group.minStatNoStabPossible !== null && (
                    <StatThreshold label={`${statLabel} no STAB`} value={group.minStatNoStabPossible} color="#3182ce" muted />
                  )}

                  <span style={{ fontSize: '12px', color: '#aaa', minWidth: '60px', textAlign: 'right' }}>
                    {totalPokemon} Pokémon
                  </span>
                </div>
              </div>

              {/* Expandable Pokémon chips */}
              {isExpanded && (
                <div style={{
                  padding: '10px 16px 12px',
                  borderTop: '1px solid #eee',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}>
                  {[
                    ...group.stabPokemon.map(p => ({ pokemon: p, stab: true })),
                    ...group.noStabPokemon.map(p => ({ pokemon: p, stab: false })),
                  ]
                    .sort((a, b) => {
                      if (a.stab !== b.stab) return a.stab ? -1 : 1;
                      const aStat = isPhysical ? a.pokemon.stats.atk : a.pokemon.stats.spa;
                      const bStat = isPhysical ? b.pokemon.stats.atk : b.pokemon.stats.spa;
                      return bStat - aStat;
                    })
                    .map(({ pokemon, stab }) => {
                      const relevantStat = isPhysical ? pokemon.stats.atk : pokemon.stats.spa;
                      const typeNames = pokemon.typeIds.map(tid => data.typeNames.get(tid) ?? '?');
                      return (
                        <PokemonChip
                          key={pokemon.id}
                          id={pokemon.id}
                          name={pokemon.name}
                          stat={relevantStat}
                          statLabel={statLabel}
                          stab={stab}
                          typeNames={typeNames}
                        />
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatThreshold({ label, value, color, muted = false }: {
  label: string; value: number; color: string; muted?: boolean;
}) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{
        fontSize: '17px', fontWeight: 800,
        color: muted ? '#bbb' : color,
        lineHeight: 1.1,
      }}>
        {value}
        {muted && <span style={{ fontSize: '10px', color: '#ccc' }}> *</span>}
      </div>
    </div>
  );
}

function PokemonChip({ id, name, stat, statLabel, stab, typeNames }: {
  id: number; name: string; stat: number; statLabel: string;
  stab: boolean; typeNames: string[];
}) {
  return (
    <div
      title={`${name} — ${statLabel}: ${stat} (base)${stab ? ' · STAB' : ''}\nTypes: ${typeNames.join(', ')}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: stab ? '#fff8f0' : '#f7f7f7',
        border: `1px solid ${stab ? '#f6ad55' : '#e2e2e2'}`,
        borderRadius: '20px',
        padding: '3px 10px 3px 4px',
        cursor: 'default',
        fontSize: '13px',
        whiteSpace: 'nowrap',
      }}
    >
      <img
        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
        alt={name}
        width={28}
        height={28}
        style={{ imageRendering: 'pixelated', marginTop: '-2px' }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <span style={{ fontWeight: 600 }}>{name}</span>
      <span style={{ color: '#999', fontSize: '11px' }}>{stat}</span>
      {stab && <span style={{ fontSize: '10px', color: '#dd6b20', fontWeight: 700 }}>STAB</span>}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '5px 12px',
  fontSize: '12px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  background: '#fff',
  cursor: 'pointer',
  color: '#555',
};
