import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { PokemonOHKOResult, OHKOMoveInfo, Weather, Terrain } from '../calc/damage';
import { WEATHER_INFO, TERRAIN_INFO, FOUL_PLAY_MOVE_ID, BODY_PRESS_MOVE_ID, PSYSHOCK_MOVE_IDS, ROUND_MOVE_ID } from '../calc/damage';
import type { MoveFlag } from '../data/types';
import { calcStat, stageMult } from '../calc/damage';
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
      style={{ verticalAlign: 'middle', display: 'block', margin: '0 auto' }}
      onError={() => setFailed(true)}
    />
  );
}

/** Emoji fallbacks for items whose sprites are missing from the PokeAPI sprites repo */
const ITEM_EMOJI_FALLBACK: Record<string, string> = {
  'fairy-feather': '🪶',
  'life-orb': '🔮',
};

function ItemIcon({ identifier, name, boost, size = 16 }: { identifier: string; name: string; boost: number; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${identifier}.png`;
  const pct = Math.round((boost - 1) * 100);
  const emoji = ITEM_EMOJI_FALLBACK[identifier];
  if (failed) {
    return (
      <Tooltip content={`${name} (+${pct}%)`} side="bottom">
        {emoji ? (
          <span style={{ fontSize: size, lineHeight: 1, cursor: 'help', display: 'block' }} title={name}>
            {emoji}
          </span>
        ) : (
          <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 700, cursor: 'help' }}>
            [{name}]
          </span>
        )}
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
  title: string;
  results: PokemonOHKOResult[];
  targetNames: string[];
  targetSpeeds: number[];
  mustOutspeedSpeeds: number[];
  targetsMustOutspeed: boolean[];
  championsOnly: boolean;
  data: GameData;
  showPossible: boolean;
  onShowPossibleChange: (v: boolean) => void;
  minAccuracy: number;
  onMinAccuracyChange: (v: number) => void;
  weather: Weather;
  onWeatherChange: (w: Weather) => void;
  gravity: boolean;
  onGravityChange: (v: boolean) => void;
  trickRoom: boolean;
  onTrickRoomChange: (v: boolean) => void;
  terrain: Terrain;
  onTerrainChange: (t: Terrain) => void;
  fairyAura: boolean;
  onFairyAuraChange: (v: boolean) => void;
  atkStage: number;
  onAtkStageChange: (v: number) => void;
  spaStage: number;
  onSpaStageChange: (v: number) => void;
  atkDefStage: number;
  onAtkDefStageChange: (v: number) => void;
  atkSpeStage: number;
  onAtkSpeStageChange: (v: number) => void;
  choiceItem: 'band' | 'scarf' | 'specs' | null;
  onChoiceItemChange: (v: 'band' | 'scarf' | 'specs' | null) => void;
  isDoubles: boolean;
  statMode: 'ev' | 'sp';
  hasTargets: boolean;
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

export function statColor(val: number): string {
  if (val >= 120) return '#68d391';
  if (val >= 90) return '#f6e05e';
  if (val >= 60) return '#f6ad55';
  return '#fc8181';
}

// ── Sort + Filter types ──────────────────────────────────────────────────────

type SortKey = 'usage' | 'bst' | 'name' | 'atk' | 'spa' | 'spe' | 'def' | 'spd' | 'hp';
type SortDir = 'asc' | 'desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'usage', label: 'Usage Rank' },
  { key: 'bst',  label: 'Base Stat Total' },
  { key: 'name', label: 'Name' },
  { key: 'spe',  label: 'Speed' },
  { key: 'atk',  label: 'Attack' },
  { key: 'spa',  label: 'Sp. Attack' },
  { key: 'def',  label: 'Defense' },
  { key: 'spd',  label: 'Sp. Defense' },
  { key: 'hp',   label: 'HP' },
];

type OutspeedFilter = 'any' | 'all' | 'none';
type CategoryFilter = 'all' | 'physical' | 'special';

type FormCategory = 'mega' | 'regional' | 'gmax' | 'other';

const FORM_CATEGORIES: { key: FormCategory; label: string; test: (id: string) => boolean }[] = [
  { key: 'mega',     label: 'Mega Evolutions',      test: id => id.includes('-mega') || id.includes('-primal') },
  { key: 'regional', label: 'Regional Variants',    test: id => id.includes('-alola') || id.includes('-galar') || id.includes('-hisui') || id.includes('-paldea') },
  { key: 'gmax',     label: 'Gigantamax',           test: id => id.includes('-gmax') },
  { key: 'other',    label: 'Other Alternate Forms', test: (id) => {
    const known = ['-mega', '-primal', '-alola', '-galar', '-hisui', '-paldea', '-gmax'];
    return !known.some(s => id.includes(s));
  }},
];

export function getFormCategory(identifier: string, isDefault: boolean): FormCategory | null {
  if (isDefault) return null;
  for (const fc of FORM_CATEGORIES.slice(0, 3)) {
    if (fc.test(identifier)) return fc.key;
  }
  return 'other';
}

interface Filters {
  types: Set<number>;
  minSpe: string;
  maxSpe: string;
  outspeed: OutspeedFilter;
  category: CategoryFilter;
  noEvs: boolean;
  noItem: boolean;
  defaultOnly: boolean;
  excludedForms: Set<FormCategory>;
  excludedFlags: Set<MoveFlag>;
  hideTwoTurnMoves: boolean;
}

const EMPTY_FILTERS: Filters = {
  types: new Set(),
  minSpe: '',
  maxSpe: '',
  outspeed: 'any',
  category: 'all',
  noEvs: false,
  noItem: false,
  defaultOnly: false,
  excludedForms: new Set(),
  excludedFlags: new Set(),
  hideTwoTurnMoves: false,
};

export function countActiveFilters(f: Filters, minAccuracy: number, showPossible: boolean): number {
  return (
    f.types.size +
    (f.minSpe !== '' ? 1 : 0) +
    (f.maxSpe !== '' ? 1 : 0) +
    (f.outspeed !== 'any' ? 1 : 0) +
    (f.category !== 'all' ? 1 : 0) +
    (f.noEvs ? 1 : 0) +
    (f.noItem ? 1 : 0) +
    (f.defaultOnly ? 1 : 0) +
    (f.excludedForms.size > 0 ? 1 : 0) +
    (f.excludedFlags.size > 0 ? 1 : 0) +
    (f.hideTwoTurnMoves ? 1 : 0) +
    (showPossible ? 1 : 0) +
    (minAccuracy > 0 ? 1 : 0)
  );
}

// ── Speed helpers ────────────────────────────────────────────────────────────

/**
 * Returns the minimum EV investment (0..252 step 4) for `baseSpe` to strictly
 * outspeed `targetSpeed` at L50 with the given nature multiplier, or null if
 * even 252 EVs cannot achieve it.
 */
export function minSpeedEVs(baseSpe: number, targetSpeed: number, natureMult: number, atkStageMult = 1.0, step = 4, maxEV = 252): number | null {
  for (let ev = 0; ev <= maxEV; ev += step) {
    if (Math.floor(calcStat(baseSpe, ev, 31, 50, natureMult) * atkStageMult) > targetSpeed) return ev;
  }
  return null;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PokemonResultsView({ title, results, targetNames, targetSpeeds, mustOutspeedSpeeds, targetsMustOutspeed, championsOnly, data, showPossible, onShowPossibleChange, minAccuracy, onMinAccuracyChange, weather, onWeatherChange, gravity, onGravityChange, trickRoom, onTrickRoomChange, terrain, onTerrainChange, fairyAura, onFairyAuraChange, atkStage, onAtkStageChange, spaStage, onSpaStageChange, atkDefStage, onAtkDefStageChange, atkSpeStage, onAtkSpeStageChange, choiceItem, onChoiceItemChange, isDoubles, statMode, hasTargets }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>('usage');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');

  const toggle = (id: number) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
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
      const atkSpeMult = stageMult(atkSpeStage) * (choiceItem === 'scarf' ? 1.5 : 1.0);
      const spe    = Math.floor(calcStat(r.pokemon.stats.spe, 0) * atkSpeMult);
      // Max reachable speed: 252 EVs + ×1.1 (+Spe nature) at L50, with stage + scarf
      const maxSpe = Math.floor(calcStat(r.pokemon.stats.spe, 252, 31, 50, 1.1) * atkSpeMult);

      if (filters.types.size > 0 && !r.pokemon.typeIds.some(t => filters.types.has(t))) return false;

      if (filters.minSpe !== '' && spe < Number(filters.minSpe)) return false;
      if (filters.maxSpe !== '' && spe > Number(filters.maxSpe)) return false;

      // In Trick Room slower = first, so the comparison flips
      const movesFirst = (a: number, t: number) => trickRoom ? a < t : a > t;

      if (targetSpeeds.length > 0 && filters.outspeed !== 'any') {
        // "Faster than all" — use max potential speed in normal mode so we include
        // Pokémon that could outspeed with EV/nature investment.
        if (filters.outspeed === 'all') {
          const speCheck = trickRoom ? spe : maxSpe;
          if (!targetSpeeds.every(ts => movesFirst(speCheck, ts))) return false;
        }
        if (filters.outspeed === 'none' && targetSpeeds.some(ts => movesFirst(spe, ts))) return false;
      }

      // Per-target must-outspeed constraints — in non-TR show anything that COULD
      // outspeed at max investment; in TR keep the uninvested check.
      if (mustOutspeedSpeeds.length > 0) {
        const speCheck = trickRoom ? spe : maxSpe;
        if (!mustOutspeedSpeeds.every(ts => movesFirst(speCheck, ts))) return false;
      }

      if (filters.category !== 'all') {
        const physical = filters.category === 'physical';
        const classId = physical ? 2 : 3;
        if (!r.movesPerTarget.every(moves => moves.some(m => m.move.damageClassId === classId))) return false;
      }

      if (filters.noEvs && !r.movesPerTarget.every(moves => moves.some(m => m.evNeeded === 0))) return false;
      const isMega = r.pokemon.identifier.includes('-mega') || r.pokemon.identifier.includes('-primal');
      // Mega and Primal Pokémon hold their Mega Stone / Orb and can't use a Choice item
      if (choiceItem !== null && isMega) return false;
      if ((filters.noItem || isMega || choiceItem !== null) && !r.movesPerTarget.every(moves => moves.some(m => !m.item))) return false;
      if (filters.defaultOnly && !r.pokemon.isDefault) return false;
      if (filters.excludedForms.size > 0 && !r.pokemon.isDefault) {
        const fc = getFormCategory(r.pokemon.identifier, r.pokemon.isDefault);
        if (fc && filters.excludedForms.has(fc)) return false;
      }
      if (filters.excludedFlags.size > 0) {
        // Keep only Pokémon that have at least one OHKO move per target with none of the excluded flags
        if (!r.movesPerTarget.every(moves =>
          moves.some(m => !m.move.flags.some(f => filters.excludedFlags.has(f)))
        )) return false;
      }

      // Must-outspeed: exclude Pokémon that only have negative-priority moves for any must-outspeed target
      if (targetsMustOutspeed.some(Boolean)) {
        for (let ti = 0; ti < r.movesPerTarget.length; ti++) {
          if (targetsMustOutspeed[ti] && !r.movesPerTarget[ti].some(m => m.move.priority >= 0)) return false;
        }
      }

      if (championsOnly && !data.championsRoster.has(r.pokemon.id)) return false;

      return true;
    });
  }, [results, filters, choiceItem, trickRoom, atkSpeStage, targetSpeeds, mustOutspeedSpeeds, targetsMustOutspeed, championsOnly, data]);

  const sortedResults = useMemo(() => {
    const arr = [...filteredResults];
    const NO_RANK = 99999;
    arr.sort((a, b) => {
      const bst = (p: typeof a.pokemon) =>
        p.stats.hp + p.stats.atk + p.stats.def + p.stats.spa + p.stats.spd + p.stats.spe;
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case 'usage': {
          // Unranked Pokémon sort after all ranked ones, then by BST descending as tiebreaker.
          const ra = data.usageRank.get(a.pokemon.identifier) ?? NO_RANK;
          const rb = data.usageRank.get(b.pokemon.identifier) ?? NO_RANK;
          if (ra !== rb) return sortDir === 'asc' ? ra - rb : rb - ra;
          return bst(b.pokemon) - bst(a.pokemon);
        }
        case 'bst':  av = bst(a.pokemon);        bv = bst(b.pokemon);        break;
        case 'name': av = a.pokemon.name;         bv = b.pokemon.name;        break;
        case 'atk':  av = a.pokemon.stats.atk;   bv = b.pokemon.stats.atk;   break;
        case 'spa':  av = a.pokemon.stats.spa;   bv = b.pokemon.stats.spa;   break;
        case 'spe':  av = a.pokemon.stats.spe;   bv = b.pokemon.stats.spe;   break;
        case 'def':  av = a.pokemon.stats.def;   bv = b.pokemon.stats.def;   break;
        case 'spd':  av = a.pokemon.stats.spd;   bv = b.pokemon.stats.spd;   break;
        case 'hp':   av = a.pokemon.stats.hp;    bv = b.pokemon.stats.hp;    break;
      }
      const cmp = typeof av === 'string'
        ? av.localeCompare(bv as string)
        : (av) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    // Apply search filter
    const q = search.trim().toLowerCase();
    if (q) {
      return arr.filter(r =>
        r.pokemon.name.toLowerCase().includes(q) ||
        r.movesPerTarget.some(moves => moves.some(m => m.move.name.toLowerCase().includes(q)))
      );
    }
    return arr;
  }, [filteredResults, sortKey, sortDir, search]);

  const expandAll = () => setExpandedIds(new Set(sortedResults.map(r => r.pokemon.id)));
  const collapseAll = () => setExpandedIds(new Set());

  const activeFilterCount = countActiveFilters(filters, minAccuracy, showPossible);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const toggleType = (tid: number) =>
    setFilters(prev => {
      const next = new Set(prev.types);
      if (next.has(tid)) { next.delete(tid); } else { next.add(tid); }
      return { ...prev, types: next };
    });

  const guaranteed = sortedResults.filter(r => r.allGuaranteed);
  const possible = sortedResults.filter(r => !r.allGuaranteed);

  return (
    <div>
      {/* ── Sticky controls wrapper ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#f8f9fa',
        paddingTop: '8px',
        marginTop: '-8px',
        paddingBottom: '2px',
      }}>
      {/* ── Title row ── */}
      <h2 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 800, color: '#1a202c' }}>
        <span style={{ color: '#2b6cb0' }}>{guaranteed.length}</span> {title}
        {showPossible && possible.length > 0 && (
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#888', marginLeft: '8px' }}>
            +{possible.length} possible
          </span>
        )}
        {activeFilterCount > 0 && (
          <span style={{ fontSize: '13px', fontWeight: 400, color: '#aaa', marginLeft: '8px' }}>
            ({filteredResults.length} of {results.length} shown)
          </span>
        )}
      </h2>

      {/* ── Controls bar: search + sort far-left · filters + expand far-right ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        {/* Search + Sort — far left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Pokémon or move name…"
            style={{
              width: 'min(270px, 100%)',
              fontSize: '12px', padding: '5px 10px',
              border: '1px solid #ddd', borderRadius: '6px',
              background: '#fff', color: '#333', outline: 'none',
              minWidth: 0,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} data-tour="sort-controls">
            <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sort</span>
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              style={{
                fontSize: '12px', padding: '4px 6px', border: '1px solid #ddd',
                borderRadius: '6px', background: '#fff', color: '#555', cursor: 'pointer',
              }}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              title={sortDir === 'asc' ? 'Ascending — click to switch to descending' : 'Descending — click to switch to ascending'}
              style={{
                ...btnStyle, padding: '4px 8px', fontWeight: 700, fontSize: '13px',
                color: '#555', minWidth: '32px', textAlign: 'center',
              }}
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          {sortKey === 'usage' && (
            <a
              href="https://limitlessvgc.com/pokemon?time=all&type=all&format=all&region=all"
              target="_blank"
              rel="noopener noreferrer"
              title="Usage data sourced from Limitless VGC — all formats, all time"
              style={{ fontSize: '10px', color: '#aaa', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              via Limitless VGC ↗
            </a>
          )}
        </div>

        {/* Battle Effects + Filters + expand/collapse — far right */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }} data-tour="attacker-controls">
          <StatChangesDropdown
            atkStage={atkStage}
            onAtkStageChange={onAtkStageChange}
            spaStage={spaStage}
            onSpaStageChange={onSpaStageChange}
            atkDefStage={atkDefStage}
            onAtkDefStageChange={onAtkDefStageChange}
            atkSpeStage={atkSpeStage}
            onAtkSpeStageChange={onAtkSpeStageChange}
            choiceItem={choiceItem}
            onChoiceItemChange={onChoiceItemChange}
          />
          <BattlegroundDropdown
            weather={weather}
            onWeatherChange={onWeatherChange}
            terrain={terrain}
            onTerrainChange={onTerrainChange}
            fairyAura={fairyAura}
            onFairyAuraChange={onFairyAuraChange}
            gravity={gravity}
            onGravityChange={onGravityChange}
            trickRoom={trickRoom}
            onTrickRoomChange={onTrickRoomChange}
          />
          <button
            onClick={() => setFiltersOpen(v => !v)}
            style={{
              ...btnStyle,
              background: filtersOpen ? '#fff7ed' : '#fff',
              borderColor: filtersOpen ? '#f59e0b' : activeFilterCount > 0 ? '#e53e3e' : '#ddd',
              color: filtersOpen ? '#b45309' : '#555',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {activeFilterCount > 0 && (
              <Tooltip content="Clear all active filters" side="top">
                <span
                  onClick={e => { e.stopPropagation(); setFilters(EMPTY_FILTERS); onMinAccuracyChange(0); onShowPossibleChange(false); }}
                  style={{ color: '#e53e3e', fontWeight: 800, lineHeight: 1, padding: '0 2px' }}
                >✕</span>
              </Tooltip>
            )}
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
          maxHeight: '70vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
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
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {([
                  ['any', 'Any'],
                  ['all', trickRoom ? 'Slower than all' : 'Faster than all'],
                  ['none', trickRoom ? 'Faster than all' : 'Slower than all'],
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
              <div style={filterLabel}>Exclude Forms</div>
              <div style={{ marginTop: '6px' }}>
                <ExcludeFormsDropdown
                  excludedForms={filters.excludedForms}
                  onChange={next => setFilter('excludedForms', next)}
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
                  ['noEvs', statMode === 'sp' ? 'No SP investment required' : 'No EV investment required'],
                  ['noItem', 'No held item required'],
                  ['defaultOnly', 'Default forms only'],
                  ['hideTwoTurnMoves', 'Hide 2-turn moves'],
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

      </div>{/* end sticky wrapper */}

      {/* ── Results list ── */}
      {!hasTargets && (
        <div style={{ textAlign: 'center', color: '#aaa', padding: '48px 32px', fontSize: '15px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>🔍</div>
          Search for a Pokémon above to find what can OHKO it
        </div>
      )}
      {hasTargets && sortedResults.length === 0 && activeFilterCount > 0 && (
        <div style={{ textAlign: 'center', color: '#aaa', padding: '32px', fontSize: '15px' }}>
          No results match the current filters.
        </div>
      )}
      {hasTargets && results.length === 0 && activeFilterCount === 0 && (
        <div style={{ textAlign: 'center', color: '#888', padding: '32px', fontSize: '16px' }}>
          No{showPossible ? '' : ' guaranteed'} OHKOs found with current settings.
          {!showPossible && (
            <div style={{ marginTop: '8px', fontSize: '14px' }}>
              Try enabling "Show possible OHKOs" to see lucky-roll results.
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }} data-tour="results-list">
        {sortedResults.map((result, resultIdx) => {
          const { pokemon, movesPerTarget, allGuaranteed } = result;
          const isMega = pokemon.identifier.includes('-mega');
          const isExpanded = expandedIds.has(pokemon.id);
          const typeNames = pokemon.typeIds.map(tid => data.typeNames.get(tid) ?? '?');
          const scarfMult = choiceItem === 'scarf' ? 1.5 : 1.0;
          const attackerSpe = Math.floor(calcStat(pokemon.stats.spe, 0) * stageMult(atkSpeStage) * scarfMult);

          const moveCounts = movesPerTarget.map((moves, ti) => {
            // Apply the same filters as MoveTable so the count matches what's displayed
            const visible = moves.filter(m =>
              (!filters.noItem            || !m.item) &&
              (!filters.noEvs             || m.evNeeded === 0) &&
              (!isMega                    || !m.item) &&
              (choiceItem === null         || !m.item) &&
              (!targetsMustOutspeed[ti]   || m.move.priority >= 0) &&
              (!filters.hideTwoTurnMoves  || !m.twoTurn)
            );
            return {
              guaranteed: visible.filter(m => m.isGuaranteed).length,
              total: visible.length,
            };
          });

          return (
            <div
              key={pokemon.id}
              data-tour={resultIdx === 0 ? 'first-result-row' : undefined}
              style={{
                border: `1px solid ${allGuaranteed ? '#c6f6d5' : '#fef3c7'}`,
                borderRadius: '10px',
                background: '#fff',
                minWidth: 0,
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
                    onError={e => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.fallback) {
                        img.dataset.fallback = '1';
                        img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;
                      } else {
                        img.style.display = 'none';
                      }
                    }}
                  />

                  <Tooltip content={<StatTooltipContent pokemon={pokemon} />} maxWidth={220}>
                    <span style={{
                      fontWeight: 700, fontSize: '15px', minWidth: '120px',
                      borderBottom: '1px dashed #ccc', cursor: 'help',
                    }}>
                      {pokemon.name}
                    </span>
                  </Tooltip>

                  <StatChip label="BST" value={
                    pokemon.stats.hp + pokemon.stats.atk + pokemon.stats.def +
                    pokemon.stats.spa + pokemon.stats.spd + pokemon.stats.spe
                  } />

                  <div style={{ display: 'flex', gap: '3px' }}>
                    {typeNames.map(t => <TypeBadge key={t} typeName={t} />)}
                  </div>

                  {/* Atk chip */}
                  {(() => {
                    const uninvestedAtk = calcStat(pokemon.stats.atk, 0);
                    const hasBand = choiceItem === 'band';
                    const effectiveAtk = Math.floor(uninvestedAtk * stageMult(atkStage) * (hasBand ? 1.5 : 1.0));
                    const showEffective = atkStage !== 0 || hasBand;
                    return (
                      <Tooltip
                        content={
                          <div>
                            <div style={{ fontWeight: 700, marginBottom: '7px' }}>Attack (uninvested L50)</div>
                            <div style={{ color: '#ccc', marginBottom: '2px', fontSize: '11px' }}>Base: {pokemon.stats.atk} · {statMode === 'sp' ? 'SPs: 0' : 'EVs: 0'} · IVs: 31</div>
                            <div style={{ color: '#68d391', fontWeight: 700, marginBottom: showEffective ? '2px' : '0' }}>→ {uninvestedAtk} Atk</div>
                            {atkStage !== 0 && (
                              <div style={{ color: atkStage < 0 ? '#fc8181' : '#68d391', fontWeight: 700, marginBottom: hasBand ? '2px' : '0' }}>
                                Stage {atkStage > 0 ? `+${atkStage}` : atkStage}: → {Math.floor(uninvestedAtk * stageMult(atkStage))} Atk
                              </div>
                            )}
                            {hasBand && (
                              <div style={{ color: '#f6ad55', fontWeight: 700 }}>
                                Choice Band ×1.5: → {effectiveAtk} effective
                              </div>
                            )}
                          </div>
                        }
                        maxWidth={220}
                      >
                        <span style={{
                          background: hasBand ? '#fffaf0' : '#f0f0f0',
                          border: hasBand ? '1px solid #f6ad55' : '1px solid transparent',
                          borderRadius: '5px', padding: '2px 7px',
                          fontSize: '12px', fontWeight: 600, cursor: 'help',
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                        }}>
                          Atk <span style={{ color: '#333' }}>{pokemon.stats.atk}</span>
                          {showEffective && (
                            <span style={{ color: '#999', fontWeight: 400 }}>({effectiveAtk})</span>
                          )}
                        </span>
                      </Tooltip>
                    );
                  })()}

                  {/* SpA chip */}
                  {(() => {
                    const uninvestedSpa = calcStat(pokemon.stats.spa, 0);
                    const hasSpecs = choiceItem === 'specs';
                    const effectiveSpa = Math.floor(uninvestedSpa * stageMult(spaStage) * (hasSpecs ? 1.5 : 1.0));
                    const showEffective = spaStage !== 0 || hasSpecs;
                    return (
                      <Tooltip
                        content={
                          <div>
                            <div style={{ fontWeight: 700, marginBottom: '7px' }}>Sp. Atk (uninvested L50)</div>
                            <div style={{ color: '#ccc', marginBottom: '2px', fontSize: '11px' }}>Base: {pokemon.stats.spa} · {statMode === 'sp' ? 'SPs: 0' : 'EVs: 0'} · IVs: 31</div>
                            <div style={{ color: '#68d391', fontWeight: 700, marginBottom: showEffective ? '2px' : '0' }}>→ {uninvestedSpa} SpA</div>
                            {spaStage !== 0 && (
                              <div style={{ color: spaStage < 0 ? '#fc8181' : '#68d391', fontWeight: 700, marginBottom: hasSpecs ? '2px' : '0' }}>
                                Stage {spaStage > 0 ? `+${spaStage}` : spaStage}: → {Math.floor(uninvestedSpa * stageMult(spaStage))} SpA
                              </div>
                            )}
                            {hasSpecs && (
                              <div style={{ color: '#90cdf4', fontWeight: 700 }}>
                                Choice Specs ×1.5: → {effectiveSpa} effective
                              </div>
                            )}
                          </div>
                        }
                        maxWidth={220}
                      >
                        <span style={{
                          background: hasSpecs ? '#ebf8ff' : '#f0f0f0',
                          border: hasSpecs ? '1px solid #90cdf4' : '1px solid transparent',
                          borderRadius: '5px', padding: '2px 7px',
                          fontSize: '12px', fontWeight: 600, cursor: 'help',
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                        }}>
                          SpA <span style={{ color: '#333' }}>{pokemon.stats.spa}</span>
                          {showEffective && (
                            <span style={{ color: '#999', fontWeight: 400 }}>({effectiveSpa})</span>
                          )}
                        </span>
                      </Tooltip>
                    );
                  })()}

                  {/* Speed chip */}
                  {(() => {
                    const uninvestedSpe = calcStat(pokemon.stats.spe, 0);
                    const hasScarf = choiceItem === 'scarf';
                    const speAfterStage = atkSpeStage !== 0 ? Math.floor(uninvestedSpe * stageMult(atkSpeStage)) : uninvestedSpe;
                    const speModified = atkSpeStage !== 0 || hasScarf;
                    return (
                  <Tooltip
                    content={
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: '7px' }}>
                          Speed (uninvested L50){trickRoom && <span style={{ marginLeft: '6px', color: '#b794f4', fontSize: '10px' }}>🔮 Trick Room</span>}
                        </div>
                        <div style={{ color: '#ccc', marginBottom: '2px', fontSize: '11px' }}>Base: {pokemon.stats.spe} · {statMode === 'sp' ? 'SPs: 0' : 'EVs: 0'} · IVs: 31</div>
                        <div style={{ color: '#68d391', fontWeight: 700, marginBottom: speModified ? '2px' : '7px' }}>→ {uninvestedSpe} Speed</div>
                        {atkSpeStage !== 0 && (
                          <div style={{ color: atkSpeStage < 0 ? '#fc8181' : '#68d391', fontWeight: 700, marginBottom: hasScarf ? '2px' : '7px' }}>
                            Stage {atkSpeStage > 0 ? `+${atkSpeStage}` : atkSpeStage}: → {speAfterStage} Speed
                          </div>
                        )}
                        {hasScarf && (
                          <div style={{ color: '#f6ad55', fontWeight: 700, marginBottom: '7px' }}>
                            Choice Scarf ×1.5: → {attackerSpe} effective
                          </div>
                        )}
                        {targetSpeeds.map((ts, i) => {
                          const attackerGoesFirst = trickRoom ? attackerSpe < ts : attackerSpe > ts;
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
                      background: hasScarf ? '#fffaf0' : trickRoom ? '#f3f0ff' : '#f0f0f0',
                      border: hasScarf ? '1px solid #f6ad55' : trickRoom ? '1px solid #c4b5fd' : '1px solid transparent',
                      borderRadius: '5px', padding: '2px 7px',
                      fontSize: '12px', fontWeight: 600, cursor: 'help',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                    }}>
                      {trickRoom && <span style={{ fontSize: '10px' }}>🔮</span>}
                      Spe <span style={{ color: '#333' }}>{pokemon.stats.spe}</span>
                      {speModified && (
                        <span style={{ color: '#999', fontWeight: 400 }}>({attackerSpe})</span>
                      )}
                      {targetSpeeds.length > 0 && (() => {
                        // "good" = moves first = faster normally, slower in TR
                        const allGood = trickRoom
                          ? targetSpeeds.every(ts => attackerSpe < ts)
                          : targetSpeeds.every(ts => attackerSpe > ts);
                        const allBad = trickRoom
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
                    );
                  })()}

                  {/* Speed investment chip — only in normal (non-TR) mode with targets */}
                  {targetSpeeds.length > 0 && !trickRoom && (() => {
                    const worstTarget = Math.max(...targetSpeeds);
                    // Already outspeeds at 0 EVs neutral → no chip
                    if (attackerSpe > worstTarget) return null;

                    const atkSpeMult = stageMult(atkSpeStage) * scarfMult;
                    // In SP mode, step by 8 (= 1 SP) and allow up to 256 (= 32 SPs)
                    const spStep = statMode === 'sp' ? 8 : 4;
                    const spMax  = statMode === 'sp' ? 256 : 252;
                    const evNeutral = minSpeedEVs(pokemon.stats.spe, worstTarget, 1.0, atkSpeMult, spStep, spMax);
                    const evPlus    = minSpeedEVs(pokemon.stats.spe, worstTarget, 1.1, atkSpeMult, spStep, spMax);

                    // Cannot outspeed even at full investment → no chip
                    if (evNeutral === null && evPlus === null) return null;

                    // Convert to display unit
                    const toDisplay = (ev: number | null) => ev === null ? null : (statMode === 'sp' ? ev / 8 : ev);
                    const dispNeutral = toDisplay(evNeutral);
                    const dispPlus    = toDisplay(evPlus);
                    const unit = statMode === 'sp' ? 'SPs' : 'EVs';

                    // Build chip label
                    let label: string;
                    if (dispNeutral !== null && dispPlus !== null && dispPlus < dispNeutral) {
                      label = `⚡ +${dispNeutral} ${unit} · +Spe: ${dispPlus} ${unit}`;
                    } else if (dispNeutral !== null) {
                      label = `⚡ +${dispNeutral} ${unit}`;
                    } else {
                      // dispPlus !== null, dispNeutral === null
                      label = `⚡ +Spe: ${dispPlus} ${unit}`;
                    }

                    const onlyWithNature = evNeutral === null;

                    const tooltipContent = (
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: '7px' }}>Speed Investment Needed</div>
                        {targetSpeeds.map((ts, i) => {
                          const alreadyOutspeeds = attackerSpe > ts;
                          const enN = alreadyOutspeeds ? null : minSpeedEVs(pokemon.stats.spe, ts, 1.0, stageMult(atkSpeStage) * scarfMult, spStep, spMax);
                          const enP = alreadyOutspeeds ? null : minSpeedEVs(pokemon.stats.spe, ts, 1.1, stageMult(atkSpeStage) * scarfMult, spStep, spMax);
                          const dN = toDisplay(enN);
                          const dP = toDisplay(enP);
                          const cantAtAll = !alreadyOutspeeds && enN === null && enP === null;
                          return (
                            <div key={i} style={{ marginBottom: '6px' }}>
                              <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '2px' }}>
                                vs {targetNames[i]} ({ts} Spe)
                              </div>
                              {alreadyOutspeeds ? (
                                <div style={{ color: '#68d391', fontWeight: 700, fontSize: '12px' }}>Already outspeeds ✓</div>
                              ) : cantAtAll ? (
                                <div style={{ color: '#fc8181', fontWeight: 700, fontSize: '12px' }}>Cannot outspeed</div>
                              ) : (
                                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                  {dN !== null && (
                                    <div>{dN === 0 ? `Already outspeeds (neutral)` : `${dN} ${unit} — neutral nature`}</div>
                                  )}
                                  {dP !== null && dP !== dN && (
                                    <div style={{ color: '#f6ad55' }}>{dP === 0 ? `Already outspeeds (+Spe)` : `${dP} ${unit} — +Spe nature`}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );

                    return (
                      <Tooltip content={tooltipContent} maxWidth={240} key="spe-invest">
                        <span style={{
                          background: onlyWithNature ? '#fffbeb' : '#ebf8ff',
                          border: `1px solid ${onlyWithNature ? '#f6ad55' : '#90cdf4'}`,
                          color: onlyWithNature ? '#744210' : '#2b6cb0',
                          borderRadius: '5px', padding: '2px 7px',
                          fontSize: '11px', fontWeight: 700, cursor: 'help',
                          display: 'inline-flex', alignItems: 'center',
                          whiteSpace: 'nowrap',
                        }}>
                          {label}
                        </span>
                      </Tooltip>
                    );
                  })()}

                </div>

                {/* Row 2: ability chips (left) + move counts + status badge (right) */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  {/* Ability chips — left side */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {pokemon.abilities.map(ability => (
                      <Tooltip
                        key={ability.name}
                        content={
                          <div>
                            <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {ability.name}
                              {ability.isHidden && (
                                <span style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 600 }}>Hidden</span>
                              )}
                            </div>
                            {ability.description
                              ? <div style={{ color: '#ccc' }}>{ability.description}</div>
                              : <div style={{ color: '#777', fontStyle: 'italic' }}>No description available</div>
                            }
                          </div>
                        }
                        maxWidth={260}
                      >
                        <span
                          style={{
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

                  {/* Move counts + status badge — right side */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
                      className="ohko-target-col"
                      style={{
                        borderRight: ti < movesPerTarget.length - 1 ? '1px solid #eee' : 'none',
                        padding: '12px 16px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>
                        vs {targetNames[ti]} ({moves[0]?.targetHP ?? '?'} HP)
                      </div>
                      <MoveTable
                        moves={moves.filter(m =>
                          (!filters.noItem           || !m.item) &&
                          (!filters.noEvs            || m.evNeeded === 0) &&
                          (!isMega                   || !m.item) &&
                          (choiceItem === null        || !m.item) &&
                          (!targetsMustOutspeed[ti]  || m.move.priority >= 0) &&
                          (!filters.hideTwoTurnMoves || !m.twoTurn)
                        )}
                        data={data}
                        totalTargets={movesPerTarget.length}
                        targetNames={targetNames}
                        isDoubles={isDoubles}
                        statMode={statMode}
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

function MoveTable({ moves, data, totalTargets, targetNames, isDoubles, statMode }: {
  moves: OHKOMoveInfo[];
  data: GameData;
  totalTargets: number;
  targetNames: string[];
  isDoubles: boolean;
  statMode: 'ev' | 'sp';
}) {
  return (
    <div className="ohko-scroll-x">
    <table className="ohko-move-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #eee' }}>
          <th style={th}>Move</th>
          <th style={th}>Tags</th>
          <th style={{ ...th, textAlign: 'center', width: '28px' }}></th>
          <th style={th}>Type</th>
          <th style={{ ...th, textAlign: 'center' }}>BP</th>
          <th style={{ ...th, textAlign: 'center' }}>Acc</th>
          <th style={{ ...th, textAlign: 'center' }}>Cat</th>
          <th style={{ ...th, textAlign: 'right' }}>Damage</th>
          <th style={{ ...th, textAlign: 'right' }}>% HP</th>
          <th style={{ ...th, textAlign: 'center' }}>{statMode === 'sp' ? 'SPs' : 'EVs'}</th>
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
              <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>
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
              </td>

              {/* Tags column — flags, spread, weather, Foul Play, ability, coverage */}
              <td style={{ ...td, verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Flag chips */}
                  {m.move.flags.map(flag => (
                    <Tooltip key={flag} content={FLAG_INFO[flag]?.description ?? flag} side="bottom">
                      <span style={{
                        fontSize: '10px', fontWeight: 600, cursor: 'help',
                        background: FLAG_INFO[flag]?.bg ?? '#e2e8f0',
                        color: FLAG_INFO[flag]?.color ?? '#4a5568',
                        borderRadius: '3px', padding: '1px 4px',
                        whiteSpace: 'nowrap',
                      }}>
                        {FLAG_INFO[flag]?.label ?? flag}
                      </span>
                    </Tooltip>
                  ))}
                  {/* Spread chip */}
                  {m.move.isSpread && (
                    <Tooltip
                      content={isDoubles
                        ? 'Spread move — hits all adjacent foes. ×0.75 damage applied (doubles format).'
                        : 'Spread move — hits all adjacent foes. No damage penalty in singles format.'}
                      side="bottom"
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: 700, cursor: 'help',
                        background: '#e0f2fe', color: '#075985',
                        border: '1px solid #7dd3fc',
                        borderRadius: '3px', padding: '1px 5px',
                        whiteSpace: 'nowrap',
                      }}>
                        {isDoubles ? '↔ Spread ×0.75' : '↔ Spread'}
                      </span>
                    </Tooltip>
                  )}
                  {/* Weather chip */}
                  {m.weatherRequired && (() => {
                    const wi = WEATHER_INFO[m.weatherRequired];
                    return (
                      <Tooltip
                        content={`${wi.icon} ${wi.label} required — ${wi.description}`}
                        side="bottom"
                      >
                        <span style={{
                          fontSize: '10px', fontWeight: 700, cursor: 'help',
                          background: wi.bg, color: wi.color,
                          border: `1px solid ${wi.color}`,
                          borderRadius: '3px', padding: '1px 5px',
                          whiteSpace: 'nowrap',
                        }}>
                          {wi.icon} {wi.label}
                        </span>
                      </Tooltip>
                    );
                  })()}
                  {/* Body Press chip — uses attacker's Defense as offensive stat */}
                  {m.move.id === BODY_PRESS_MOVE_ID && (
                    <Tooltip
                      content="Body Press deals damage based on the attacker's Defense stat, not Attack."
                      side="bottom"
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: 700, cursor: 'help',
                        background: '#ebf8ff', color: '#2b6cb0',
                        border: '1px solid #90cdf4',
                        borderRadius: '3px', padding: '1px 5px',
                        whiteSpace: 'nowrap',
                      }}>
                        ⬡ Uses Def
                      </span>
                    </Tooltip>
                  )}
                  {/* Psyshock/Psystrike/Secret Sword chip — hits target's Defense */}
                  {PSYSHOCK_MOVE_IDS.has(m.move.id) && (
                    <Tooltip
                      content="This special move deals damage based on the target's Defense stat, not Sp. Defense."
                      side="bottom"
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: 700, cursor: 'help',
                        background: '#faf5ff', color: '#553c9a',
                        border: '1px solid #b794f4',
                        borderRadius: '3px', padding: '1px 5px',
                        whiteSpace: 'nowrap',
                      }}>
                        ⬡ Hits Def
                      </span>
                    </Tooltip>
                  )}
                  {/* Foul Play chip */}
                  {m.move.id === FOUL_PLAY_MOVE_ID && m.foulPlayAtk !== undefined && (
                    <Tooltip
                      content={`Foul Play uses the target's Attack stat (${m.foulPlayAtk}), not the attacker's.`}
                      side="bottom"
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: 700, cursor: 'help',
                        background: '#faf5ff', color: '#553c9a',
                        border: '1px solid #b794f4',
                        borderRadius: '3px', padding: '1px 5px',
                        whiteSpace: 'nowrap',
                      }}>
                        ↩ Atk: {m.foulPlayAtk}
                      </span>
                    </Tooltip>
                  )}
                  {/* Going-second chip — Avalanche, Revenge, Payback at ×2 power */}
                  {m.needsGoingSecond && (
                    <Tooltip
                      content={
                        m.move.priority < 0
                          ? `${m.move.name} has negative priority and almost always moves last. Calculated at ×2 power (assumes the user was hit before attacking this turn).`
                          : `${m.move.name} doubles in power if the user moves after the target. Calculated at ×2 power (assumes the target has already moved this turn).`
                      }
                      side="bottom"
                      maxWidth={260}
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: 700, cursor: 'help',
                        background: '#ebf8ff', color: '#2b6cb0',
                        border: '1px solid #90cdf4',
                        borderRadius: '3px', padding: '1px 5px',
                        whiteSpace: 'nowrap',
                      }}>
                        ⬇ Goes 2nd
                      </span>
                    </Tooltip>
                  )}
                  {/* Round double-power chip */}
                  {m.move.id === ROUND_MOVE_ID && m.needsRoundBoost && (
                    <Tooltip
                      content="Round's power doubles to 120 when any other Pokémon (ally or opponent) has already used Round that turn. This OHKO requires the doubled power."
                      side="bottom"
                      maxWidth={240}
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: 700, cursor: 'help',
                        background: '#faf5ff', color: '#553c9a',
                        border: '1px solid #d6bcfa',
                        borderRadius: '3px', padding: '1px 5px',
                      }}>
                        ♪ Double Power
                      </span>
                    </Tooltip>
                  )}
                  {/* Multi-hit: Sturdy-break chip */}
                  {m.breaksSturdy && (
                    <Tooltip
                      content={`${m.move.name} hits at least twice. The first hit triggers Sturdy (target survives at 1 HP), and the second hit KOs — no EV investment needed. Damage shown is 2 hits total.`}
                      side="bottom"
                      maxWidth={280}
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: 700, cursor: 'help',
                        background: '#f0fff4', color: '#276749',
                        border: '1px solid #68d391',
                        borderRadius: '3px', padding: '1px 5px',
                        whiteSpace: 'nowrap',
                      }}>
                        💥 Breaks Sturdy (2 hits)
                      </span>
                    </Tooltip>
                  )}
                  {/* Focus Sash-break chip */}
                  {m.breaksSash && (
                    <Tooltip
                      content={`${m.move.name} hits at least twice. The first hit pops the Focus Sash (target survives at 1 HP), and the second hit KOs — no EV investment needed. Mold Breaker has no effect on held items. Damage shown is 2 hits total.`}
                      side="bottom"
                      maxWidth={300}
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: 700, cursor: 'help',
                        background: '#fffaf0', color: '#744210',
                        border: '1px solid #f6ad55',
                        borderRadius: '3px', padding: '1px 5px',
                        whiteSpace: 'nowrap',
                      }}>
                        🎽 Breaks Sash (2 hits)
                      </span>
                    </Tooltip>
                  )}
                  {/* Multi-hit: hits required chip (non-Sturdy, non-Sash) */}
                  {m.hitsRequired !== undefined && !m.breaksSturdy && !m.breaksSash && (
                    <Tooltip
                      content={`${m.move.name} hits multiple times. With these EVs, ${m.hitsRequired} hit${m.hitsRequired === 1 ? '' : 's'} are needed to KO the target. Damage shown is the total across all required hits.`}
                      side="bottom"
                      maxWidth={280}
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: 700, cursor: 'help',
                        background: '#e6fffa', color: '#234e52',
                        border: '1px solid #81e6d9',
                        borderRadius: '3px', padding: '1px 5px',
                        whiteSpace: 'nowrap',
                      }}>
                        ✕{m.hitsRequired} hits
                      </span>
                    </Tooltip>
                  )}
                  {/* Two-turn chip */}
                  {m.twoTurn && (
                    <Tooltip
                      content={`${m.move.name} requires a charge turn — it cannot OHKO in a single action. Use the Filters panel to hide 2-turn moves.`}
                      side="bottom"
                      maxWidth={260}
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: 700, cursor: 'help',
                        background: '#faf5ff', color: '#553c9a',
                        border: '1px solid #b794f4',
                        borderRadius: '3px', padding: '1px 5px',
                        whiteSpace: 'nowrap',
                      }}>
                        ⏳ 2 Turns
                      </span>
                    </Tooltip>
                  )}
                  {/* Ability chip */}
                  {m.abilityMod && (
                    <Tooltip
                      content={`${m.abilityMod.name} is required to achieve this OHKO${m.abilityMod.isHidden ? ' (Hidden Ability)' : ''}`}
                      side="bottom"
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: 700, cursor: 'help',
                        background: '#fffbeb', color: '#92400e',
                        border: '1px solid #f6ad55',
                        borderRadius: '3px', padding: '1px 5px',
                        whiteSpace: 'nowrap',
                      }}>
                        ★ {m.abilityMod.name}
                      </span>
                    </Tooltip>
                  )}
                  {/* Nature chip — shown when a +Atk or +SpA nature is required */}
                  {m.nature && (
                    <Tooltip
                      content={m.nature === '+atk'
                        ? 'Requires a +Atk nature (e.g. Adamant) — physical moves ×1.1'
                        : 'Requires a +SpA nature (e.g. Modest) — special moves ×1.1'}
                      side="bottom"
                    >
                      <span style={{
                        fontSize: '10px', fontWeight: 700, cursor: 'help',
                        background: m.nature === '+atk' ? '#fff5f5' : '#faf5ff',
                        color: m.nature === '+atk' ? '#c53030' : '#553c9a',
                        border: `1px solid ${m.nature === '+atk' ? '#feb2b2' : '#d6bcfa'}`,
                        borderRadius: '3px', padding: '1px 5px',
                        whiteSpace: 'nowrap',
                      }}>
                        {m.nature === '+atk' ? '+Atk' : '+SpA'} nature
                      </span>
                    </Tooltip>
                  )}
                  {/* Defensive ability chip — only shown when EV investment is required */}
                  {m.defAbility && m.evNeeded > 0 && (() => {
                    const isReduction = m.defAbility.mult < 1;
                    const typeName = data.typeNames.get(m.move.typeId) ?? 'this';
                    const unit = statMode === 'sp' ? 'SP' : 'EV';
                    const extraRaw = m.baseEvNeeded !== undefined ? m.evNeeded - m.baseEvNeeded : null;
                    const extra = extraRaw !== null
                      ? (statMode === 'sp' ? extraRaw / 8 : extraRaw)
                      : null;
                    const extraStr = extra !== null && extra > 0
                      ? ` — ${extra} extra ${unit}${extra === 1 ? '' : 's'} because of ability`
                      : extra !== null && extra < 0
                      ? ` — ${Math.abs(extra)} fewer ${unit}${Math.abs(extra) === 1 ? '' : 's'} because of ability`
                      : '';
                    const tooltipText = `Target's ${m.defAbility.name} ${isReduction ? 'reduces' : 'amplifies'} ${typeName}-type damage (×${m.defAbility.mult})${extraStr}`;
                    return (
                      <Tooltip content={tooltipText} side="bottom">
                        <span style={{
                          fontSize: '10px', fontWeight: 700, cursor: 'help',
                          background: isReduction ? '#ebf8ff' : '#fffbeb',
                          color: isReduction ? '#2c5282' : '#92400e',
                          border: `1px solid ${isReduction ? '#90cdf4' : '#f6ad55'}`,
                          borderRadius: '3px', padding: '1px 5px',
                          whiteSpace: 'nowrap',
                        }}>
                          {isReduction ? '🛡' : '⚡'} {m.defAbility.name}
                        </span>
                      </Tooltip>
                    );
                  })()}
                  {/* Coverage chip */}
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
                </div>
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
                {(() => {
                  const dispVal = statMode === 'sp' ? m.evNeeded / 8 : m.evNeeded;
                  const unit = statMode === 'sp' ? 'SPs' : 'EVs';
                  const statLabel = m.move.id === BODY_PRESS_MOVE_ID ? 'Defense'
                    : m.move.damageClassId === 2 ? 'Attack'
                    : 'Sp. Atk';
                  return (
                    <Tooltip
                      content={m.evNeeded === 0
                        ? `No ${unit} investment needed`
                        : `Needs ${dispVal} ${unit} in ${statLabel}`}
                      side="bottom"
                    >
                      <span style={{
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'help',
                        // midpoint is 128 EVs = 16 SPs; evNeeded is always in EV units internally
                        color: m.evNeeded === 0 ? '#38a169' : m.evNeeded <= 128 ? '#d69e2e' : '#e53e3e',
                      }}>
                        {dispVal}
                      </span>
                    </Tooltip>
                  );
                })()}
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
    </div>
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
        Move Flags
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
                    if (e.target.checked) { next.delete(flag); } else { next.add(flag); }
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

// ── Exclude Forms dropdown ──────────────────────────────────────────────────

function ExcludeFormsDropdown({
  excludedForms,
  onChange,
}: {
  excludedForms: Set<FormCategory>;
  onChange: (forms: Set<FormCategory>) => void;
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

  const excludedCount = excludedForms.size;

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
        Forms
        <span style={{ fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
          background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: '8px', padding: '10px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          minWidth: '220px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FORM_CATEGORIES.map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#333' }}>
                <input
                  type="checkbox"
                  checked={excludedForms.has(key)}
                  style={{ margin: 0, cursor: 'pointer' }}
                  onChange={e => {
                    const next = new Set(excludedForms);
                    if (e.target.checked) { next.add(key); } else { next.delete(key); }
                    onChange(next);
                  }}
                />
                {label}
              </label>
            ))}
          </div>
          {excludedCount > 0 && (
            <button
              onClick={() => onChange(new Set())}
              style={{ ...clearChipStyle, marginTop: '8px', width: '100%', textAlign: 'center' }}
            >
              ✕ Show all forms
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Stat Changes dropdown ────────────────────────────────────────────────────

function StatChangesDropdown({
  atkStage, onAtkStageChange,
  spaStage, onSpaStageChange,
  atkDefStage, onAtkDefStageChange,
  atkSpeStage, onAtkSpeStageChange,
  choiceItem, onChoiceItemChange,
}: {
  atkStage: number;
  onAtkStageChange: (v: number) => void;
  spaStage: number;
  onSpaStageChange: (v: number) => void;
  atkDefStage: number;
  onAtkDefStageChange: (v: number) => void;
  atkSpeStage: number;
  onAtkSpeStageChange: (v: number) => void;
  choiceItem: 'band' | 'scarf' | 'specs' | null;
  onChoiceItemChange: (v: 'band' | 'scarf' | 'specs' | null) => void;
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

  const activeCount = (atkStage !== 0 ? 1 : 0) + (spaStage !== 0 ? 1 : 0) + (atkDefStage !== 0 ? 1 : 0) + (atkSpeStage !== 0 ? 1 : 0) + (choiceItem !== null ? 1 : 0);

  const CHOICE_ITEMS: { key: 'band' | 'scarf' | 'specs'; label: string; desc: string; tooltip: string; identifier: string; color: string }[] = [
    { key: 'band',  label: 'Choice Band',  desc: 'Atk ×1.5', identifier: 'choice-band',  color: '#c53030', tooltip: 'Boosts the holder\'s Attack by ×1.5, but locks it into the first move used.' },
    { key: 'scarf', label: 'Choice Scarf', desc: 'Spe ×1.5', identifier: 'choice-scarf', color: '#2b6cb0', tooltip: 'Boosts the holder\'s Speed by ×1.5, but locks it into the first move used. Affects all outspeed comparisons and speed chip values.' },
    { key: 'specs', label: 'Choice Specs', desc: 'SpA ×1.5', identifier: 'choice-specs', color: '#553c9a', tooltip: 'Boosts the holder\'s Sp. Atk by ×1.5, but locks it into the first move used.' },
  ];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          ...btnStyle,
          background: open ? '#f0fff4' : '#fff',
          borderColor: open ? '#68d391' : activeCount > 0 ? '#276749' : '#ddd',
          color: open || activeCount > 0 ? '#276749' : '#555',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}
      >
        {activeCount > 0 && (
          <Tooltip content="Reset all stat changes" side="top">
            <span
              onClick={e => { e.stopPropagation(); onAtkStageChange(0); onSpaStageChange(0); onAtkDefStageChange(0); onAtkSpeStageChange(0); onChoiceItemChange(null); }}
              style={{ color: '#276749', fontWeight: 800, lineHeight: 1, padding: '0 2px' }}
            >✕</span>
          </Tooltip>
        )}
        Stat Changes
        {activeCount > 0 && (
          <span style={{
            background: '#276749', color: '#fff',
            borderRadius: '999px', fontSize: '10px', fontWeight: 700,
            padding: '1px 6px', lineHeight: 1.4,
          }}>{activeCount}</span>
        )}
        <span style={{ fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: '10px', padding: '14px 16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          minWidth: '200px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '32px 22px 36px 22px 16px', gap: '5px 6px', alignItems: 'center' }}>
            <AttackerStageStepper label="Atk" value={atkStage} onChange={onAtkStageChange} />
            <AttackerStageStepper label="Def" value={atkDefStage} onChange={onAtkDefStageChange} labelTooltip="Used by Body Press, which deals damage based on the attacker's Defense stat." />
            <AttackerStageStepper label="SpA" value={spaStage} onChange={onSpaStageChange} />
            <AttackerStageStepper label="Spe" value={atkSpeStage} onChange={onAtkSpeStageChange} />
          </div>

          <div style={{ borderTop: '1px solid #f0f0f0', marginTop: '10px', paddingTop: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#aaa', marginBottom: '7px' }}>
              Choice Item
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {CHOICE_ITEMS.map(({ key, label, desc, tooltip, identifier, color }) => {
                const checked = choiceItem === key;
                return (
                  <Tooltip key={key} content={tooltip} side="bottom" maxWidth={220}>
                    <label
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        cursor: 'pointer', padding: '4px 6px', borderRadius: '5px',
                        background: checked ? `${color}10` : 'transparent',
                        border: `1px solid ${checked ? color : 'transparent'}`,
                        transition: 'all 0.1s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onChoiceItemChange(checked ? null : key)}
                        style={{ accentColor: color, width: '13px', height: '13px', flexShrink: 0 }}
                      />
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${identifier}.png`}
                        alt={label}
                        width={20} height={20}
                        style={{ imageRendering: 'pixelated', flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: checked ? color : '#333', lineHeight: 1.2 }}>{label}</div>
                        <div style={{ fontSize: '10px', color: '#999', lineHeight: 1.2 }}>{desc}</div>
                      </div>
                    </label>
                  </Tooltip>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Battleground Effects dropdown ───────────────────────────────────────────

function BattlegroundDropdown({
  weather, onWeatherChange,
  terrain, onTerrainChange,
  fairyAura, onFairyAuraChange,
  gravity, onGravityChange,
  trickRoom, onTrickRoomChange,
}: {
  weather: Weather;
  onWeatherChange: (w: Weather) => void;
  terrain: Terrain;
  onTerrainChange: (t: Terrain) => void;
  fairyAura: boolean;
  onFairyAuraChange: (v: boolean) => void;
  gravity: boolean;
  onGravityChange: (v: boolean) => void;
  trickRoom: boolean;
  onTrickRoomChange: (v: boolean) => void;
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

  const activeCount = (weather !== 'none' ? 1 : 0) + (terrain !== 'none' ? 1 : 0) + (fairyAura ? 1 : 0) + (gravity ? 1 : 0) + (trickRoom ? 1 : 0);

  const TERRAINS: { key: Terrain; label: string; icon: string }[] = [
    { key: 'none',     label: 'None',     icon: ''   },
    { key: 'electric', label: 'Electric', icon: '⚡' },
    { key: 'grassy',   label: 'Grassy',   icon: '🌿' },
    { key: 'misty',    label: 'Misty',    icon: '🌫️' },
    { key: 'psychic',  label: 'Psychic',  icon: '🔮' },
  ];

  const sectionLabel: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: '#aaa', marginBottom: '6px',
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          ...btnStyle,
          background: open ? '#f0f7ff' : '#fff',
          borderColor: open ? '#90cdf4' : activeCount > 0 ? '#2b6cb0' : '#ddd',
          color: open || activeCount > 0 ? '#2b6cb0' : '#555',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}
      >
        {activeCount > 0 && (
          <Tooltip content="Clear all battle effects" side="top">
            <span
              onClick={e => { e.stopPropagation(); onWeatherChange('none'); onTerrainChange('none'); onFairyAuraChange(false); onGravityChange(false); onTrickRoomChange(false); }}
              style={{ color: '#2b6cb0', fontWeight: 800, lineHeight: 1, padding: '0 2px' }}
            >✕</span>
          </Tooltip>
        )}
        Battle Effects
        {activeCount > 0 && (
          <span style={{
            background: '#2b6cb0', color: '#fff',
            borderRadius: '999px', fontSize: '10px', fontWeight: 700,
            padding: '1px 6px', lineHeight: 1.4,
          }}>{activeCount}</span>
        )}
        <span style={{ fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: '10px', padding: '14px 16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          minWidth: '280px',
          display: 'flex', flexDirection: 'column', gap: '14px',
        }}>

          {/* Weather */}
          <div>
            <div style={sectionLabel}>Weather</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['none', 'sun', 'rain', 'sand', 'snow'] as Weather[]).map(w => {
                const info = w !== 'none' ? WEATHER_INFO[w] : null;
                const active = weather === w;
                const btn = (
                  <button
                    key={w}
                    onClick={() => onWeatherChange(w)}
                    style={{
                      ...toggleBtnStyle,
                      background: active ? (info?.bg ?? '#fff') : '#fff',
                      color: active ? (info?.color ?? '#555') : '#555',
                      borderColor: active ? (info?.color ?? '#ddd') : '#ddd',
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    {info ? `${info.icon} ${info.label}` : 'None'}
                  </button>
                );
                return info ? (
                  <Tooltip key={w} content={`${info.icon} ${info.label}: ${info.description}`} side="bottom">
                    {btn}
                  </Tooltip>
                ) : btn;
              })}
            </div>
          </div>

          {/* Terrain */}
          <div>
            <div style={sectionLabel}>Terrain</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {TERRAINS.map(({ key, label, icon }) => {
                const info = key !== 'none' ? TERRAIN_INFO[key] : null;
                const active = terrain === key;
                const btn = (
                  <button
                    key={key}
                    onClick={() => onTerrainChange(key)}
                    style={{
                      ...toggleBtnStyle,
                      background: active ? (info?.bg ?? '#e53e3e') : '#fff',
                      color: active ? (info?.color ?? '#fff') : '#555',
                      borderColor: active ? (info?.color ?? '#e53e3e') : '#ddd',
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    {icon ? `${icon} ` : ''}{label}
                  </button>
                );
                return info ? (
                  <Tooltip key={key} content={`${info.icon} ${info.label}: ${info.description}`} side="bottom">
                    {btn}
                  </Tooltip>
                ) : btn;
              })}
            </div>
          </div>

          {/* Auras */}
          <div>
            <div style={sectionLabel}>Aura</div>
            <Tooltip
              content="Fairy Aura — boosts the power of all Fairy-type moves by ×4/3 for every Pokémon on the field. Emitted by Xerneas."
              side="bottom"
              maxWidth={260}
            >
              <button
                onClick={() => onFairyAuraChange(!fairyAura)}
                style={{
                  ...toggleBtnStyle,
                  background: fairyAura ? '#fdf2f8' : '#fff',
                  color: fairyAura ? '#9d174d' : '#555',
                  borderColor: fairyAura ? '#f9a8d4' : '#ddd',
                  fontWeight: fairyAura ? 700 : 500,
                }}
              >
                ✨ Fairy Aura
              </button>
            </Tooltip>
          </div>

          {/* Field Moves */}
          <div>
            <div style={sectionLabel}>Field Moves</div>
            <Tooltip
              content={
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '5px' }}>⬇ Gravity</div>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#90cdf4', fontWeight: 700 }}>Accuracy ×5/3</span> — all moves with finite accuracy are capped at 100%. Stone Edge, Focus Blast, Fire Blast and others all become guaranteed to hit.
                  </div>
                  <div>
                    <span style={{ color: '#fc8181', fontWeight: 700 }}>Unusable moves excluded</span> — Fly, Bounce, Sky Drop, Jump Kick, and High Jump Kick are removed from results.
                  </div>
                </div>
              }
              side="bottom"
              maxWidth={270}
            >
              <button
                onClick={() => onGravityChange(!gravity)}
                style={{
                  ...toggleBtnStyle,
                  background: gravity ? '#ebf8ff' : '#fff',
                  color: gravity ? '#2b6cb0' : '#555',
                  borderColor: gravity ? '#90cdf4' : '#ddd',
                  fontWeight: gravity ? 700 : 500,
                }}
              >
                ⬇ Gravity
              </button>
            </Tooltip>
            <Tooltip
              content="Trick Room — reverses speed priority for 5 turns. Slower Pokémon move first. Affects the Outspeed filter and speed comparison indicators in results."
              side="bottom"
              maxWidth={260}
            >
              <button
                onClick={() => onTrickRoomChange(!trickRoom)}
                style={{
                  ...toggleBtnStyle,
                  background: trickRoom ? '#553c9a' : '#fff',
                  color: trickRoom ? '#fff' : '#7c3aed',
                  borderColor: trickRoom ? '#553c9a' : '#c4b5fd',
                  fontWeight: trickRoom ? 700 : 500,
                }}
              >
                🔮 Trick Room
              </button>
            </Tooltip>
          </div>

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

function AttackerStageStepper({ label, value, onChange, labelTooltip }: { label: string; value: number; onChange: (v: number) => void; labelTooltip?: React.ReactNode }) {
  const color = value > 0 ? '#276749' : value < 0 ? '#9b2c2c' : '#aaa';
  const bg    = value > 0 ? '#f0fff4' : value < 0 ? '#fff5f5' : '#f7f7f7';
  const labelEl = (
    <span style={{ fontSize: '11px', color: '#888', fontWeight: 700, cursor: labelTooltip ? 'help' : 'default', borderBottom: labelTooltip ? '1px dashed #ccc' : 'none' }}>
      {label}
    </span>
  );
  // Returns a fragment — parent must be a CSS grid with 5 columns
  return (
    <>
      {labelTooltip
        ? <Tooltip content={labelTooltip} side="bottom" maxWidth={200}>{labelEl}</Tooltip>
        : labelEl}
      <button
        onClick={() => onChange(Math.max(-6, value - 1))}
        disabled={value <= -6}
        style={{ ...stageStepBtnRV, opacity: value <= -6 ? 0.3 : 1 }}
      >−</button>
      <span style={{
        fontSize: '12px', fontWeight: 700, color,
        background: bg, borderRadius: '4px',
        padding: '1px 0', textAlign: 'center',
        border: `1px solid ${value !== 0 ? color : '#ddd'}`,
      }}>
        {value > 0 ? `+${value}` : value}
      </span>
      <button
        onClick={() => onChange(Math.min(6, value + 1))}
        disabled={value >= 6}
        style={{ ...stageStepBtnRV, opacity: value >= 6 ? 0.3 : 1 }}
      >+</button>
      {value !== 0 ? (
        <Tooltip content="Reset to 0" side="top">
          <button
            onClick={() => onChange(0)}
            style={{ fontSize: '10px', color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', padding: '0', lineHeight: 1, justifySelf: 'center' }}
          >✕</button>
        </Tooltip>
      ) : (
        <span />
      )}
    </>
  );
}

const stageStepBtnRV: React.CSSProperties = {
  width: '22px', height: '22px', fontSize: '14px', fontWeight: 700,
  border: '1px solid #ddd', borderRadius: '4px',
  background: '#fff', cursor: 'pointer', color: '#555',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, lineHeight: 1,
};
