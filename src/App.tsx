import { useEffect, useRef, useState, useMemo } from 'react';
import { loadGameData } from './data/loader';
import type { GameData, Pokemon } from './data/types';
import { findPokemonOHKOs, calcHP, calcStat, TARGET_HELD_ITEMS } from './calc/damage';
import type { PokemonOHKOResult, EVSpread, TargetConfig, TargetHeldItem, Weather, Terrain } from './calc/damage';
import PokemonSearch from './components/PokemonSearch';
import PokemonResultsView from './components/PokemonResultsView';
import ReleaseNotes from './components/ReleaseNotes';
import TypeBadge from './components/TypeBadge';
import Tooltip from './components/Tooltip';
import { APP_VERSION } from './version';

const DEFAULT_EVS: EVSpread = { hp: 0, atk: 0, def: 0, spd: 0, spe: 0 };

// ── Natures ──────────────────────────────────────────────────────────────────

type StatKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe';
interface NatureData {
  name: string;
  plus: StatKey | null;
  minus: StatKey | null;
}
const STAT_LABELS: Record<StatKey, string> = {
  atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed',
};
const NATURE_GROUPS: { label: string; natures: NatureData[] }[] = [
  {
    label: '+ Defense',
    natures: [
      { name: 'Bold',    plus: 'def', minus: 'atk' },
      { name: 'Impish',  plus: 'def', minus: 'spa' },
      { name: 'Relaxed', plus: 'def', minus: 'spe' },
      { name: 'Lax',     plus: 'def', minus: 'spd' },
    ],
  },
  {
    label: '+ Sp. Defense',
    natures: [
      { name: 'Calm',    plus: 'spd', minus: 'atk' },
      { name: 'Careful', plus: 'spd', minus: 'spa' },
      { name: 'Gentle',  plus: 'spd', minus: 'def' },
      { name: 'Sassy',   plus: 'spd', minus: 'spe' },
    ],
  },
  {
    label: '+ Speed',
    natures: [
      { name: 'Timid',   plus: 'spe', minus: 'atk' },
      { name: 'Jolly',   plus: 'spe', minus: 'spa' },
      { name: 'Hasty',   plus: 'spe', minus: 'def' },
      { name: 'Naive',   plus: 'spe', minus: 'spd' },
    ],
  },
  {
    label: '− Defense',
    natures: [
      { name: 'Lonely',  plus: 'atk', minus: 'def' },
      { name: 'Mild',    plus: 'spa', minus: 'def' },
    ],
  },
  {
    label: '− Sp. Defense',
    natures: [
      { name: 'Naughty', plus: 'atk', minus: 'spd' },
      { name: 'Rash',    plus: 'spa', minus: 'spd' },
    ],
  },
  {
    label: '− Speed',
    natures: [
      { name: 'Brave',   plus: 'atk', minus: 'spe' },
      { name: 'Quiet',   plus: 'spa', minus: 'spe' },
    ],
  },
  {
    label: 'No effect on Def/SpD/Spe',
    natures: [
      { name: 'Modest',  plus: 'spa', minus: 'atk' },
      { name: 'Adamant', plus: 'atk', minus: 'spa' },
    ],
  },
];
const ALL_NATURES = NATURE_GROUPS.flatMap(g => g.natures);

function getNatureMult(nature: string, stat: StatKey): number {
  const n = ALL_NATURES.find(n => n.name === nature);
  if (!n) return 1.0;
  if (n.plus === stat)  return 1.1;
  if (n.minus === stat) return 0.9;
  return 1.0;
}
const MAX_TARGETS = 6;
const STORAGE_KEY = 'ohko-finder-slots';

interface TargetSlot {
  id: number;           // stable key for React
  pokemon: Pokemon | null;
  evs: EVSpread;
  mustOutspeed: boolean;
  heldItem: TargetHeldItem | null;
  reflect: boolean;
  lightScreen: boolean;
  nature: string; // nature name, or 'Neutral'
  tailwind: boolean;
  friendGuard: boolean;
}

/** Shape written to / read from localStorage (no full Pokemon object). */
interface SavedSlot {
  pokemonId: number | null;
  evs: EVSpread;
  mustOutspeed?: boolean;
  heldItemIdentifier?: string;
  reflect?: boolean;
  lightScreen?: boolean;
  nature?: string;
  tailwind?: boolean;
  friendGuard?: boolean;
}

let nextId = 1;
function makeSlot(): TargetSlot {
  return { id: nextId++, pokemon: null, evs: { ...DEFAULT_EVS }, mustOutspeed: false, heldItem: null, reflect: false, lightScreen: false, nature: 'Neutral', tailwind: false, friendGuard: false };
}

export default function App() {
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [slots, setSlots] = useState<TargetSlot[]>([makeSlot()]);
  // Gate: don't overwrite localStorage until after we've had a chance to restore
  const restoredRef = useRef(false);

  const [activeTab, setActiveTab] = useState<'finder' | 'notes'>('finder');
  const [championsOnly, setChampionsOnly] = useState(true);
  const [isDoubles, setIsDoubles] = useState(true);
  const [gravity, setGravity] = useState(false);
  const [terrain, setTerrain] = useState<Terrain>('none');
  const [fairyAura, setFairyAura] = useState(false);
  const [results, setResults] = useState<PokemonOHKOResult[]>([]);
  const [computing, setComputing] = useState(false);
  const [showPossible, setShowPossible] = useState(false);
  const [minAccuracy, setMinAccuracy] = useState(0);
  const [weather, setWeather] = useState<Weather>('none');

  useEffect(() => {
    loadGameData()
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setLoadError(String(err)); setLoading(false); });
  }, []);

  // Restore saved slots once data is available, then open the save gate
  useEffect(() => {
    if (!data) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: SavedSlot[] = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length > 0) {
          const restored = saved.map(s => ({
            id: nextId++,
            pokemon: s.pokemonId != null ? (data.pokemon.get(s.pokemonId) ?? null) : null,
            evs: { ...DEFAULT_EVS, ...s.evs },
            mustOutspeed: s.mustOutspeed ?? false,
            heldItem: TARGET_HELD_ITEMS.find(i => i.identifier === s.heldItemIdentifier) ?? null,
            reflect: s.reflect ?? false,
            lightScreen: s.lightScreen ?? false,
            nature: s.nature ?? 'Neutral',
            tailwind: s.tailwind ?? false,
            friendGuard: s.friendGuard ?? false,
          }));
          restoredRef.current = true; // open gate before setSlots so the next save is correct
          setSlots(restored);
          return;
        }
      }
    } catch { /* ignore corrupt data */ }
    restoredRef.current = true; // nothing to restore — open gate for future saves
  }, [data]);

  // Persist slots — but only after restore has run to avoid clobbering saved data
  useEffect(() => {
    if (!restoredRef.current) return;
    const toSave: SavedSlot[] = slots.map(s => ({
      pokemonId: s.pokemon?.id ?? null,
      evs: s.evs,
      mustOutspeed: s.mustOutspeed,
      heldItemIdentifier: s.heldItem?.identifier,
      reflect: s.reflect,
      lightScreen: s.lightScreen,
      nature: s.nature,
      tailwind: s.tailwind,
      friendGuard: s.friendGuard,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [slots]);

  const pokemonList = useMemo(() => {
    if (!data) return [];
    return Array.from(data.pokemon.values()).sort((a, b) => {
      // Group by species, default form first, then alternate forms by id
      if (a.speciesId !== b.speciesId) return a.speciesId - b.speciesId;
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.id - b.id;
    });
  }, [data]);

  // When Champions mode is on, restrict the search list to roster Pokémon only
  const searchablePokemon = useMemo(() => {
    if (!data || !championsOnly) return pokemonList;
    return pokemonList.filter(p => data.championsRoster.has(p.speciesId));
  }, [pokemonList, championsOnly, data]);

  // Slots with a selected Pokémon
  const activeTargets: TargetConfig[] = slots
    .filter(s => s.pokemon !== null)
    .map(s => ({
      pokemon: s.pokemon!,
      evs: s.evs,
      heldItem: s.heldItem ?? undefined,
      reflect: s.reflect,
      lightScreen: s.lightScreen,
      atkNature: getNatureMult(s.nature, 'atk'),
      defNature: getNatureMult(s.nature, 'def'),
      spdNature: getNatureMult(s.nature, 'spd'),
      speNature: getNatureMult(s.nature, 'spe'),
      friendGuard: isDoubles ? s.friendGuard : false,
    }));

  // EV-invested, nature-adjusted L50 speed for each active target (×2 under Tailwind)
  const targetSpeeds: number[] = slots
    .filter(s => s.pokemon !== null)
    .map(s => {
      const base = calcStat(s.pokemon!.stats.spe, s.evs.spe, 31, 50, getNatureMult(s.nature, 'spe'));
      return s.tailwind ? base * 2 : base;
    });

  // Speeds of targets with mustOutspeed checked (also Tailwind-aware)
  const mustOutspeedSpeeds: number[] = slots
    .filter(s => s.pokemon !== null && s.mustOutspeed)
    .map(s => {
      const base = calcStat(s.pokemon!.stats.spe, s.evs.spe, 31, 50, getNatureMult(s.nature, 'spe'));
      return s.tailwind ? base * 2 : base;
    });

  useEffect(() => {
    if (!data || activeTargets.length === 0) { setResults([]); return; }
    setComputing(true);
    setTimeout(() => {
      setResults(findPokemonOHKOs(activeTargets, data, showPossible, minAccuracy, weather, isDoubles, gravity, terrain, fairyAura));
      setComputing(false);
    }, 10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, slots, showPossible, minAccuracy, weather, isDoubles, gravity, terrain, fairyAura]);

  /* ── slot helpers ── */
  const updateSlot = (id: number, patch: Partial<TargetSlot>) =>
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const addSlot = () => {
    if (slots.length >= MAX_TARGETS) return;
    setSlots(prev => [...prev, makeSlot()]);
  };

  const removeSlot = (id: number) =>
    setSlots(prev => prev.length === 1 ? [{ ...prev[0], pokemon: null, evs: { ...DEFAULT_EVS } }] : prev.filter(s => s.id !== id));

  /* ── result heading ── */
  const filledNames = slots.filter(s => s.pokemon).map(s => s.pokemon!.name);
  const resultLabel =
    filledNames.length === 0 ? '' :
    filledNames.length === 1 ? `Pokémon that can OHKO ${filledNames[0]}` :
    filledNames.length === 2 ? `Pokémon that can OHKO ${filledNames[0]} & ${filledNames[1]}` :
    `Pokémon that can OHKO all ${filledNames.length} targets`;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{
        background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
        color: '#fff', padding: '24px 32px 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Pokémon OHKO Finder</h1>
            <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '15px' }}>
              Find every Pokémon that can one-hit KO your targets in competitive play (Level 50)
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <span style={{ opacity: 0.6, fontSize: '12px', fontWeight: 600 }}>
              v{APP_VERSION}
            </span>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
              <a
                href="https://github.com/kameelyan/pokemon-ohko-finder"
                target="_blank"
                rel="noopener noreferrer"
                title="View on GitHub"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: '#fff', color: '#1a202c',
                  width: '30px', borderRadius: '6px',
                  textDecoration: 'none',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </a>
              <a
                href="https://ko-fi.com/kameelyan"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: '#fff', color: '#c53030',
                  fontSize: '12px', fontWeight: 700,
                  padding: '5px 12px', borderRadius: '6px',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                ☕ Support on Ko-fi
              </a>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '20px' }}>
          {([
            ['finder', 'OHKO Finder'],
            ['notes',  '📋 Release Notes'],
          ] as ['finder' | 'notes', string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? '#fff' : 'transparent',
                color: activeTab === tab ? '#c53030' : 'rgba(255,255,255,0.75)',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >{label}</button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '32px 24px' }}>
        {activeTab === 'notes' ? (
          <ReleaseNotes />
        ) : loading ? (
          <div style={{ textAlign: 'center', marginTop: '80px' }}>
            <div style={{ fontSize: '48px' }}>⏳</div>
            <p style={{ fontSize: '18px', color: '#666', marginTop: '16px' }}>Loading Pokédex data…</p>
          </div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', marginTop: '80px' }}>
            <div style={{ fontSize: '48px' }}>⚠️</div>
            <p style={{ fontSize: '18px', color: '#e53e3e', marginTop: '16px', fontWeight: 700 }}>
              Failed to load Pokédex data
            </p>
            <p style={{ fontSize: '14px', color: '#888', maxWidth: '500px', margin: '8px auto 0' }}>
              Try a hard refresh (<kbd>Cmd+Shift+R</kbd> on Mac, <kbd>Ctrl+Shift+R</kbd> on Windows).
              If the problem persists, check the browser console for details.
            </p>
            <details style={{ marginTop: '12px', fontSize: '12px', color: '#aaa' }}>
              <summary style={{ cursor: 'pointer' }}>Error details</summary>
              <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '8px', borderRadius: '6px', marginTop: '6px', overflowX: 'auto' }}>
                {loadError}
              </pre>
            </details>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div style={{
              background: '#fff', borderRadius: '12px', padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '24px',
            }}>
              {/* Champions toggle + section header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#333' }}>
                    Target Pokémon
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#999' }}>
                    Select up to {MAX_TARGETS} Pokémon to find what can OHKO them
                  </p>
                  {/* Screen shortcuts */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {([
                      { key: 'reflect',     label: '🛡 Reflect',      color: '#e53e3e' },
                      { key: 'lightScreen', label: '✨ Light Screen', color: '#d69e2e' },
                    ] as { key: 'reflect' | 'lightScreen'; label: string; color: string }[]).map(({ key, label, color }) => {
                      const allOn  = slots.every(s => s[key]);
                      const anyOn  = slots.some(s => s[key]);
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}:</span>
                          <button
                            onClick={() => setSlots(prev => prev.map(s => ({ ...s, [key]: true })))}
                            disabled={allOn}
                            style={{
                              fontSize: '11px', padding: '2px 8px',
                              border: `1px solid ${allOn ? color : '#ddd'}`,
                              borderRadius: '4px', cursor: allOn ? 'default' : 'pointer',
                              background: allOn ? color : '#fff',
                              color: allOn ? '#fff' : '#555', fontWeight: 600,
                            }}
                          >All</button>
                          <button
                            onClick={() => setSlots(prev => prev.map(s => ({ ...s, [key]: false })))}
                            disabled={!anyOn}
                            style={{
                              fontSize: '11px', padding: '2px 8px',
                              border: '1px solid #ddd', borderRadius: '4px',
                              cursor: anyOn ? 'pointer' : 'default',
                              background: '#fff', color: anyOn ? '#555' : '#bbb', fontWeight: 600,
                            }}
                          >None</button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Singles / Doubles toggle */}
                  <Tooltip
                    content={
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: '5px' }}>Battle Format</div>
                        <div style={{ color: '#ccc', marginBottom: '6px' }}>
                          Affects how spread moves are calculated.
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          <span style={{ color: '#68d391', fontWeight: 700 }}>Doubles</span> — spread moves (e.g. Rock Slide, Earthquake, Heat Wave) deal <strong>×0.75</strong> damage. A "Spread" chip appears on these moves.
                        </div>
                        <div>
                          <span style={{ color: '#f6ad55', fontWeight: 700 }}>Singles</span> — spread moves deal full damage, no penalty applied.
                        </div>
                      </div>
                    }
                    maxWidth={280}
                    side="bottom"
                  >
                    <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #ddd', cursor: 'pointer' }}>
                      {(['singles', 'doubles'] as const).map(fmt => {
                        const active = fmt === (isDoubles ? 'doubles' : 'singles');
                        return (
                          <button
                            key={fmt}
                            onClick={() => setIsDoubles(fmt === 'doubles')}
                            style={{
                              padding: '6px 14px', fontSize: '13px', fontWeight: 700,
                              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                              background: active ? '#2b6cb0' : '#fff',
                              color: active ? '#fff' : '#aaa',
                            }}
                          >
                            {fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </Tooltip>

                  {/* Champions toggle */}
                  <button
                    onClick={() => setChampionsOnly(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      padding: '6px 14px',
                      border: `1.5px solid ${championsOnly ? '#553c9a' : '#ddd'}`,
                      borderRadius: '8px',
                      background: championsOnly ? '#f3f0ff' : '#fff',
                      color: championsOnly ? '#553c9a' : '#888',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>🏆</span>
                    <span>Pokémon Champions</span>
                    <span style={{
                      width: '28px', height: '16px', borderRadius: '999px',
                      background: championsOnly ? '#553c9a' : '#ddd',
                      position: 'relative', flexShrink: 0, transition: 'background 0.15s',
                    }}>
                      <span style={{
                        position: 'absolute', top: '2px',
                        left: championsOnly ? '14px' : '2px',
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: '#fff', transition: 'left 0.15s',
                      }} />
                    </span>
                  </button>
                </div>
              </div>

              {/* Target grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}>
                {slots.map((slot, idx) => (
                  <TargetPanel
                    key={slot.id}
                    label={`Target ${idx + 1}`}
                    pokemon={searchablePokemon}
                    selected={slot.pokemon}
                    evs={slot.evs}
                    mustOutspeed={slot.mustOutspeed}
                    heldItem={slot.heldItem}
                    reflect={slot.reflect}
                    lightScreen={slot.lightScreen}
                    nature={slot.nature}
                    onSelect={p => updateSlot(slot.id, { pokemon: p, evs: { ...DEFAULT_EVS } })}
                    onRemove={slots.length > 1 ? () => removeSlot(slot.id) : undefined}
                    onEvsChange={evs => updateSlot(slot.id, { evs })}
                    onMustOutspeedChange={v => updateSlot(slot.id, { mustOutspeed: v })}
                    onHeldItemChange={item => updateSlot(slot.id, { heldItem: item })}
                    onReflectChange={v => updateSlot(slot.id, { reflect: v })}
                    onLightScreenChange={v => updateSlot(slot.id, { lightScreen: v })}
                    onNatureChange={n => updateSlot(slot.id, { nature: n })}
                    tailwind={slot.tailwind}
                    onTailwindChange={v => updateSlot(slot.id, { tailwind: v })}
                    friendGuard={slot.friendGuard}
                    onFriendGuardChange={v => updateSlot(slot.id, { friendGuard: v })}
                    isDoubles={isDoubles}
                    data={data!}
                  />
                ))}

                {/* Add slot button */}
                {slots.length < MAX_TARGETS && (
                  <button
                    onClick={addSlot}
                    style={{
                      border: '2px dashed #ddd',
                      borderRadius: '10px',
                      background: 'none',
                      cursor: 'pointer',
                      color: '#bbb',
                      fontSize: '14px',
                      fontWeight: 600,
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#e53e3e';
                      (e.currentTarget as HTMLButtonElement).style.color = '#e53e3e';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#ddd';
                      (e.currentTarget as HTMLButtonElement).style.color = '#bbb';
                    }}
                  >
                    <span style={{ fontSize: '24px', lineHeight: 1 }}>+</span>
                    <span>Add target</span>
                  </button>
                )}
              </div>

            </div>

            {/* Results */}
            {activeTargets.length > 0 && (
              <div style={{
                background: '#fff', borderRadius: '12px', padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              }}>
                <PokemonResultsView
                  title={computing ? '⏳ Computing…' : resultLabel}
                  results={results}
                  targetNames={filledNames}
                  targetSpeeds={targetSpeeds}
                  mustOutspeedSpeeds={mustOutspeedSpeeds}
                  championsOnly={championsOnly}
                  data={data!}
                  showPossible={showPossible}
                  onShowPossibleChange={setShowPossible}
                  minAccuracy={minAccuracy}
                  onMinAccuracyChange={setMinAccuracy}
                  weather={weather}
                  onWeatherChange={setWeather}
                  gravity={gravity}
                  onGravityChange={setGravity}
                  terrain={terrain}
                  onTerrainChange={setTerrain}
                  fairyAura={fairyAura}
                  onFairyAuraChange={setFairyAura}
                  isDoubles={isDoubles}
                />
              </div>
            )}

            {activeTargets.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '60px', color: '#aaa' }}>
                <div style={{ fontSize: '64px' }}>🔍</div>
                <p style={{ fontSize: '18px', marginTop: '12px' }}>
                  Search for a Pokémon above to find what can OHKO it
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function heldItemDescription(item: TargetHeldItem, data: GameData): string {
  const parts: string[] = [];
  if (item.defMult > 1 && item.spdMult > 1)
    parts.push(`Boosts Def and Sp. Def by ${Math.round((item.defMult - 1) * 100)}%`);
  else if (item.defMult > 1)
    parts.push(`Boosts Def by ${Math.round((item.defMult - 1) * 100)}%`);
  else if (item.spdMult > 1)
    parts.push(`Boosts Sp. Def by ${Math.round((item.spdMult - 1) * 100)}% (special moves only)`);
  if (item.accuracyMult < 1)
    parts.push(`Reduces incoming move accuracy by ${Math.round((1 - item.accuracyMult) * 100)}%`);
  for (const r of item.typeResists) {
    const typeName = data.typeNames.get(r.typeId) ?? 'unknown';
    parts.push(`Halves damage from ${typeName}-type moves`);
  }
  return parts.join(' · ');
}

// Group TARGET_HELD_ITEMS into categories for the dropdown
const HELD_ITEM_GROUPS: { label: string; items: typeof TARGET_HELD_ITEMS }[] = [
  {
    label: 'Stat Boosts',
    items: TARGET_HELD_ITEMS.filter(i => i.defMult > 1 || i.spdMult > 1),
  },
  {
    label: 'Accuracy Reduction',
    items: TARGET_HELD_ITEMS.filter(i => i.accuracyMult < 1),
  },
  {
    label: 'Type-Resist Berries',
    items: TARGET_HELD_ITEMS.filter(i => i.typeResists.length > 0),
  },
];

function TargetPanel({ label, pokemon, selected, evs, mustOutspeed, heldItem, reflect, lightScreen, nature, tailwind, onTailwindChange, friendGuard, onFriendGuardChange, isDoubles, onSelect, onRemove, onEvsChange, onMustOutspeedChange, onHeldItemChange, onReflectChange, onLightScreenChange, onNatureChange, data }: {
  label: string;
  pokemon: Pokemon[];
  selected: Pokemon | null;
  evs: EVSpread;
  mustOutspeed: boolean;
  heldItem: TargetHeldItem | null;
  reflect: boolean;
  lightScreen: boolean;
  nature: string;
  tailwind: boolean;
  onTailwindChange: (v: boolean) => void;
  friendGuard: boolean;
  onFriendGuardChange: (v: boolean) => void;
  isDoubles: boolean;
  onSelect: (p: Pokemon) => void;
  onRemove?: () => void;
  onEvsChange: (evs: EVSpread) => void;
  onMustOutspeedChange: (v: boolean) => void;
  onHeldItemChange: (item: TargetHeldItem | null) => void;
  onReflectChange: (v: boolean) => void;
  onLightScreenChange: (v: boolean) => void;
  onNatureChange: (n: string) => void;
  data: GameData;
}) {
  const hp  = selected ? calcHP(selected.stats.hp, evs.hp) : 0;
  const atk = selected ? calcStat(selected.stats.atk, evs.atk, 31, 50, getNatureMult(nature, 'atk')) : 0;
  const def = selected ? calcStat(selected.stats.def, evs.def, 31, 50, getNatureMult(nature, 'def')) : 0;
  const spd = selected ? calcStat(selected.stats.spd, evs.spd, 31, 50, getNatureMult(nature, 'spd')) : 0;
  const baseSpe = selected ? calcStat(selected.stats.spe, evs.spe, 31, 50, getNatureMult(nature, 'spe')) : 0;
  const spe = tailwind ? baseSpe * 2 : baseSpe;

  return (
    <div style={{
      border: '1px solid #eee',
      borderRadius: '10px',
      padding: '14px',
      background: '#fafafa',
      position: 'relative',
    }}>
      {/* Remove slot button */}
      {onRemove && (
        <button
          onClick={onRemove}
          title="Remove this target"
          style={{
            position: 'absolute', top: '8px', right: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#ccc', fontSize: '14px', lineHeight: 1, padding: '2px 4px',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#e53e3e')}
          onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
        >✕</button>
      )}

      <label style={labelStyle}>{label}</label>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <PokemonSearch pokemon={pokemon} onSelect={onSelect} />
      </div>

      {selected && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <img
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selected.id}.png`}
              alt={selected.name} width={48} height={48}
              style={{ imageRendering: 'pixelated' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{selected.name}</div>
              <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                {selected.typeIds.map(tid => (
                  <TypeBadge key={tid} typeName={data.typeNames.get(tid) ?? '?'} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', columnGap: '6px', rowGap: '10px', flexWrap: 'wrap', marginBottom: '8px', fontSize: '11px' }}>
            <StatPill label="HP" base={selected.stats.hp} computed={hp} tooltip={
              <div>
                <div style={{ fontWeight: 700, marginBottom: '5px' }}>HP Stat at Lv. 50</div>
                <div style={{ color: '#ccc', marginBottom: '4px', fontSize: '11px' }}>Base: {selected.stats.hp} · EVs: {evs.hp} · IVs: 31</div>
                <div style={{ color: '#68d391', fontWeight: 700 }}>→ {hp} HP</div>
              </div>
            } />
            {(() => {
              const atkNatMult = getNatureMult(nature, 'atk');
              const atkNatLabel = atkNatMult === 1.1 ? '+10% (boosted)' : atkNatMult === 0.9 ? '−10% (reduced)' : 'neutral';
              return (
                <StatPill label="Atk" base={selected.stats.atk} computed={atk} tooltip={
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '5px' }}>Attack Stat at Lv. 50</div>
                    <div style={{ color: '#ccc', marginBottom: '2px', fontSize: '11px' }}>Base: {selected.stats.atk} · EVs: {evs.atk} · IVs: 31</div>
                    <div style={{ color: '#ccc', marginBottom: '4px', fontSize: '11px' }}>Nature: {atkNatLabel}</div>
                    <div style={{ color: '#68d391', fontWeight: 700 }}>→ {atk} Attack</div>
                    <div style={{ color: '#aaa', marginTop: '4px', fontSize: '11px' }}>Used by Foul Play when this Pokémon is the target.</div>
                  </div>
                } />
              );
            })()}
            {(() => {
              const defNatMult = getNatureMult(nature, 'def');
              const defNatLabel = defNatMult === 1.1 ? '+10% (boosted)' : defNatMult === 0.9 ? '−10% (reduced)' : 'neutral';
              return (
                <StatPill label="Def" base={selected.stats.def} computed={def} tooltip={
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '5px' }}>Defense Stat at Lv. 50</div>
                    <div style={{ color: '#ccc', marginBottom: '2px', fontSize: '11px' }}>Base: {selected.stats.def} · EVs: {evs.def} · IVs: 31</div>
                    <div style={{ color: '#ccc', marginBottom: '4px', fontSize: '11px' }}>Nature: {defNatLabel}</div>
                    <div style={{ color: '#68d391', fontWeight: 700 }}>→ {def} Defense</div>
                  </div>
                } />
              );
            })()}
            {(() => {
              const spdNatMult = getNatureMult(nature, 'spd');
              const spdNatLabel = spdNatMult === 1.1 ? '+10% (boosted)' : spdNatMult === 0.9 ? '−10% (reduced)' : 'neutral';
              return (
                <StatPill label="SpD" base={selected.stats.spd} computed={spd} tooltip={
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '5px' }}>Sp. Defense Stat at Lv. 50</div>
                    <div style={{ color: '#ccc', marginBottom: '2px', fontSize: '11px' }}>Base: {selected.stats.spd} · EVs: {evs.spd} · IVs: 31</div>
                    <div style={{ color: '#ccc', marginBottom: '4px', fontSize: '11px' }}>Nature: {spdNatLabel}</div>
                    <div style={{ color: '#68d391', fontWeight: 700 }}>→ {spd} Sp. Defense</div>
                  </div>
                } />
              );
            })()}
            {(() => {
              const speNatMult = getNatureMult(nature, 'spe');
              const speNatLabel = speNatMult === 1.1 ? '+10% (boosted)' : speNatMult === 0.9 ? '−10% (reduced)' : 'neutral';
              return (
                <StatPill label="Spe" base={selected.stats.spe} computed={spe} tooltip={
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '5px' }}>Speed Stat at Lv. 50</div>
                    <div style={{ color: '#ccc', marginBottom: '2px', fontSize: '11px' }}>Base: {selected.stats.spe} · EVs: {evs.spe} · IVs: 31</div>
                    <div style={{ color: '#ccc', marginBottom: '2px', fontSize: '11px' }}>Nature: {speNatLabel}</div>
                    {tailwind ? (
                      <>
                        <div style={{ color: '#ccc', marginBottom: '4px', fontSize: '11px' }}>Tailwind: ×2</div>
                        <div style={{ color: '#68d391', fontWeight: 700 }}>→ {baseSpe} Speed · ×2 = {spe} effective</div>
                      </>
                    ) : (
                      <div style={{ color: '#68d391', fontWeight: 700 }}>→ {spe} Speed</div>
                    )}
                  </div>
                } />
              );
            })()}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <EVInput label="HP EVs"  value={evs.hp}  onChange={v => onEvsChange({ ...evs, hp: v })} />
            <EVInput label="Atk EVs" value={evs.atk} onChange={v => onEvsChange({ ...evs, atk: v })} />
            <EVInput label="Def EVs" value={evs.def} onChange={v => onEvsChange({ ...evs, def: v })} />
            <EVInput label="SpD EVs" value={evs.spd} onChange={v => onEvsChange({ ...evs, spd: v })} />
            <EVInput label="Spe EVs" value={evs.spe} onChange={v => onEvsChange({ ...evs, spe: v })} />
          </div>

          {/* Nature */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Nature
            </div>
            <select
              value={nature}
              onChange={e => onNatureChange(e.target.value)}
              style={{
                width: '100%', padding: '4px 6px', border: '1px solid #ddd',
                borderRadius: '5px', fontSize: '12px', background: '#fff',
                color: nature === 'Neutral' ? '#aaa' : '#333', cursor: 'pointer',
              }}
            >
              <option value="Neutral">Neutral (Hardy / Docile / Serious / Bashful / Quirky)</option>
              {NATURE_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.natures.map(n => (
                    <option key={n.name} value={n.name}>
                      {n.name}{n.plus && n.minus ? ` (+${STAT_LABELS[n.plus]}, −${STAT_LABELS[n.minus]})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginTop: '10px', cursor: 'pointer', fontSize: '12px',
            color: mustOutspeed ? '#2b6cb0' : '#666',
            fontWeight: mustOutspeed ? 700 : 400,
          }}>
            <input
              type="checkbox"
              checked={mustOutspeed}
              onChange={e => onMustOutspeedChange(e.target.checked)}
            />
            Must outspeed {selected.name}
          </label>

          {/* ── Additional Settings (collapsible) ── */}
          <AdditionalSettings
            heldItem={heldItem}
            onHeldItemChange={onHeldItemChange}
            reflect={reflect}
            onReflectChange={onReflectChange}
            lightScreen={lightScreen}
            onLightScreenChange={onLightScreenChange}
            tailwind={tailwind}
            onTailwindChange={onTailwindChange}
            friendGuard={friendGuard}
            onFriendGuardChange={onFriendGuardChange}
            isDoubles={isDoubles}
            data={data}
            selected={selected}
          />
        </div>
      )}
    </div>
  );
}

function AdditionalSettings({
  heldItem, onHeldItemChange,
  reflect, onReflectChange,
  lightScreen, onLightScreenChange,
  tailwind, onTailwindChange,
  friendGuard, onFriendGuardChange,
  isDoubles, data, selected,
}: {
  heldItem: TargetHeldItem | null;
  onHeldItemChange: (item: TargetHeldItem | null) => void;
  reflect: boolean;
  onReflectChange: (v: boolean) => void;
  lightScreen: boolean;
  onLightScreenChange: (v: boolean) => void;
  tailwind: boolean;
  onTailwindChange: (v: boolean) => void;
  friendGuard: boolean;
  onFriendGuardChange: (v: boolean) => void;
  isDoubles: boolean;
  data: GameData;
  selected: Pokemon;
}) {
  const [open, setOpen] = useState(false);

  const activeCount =
    (heldItem ? 1 : 0) +
    (reflect ? 1 : 0) +
    (lightScreen ? 1 : 0) +
    (tailwind ? 1 : 0) +
    (friendGuard && isDoubles ? 1 : 0);

  return (
    <div style={{ marginTop: '10px' }}>
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: open ? '#f0f7ff' : '#f7f7f7',
          border: `1px solid ${open ? '#90cdf4' : '#e2e8f0'}`,
          borderRadius: open ? '6px 6px 0 0' : '6px',
          padding: '5px 10px', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: open ? '#2b6cb0' : '#888' }}>
            Additional Modifiers
          </span>
          {activeCount > 0 && (
            <span style={{
              background: '#2b6cb0', color: '#fff',
              borderRadius: '999px', fontSize: '10px', fontWeight: 700,
              padding: '1px 6px', lineHeight: 1.4,
            }}>{activeCount}</span>
          )}
        </div>
        <span style={{ fontSize: '10px', color: '#aaa', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
      </button>

      {/* Collapsible body */}
      {open && (
        <div style={{
          border: '1px solid #90cdf4', borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          padding: '10px',
          background: '#f8fbff',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          {/* Held item */}
          <div>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Held Item
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {heldItem && (
                <Tooltip content={heldItemDescription(heldItem, data)} maxWidth={220}>
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${heldItem.identifier}.png`}
                    alt={heldItem.name} width={20} height={20}
                    style={{ imageRendering: 'pixelated', flexShrink: 0, cursor: 'help' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </Tooltip>
              )}
              <select
                value={heldItem?.identifier ?? ''}
                onChange={e => {
                  const found = TARGET_HELD_ITEMS.find(i => i.identifier === e.target.value);
                  onHeldItemChange(found ?? null);
                }}
                style={{
                  flex: 1, padding: '4px 6px', border: '1px solid #ddd',
                  borderRadius: '5px', fontSize: '12px', background: '#fff',
                  color: heldItem ? '#333' : '#aaa', cursor: 'pointer',
                }}
              >
                <option value="">None</option>
                {HELD_ITEM_GROUPS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map(item => (
                      <option key={item.identifier} value={item.identifier}>
                        {item.name}{item.typeResists.length > 0 ? ` (${data.typeNames.get(item.typeResists[0].typeId) ?? ''})` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Screens */}
          <div>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Screens
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {([
                { key: 'reflect',     label: '🛡 Reflect',      active: reflect,      onChange: onReflectChange,     activeColor: '#e53e3e', tooltip: 'Reflect reduces physical damage taken — ×0.5 in singles, ×2/3 in doubles.' },
                { key: 'lightScreen', label: '✨ Light Screen', active: lightScreen,  onChange: onLightScreenChange, activeColor: '#d69e2e', tooltip: 'Light Screen reduces special damage taken — ×0.5 in singles, ×2/3 in doubles.' },
              ] as const).map(({ key, label, active, onChange, activeColor, tooltip }) => (
                <Tooltip key={key} content={tooltip} side="bottom" maxWidth={220}>
                  <button
                    onClick={() => onChange(!active)}
                    style={{
                      flex: 1, fontSize: '11px', fontWeight: 700, padding: '4px 6px',
                      border: `1px solid ${active ? activeColor : '#ddd'}`,
                      borderRadius: '5px', cursor: 'pointer',
                      background: active ? activeColor : '#fff',
                      color: active ? '#fff' : '#888',
                      transition: 'all 0.15s',
                    }}
                  >{label}</button>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Speed modifiers */}
          <div>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Modifiers
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Tooltip content={`Tailwind doubles ${selected.name}'s Speed for 4 turns. Outspeed comparisons and speed chips use the doubled value.`} side="bottom" maxWidth={230}>
                <button
                  onClick={() => onTailwindChange(!tailwind)}
                  style={{
                    flex: 1, fontSize: '11px', fontWeight: 700, padding: '4px 6px',
                    border: `1px solid ${tailwind ? '#2b6cb0' : '#ddd'}`,
                    borderRadius: '5px', cursor: 'pointer',
                    background: tailwind ? '#ebf8ff' : '#fff',
                    color: tailwind ? '#2b6cb0' : '#888',
                    transition: 'all 0.15s',
                  }}
                >💨 Tailwind</button>
              </Tooltip>
              <Tooltip
                content={isDoubles
                  ? `Friend Guard — an adjacent ally reduces all damage ${selected.name} takes by ×0.75 (25% reduction).`
                  : 'Friend Guard only applies in doubles battles.'}
                side="bottom" maxWidth={230}
              >
                <button
                  onClick={() => isDoubles && onFriendGuardChange(!friendGuard)}
                  style={{
                    flex: 1, fontSize: '11px', fontWeight: 700, padding: '4px 6px',
                    border: `1px solid ${friendGuard && isDoubles ? '#276749' : '#ddd'}`,
                    borderRadius: '5px', cursor: isDoubles ? 'pointer' : 'not-allowed',
                    background: friendGuard && isDoubles ? '#c6f6d5' : '#fff',
                    color: friendGuard && isDoubles ? '#276749' : '#bbb',
                    transition: 'all 0.15s',
                    opacity: isDoubles ? 1 : 0.4,
                  }}
                >🛡 Friend Guard</button>
              </Tooltip>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EVInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>{label}</div>
      <input
        type="number" min={0} max={252} step={4} value={value}
        onChange={e => onChange(Math.min(252, Math.max(0, Number(e.target.value))))}
        style={{ width: '62px', padding: '4px 6px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '12px', background: '#fff' }}
      />
    </div>
  );
}

function StatPill({ label, base, computed, tooltip }: { label: string; base: number; computed?: number; tooltip?: React.ReactNode }) {
  const pill = (
    <span style={{ background: '#efefef', borderRadius: '5px', padding: '2px 6px', fontWeight: 600, cursor: tooltip ? 'help' : 'default' }}>
      {label}: {base}
      {computed !== undefined && <span style={{ color: '#999' }}> ({computed})</span>}
    </span>
  );
  return tooltip ? <Tooltip content={tooltip} side="bottom" maxWidth={220}>{pill}</Tooltip> : pill;
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.05em', color: '#888', marginBottom: '6px',
};
