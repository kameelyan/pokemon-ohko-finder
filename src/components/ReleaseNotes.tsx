const releases: {
  version: string;
  date: string;
  title: string;
  sections: { heading: string; items: string[] }[];
}[] = [
  {
    version: '1.1.0',
    date: 'May 2026',
    title: 'Filters, Held Items, Trick Room & Champions',
    sections: [
      {
        heading: '🎒 Held Items',
        items: [
          'The damage calculator now accounts for type-boosting held items (like Charcoal for Fire moves or Mystic Water for Water moves), each of which boost damage by 20%.',
          "If a Pokémon can only land the KO with a held item's help, the item's icon appears next to the move name in the results. If no item is needed, nothing is shown.",
          'You can filter results to only show Pokémon that don\'t need a held item using the new "No held item required" checkbox in Filters.',
        ],
      },
      {
        heading: '🔍 Filter Panel',
        items: [
          'A collapsible Filters panel now appears above the results. Click "Filters" to expand it.',
          'Filter by Pokémon type — click one or more type badges to only show Pokémon of those types.',
          'Set a minimum or maximum Speed stat to focus on fast or slow Pokémon.',
          'Filter by move category — Physical only, Special only, or both.',
          '"No EV investment required" shows only Pokémon that can land the KO without putting any effort into Attack or Sp. Atk.',
          '"Default forms only" hides alternate forms like Mega Evolutions and regional variants.',
          'Active filters are counted on the Filters button badge. "Clear all filters" resets everything at once.',
        ],
      },
      {
        heading: '🎯 Minimum Accuracy',
        items: [
          'The accuracy slider has moved into the Filters panel where it fits more naturally.',
          'Slide it up to exclude moves with poor accuracy from the results entirely — e.g. set to 85% to hide moves like Focus Blast.',
        ],
      },
      {
        heading: '🔮 Trick Room',
        items: [
          'A Trick Room toggle has been added to the Filters panel, inside the Outspeed section.',
          'When Trick Room is on, slower Pokémon are treated as going first. All speed comparisons — including the outspeed filter and the speed indicator on each result — flip accordingly.',
          'The speed tooltip on each result now clearly names which Pokémon goes first, rather than just saying "faster" or "slower".',
        ],
      },
      {
        heading: '⚡ Must Outspeed',
        items: [
          'Each target Pokémon panel now has a "Must outspeed [Name]" checkbox.',
          'Tick it to filter results to only show Pokémon that move before that target in battle.',
          'Works with Trick Room — when enabled, "outspeed" means being slower.',
          'Multiple targets can have this checked at the same time.',
        ],
      },
      {
        heading: '🏆 Pokémon Champions Mode',
        items: [
          'A Pokémon Champions toggle now sits at the top of the page, above the target inputs. It\'s on by default since Champions is the current competitive format.',
          'When on, the search dropdowns only show Pokémon that are in the Champions roster — so you can\'t accidentally add a Pokémon that isn\'t legal. Results are filtered to the same set.',
          'Toggle it off at any time to search the full Pokédex.',
          'The roster (184 species) is sourced directly from the PokéAPI database.',
        ],
      },
      {
        heading: '🎛 Other Improvements',
        items: [
          '"Show possible OHKOs" has moved from the target area into the Filters panel, where it fits alongside the other result options.',
          'Turning on possible OHKOs now counts toward the active filter badge, and is reset by "Clear all filters".',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    date: 'April 2026',
    title: 'Initial Release',
    sections: [
      {
        heading: '⚔ Core Features',
        items: [
          'Search for up to 6 target Pokémon and instantly see every Pokémon in the game that can one-hit KO them.',
          'Results are split into "guaranteed" KOs (works even on the lowest damage roll) and "possible" KOs (needs a lucky hit).',
          'All calculations are done at Level 50, matching competitive VGC rules.',
          'Set HP, Defense, and Sp. Defense EVs on each target to simulate bulkier sets.',
          'Each result shows the move, its power, type, accuracy, damage range, percentage of HP dealt, and how many Attack/Sp. Atk EVs the attacker needs.',
        ],
      },
      {
        heading: '🧬 Pokémon Info',
        items: [
          'Hover a Pokémon\'s name in the results to see its full base stat spread.',
          'Each result shows the Pokémon\'s abilities with descriptions on hover, including Hidden Abilities.',
          'Speed is shown with an indicator (▲/▼) comparing it to your target Pokémon.',
          'Moves that hit multiple of your targets are highlighted with a special badge.',
        ],
      },
      {
        heading: '💾 Quality of Life',
        items: [
          'Your selected targets are automatically saved and restored when you revisit the page.',
          'Expand or collapse individual results, or use "Expand all" / "Collapse all" buttons.',
          'Move names show a description tooltip on hover.',
        ],
      },
    ],
  },
];

export default function ReleaseNotes() {
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      {releases.map((release, ri) => (
        <div
          key={release.version}
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '28px 32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            marginBottom: ri < releases.length - 1 ? '24px' : 0,
          }}
        >
          {/* Version header */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{
              background: ri === 0 ? '#e53e3e' : '#718096',
              color: '#fff',
              fontWeight: 800,
              fontSize: '13px',
              borderRadius: '6px',
              padding: '2px 10px',
              letterSpacing: '0.03em',
            }}>
              v{release.version}
            </span>
            {ri === 0 && (
              <span style={{
                background: '#c6f6d5', color: '#276749',
                fontSize: '11px', fontWeight: 700,
                borderRadius: '4px', padding: '1px 8px',
              }}>
                Latest
              </span>
            )}
            <span style={{ fontSize: '13px', color: '#aaa' }}>{release.date}</span>
          </div>

          <h2 style={{ margin: '4px 0 20px', fontSize: '20px', fontWeight: 800, color: '#1a202c' }}>
            {release.title}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {release.sections.map(section => (
              <div key={section.heading}>
                <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#2d3748' }}>
                  {section.heading}
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {section.items.map((item, i) => (
                    <li key={i} style={{ fontSize: '14px', color: '#4a5568', lineHeight: 1.6 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
