const releases: {
  version: string;
  date: string;
  title: string;
  sections: { heading: string; items: string[] }[];
}[] = [
  {
    version: '1.8.1',
    date: 'May 2026',
    title: 'Choice Items',
    sections: [
      {
        heading: '🎽 Choice Items for Attackers',
        items: [
          'Choice Band, Choice Scarf, and Choice Specs can now be selected in the Stat Changes dropdown for the attacker.',
          'Each item applies a ×1.5 multiplier to the relevant stat — Attack, Speed, or Sp. Atk respectively.',
          'Selecting one automatically deselects the others. The active item is highlighted and counted in the dropdown badge.',
          'Choice Band does not apply to Foul Play (uses target\'s Attack) or Body Press (uses attacker\'s Defense).',
          'Item icons from the Pokédex are shown alongside each option, with a tooltip describing the mechanic.',
          'When active, the corresponding Atk, SpA, or Spe chip on each result card shows the boosted effective value and a breakdown line in the tooltip.',
        ],
      },
      {
        heading: '♪ Round',
        items: [
          'Round now correctly accounts for its power-doubling mechanic: if any other Pokémon (ally or opponent) has already used Round that turn, its power doubles from 60 to 120.',
          'The tool first checks whether the base power (60) is enough to OHKO. If not, it checks the doubled power (120).',
          'When the doubled power is required, a purple "♪ Double Power" chip appears on the move row with a tooltip explaining the condition.',
        ],
      },
      {
        heading: '🎽 Choice Scarf for Targets',
        items: [
          'Choice Scarf has been added to the target Pokémon held item dropdown under a new "Speed" category.',
          'When selected, the target\'s Speed is multiplied by ×1.5 in all outspeed comparisons, the speed chip, and the "Must outspeed" filter.',
          'The Spe stat pill in the target panel shows the scarf-adjusted speed in the tooltip and as the effective value in the chip.',
        ],
      },
    ],
  },
  {
    version: '1.8.0',
    date: 'May 2026',
    title: 'Stat Stages, Body Press & Psyshock Support',
    sections: [
      {
        heading: '📈 Target Stat Stages',
        items: [
          'The "Additional Modifiers" section in each target panel now includes Atk, Def, SpD, and Spe stat stage steppers (−6 to +6).',
          'Def and SpD stages are applied directly to damage calculations — a target at +2 Def effectively takes less physical damage, and so on.',
          'Atk stage feeds into Foul Play, which uses the target\'s Attack stat.',
          'Spe stage is factored into all outspeed comparisons, the speed chip, and speed tooltips — so you can model a Choice Scarf or a Speed drop accurately.',
        ],
      },
      {
        heading: '⚔ Attacker Stat Stages',
        items: [
          'A new "Stat Changes" dropdown in the results panel adds Atk, Def, SpA, and Spe stage steppers for the attacker.',
          'Atk stage scales Physical move damage; SpA stage scales Special move damage.',
          'A separate Def stage is provided for Body Press, which deals damage based on the attacker\'s Defense stat rather than Attack.',
          'Spe stage adjusts the attacker\'s effective speed for outspeed comparisons and the speed chip on each result card.',
        ],
      },
      {
        heading: '🥊 Body Press, Psyshock & Variants',
        items: [
          'Body Press is now correctly calculated using the attacker\'s Defense stat (not Attack). A "⬡ Uses Def" chip appears on Body Press rows as a reminder.',
          'Psyshock, Psystrike, and Secret Sword are now correctly calculated against the target\'s Defense stat (not Sp. Def), despite being Special moves. A "⬡ Hits Def" chip appears on these rows.',
          'Light Screen still applies to all three variants — they are Special moves and the screen check follows move category, not the defensive stat used.',
        ],
      },
      {
        heading: '📊 Stat Chip Improvements',
        items: [
          'The Atk and SpA chips on each result card now have the same tooltip treatment as the speed chip: hover to see the base stat, uninvested L50 value, and effective value after any attacker stage modifier.',
          'The speed chip tooltip now includes a stage breakdown line when an attacker Spe stage is active, showing the uninvested L50 speed, the stage multiplier, and the final effective speed.',
          'When a stage is active, the chip also shows the effective value in grey next to the base stat.',
        ],
      },
      {
        heading: '🔄 Reset Additional Modifiers',
        items: [
          'A "✕ Reset" button now appears in the "Additional Modifiers" header whenever any modifier is active on a target.',
          'Clicking it clears the held item, screens, Tailwind, Friend Guard, and all stat stages for that target in one go — no need to undo each setting individually.',
          'The button uses stopPropagation so clicking it doesn\'t accidentally toggle the section open or closed.',
        ],
      },
    ],
  },
  {
    version: '1.7.3',
    date: 'May 2026',
    title: 'EV Input Improvements',
    sections: [
      {
        heading: '🎯 EV Quick-Set & Validation',
        items: [
          'Each EV input now has "min" and "max" text links below it — click to instantly set that stat to 0 or 252.',
          'Total EVs across all five inputs are now validated against the 506 limit. If the total is exceeded, all inputs turn red with a warning message showing the current total.',
        ],
      },
    ],
  },
  {
    version: '1.7.2',
    date: 'May 2026',
    title: 'Mobile Experience Improvements',
    sections: [
      {
        heading: '📱 Mobile Fixes',
        items: [
          'Target Pokémon panels no longer overflow their container on narrow screens — the grid now collapses to a single column on small viewports.',
          'Main page padding scales down on narrow screens so content has more room to breathe.',
          'EV input boxes wrap onto a second row on mobile rather than overflowing the panel.',
          'The results controls bar (search + sort) now wraps cleanly on narrow screens instead of overflowing.',
          'Move tables in expanded results are now horizontally scrollable on mobile, so all columns are reachable without the page overflowing.',
          'The filter panel is now capped at 70% of the viewport height and scrolls independently — no more having to scroll through all results just to reach the bottom of the filters.',
        ],
      },
    ],
  },
  {
    version: '1.7.1',
    date: 'May 2026',
    title: 'Form Filters, Search Polish & Bug Fixes',
    sections: [
      {
        heading: '🎭 Exclude Forms Filter',
        items: [
          'A new "Forms" dropdown in the Filters panel lets you exclude specific form categories from results: Mega Evolutions, Regional Variants, Gigantamax, and Other Alternate Forms.',
          'The dropdown turns red when any forms are excluded, matching the styling of other active filters.',
          'Move Flags dropdown received the same active-state treatment.',
        ],
      },
      {
        heading: '🔍 Search & Sort',
        items: [
          'The search field has moved to the far left of the controls bar, with sort immediately to its right, for a more natural left-to-right flow.',
          'Search field width increased so the placeholder text is no longer clipped.',
        ],
      },
      {
        heading: '🐛 Bug Fix',
        items: [
          'Fixed Foul Play calculations ignoring the target\'s Attack nature. An Adamant Dragapult with 252 Atk EVs now correctly shows 189 Attack (was 172).',
        ],
      },
    ],
  },
  {
    version: '1.7.0',
    date: 'May 2026',
    title: 'Foul Play Support & Global Search',
    sections: [
      {
        heading: '↩ Foul Play',
        items: [
          'Foul Play now correctly uses the target\'s Attack stat in damage calculations rather than the attacker\'s own Attack stat, matching the in-game mechanic.',
          'Each target Pokémon panel now shows an Atk stat chip alongside HP, Def, SpD, and Spe — hover it to see the base stat, EV investment, nature modifier, and computed Lv. 50 value.',
          'An Atk EVs input has been added to the target panel so you can set the exact Attack EVs on the target for accurate Foul Play calculations.',
          'Foul Play move rows in the results display a purple "↩ Atk: X" chip showing the target\'s Attack stat used, with a tooltip explaining the mechanic.',
        ],
      },
      {
        heading: '🔍 Global Search',
        items: [
          'A search field now sits between the sort controls and the Battle Effects dropdown.',
          'Type any Pokémon name or move name to filter results in real time — useful when you\'re looking for a specific attacker or want to check which Pokémon can OHKO with a particular move.',
          'The search works alongside all existing filters — both are applied simultaneously.',
        ],
      },
    ],
  },
  {
    version: '1.6.1',
    date: 'May 2026',
    title: 'Bug Fixes & Polish',
    sections: [
      {
        heading: '🐛 Bug Fixes',
        items: [
          'Mega Pokémon now correctly exclude moves that require a held item — since their held item slot is always occupied by their Mega Stone, those moves are not viable and were misleading.',
          'If all of a Mega Pokémon\'s OHKO paths require a held item, it is now omitted from results entirely rather than shown with an empty move list.',
        ],
      },
      {
        heading: '🎛 UI Polish',
        items: [
          'Terrain "None" option in the Battle Effects dropdown no longer shows a "—" icon, matching the style of Weather\'s "None" option.',
          'A GitHub icon link has been added to the header next to the Ko-fi support button.',
          'The "Additional Settings" collapsible in target panels has been renamed to "Additional Modifiers", and the inner "Speed Modifiers" sub-section is now just "Modifiers" since Friend Guard is not a speed modifier.',
          'Stat chips now have slightly more vertical spacing when they wrap onto multiple lines.',
        ],
      },
    ],
  },
  {
    version: '1.6.0',
    date: 'May 2026',
    title: 'Battle Effects, Per-Target Modifiers & UI Polish',
    sections: [
      {
        heading: '🌀 Battle Effects Dropdown',
        items: [
          'A new "Battle Effects" dropdown sits to the left of the Filters button and consolidates all field-wide conditions in one place.',
          'Weather has moved here from the Filters panel — Sun, Rain, Sand, and Snow are all available.',
          'Four terrain types are now supported: Electric, Grassy, Misty, and Psychic. Each boosts or dampens the relevant move types as per the in-game rules (e.g. Electric Terrain ×1.3 to Electric moves, Grassy Terrain ×0.5 to Earthquake/Magnitude/Bulldoze).',
          'Fairy Aura can be toggled on, applying the ×4/3 damage multiplier to all Fairy-type moves.',
          'Gravity can be toggled on, applying the ×5/3 accuracy boost (capped at 100%) and removing moves that cannot be used under Gravity (Fly, Bounce, Jump Kick, High Jump Kick, Sky Drop).',
          'An inline ✕ inside the Battle Effects button clears all active conditions at once without needing a separate button.',
        ],
      },
      {
        heading: '🎯 Per-Target Modifiers',
        items: [
          'Each target Pokémon panel now has a collapsible "Additional Modifiers" section containing held item, screens, and combat modifiers — keeping the card tidy by default.',
          'Tailwind can be toggled per target. When active, the target\'s effective Speed is doubled — all outspeed comparisons, the speed chip, and tooltip update automatically.',
          'Friend Guard can be toggled per target (doubles only). When active, incoming damage to that target is reduced by ×0.75, reflecting the in-game ally support mechanic.',
        ],
      },
      {
        heading: '💡 Stat Chip Tooltips',
        items: [
          'Hovering any stat chip (HP, Def, SpD, Spe) in a target panel now shows a tooltip explaining both numbers displayed.',
          'The tooltip lists the base stat, current EV and IV assumptions, any nature modifier, and the resulting Level 50 computed value.',
          'If Tailwind is active on that target, the Spe tooltip additionally shows the effective doubled speed.',
        ],
      },
      {
        heading: '🎛 UI Polish',
        items: [
          'The results title now embeds the count directly in bold ("42 Pokémon can OHKO…"), removing the separate grey subtitle.',
          'Sort control has moved to the far left of the controls bar; Filters and Expand All sit on the far right.',
          'Sticky controls bar — the sort, filters, and expand controls now stay pinned to the top of the viewport as you scroll through results.',
          'Target panel minimum width increased from 250 px to 320 px so all four EV inputs fit in a single row.',
          'Stat chips now have slightly more vertical spacing when they wrap onto a second line.',
        ],
      },
    ],
  },
  {
    version: '1.5.0',
    date: 'May 2026',
    title: 'Screens, Spread Moves & Battle Format',
    sections: [
      {
        heading: '🛡 Reflect & Light Screen',
        items: [
          'Each target Pokémon panel now has 🛡 Reflect and ✨ Light Screen toggle buttons.',
          'When active, the appropriate damage reduction is applied to all OHKO calculations for that target — physical moves for Reflect, special moves for Light Screen.',
          'Reduction is format-aware: ×0.5 damage in singles, ×2/3 damage in doubles.',
          'Quick "All" and "None" buttons above the target grid let you apply or clear each screen across every target at once.',
          'Hover either button for a tooltip explaining the mechanic and the per-format values.',
        ],
      },
      {
        heading: '↔ Spread Moves',
        items: [
          'Moves that hit multiple targets (e.g. Rock Slide, Earthquake, Heat Wave, Hyper Voice, Discharge, Surf) are now identified and tagged with a light-blue "↔ Spread" chip in the results.',
          'In doubles format the chip shows "↔ Spread ×0.75", reflecting the damage penalty applied in calculations. In singles format no penalty is applied and the chip shows "↔ Spread" only.',
          'Spread detection is based on move target data: "all-adjacent" (target 9) and "all-adjacent-foes" (target 11).',
        ],
      },
      {
        heading: '⚔ Singles / Doubles Format Toggle',
        items: [
          'A Singles / Doubles segmented button has been added to the top of the target panel, next to the Pokémon Champions toggle.',
          'Defaults to Doubles, matching the VGC competitive format.',
          'Switching to Singles removes the spread move damage penalty and uses the stronger ×0.5 screen reduction.',
          'Hover the toggle for a tooltip explaining what changes between formats.',
        ],
      },
    ],
  },
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

const KNOWN_ISSUES: { heading: string; items: string[] }[] = [
  {
    heading: '🏆 Pokémon Champions Roster',
    items: [
      'The Pokémon Champions eligible Pokémon list is not 100% accurate — it is sourced from PokéAPI and may be missing recently added or updated entries.',
    ],
  },
];

export default function ReleaseNotes() {
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      {/* Known Issues */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '28px 32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        marginBottom: '24px',
        borderLeft: '4px solid #f6ad55',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{
            background: '#f6ad55', color: '#fff',
            fontWeight: 800, fontSize: '13px',
            borderRadius: '6px', padding: '2px 10px',
            letterSpacing: '0.03em',
          }}>
            Known Issues
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {KNOWN_ISSUES.map(section => (
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
