const releases: {
  version: string;
  date: string;
  title: string;
  sections: { heading: string; items: string[] }[];
}[] = [
  {
    version: '1.4.0',
    date: 'May 2026',
    title: 'Target Speed EVs',
    sections: [
      {
        heading: '⚡ Speed EVs on Target Pokémon',
        items: [
          'Each target Pokémon panel now has a "Spe EVs" input alongside HP, Def, and SpD EVs.',
          'The Speed stat pill in the panel updates live as you type to reflect the invested speed.',
          'Outspeed comparisons throughout the results — the ▲/▼ indicator, the speed tooltip, and the "Must outspeed" filter — all now use the EV-adjusted speed instead of assuming 0 EVs.',
          'Existing saved targets load cleanly, defaulting Speed EVs to 0.',
        ],
      },
    ],
  },
  {
    version: '1.3.0',
    date: 'May 2026',
    title: 'Ability Modifiers, Weather, Sorting & UI Polish',
    sections: [
      {
        heading: '⚡ Ability Modifiers',
        items: [
          'Damage calculations now account for 14 damage-boosting abilities: Technician, Iron Fist, Strong Jaw, Mega Launcher, Tough Claws, Punk Rock, Sheer Force, Adaptability, Steelworker, Transistor, Dragon\'s Maw, Hustle, and the Normalise family (Pixilate, Refrigerate, Aerilate, Galvanize).',
          'When an ability is required to achieve the OHKO, an amber "★ AbilityName" chip appears on the move row — hover it to see the exact ability and whether it\'s a Hidden Ability.',
        ],
      },
      {
        heading: '🌤 Weather',
        items: [
          'Weather conditions — Sun, Rain, Sand, and Snow — are now factored into damage calculations.',
          'Sun boosts Fire-type moves by ×1.5; Rain boosts Water-type moves by ×1.5. Solar Power activates under Sun, and Sand Force activates under Sand for Rock, Ground, and Steel moves.',
          'A weather chip (e.g. ☀️ Sun) appears on a move row when that weather is required for the OHKO.',
          'A Weather selector has been added to the Filters panel. Set the current weather to see how it affects which Pokémon can land the KO.',
          'A "✕ Clear filters" button appears to the left of the Filters dropdown whenever any filters are active, for quick one-click reset.',
        ],
      },
      {
        heading: '🔢 Sorting',
        items: [
          'Results can now be sorted by Base Stat Total, Name, Speed, Attack, Sp. Attack, Defense, Sp. Defense, or HP.',
          'Toggle between ascending (↑) and descending (↓) order with the direction button next to the sort dropdown.',
          'Defaults to Base Stat Total descending — strongest Pokémon first.',
        ],
      },
      {
        heading: '🎛 UI Polish',
        items: [
          'Expanded result rows no longer collapse when filters are added or removed.',
          'The BST chip has moved to the far left of each result row for quicker scanning.',
          'Ability chips have moved to the second row of each result card, on the left side.',
          'Move category icons are now properly centred in their table column.',
        ],
      },
    ],
  },
  {
    version: '1.2.0',
    date: 'May 2026',
    title: 'Move Flags, Target Items & Accuracy Fix',
    sections: [
      {
        heading: '🏷 Move Flags',
        items: [
          'Each move in the results table now shows small colour-coded badges for notable properties: Contact, Punch, Sound, Powder, Bite, Pulse, Ballistic, and Dance.',
          'Hover any badge to see a tooltip explaining what it interacts with in battle — for example Contact warns about Rocky Helmet and Rough Skin, while Sound notes Soundproof immunity.',
          'Priority moves show a green "+1" or "+2" chip (red for negative priority) so you can immediately see which moves go before or after normal attacks.',
        ],
      },
      {
        heading: '🔍 Move Flags Filter',
        items: [
          'A new "Move Flags" dropdown has been added to the Filters panel alongside Move Category.',
          'All flags are checked by default (no filtering). Uncheck a flag — say, Contact — to hide any Pokémon that can only OHKO via moves of that type, so you can find attackers that won\'t trigger Rocky Helmet or Rough Skin.',
          'The dropdown uses a clean grid layout: checkboxes, flag chips, and descriptions all line up in their own columns.',
        ],
      },
      {
        heading: '🎒 Target Held Items',
        items: [
          'Each target Pokémon panel now has a Held Item dropdown that appears once a Pokémon is selected.',
          'Items are grouped into three categories: Stat Boosts (Eviolite, Assault Vest), Accuracy Reduction (Bright Powder, Lax Incense), and Type-Resist Berries (all 18, e.g. Occa Berry for Fire).',
          'Type-resist berries show their type name in the dropdown — "Occa Berry (Fire)" — so you don\'t need to remember which berry covers which type.',
          'Hover the item icon to see a tooltip describing exactly what the item does — e.g. "Boosts Sp. Def by 50% (special moves only)" for Assault Vest.',
          'All item effects are factored into the OHKO calculations: stat boosts raise the effective Defence or Sp. Defence, accuracy-reducing items lower the chance a move lands, and berries halve damage from the matching type.',
          'Your chosen item is saved and restored automatically with the rest of your target settings.',
        ],
      },
      {
        heading: '🎯 Accuracy Filter (Bug Fix)',
        items: [
          'The accuracy filter was previously a slider, which caused the filter panel to close unexpectedly when tapped on mobile.',
          'It has been replaced with a button group — Any / 50% / 70% / 80% / 90% / 100% — matching the style of the other filters and working reliably on touch screens.',
        ],
      },
    ],
  },
  {
    version: '1.1.0',
    date: 'May 2026',
    title: 'Filters, Held Items, Trick Room & Champions',
    sections: [
      {
        heading: '🎒 Held Items',
        items: [
          'The damage calculator now accounts for type-boosting held items (like Charcoal for Fire moves or Mystic Water for Water moves), each of which boost damage by 20%.',
          'A held item is only ever suggested when no amount of EV investment (0–252) can achieve the OHKO on its own. If maxing out EVs is enough, no item will be shown.',
          "If a Pokémon genuinely needs a held item to land the KO, the item's icon appears next to the move name in the results. If no item is needed, nothing is shown.",
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
