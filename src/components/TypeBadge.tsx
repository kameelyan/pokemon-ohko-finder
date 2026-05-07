const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
  stellar: '#40B5A5',
  shadow: '#604060',
};

interface Props {
  typeName: string;
}

export default function TypeBadge({ typeName }: Props) {
  const color = TYPE_COLORS[typeName.toLowerCase()] ?? '#888';
  return (
    <span
      style={{
        backgroundColor: color,
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        display: 'inline-block',
      }}
    >
      {typeName}
    </span>
  );
}
