import { useState, useMemo } from 'react';
import type { Pokemon } from '../data/types';

interface Props {
  pokemon: Pokemon[];
  onSelect: (p: Pokemon) => void;
  placeholder?: string;
}

export default function PokemonSearch({ pokemon, onSelect, placeholder = 'Search Pokémon...' }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return pokemon
      .filter(p => p.name.toLowerCase().includes(q) || p.identifier.includes(q))
      .slice(0, 16);
  }, [query, pokemon]);

  const handleSelect = (p: Pokemon) => {
    setQuery(p.name);
    setOpen(false);
    onSelect(p);
  };

  return (
    <div style={{ position: 'relative', width: '280px' }}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '9px 12px',
          fontSize: '15px',
          borderRadius: '8px',
          border: '2px solid #ddd',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {open && filtered.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#fff',
          border: '2px solid #ddd',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          zIndex: 200,
          maxHeight: '320px',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        }}>
          {filtered.map(p => (
            <li
              key={p.id}
              onMouseDown={() => handleSelect(p)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderLeft: !p.isDefault ? '3px solid #a78bfa' : '3px solid transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                alt={p.name}
                width={30}
                height={30}
                style={{ imageRendering: 'pixelated', flexShrink: 0 }}
                onError={e => {
                  const img = e.target as HTMLImageElement;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = '1';
                    img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
                  } else {
                    img.style.display = 'none';
                  }
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', lineHeight: 1.2 }}>{p.name}</div>
                {!p.isDefault && (
                  <div style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 600 }}>Alternate form</div>
                )}
              </div>
              <span style={{ color: '#bbb', fontSize: '11px', marginLeft: 'auto', flexShrink: 0 }}>
                #{String(p.speciesId).padStart(4, '0')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
