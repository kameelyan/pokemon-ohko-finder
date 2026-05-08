import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { PokemonOHKOResult, OHKOMoveInfo } from '../calc/damage';
import type { MoveFlag } from '../data/types';
import { calcStat } from '../calc/damage';
import type { GameData, Pokemon } from '../data/types';
import TypeBadge from './TypeBadge';
import Tooltip from './Tooltip';

const FLAG_INFO: Record<MoveFlag, { label: string; description: string; bg: string; color: string }> = {
  contact:    { label: 'Contact',   description: 'Makes contact — triggers Rocky Helmet, Rough Skin, Static, etc.',      bg: '#feebc8', color: '#7b341e' },
  punch:      { label: 'Punch',     description: 'Punch move — boosted by Iron Fist',                                    bg: '#bee3f8', color: '#2a4365' },
  sound:      { label: 'Sound',     description: 'Sound move — blocked by Soundproof; boosted by Throat Spray',          bg: '#e9d8fd', color: '#553c9a' },
  powder:     { label: 'Powder',    description: 'Powder move — blocked by Safety Goggles, Overcoat, and Grass-types',   bg: '#fefcbf', color: '#744210' },
  bite:       { label: 'Bite',      description: 'Bite move — boosted by Strong Jaw',                                    bg: '#fed7d7', color: '#742a2a' },
  pulse:      { label: 'Pulse',     description: 'Pulse/aura move — boosted by Mega Launcher',                           bg: '#b2f5ea', color: '#234e52' },
  ballistics: { label: 'Ballistic', description: 'Ballistic move — blocked by Bulletproof',                              bg: '#e2e8f0', color: '#2d3748' },
  dance:      { label: 'Dance',     description: 'Dance move — triggers the Dancer ability',                             bg: '#fed7e2', color: '#702459' },
};

const ALL_MOVE_FLAGS: MoveFlag[] = ['contact', 'punch', 'sound', 'powder', 'bite', 'pulse', 'ballistics', 'dance'];

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

function ItemIcon({ identifier, name, boost, size = 16 }: { identifier: string; name: string; boost: number; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${identifier}.png`;
  const pct = Math.round((boost - 1) * 100);
  if (failed) {
    return (
      <Tooltip content={`${name} (+${pct}%)`} side="bottom">
        <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 700, cursor: 'help' }}>
          [{name}]
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip content={`${name} (+${pct}%)`} side="bottom">
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{ verticalAlign: 'middle', imageRendering: 'pixelated', cursor: 'help', display: 'block' }}
        onError={() => setFailed(true)}
      />
    </Tooltip>
  );
}

interface Props {
  results: PokemonOHKOResult[];
  targetNames: string[];
  targetSpeeds: number[];
  mustOutspeedSpeeds: number[];
  championsOnly: boolean;
  data: GameData;
  showPossible: boolean;
  onShowPossibleChange: (v: boolean) => void;
  minAccuracy: number;
  onMinAccuracyChange: (v: number) => void;
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

// ── Filter types ────────────────────────────────────────────────────────────

type OutspeedFilter = 'any' | 'all' | 'none';
type CategoryFilter = 'all' | 'physical' | 'special';

interface Filters {
  types: Set<number>;
  minSpe: string;
  maxSpe: string;
  outspeed: OutspeedFilter;
  trickRoom: boolean;
  category: CategoryFilter;
  noEvs: boolean;
  noItem: boolean;
  defaultOnly: boolean;
  excludedFlags: Set<MoveFlag>;
}

const EMPTY_FILTERS: Filters = {
  types: new Set(),
  minSpe: '',
  maxSpe: '',
  outspeed: 'any',
  trickRoom: false,
  category: 'all',
  noEvs: false,
  noItem: false,
  defaultOnly: false,
  excludedFlags: new Set(),
};

function countActiveFilters(f: Filters, minAccuracy: number, showPossible: boolean): number {
  return (
    f.types.size +
    (f.minSpe !== '' ? 1 : 0) +
    (f.maxSpe !== '' ? 1 : 0) +
    (f.outspeed !== 'any' ? 1 : 0) +
    (f.trickRoom ? 1 : 0) +
    (f.category !== 'all' ? 1 : 0) +
    (f.noEvs ? 1 : 0) +
    (f.noItem ? 1 : 0) +
    (f.defaultOnly ? 1 : 0) +
    (f.excludedFlags.size > 0 ? 1 : 0) +
    (showPossible ? 1 : 0) +
    (minAccuracy > 0 ? 1 : 0)
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PokemonResultsView({ results, targetNames, targetSpeeds, mustOutspeedSpeeds, championsOnly, data, showPossible, onShowPossibleChange, minAccuracy, onMinAccuracyChange }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const toggle = (id: number) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Unique type IDs across all result Pokémon
  const availableTypes = useMemo(() => {
    const s = new Set<number>();
    for (const r of results) for (const t of r.pokemon.typeIds) s.add(t);
    return Array.from(s).sort((a, b) => a - b);
  }, [results]);

  // Apply filters
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const spe = calcStat(r.pokemon.stats.spe, 0);

      if (filters.types.size > 0 && !r.pokemon.typeIds.some(t => filters.types.has(t))) return false;

      if (filters.minSpe !== '' && spe < Number(filters.minSpe)) return false;
      if (filters.maxSpe !== '' && spe > Number(filters.maxSpe)) return false;

      // In Trick Room slower = first, so the comparison flips
      const movesFirst = (a: number, t: number) => filters.trickRoom ? a < t : a > t;

      if (targetSpeeds.length > 0 && filters.outspeed !== 'any') {
        if (filters.outspeed === 'all'  && !targetSpeeds.every(ts => movesFirst(spe, ts))) return false;
        if (filters.outspeed === 'none' && targetSpeeds.some(ts => movesFirst(spe, ts)))   return false;
      }

      // Per-target must-outspeed constraints (set on the target panel, TR-aware)
      if (mustOutspeedSpeeds.length > 0 && !mustOutspeedSpeeds.every(ts => movesFirst(spe, ts))) return false;

      if (filters.category !== 'all') {
        const physical = filters.category === 'physical';
        const classId = physical ? 2 : 3;
        if (!r.movesPerTarget.every(moves => moves.some(m => m.move.damageClassId === classId))) return false;
      }

      if (filters.noEvs && !r.movesPerTarget.every(moves => moves.some(m => m.evNeeded === 0))) return false;
      if (filters.noItem && !r.movesPerTarget.every(moves => moves.some(m => !m.item))) return false;
      if (filters.defaultOnly && !r.pokemon.isDefault) return false;
      if (filters.excludedFlags.size > 0) {
        // Keep only Pokémon that have at least one OHKO move per target with none of the excluded flags
        if (!r.movesPerTarget.every(moves =>
          moves.some(m => !m.move.flags.some(f => filters.excludedFlags.has(f)))
        )) return false;
      }
      if (championsOnly && !data.championsRoster.has(r.pokemon.speciesId)) return false;

      return true;
    });
  }, [results, filters, targetSpeeds, mustOutspeedSpeeds, championsOnly]);

  const expandAll = () => setExpandedIds(new Set(filteredResults.map(r => r.pokemon.id)));
  const collapseAll = () => setExpandedIds(new Set());

  const activeFilterCount = countActiveFilters(filters, minAccuracy, showPossible);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const toggleType = (tid: number) =>
    setFilters(prev => {
      const next = new Set(prev.types);
      next.has(tid) ? next.delete(tid) : next.add(tid);
      return { ...prev, types: next };
    });

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

  const guaranteed = filteredResults.filter(r => r.allGuaranteed);
  const possible = filteredResults.filter(r => !r.allGuaranteed);

  return (
    <div>
      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
          <strong>{guaranteed.length}</strong> Pokémon with guaranteed OHKOs
          {showPossible && possible.length > 0 && <>, <strong>{possible.length}</strong> more with possible OHKOs</>}
          {activeFilterCount > 0 && (
            <span style={{ color: '#999' }}> &nbsp;(showing {filteredResults.length} of {results.length})</span>
          )}
          .
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFiltersOpen(v => !v)}
            style={{
              ...btnStyle,
              background: filtersOpen ? '#fff7ed' : '#fff',
              borderColor: filtersOpen ? '#f59e0b' : '#ddd',
              color: filtersOpen ? '#b45309' : '#555',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            Filters
            {activeFilterCount > 0 && (
              <span style={{
                background: '#e53e3e', color: '#fff',
                borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                padding: '1px 6px', lineHeight: 1.4,
              }}>{activeFilterCount}</span>
            )}
            <span style={{ fontSize: '10px' }}>{filtersOpen ? '▲' : '▼'}</span>
          </button>
          <button onClick={expandAll} style={btnStyle}>Expand all</button>
          <button onClick={collapseAll} style={btnStyle} disabled={expandedIds.size === 0}>Collapse all</button>
        </div>
      </div>

      {/* ── Filter panel ── */}
      {filtersOpen && (
        <div style={{
          border: '1px solid #fde68a',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '16px',
          background: '#fffbf0',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          {/* Row 1: Type */}
          <div>
            <div style={filterLabel}>Pokémon Type</div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
              {availableTypes.map(tid => {
                const active = filters.types.has(tid);
                return (
                  <span
                    key={tid}
                    onClick={() => toggleType(tid)}
                    style={{ cursor: 'pointer', opacity: filters.types.size > 0 && !active ? 0.35 : 1, transition: 'opacity 0.1s' }}
                  >
                    <TypeBadge typeName={data.typeNames.get(tid) ?? '?'} />
                  </span>
                );
              })}
              {filters.types.size > 0 && (
                <button onClick={() => setFilter('types', new Set())} style={clearChipStyle}>✕ Clear</button>
              )}
            </div>
          </div>

          {/* Row 2: Speed + Outspeed */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <div style={filterLabel}>Speed (uninvested L50)</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '13px', color: '#666' }}>Min</span>
                <input
                  type="number" min={0} max={999} value={filters.minSpe}
                  onChange={e => setFilter('minSpe', e.target.value)}
                  placeholder="—"
                  style={numInputStyle}
                />
                <span style={{ fontSize: '13px', color: '#666' }}>Max</span>
                <input
                  type="number" min={0} max={999} value={filters.maxSpe}
                  onChange={e => setFilter('maxSpe', e.target.value)}
                  placeholder="—"
                  style={numInputStyle}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={filterLabel}>Outspeed Targets</div>
                {/* Trick Room toggle — lives right next to the outspeed label */}
                <button
                  onClick={() => setFilter('trickRoom', !filters.trickRoom)}
                  disabled={targetSpeeds.length === 0}
                  title="Trick Room: reverses speed order — slower Pokémon move first"
                  style={{
                    ...toggleBtnStyle,
                    fontSize: '11px',
                    padding: '2px 8px',
                    background: filters.trickRoom ? '#553c9a' : '#fff',
                    color: filters.trickRoom ? '#fff' : '#7c3aed',
                    borderColor: filters.trickRoom ? '#553c9a' : '#c4b5fd',
                    fontWeight: 700,
                  }}
                >
                  🔮 Trick Room
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {([
                  ['any', 'Any'],
                  ['all', filters.trickRoom ? 'Slower than all' : 'Faster than all'],
                  ['none', filters.trickRoom ? 'Faster than all' : 'Slower than all'],
                ] as [OutspeedFilter, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setFilter('outspeed', val)}
                    disabled={targetSpeeds.length === 0}
                    style={{
                      ...toggleBtnStyle,
                      background: filters.outspeed === val ? '#e53e3e' : '#fff',
                      color: filters.outspeed === val ? '#fff' : '#555',
                      borderColor: filters.outspeed === val ? '#e53e3e' : '#ddd',
                    }}
                  >{label}</button>
                ))}
              </div>
              {targetSpeeds.length === 0 && (
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>Select targets to enable</div>
              )}
            </div>

            <div>
              <div style={filterLabel}>Min. Accuracy</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {([
                  [0,   'Any'],
                  [50,  '50%'],
                  [70,  '70%'],
                  [80,  '80%'],
                  [90,  '90%'],
                  [100, '100%'],
                ] as [number, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => onMinAccuracyChange(val)}
                    style={{
                      ...toggleBtnStyle,
                      background: minAccuracy === val ? '#e53e3e' : '#fff',
                      color: minAccuracy === val ? '#fff' : '#555',
                      borderColor: minAccuracy === val ? '#e53e3e' : '#ddd',
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Category + Flags + Other */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <div style={filterLabel}>Move Category</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {([
                  ['all', 'All'],
                  ['physical', 'Physical'],
                  ['special', 'Special'],
                ] as [CategoryFilter, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setFilter('category', val)}
                    style={{
                      ...toggleBtnStyle,
                      background: filters.category === val ? '#e53e3e' : '#fff',
                      color: filters.category === val ? '#fff' : '#555',
                      borderColor: filters.category === val ? '#e53e3e' : '#ddd',
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={filterLabel}>Move Flags</div>
              <div style={{ marginTop: '6px' }}>
                <MoveFlagsDropdown
                  excludedFlags={filters.excludedFlags}
                  onChange={next => setFilter('excludedFlags', next)}
                />
              </div>
            </div>

            <div>
              <div style={filterLabel}>Other</div>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={showPossible}
                    onChange={e => onShowPossibleChange(e.target.checked)}
                  />
                  Show possible OHKOs (not just guaranteed)
                </label>
                {([
                  ['noEvs', 'No EV investment required'],
                  ['noItem', 'No held item required'],
                  ['defaultOnly', 'Default forms only'],
                ] as [keyof Filters, string][]).map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={!!filters[key]}
                      onChange={e => setFilter(key, e.target.checked as Filters[typeof key])}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <div>
              <button
                onClick={() => { setFilters(EMPTY_FILTERS); onMinAccuracyChange(0); onShowPossibleChange(false); }}
                style={{ ...btnStyle, color: '#e53e3e', borderColor: '#e53e3e' }}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Results list ── */}
      {filteredResults.length === 0 && activeFilterCount > 0 && (
        <div style={{ textAlign: 'center', color: '#aaa', padding: '32px', fontSize: '15px' }}>
          No results match the current filters.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filteredResults.map(result => {
          const { pokemon, movesPerTarget, allGuaranteed } = result;
          const isExpanded = expandedIds.has(pokemon.id);
          const typeNames = pokemon.typeIds.map(tid => data.typeNames.get(tid) ?? '?');
          const attackerSpe = calcStat(pokemon.stats.spe, 0);

          const moveCounts = movesPerTarget.map(moves => ({
            guaranteed: moves.filter(m => m.isGuaranteed).length,
            total: moves.length,
          }));

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
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '8px 14px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: allGuaranteed ? '#f0fff4' : '#fffbf0',
                  borderRadius: '10px 10px 0 0',
                }}
              >
                {/* Row 1: identity + abilities */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', rowGap: '4px' }}>
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

                  <StatChip label="Atk" value={pokemon.stats.atk} />
                  <StatChip label="SpA" value={pokemon.stats.spa} />
                  <StatChip label="BST" value={
                    pokemon.stats.hp + pokemon.stats.atk + pokemon.stats.def +
                    pokemon.stats.spa + pokemon.stats.spd + pokemon.stats.spe
                  } />

                  {/* Speed chip */}
                  <Tooltip
                    content={
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: '7px' }}>
                          Speed (uninvested L50){filters.trickRoom && <span style={{ marginLeft: '6px', color: '#b794f4', fontSize: '10px' }}>🔮 Trick Room</span>}
                        </div>
                        {targetSpeeds.map((ts, i) => {
                          const attackerGoesFirst = filters.trickRoom ? attackerSpe < ts : attackerSpe > ts;
                          const tied = attackerSpe === ts;
                          return (
                            <div key={i} style={{ marginBottom: '5px' }}>
                              <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '2px' }}>
                                vs {targetNames[i]}
                              </div>
                              <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                                <span>
                                  {pokemon.name}: <strong>{attackerSpe}</strong>
                                </span>
                                <span style={{ color: '#666' }}>·</span>
                                <span>
                                  {targetNames[i]}: <strong>{ts}</strong>
                                </span>
                              </div>
                              <div style={{
                                marginTop: '3px', fontWeight: 700, fontSize: '12px',
                                color: attackerGoesFirst ? '#68d391' : tied ? '#f6e05e' : '#fc8181',
                              }}>
                                {tied
                                  ? 'Speed tie'
                                  : attackerGoesFirst
                                    ? `${pokemon.name} goes first`
                                    : `${targetNames[i]} goes first`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    }
                    maxWidth={220}
                  >
                    <span style={{
                      background: filters.trickRoom ? '#f3f0ff' : '#f0f0f0',
                      border: filters.trickRoom ? '1px solid #c4b5fd' : '1px solid transparent',
                      borderRadius: '5px', padding: '2px 7px',
                      fontSize: '12px', fontWeight: 600, cursor: 'help',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                    }}>
                      {filters.trickRoom && <span style={{ fontSize: '10px' }}>🔮</span>}
                      Spe <span style={{ color: '#333' }}>{pokemon.stats.spe}</span>
                      {targetSpeeds.length > 0 && (() => {
                        // "good" = moves first = faster normally, slower in TR
                        const allGood = filters.trickRoom
                          ? targetSpeeds.every(ts => attackerSpe < ts)
                          : targetSpeeds.every(ts => attackerSpe > ts);
                        const allBad = filters.trickRoom
                          ? targetSpeeds.every(ts => attackerSpe > ts)
                          : targetSpeeds.every(ts => attackerSpe < ts);
                        const allTied = targetSpeeds.every(ts => attackerSpe === ts);
                        if (allGood) return <span style={{ color: '#38a169', fontSize: '11px' }}>▲</span>;
                        if (allBad)  return <span style={{ color: '#e53e3e', fontSize: '11px' }}>▼</span>;
                        if (allTied) return <span style={{ color: '#d69e2e', fontSize: '11px' }}>═</span>;
                        return <span style={{ color: '#888', fontSize: '11px' }}>~</span>;
                      })()}
                    </span>
                  </Tooltip>

                  {/* Ability chips — far right */}
                  {pokemon.abilities.length > 0 && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
                </div>

                {/* Row 2: move counts + status badge */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
          <th style={{ ...th, textAlign: 'center', width: '28px' }}></th>
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
                  content={m.move.description ? <>{m.move.description}</> : null}
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
                {/* Priority chip */}
                {m.move.priority !== 0 && (
                  <Tooltip
                    content={m.move.priority > 0 ? `Priority +${m.move.priority} — moves before most attacks` : `Negative priority (${m.move.priority}) — moves last`}
                    side="bottom"
                  >
                    <span style={{
                      marginLeft: '4px', fontSize: '10px', fontWeight: 700, cursor: 'help',
                      background: m.move.priority > 0 ? '#c6f6d5' : '#fed7d7',
                      color: m.move.priority > 0 ? '#276749' : '#9b2c2c',
                      borderRadius: '3px', padding: '1px 4px',
                    }}>
                      {m.move.priority > 0 ? `+${m.move.priority}` : m.move.priority}
                    </span>
                  </Tooltip>
                )}
                {/* Flag chips */}
                {m.move.flags.map(flag => (
                  <Tooltip key={flag} content={FLAG_INFO[flag]?.description ?? flag} side="bottom">
                    <span style={{
                      marginLeft: '4px', fontSize: '10px', fontWeight: 600, cursor: 'help',
                      background: FLAG_INFO[flag]?.bg ?? '#e2e8f0',
                      color: FLAG_INFO[flag]?.color ?? '#4a5568',
                      borderRadius: '3px', padding: '1px 4px',
                    }}>
                      {FLAG_INFO[flag]?.label ?? flag}
                    </span>
                  </Tooltip>
                ))}
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
              {/* Dedicated held-item cell — larger icon, own column */}
              <td style={{ ...td, textAlign: 'center', padding: '5px 4px' }}>
                {m.item && (
                  <ItemIcon identifier={m.item.identifier} name={m.item.name} boost={m.item.boost} size={24} />
                )}
              </td>
              <td style={td}>
                <span style={{ fontSize: '10px' }}>
                  <TypeBadge typeName={typeName} />
                </span>
              </td>
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

function MoveFlagsDropdown({
  excludedFlags,
  onChange,
}: {
  excludedFlags: Set<MoveFlag>;
  onChange: (flags: Set<MoveFlag>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const excludedCount = excludedFlags.size;
  const total = ALL_MOVE_FLAGS.length;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          ...toggleBtnStyle,
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: excludedCount > 0 ? '#fff5f5' : '#fff',
          borderColor: excludedCount > 0 ? '#e53e3e' : '#ddd',
          color: excludedCount > 0 ? '#c53030' : '#555',
        }}
      >
        {excludedCount === 0 ? `All flags` : `${total - excludedCount}/${total} flags`}
        <span style={{ fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
          background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: '8px', padding: '10px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          minWidth: '260px',
        }}>
          {/* 3-column grid: checkbox | chip | description */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '16px auto 1fr',
            gap: '7px 10px',
            alignItems: 'center',
          }}>
            {ALL_MOVE_FLAGS.map(flag => (
              <React.Fragment key={flag}>
                <input
                  id={`flag-${flag}`}
                  type="checkbox"
                  checked={!excludedFlags.has(flag)}
                  style={{ margin: 0, cursor: 'pointer' }}
                  onChange={e => {
                    const next = new Set(excludedFlags);
                    e.target.checked ? next.delete(flag) : next.add(flag);
                    onChange(next);
                  }}
                />
                <label htmlFor={`flag-${flag}`} style={{ cursor: 'pointer', margin: 0 }}>
                  <span style={{
                    background: FLAG_INFO[flag].bg, color: FLAG_INFO[flag].color,
                    borderRadius: '3px', padding: '1px 6px',
                    fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
                  }}>
                    {FLAG_INFO[flag].label}
                  </span>
                </label>
                <label htmlFor={`flag-${flag}`} style={{
                  cursor: 'pointer', margin: 0,
                  fontSize: '11px', color: '#888', lineHeight: 1.4,
                }}>
                  {FLAG_INFO[flag].description.split('—')[1]?.trim() ?? ''}
                </label>
              </React.Fragment>
            ))}
          </div>
          {excludedCount > 0 && (
            <button
              onClick={() => onChange(new Set())}
              style={{ ...clearChipStyle, marginTop: '8px', width: '100%', textAlign: 'center' }}
            >
              ✕ Show all flags
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

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
const toggleBtnStyle: React.CSSProperties = {
  padding: '3px 10px', fontSize: '12px', border: '1px solid #ddd',
  borderRadius: '5px', cursor: 'pointer', fontWeight: 500,
};
const filterLabel: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: '#888',
};
const numInputStyle: React.CSSProperties = {
  width: '64px', padding: '4px 6px', border: '1px solid #ddd',
  borderRadius: '5px', fontSize: '13px',
};
const clearChipStyle: React.CSSProperties = {
  fontSize: '11px', padding: '2px 8px', border: '1px solid #ddd',
  borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#999',
};
