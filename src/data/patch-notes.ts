import type { RootStackParamList } from '../types/navigation';

/** A bullet that can open the screen it changed, so it is quick to test. */
export interface PatchNotesLinkedItem {
  text: string;
  /** Stack screen to open from the bullet's "Open" button. */
  screen: keyof RootStackParamList;
  /** Route params, e.g. { behaviorId } for BehaviorLog. Omit for screens without params. */
  params?: object;
  /**
   * Words that already appear in `text` (exact, first occurrence) to underline and link, e.g. "Needs settings".
   * Prefer this: the sentence stays natural and no extra word is added.
   */
  linkPhrase?: string;
  /** Fallback when no phrase in the sentence fits: this label (default "Open") is added underlined at the end. */
  linkLabel?: string;
}

/** A plain string, or an object when the bullet should link to a screen. */
export type PatchNotesItem = string | PatchNotesLinkedItem;

export interface PatchNotesDay {
  /** Local calendar date, yyyy-MM-dd. */
  date: string;
  /** Plain-language, user-facing changes made that day. */
  items: PatchNotesItem[];
}

/**
 * Patch notes shown at the bottom of Settings. Newest day first.
 * Add an entry (or a bullet to today's day) with every user-facing change.
 * Write for the app's user, not for developers. Each note must be 1-2 short lines, no implementation detail.
 * When a bullet changed a screen that can be opened directly, use { text, screen, params?, linkLabel? } so
 * the bullet gets an Open button that jumps there for testing. Plain strings still work.
 */
export const PATCH_NOTES: PatchNotesDay[] = [
  {
    date: '2026-11-26',
    items: ['Tasks: set a date, start time, estimate and deadline; the card turns red when the deadline comes.'],
  },
  {
    date: '2026-11-24',
    items: [
      'Emoji search now shows every match in one list, best match first ("bed" finds the bed).',
      'Weight-style fields in the Behavior Log now start as Manual instead of Formula.',
      'Tasks: swipe a task right to log "Bugged me +1" at any time; the hottest rise to Fix first.',
      'Tasks no longer show stars.',
      'Saved-for-later logs now keep their stacked behaviours and log them together.',
      'Wake up reminders now fire when your Fitbit sleep ends (checked when you open the app).',
      'Social saves profile pics from WhatsApp, Messenger and Instagram chats, to give to your people (needs a new APK).',
      'Editing a log now moves the behaviours stacked with it to the same time and cues.',
      {
        text: 'Needs settings show body words as text, with an Edit button to change them.',
        screen: 'NeedsSettings',
        linkPhrase: 'Needs settings',
      },
      {
        text: 'Cravings now has Urges: bars for coping behaviours that rise until you do them. Long-press one to tune it.',
        screen: 'Cravings',
        linkPhrase: 'Cravings',
      },
      {
        text: 'Needs moved from Cues to Cravings, with a "By need" view that groups urges under the need they cope for.',
        screen: 'Cravings',
        linkPhrase: 'Cravings',
      },
      {
        text: 'Cues rows show XP as text only, without the bars.',
        screen: 'Cues',
        linkPhrase: 'Cues',
      },
      {
        text: 'Tasks can now have a one-off place picked on a map, without saving it to your places.',
        screen: 'Tasks',
        linkPhrase: 'Tasks',
      },
    ],
  },
  {
    date: '2026-11-23',
    items: [
      "Sunlight now follows your day cut-off, so before 4 AM it still shows yesterday's total.",
      {
        text: 'The Hunger screen has a new Calorie balance card: food kcal versus kcal burned, for 1, 7 or 30 days.',
        screen: 'Need',
        params: { needId: 'hunger' },
        linkPhrase: 'Hunger screen',
      },
      {
        text: 'On the Hunger screen, "Ate something you didn\'t log?" now adds kcal instead of percent.',
        screen: 'Need',
        params: { needId: 'hunger' },
        linkPhrase: 'Hunger screen',
      },
      {
        text: 'Number fields can now be a formula, like Before - After. Set it in Edit category.',
        screen: 'CategoryForm',
        linkPhrase: 'Edit category',
      },
      'Formula fields have a Type | Formula switch when you log. Formula fills in the result for you.',
      'You can log with only Before filled and add After later.',
      {
        text: 'Unfinished tasks on the Tasks screen show the total time spent on them.',
        screen: 'Tasks',
        linkPhrase: 'Tasks screen',
      },
      {
        text: 'Categories can now hold a Task, Behavior or Person field. Set it in Edit category, then pick one when you log.',
        screen: 'CategoryForm',
        linkPhrase: 'Edit category',
      },
      'Logging from a task now links the task to the log if its category has a Task field. Backups include your people.',
      'The task editor has a new Icon row to pick an emoji, Mix or image.',
    ],
  },
  {
    date: '2026-11-22',
    items: [
      {
        text: "On a need's What helps list, a behavior can now fill the need by minutes, e.g. 100 min of a game = Full.",
        screen: 'Need',
        params: { needId: 'fun' },
        linkPhrase: "need's What helps list",
      },
      "In a person's dialog, Met in person, Call / video and Message now let you pick when it happened.",
    ],
  },
  {
    date: '2026-11-21',
    items: [
      'Behaviors linked to an app or website now turn on Track duration and Track XP by themselves.',
      "The birthday field can be typed in your phone's date order, with a calendar button.",
      'The birthday picker now goes back before 1970.',
      'The image browser has a Desktop mode button, and you can type a web address in its search box.',
      'Fixed the automatic timer overlay disappearing right after opening an app.',
      'Long-press a behavior › Move logs to… moves or merges its logs into another behavior.',
      {
        text: 'Tapping Tidiness on Cues opens the new Tidiness screen: rooms and spots that each get messy at their own speed.',
        screen: 'Tidiness',
        linkPhrase: 'Tidiness screen',
      },
      'Tidiness floor plan: tap Edit to move and resize rooms and spots.',
      'Tidiness spot sheet: log or time its cleaning, mark it clean, or say how messy it is now.',
      'In Cook a meal, the base behavior card has a play button for its timer.',
      'Tasks: long-press › Select to edit several tasks at once.',
      {
        text: "The Social need screen's person dialog now has the full icon editor, a map for the address and a birthday picker.",
        screen: 'Need',
        params: { needId: 'social' },
        linkPhrase: 'Social need screen',
      },
      'Social auto-log: WhatsApp and Messenger messages from people on your list count as contact (needs a new app install and Notification access).',
      {
        text: 'The Social need screen has a People strip showing how long since you last talked to each person.',
        screen: 'Need',
        params: { needId: 'social' },
        linkPhrase: 'Social need screen',
      },
      'The Mood screen and mood check-in sheet end with an "Add mood" tile.',
      'You can set when a body sensation started.',
      'The Body check-in screen and sheet end with an "Add sensation" tile.',
      'In Cook a meal, picking a base behavior fills the meal name. Create batch is now a floating button.',
      'In the ingredient picker, ticked ones stay at the top of the list.',
      'In Cook a meal, the "Showing ..." button now opens a list of macros.',
      'In Cook a meal, each ingredient shows its own unit (g or ml).',
      'In Cook a meal, tap "Showing ..." to switch which macro shows under each ingredient.',
      'The top-right cog is now a "..." menu with Check for updates, Patch notes and Settings.',
      'In Cook a meal, the base behavior card shows its running timer.',
      "In Cook a meal, press and hold an ingredient's icon or name to open its details.",
      'The Cook a meal button on Routines has a chef hat icon.',
      {
        text: 'Cook a meal can now be cooked as a behavior you pick, with its timer logged on it. Ingredients have a play button too.',
        screen: 'MealBatchForm',
        linkPhrase: 'Cook a meal',
      },
      'In Cook a meal, the ingredient picker has a "Create" row when your search finds nothing.',
      'Opening an app that fills a Need now shows the floating timer by itself (needs the new app version and "Display over other apps").',
      'You can turn on Track duration without Track XP.',
      'Tapping a log start or end time opens wheels for hours, minutes and seconds.',
      'Selected tiles in the mood and body pickers have a clearer outline.',
      'In the task dialog, picking an app or an app behavior ticks Track duration.',
      {
        text: 'On the Timer screen, tap "since 5:08 AM" to set the start time. "Start another timer" is no longer hidden by the navigation bar.',
        screen: 'Timer',
        linkPhrase: 'Timer screen',
      },
      'Firefox website tracking works in newer versions and forks. A new "What does the watcher see?" button helps debug it (needs a new install).',
      'Adding or editing a task opens a dialog over the Tasks screen.',
      'Tasks can have an app; the ▶ button opens it with a timer.',
      'New "Track duration" checkbox on tasks adds a ▶ timer button.',
      'A timer that opened an app now stops 2 minutes after you leave it.',
      '"Choose an app" is now one full-screen list everywhere, with your most-used apps first.',
    ],
  },
  {
    date: '2026-11-20',
    items: [
      {
        text: 'The Cues check-in sheets now let you pick several tiles, then tap Log.',
        screen: 'CheckIn',
        linkPhrase: 'check-in',
      },
      {
        text: 'Body sensations can lower a need by name, e.g. itch or sweat lowers Hygiene. Edit the words in Needs settings.',
        screen: 'NeedsSettings',
        linkPhrase: 'Needs settings',
      },
      "Timed logs in a need's Logged today list now show their duration and start - end time.",
      'New reminder: "After logging" can pick a whole behavior group.',
      'After-logging reminders now also start on "Save for later".',
    ],
  },
  {
    date: '2026-11-19',
    items: [
      'Searching "What helps" on a need keeps the search box above the keyboard.',
      'Saved-for-later pills are now only as wide as their name.',
      {
        text: 'Needs settings: Sort arrows now work, plus a Manual order / Lowest % first switch.',
        screen: 'NeedsSettings',
        linkPhrase: 'Needs settings',
      },
      'The timer chip on Routines is now a round ring, and slides straight down and up on scroll.',
      {
        text: 'After an update restarts the app, it opens Patch notes with a NEW tag on what is new.',
        screen: 'PatchNotes',
        linkPhrase: 'Patch notes',
      },
      {
        text: 'Needs like Hunger and Sunlight now open as full screens, and Back returns to the need.',
        screen: 'Sunlight',
        linkPhrase: 'Sunlight',
      },
      'Cook a batch is now called Cook a meal.',
      {
        text: 'New reminder, Add location and Add item in the Shop are now floating + buttons.',
        screen: 'Shop',
        linkPhrase: 'Add item in the Shop',
      },
      'App and site logs less than 3 minutes apart now join into one log. Change it in Settings > Join app logs closer than.',
      'Cook a meal is now a button above Add behavior on Routines, shown on the Food category. Pick categories in Settings.',
      'Tasks has 3 tabs now: Today, Shopping and Later.',
      "Today's 3: pick up to 3 tasks a day; finishing all 3 gives +5 stars and a streak day.",
      'Every task now earns stars and money, shown as a +★ chip.',
      "Long-press a task for its menu: Edit, Today's 3, move, or Delete.",
      'Shopping: tick an item when bought and it moves to "Got it".',
      {
        text: 'New Settings option "Shopping timer app": the play button on a Shopping task opens that app with a timer.',
        screen: 'Settings',
        linkPhrase: 'Settings',
      },
      'Task tick boxes are rounded squares. Only the box ticks a task; tapping elsewhere opens its menu.',
      'Meal batch ingredients now get their own log, without counting toward Hunger.',
      'The running-timer pill shows the full time once past an hour.',
      {
        text: 'In Needs settings, a need can fill from several metadata fields and categories at once.',
        screen: 'NeedsSettings',
        params: { needId: 'movement' },
        linkPhrase: 'Needs settings',
      },
      {
        text: "The icon picker's Image tab uses a copied image link, or opens Google Images.",
        screen: 'Settings',
        linkLabel: 'Settings',
      },
      "Tap a behavior's name on its Log or Details screen to rename it.",
      {
        text: 'Every need screen has a Settings cog that opens Needs settings for that need.',
        screen: 'NeedsSettings',
        params: { needId: 'fun' },
        linkPhrase: 'Needs settings',
      },
      {
        text: 'Patch notes now have a checkbox on every line, and some lines link to the screen that changed.',
        screen: 'PatchNotes',
        linkPhrase: 'Patch notes',
      },
      'Fill rates have a linked "% per min" field next to minutes.',
      'An app can fill a need only while playing music or video, e.g. Spotify for Fun (needs a new install and Notification access).',
      "The app picker shows each app's icon (needs a new install).",
      'Tracked websites can have a friendly name like "Reddit".',
      "Logging something that fills a need now shows a card with the need's bar filling up.",
      'The Sunlight notification bar is now yellow with rounded ends (needs a new install).',
      'The Outside Mode notification has a Stop button.',
      'Timed logs can run past midnight.',
      'Running timers now float over other apps. Drag to move, swipe up to dismiss, tap to return.',
      'Apps and websites in a need show their real icon.',
      'Set how many minutes of an app or website fill a need to 100%.',
      'Needs can fill from app and website usage: open a need and tap "Fill … from an app or website".',
      'Cardio and Sunlight show progress like 0/30m on one line.',
      {
        text: 'You can run several timers at once. Tap Start another timer on the Timer screen.',
        screen: 'Timer',
        linkPhrase: 'Timer screen',
      },
      'Needs fill up live while a behavior timer runs, and go back if you cancel it.',
      'You can change the icon of any need in Settings > Needs.',
      {
        text: 'Settings > Needs has a Sort button to order your needs.',
        screen: 'NeedsSettings',
        linkPhrase: 'Settings > Needs',
      },
      'Every main tab has the same header with a Settings cog. Home is now titled Routines.',
      'Search is now a round button at the bottom left of Routines. Cook a batch moved to New behavior.',
      'Cues and Cravings no longer show a Back arrow.',
      'Needs: tap a log amount in Logged today to correct it.',
      'Needs: a Custom button lets you type your own check-in or top-up number.',
      'Needs: you can remove a check-in from Logged today or the chart.',
      'Needs: the screen shows its icon and title next to Back, leaving more room for the chart.',
      'Cues: a new Check-in card shows your mood and body, and logs how you feel in one tap.',
      {
        text: 'Check-in streak and XP: logging mood or body levels up Check-in and keeps a daily streak.',
        screen: 'CheckIn',
        linkPhrase: 'Check-in',
      },
      'Check-in nudges (off by default): a notification with mood buttons, plus an optional streak-saver at 21:00.',
    ],
  },
  {
    date: '2026-11-18',
    items: [
      'Habit reminders (After logging X) now show as a card inside the app when it is open, instead of a notification. The card shows the suggested behaviour with a countdown ring and buttons: Later, Log, and Start timer. A reminder with buttons you do not answer in 10 seconds becomes a normal notification. Settings > Reminder toast lets you turn it off or put it at the top or bottom.',
      'Sunlight: a new yellow graph shows the estimated light level from sunrise to sunset, with the time you spent outside in solid yellow. Tap a day in the past-week chart to see its graph too.',
      'Cook a batch: the new Weigh button on a batch card takes what is really left in the pot. The cooked weight becomes eaten + leftover (water that evaporated drops out) and the macros per 100 g, including logged portions, are recalculated.',
      'The emoji on the small saved-for-later circle is now centred and no longer cut off.',
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
