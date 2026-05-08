import { useEffect, useRef, useState, useMemo } from 'react';
import { loadGameData } from './data/loader';
import type { GameData, Pokemon } from './data/types';
import { findPokemonOHKOs, calcHP, calcStat, TARGET_HELD_ITEMS } from './calc/damage';
import type { PokemonOHKOResult, EVSpread, TargetConfig, TargetHeldItem, Weather } from './calc/damage';
import PokemonSearch from './components/PokemonSearch';
import PokemonResultsView from './components/PokemonResultsView';
import ReleaseNotes from './components/ReleaseNotes';
import TypeBadge from './components/TypeBadge';
import Tooltip from './components/Tooltip';
import { APP_VERSION } from './version';

const DEFAULT_EVS: EVSpread = { hp: 0, def: 0, spd: 0, spe: 0 };
const MAX_TARGETS = 6;
const STORAGE_KEY = 'ohko-finder-slots';

interface TargetSlot {
  id: number;           // stable key for React
  pokemon: Pokemon | null;
  evs: EVSpread;
  mustOutspeed: boolean;
  heldItem: TargetHeldItem | null;
}

/** Shape written to / read from localStorage (no full Pokemon object). */
interface SavedSlot {
  pokemonId: number | null;
  evs: EVSpread;
  mustOutspeed?: boolean;
  heldItemIdentifier?: string;
}

let nextId = 1;
function makeSlot(): TargetSlot {
  return { id: nextId++, pokemon: null, evs: { ...DEFAULT_EVS }, mustOutspeed: false, heldItem: null };
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
    .map(s => ({ pokemon: s.pokemon!, evs: s.evs, heldItem: s.heldItem ?? undefined }));

  // EV-invested L50 speed for each active target
  const targetSpeeds: number[] = activeTargets.map(t => calcStat(t.pokemon.stats.spe, t.evs.spe));

  // Speeds of targets with mustOutspeed checked (passed to results view for filtering)
  const mustOutspeedSpeeds: number[] = slots
    .filter(s => s.pokemon !== null && s.mustOutspeed)
    .map(s => calcStat(s.pokemon!.stats.spe, s.evs.spe));

  useEffect(() => {
    if (!data || activeTargets.length === 0) { setResults([]); return; }
    setComputing(true);
    setTimeout(() => {
      setResults(findPokemonOHKOs(activeTargets, data, showPossible, minAccuracy, weather));
      setComputing(false);
    }, 10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, slots, showPossible, minAccuracy, weather]);

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
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>⚔ Pokémon OHKO Finder</h1>
            <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '15px' }}>
              Find every Pokémon that can one-hit KO your targets in competitive play (Level 50)
            </p>
          </div>
          <span style={{ opacity: 0.6, fontSize: '12px', fontWeight: 600, paddingTop: '4px' }}>
            v{APP_VERSION}
          </span>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '20px' }}>
          {([
            ['finder', '⚔ OHKO Finder'],
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
                </div>

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

              {/* Target grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
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
                    onSelect={p => updateSlot(slot.id, { pokemon: p, evs: { ...DEFAULT_EVS } })}
                    onRemove={slots.length > 1 ? () => removeSlot(slot.id) : undefined}
                    onEvsChange={evs => updateSlot(slot.id, { evs })}
                    onMustOutspeedChange={v => updateSlot(slot.id, { mustOutspeed: v })}
                    onHeldItemChange={item => updateSlot(slot.id, { heldItem: item })}
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
                <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>
                  {computing ? '⏳ Computing…' : resultLabel}
                </h2>
                <PokemonResultsView
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

function TargetPanel({ label, pokemon, selected, evs, mustOutspeed, heldItem, onSelect, onRemove, onEvsChange, onMustOutspeedChange, onHeldItemChange, data }: {
  label: string;
  pokemon: Pokemon[];
  selected: Pokemon | null;
  evs: EVSpread;
  mustOutspeed: boolean;
  heldItem: TargetHeldItem | null;
  onSelect: (p: Pokemon) => void;
  onRemove?: () => void;
  onEvsChange: (evs: EVSpread) => void;
  onMustOutspeedChange: (v: boolean) => void;
  onHeldItemChange: (item: TargetHeldItem | null) => void;
  data: GameData;
}) {
  const hp  = selected ? calcHP(selected.stats.hp, evs.hp) : 0;
  const def = selected ? calcStat(selected.stats.def, evs.def) : 0;
  const spd = selected ? calcStat(selected.stats.spd, evs.spd) : 0;
  const spe = selected ? calcStat(selected.stats.spe, evs.spe) : 0;

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

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', fontSize: '11px' }}>
            <StatPill label="HP" base={selected.stats.hp} computed={hp} />
            <StatPill label="Def" base={selected.stats.def} computed={def} />
            <StatPill label="SpD" base={selected.stats.spd} computed={spd} />
            <StatPill label="Spe" base={selected.stats.spe} computed={spe} />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <EVInput label="HP EVs"  value={evs.hp}  onChange={v => onEvsChange({ ...evs, hp: v })} />
            <EVInput label="Def EVs" value={evs.def} onChange={v => onEvsChange({ ...evs, def: v })} />
            <EVInput label="SpD EVs" value={evs.spd} onChange={v => onEvsChange({ ...evs, spd: v })} />
            <EVInput label="Spe EVs" value={evs.spe} onChange={v => onEvsChange({ ...evs, spe: v })} />
          </div>

          {/* Held item */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Held Item
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {heldItem && (
                <Tooltip content={heldItemDescription(heldItem, data)} maxWidth={220}>
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${heldItem.identifier}.png`}
                    alt={heldItem.name}
                    width={20} height={20}
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

function StatPill({ label, base, computed }: { label: string; base: number; computed?: number }) {
  return (
    <span style={{ background: '#efefef', borderRadius: '5px', padding: '2px 6px', fontWeight: 600 }}>
      {label}: {base}
      {computed !== undefined && <span style={{ color: '#999' }}> ({computed})</span>}
    </span>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.05em', color: '#888', marginBottom: '6px',
};
