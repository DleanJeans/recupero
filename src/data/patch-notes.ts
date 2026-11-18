export interface PatchNotesDay {
  /** Local calendar date, yyyy-MM-dd. */
  date: string;
  /** Plain-language, user-facing changes made that day. */
  items: string[];
}

/**
 * Patch notes shown at the bottom of Settings. Newest day first.
 * Add an entry (or a bullet to today's day) with every user-facing change.
 * Write for the app's user, not for developers.
 */
export const PATCH_NOTES: PatchNotesDay[] = [
  {
    date: '2026-11-18',
    items: [
      'Sunlight: a new graph shows the estimated light level from sunrise to sunset, with the time you spent outside highlighted. Tap a day in the past-week chart to see its graph too.',
      'Cook a batch: the new Weigh button on a batch card takes what is really left in the pot. The cooked weight becomes eaten + leftover (water that evaporated drops out) and the macros per 100 g, including logged portions, are recalculated.',
      'The emoji on the small saved-for-later circle is now centred.',
      'Home header: the title is slightly smaller and the icons are packed closer together, so the first icon no longer touches the title.',
      'Cook a batch: the cooked weight fills itself in from the total of the ingredients until you type your own. A link puts the total back.',
      'Fixed the bookmark badge on the small saved-for-later circle being cut off.',
      'Saved for later items now float as small pills above the Add behavior button (a bookmark marks them) instead of a card on Routines. Tap one to open its log form and add more details (it stays saved if you go back); long-press to log it now or discard it. They shrink while you scroll down, and with more than 3 you see the 2 newest plus a +N more button that lists them all.',
      'The bottom navigation bar no longer has a dark gap above it, and the Add behavior button text is now centred.',
      'The Add behavior button is now a smaller floating button on the right that shrinks to a plus circle while you scroll down and expands again when you scroll up, so it takes less space.',
      'Searching for a behaviour with no results, then tapping Add behavior, now fills in the name with your search.',
      'While typing a new behaviour name, existing behaviours with a similar name appear below it after a short pause, so you do not create duplicates.',
      'On the reminder screen, the selected place now moves to the top of the place list with a smooth animation.',
    ],
  },
  {
    date: '2026-11-17',
    items: [
      'Every map (Sunlight, place editing and place previews) has a new expand button in the top-right corner that opens it full screen, with a close button to go back.',
      'The Energy sheet now has Connect Fitbit and Sync now at the bottom.',
      'Save for later: on a behaviour\'s log form, the new bookmark button keeps the amount and details you entered without logging. It shows under "Saved for later" on Routines and on that behaviour; tap Done to log it at the time you finish, or tap it to adjust the amount or time first.',
    ],
  },
  {
    date: '2026-11-16',
    items: [
      'Cook a batch: the new pot button on Routines turns a home-cooked pot into one food. Pick the ingredient behaviours, weigh each raw, enter the cooked weight, and log each portion by its weight to get its macros.',
      'A batch card shows how much is left in the pot. Edit batch changes the ingredients (past portions are recalculated) and Finish batch archives it when it is eaten.',
    ],
  },
  {
    date: '2026-11-15',
    items: [
      'Activity: fixed lots of false "Left <place>" events (e.g. 996 Space) that showed up when you had never been there, often right after adding a reminder. A "Left" now only counts if the app saw you arrive first.',
      'New reminder: the place and behaviour lists scroll inside a limited height and have a search box, and choosing a place shows it on a map.',
      'New reminder: you can now pick no behaviour and just send yourself a notification with your own message.',
      'New reminder: under the place map, an expandable section has a slider (with − / + buttons) for the area place reminders watch (the same for all places, down from 100 m; Android may miss very small areas) and for how long you must stay before an "I enter" reminder fires (5 min by default, or off).',
      'Cues: a cog button in the header opens Settings.',
      'New reminder: the message box scrolls above the keyboard instead of being hidden by it.',
      'Sunlight: tap a day in Past week to see its route on the map and its timeline.',
      'Needs: the Refill list now has a search box (shown once there are a few refills) to filter by name.',
      'Patch notes: a button at the end of Settings opens this list.',
      'Sunlight: the sheet is reorganised into Now, Today, Past week and Settings. Settings are one line each and open in place.',
      "Sunlight: Precise tracking is now the Outside Mode button, next to Pause and I'm outside. Turn it on while you move between places.",
      'Sunlight: Today is a timeline of your places, sessions and pauses, and each session shows its lux·min.',
      "Sunlight: the map draws today's route (solid where it counted as outside). Outside Mode records a detailed route.",
      'Sunlight: "Pause within" is labelled as measured from each place\'s centre (it always was).',
      'Sunlight: pause tracking manually for 30 min, 1 h, 2 h or the rest of today. The status and the live notification show the pause.',
      'Sunlight: edit the start, end and lux of Today sessions, and see the light that reaches your eyes.',
      'Sunlight: a tracking log in the sheet lists place arrivals, departures and GPS checks, so lost sessions can be debugged.',
      'Sunlight: fewer false sessions. Rapid bursts of place events and GPS wobble at home are ignored, and trips between far places are inferred.',
      'Tasks: a place task now needs you to stay there (5 min by default) before it ticks off.',
    ],
  },
  {
    date: '2026-11-14',
    items: [
      'Sunlight: precise background tracking toggle and a setting for how much light reaches your eyes.',
      'Sunlight: add manual sessions, delete misfires from Today, and Calibrate now only applies from here on.',
      'Needs: pickers and sheets open full screen with a back button.',
      'Needs charts: lines slope straight to a manual update instead of dropping vertically.',
      'Icon picker: full screen so the search box stays above the keyboard, and you can search emoji by typing or pasting the emoji itself.',
      'Image search: Back goes back through the browser before closing.',
      'Dialogs with a text box move to the top of the screen only while the keyboard is showing.',
      'Daily screen: the Cardio and Sunlight cards are gone (both live in Needs).',
      'Metadata: a custom rate basis instead of a fixed per 100.',
    ],
  },
  {
    date: '2026-11-13',
    items: [
      'Settings: Check for update button that downloads the update and restarts into it.',
      'Sunlight: a live ongoing notification counts up while you are outside.',
      'Sunlight: lux is blended hour by hour and can be calibrated against a lux meter.',
      'Needs: sleep refills show on the Energy chart as a rise across the night.',
    ],
  },
  {
    date: '2026-11-12',
    items: [
      'Needs: top up a need without logging a behavior.',
      'Needs: Active Zone Minutes moved into the Needs panel.',
      'Needs: a Sunlight bar counts time outside between sunrise and sunset, with estimated lux and a light dose bar.',
      'Needs: charts refresh right after a check-in or top-up, and draw as solid lines.',
      "Timer: a level ring, today's sessions, and Pause, which logs each segment.",
      'Behavior Log: a smart main button, a split Log | Timer button and a ⋯ menu.',
      'Reminders: Start timer and Later buttons on suggestion notifications, and Open app reminders.',
      'Cues: tap a place to see the logs made there.',
      'Icons: image icons fill their tile, tap the icon on Behavior and Place details to edit it, and the picker has steadier sliders and -/+ buttons.',
      'Settings: app version, native runtime and the running update shown at the bottom.',
    ],
  },
];
