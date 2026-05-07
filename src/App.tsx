import { useEffect, useRef, useState, useMemo } from 'react';
import { loadGameData } from './data/loader';
import type { GameData, Pokemon } from './data/types';
import { findPokemonOHKOs, calcHP, calcStat } from './calc/damage';
import type { PokemonOHKOResult, EVSpread, TargetConfig } from './calc/damage';
import PokemonSearch from './components/PokemonSearch';
import PokemonResultsView from './components/PokemonResultsView';
import TypeBadge from './components/TypeBadge';

const DEFAULT_EVS: EVSpread = { hp: 0, def: 0, spd: 0 };
const MAX_TARGETS = 6;
const STORAGE_KEY = 'ohko-finder-slots';

interface TargetSlot {
  id: number;           // stable key for React
  pokemon: Pokemon | null;
  evs: EVSpread;
}

/** Shape written to / read from localStorage (no full Pokemon object). */
interface SavedSlot {
  pokemonId: number | null;
  evs: EVSpread;
}

let nextId = 1;
function makeSlot(): TargetSlot {
  return { id: nextId++, pokemon: null, evs: { ...DEFAULT_EVS } };
}

export default function App() {
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [slots, setSlots] = useState<TargetSlot[]>([makeSlot()]);
  // Gate: don't overwrite localStorage until after we've had a chance to restore
  const restoredRef = useRef(false);

  const [results, setResults] = useState<PokemonOHKOResult[]>([]);
  const [computing, setComputing] = useState(false);
  const [showPossible, setShowPossible] = useState(false);
  const [minAccuracy, setMinAccuracy] = useState(0);

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
            evs: s.evs ?? { ...DEFAULT_EVS },
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

  // Slots with a selected Pokémon
  const activeTargets: TargetConfig[] = slots
    .filter(s => s.pokemon !== null)
    .map(s => ({ pokemon: s.pokemon!, evs: s.evs }));

  // Uninvested L50 speed for each active target (0 EVs, 31 IVs, neutral nature)
  const targetSpeeds: number[] = activeTargets.map(t => calcStat(t.pokemon.stats.spe, 0));

  useEffect(() => {
    if (!data || activeTargets.length === 0) { setResults([]); return; }
    setComputing(true);
    setTimeout(() => {
      setResults(findPokemonOHKOs(activeTargets, data, showPossible, minAccuracy));
      setComputing(false);
    }, 10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, slots, showPossible, minAccuracy]);

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
        color: '#fff', padding: '24px 32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>⚔ Pokémon OHKO Finder</h1>
        <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '15px' }}>
          Find every Pokémon that can one-hit KO your targets in competitive play (Level 50)
        </p>
      </header>

      <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '32px 24px' }}>
        {loading ? (
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
                    pokemon={pokemonList}
                    selected={slot.pokemon}
                    evs={slot.evs}
                    onSelect={p => updateSlot(slot.id, { pokemon: p, evs: { ...DEFAULT_EVS } })}
                    onClear={() => updateSlot(slot.id, { pokemon: null, evs: { ...DEFAULT_EVS } })}
                    onRemove={slots.length > 1 ? () => removeSlot(slot.id) : undefined}
                    onEvsChange={evs => updateSlot(slot.id, { evs })}
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

              {/* Options row */}
              <div style={{
                borderTop: '1px solid #f0f0f0',
                paddingTop: '16px',
                display: 'flex',
                gap: '32px',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input type="checkbox" checked={showPossible} onChange={e => setShowPossible(e.target.checked)} />
                  Show possible OHKOs (not just guaranteed)
                </label>

                <div>
                  <div style={{ fontSize: '14px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>Min. accuracy</span>
                    <span style={{
                      fontWeight: 700, fontSize: '15px', minWidth: '44px',
                      color: minAccuracy === 0 ? '#aaa' : minAccuracy >= 90 ? '#38a169' : '#d69e2e',
                    }}>
                      {minAccuracy === 0 ? 'Any' : `${minAccuracy}%`}
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5} value={minAccuracy}
                    onChange={e => setMinAccuracy(Number(e.target.value))}
                    style={{ width: '180px', accentColor: '#e53e3e', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#bbb', width: '180px' }}>
                    <span>Any</span><span>50%</span><span>100%</span>
                  </div>
                </div>
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
                {!computing && (
                  <PokemonResultsView
                    results={results}
                    targetNames={filledNames}
                    targetSpeeds={targetSpeeds}
                    data={data!}
                    showPossible={showPossible}
                  />
                )}
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

function TargetPanel({ label, pokemon, selected, evs, onSelect, onClear, onRemove, onEvsChange, data }: {
  label: string;
  pokemon: Pokemon[];
  selected: Pokemon | null;
  evs: EVSpread;
  onSelect: (p: Pokemon) => void;
  onClear: () => void;
  onRemove?: () => void;
  onEvsChange: (evs: EVSpread) => void;
  data: GameData;
}) {
  const hp  = selected ? calcHP(selected.stats.hp, evs.hp) : 0;
  const def = selected ? calcStat(selected.stats.def, evs.def) : 0;
  const spd = selected ? calcStat(selected.stats.spd, evs.spd) : 0;
  const spe = selected ? calcStat(selected.stats.spe, 0) : 0;

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
        {selected && (
          <button onClick={onClear} title="Clear Pokémon" style={{
            background: 'none', border: '1px solid #ddd', borderRadius: '6px',
            cursor: 'pointer', padding: '7px 9px', fontSize: '13px', color: '#aaa',
          }}>✕</button>
        )}
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
