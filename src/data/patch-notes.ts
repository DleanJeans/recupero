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
 * Write for the app's user, not for developers.
 * When a bullet changed a screen that can be opened directly, use { text, screen, params?, linkLabel? } so
 * the bullet gets an Open button that jumps there for testing. Plain strings still work.
 */
export const PATCH_NOTES: PatchNotesDay[] = [
  {
    date: '2026-11-21',
    items: [
      'In Cook a meal, tap the "Showing ..." button above the ingredients to switch which macro (calories, protein, fiber...) shows under each ingredient name.',
      'The Settings cog at the top right of each tab is now a "..." menu with Check for updates, Patch notes and Settings. Check for updates shows its result in the menu without closing it.',
      'In Cook a meal, the base behavior card (like Chicken Soup) now shows its running timer ticking, such as 40:05.',
      "In Cook a meal, press and hold an ingredient's icon or name to open its details and edit it. What you entered is kept.",
      'The Cook a meal button on Routines now has a chef hat icon instead of the big fork and knife, sized to match its label.',
      {
        text: 'Cook a meal can now be cooked as a behavior you pick (like Chicken Soup). Its running timer is logged there when you create the meal, linked to it. Ingredients have a play button to start a timer, and everything you typed is kept when you leave the screen.',
        screen: 'MealBatchForm',
        linkPhrase: 'Cook a meal',
      },
      'In Cook a meal, the ingredient picker now has a "Create" row when your search matches nothing. Tap it to make a new behavior in your Food category and tick it, then add its nutrition rates later.',
      'Opening an app that fills a Need (like Messenger or WhatsApp for Social) now shows the floating timer by itself, with a ring for the Need, the time in the app and its name. It goes away when you leave the app, and the notification\'s Show/Hide overlay button still works. This needs the new app version and the "Display over other apps" permission.',
      'You can now turn on "Track duration" in a behavior without turning on Track XP. Logs still get a start and end time and the Timer works; the level and XP bar stay hidden until you also turn on Track XP.',
      'Tapping the start or end time in a behavior log now opens a dialog with scrolling wheels for hours, minutes and seconds (HH:mm:ss) instead of the clock. Start and end times of timed logs now always show and keep seconds. Cancel or OK closes it.',
      'Selected tiles in the mood and body pickers now have a clear thicker outline and a stronger tint, so you can see what you picked.',
      'In the task dialog, picking a behavior that tracks an app fills the App row with that app and ticks Track duration. Picking an app also ticks it, and every behavior made for an app now has duration XP on.',
      {
        text: 'On the Timer screen, tap "since 5:08 AM" to set the start time with the time picker (replaces the -1 min button). A time later than now means yesterday. "Start another timer" is no longer hidden under the Android navigation bar.',
        screen: 'Timer',
        linkPhrase: 'Timer screen',
      },
      'Website tracking in Firefox is more tolerant: it finds the address bar in newer Firefox versions and Firefox forks (Iceraven, Fennec, Mull, LibreWolf, Tor). New "What does the watcher see?" button next to the website field shows what the watcher last read, so you can tell why a site isn\'t counted. Needs a new app install to take effect.',
      'Adding or editing a task now opens a dialog over the Tasks screen instead of pushing the list down. Behavior, App and Place are rows that each open their own full-screen picker.',
      'Tasks can have an app: the ▶ button opens it with a timer. The first time you pick an app, Recupero makes a behavior that tracks its screen time; if Needs (e.g. Fun) already tracks that app, the task reuses that behavior instead.',
      'New "Track duration" checkbox on tasks: adds a ▶ timer button (and turns on duration XP for the app\'s behavior). Ticking the task while its timer runs logs the time it took.',
      "A timer that opened an app (a task's ▶, the Shopping play button, or a timer for an app-tracked behavior) now stops by itself once you leave that app for 2 minutes, and logs the time up to when you left it.",
      '"Choose an app" is now one full-screen list everywhere (tasks, Needs app usage, behavior auto-tracking, reminders, Shopping timer app): your most-used apps this week come first, and apps that already have a behavior show its name.',
    ],
  },
  {
    date: '2026-11-20',
    items: [
      {
        text: 'The Cues check-in sheets (mood and body) now let you pick several tiles at once, then tap Log. Picks logged together count as one check-in for XP and the streak.',
        screen: 'CheckIn',
        linkPhrase: 'check-in',
      },
      {
        text: 'Body sensations can now lower a need by their name. Each need in Needs settings has a "Body words that lower it" box (Hygiene starts with itch, sweat, smell, greasy and similar), so Face Itch or Body Itch drop Hygiene to its craving line. Logging from the Cues check-in sheet now also updates Hunger, Thirst, Energy and Hygiene.',
        screen: 'NeedsSettings',
        linkPhrase: 'Needs settings',
      },
      'In the Logged today list on a need, timed logs (like app usage) now show how long they lasted under the name and their start - end time on the right.',
      'New reminder: "After logging" can now pick a whole behaviour group (e.g. Omachi) from the top of the list, so logging any flavour triggers it.',
      'Reminders set to fire after a behaviour is logged now also start when you use "Save for later" on its log.',
    ],
  },
  {
    date: '2026-11-19',
    items: [
      'Searching "What helps" on a need no longer hides the search box behind the keyboard; the list shrinks and scrolls it into view.',
      'Saved-for-later pills are now just as wide as their name, so there is no big gap before the bookmark.',
      {
        text: 'Needs settings: the Sort arrows now really move needs, and the new Manual order / Lowest % first switch (also on the Needs panel header) lists the neediest need on top. Cardio and Sunlight are sorted too: by progress toward their goal, or in your Sort order.',
        screen: 'NeedsSettings',
        linkPhrase: 'Needs settings',
      },
      'The small timer chip on Routines is now a round ring (solid track, green level arc) around the behavior icon, like the floating bubble, and the pill slides straight down and up when you scroll with no curve.',
      {
        text: 'After Check for update or the Update ready pill restarts the app, it opens Patch notes with a NEW tag on everything added since you last looked.',
        screen: 'PatchNotes',
        linkPhrase: 'Patch notes',
      },
      {
        text: 'Needs (Hunger, Thirst, Sunlight and the rest) now open as real screens instead of pull-up dialogs. Open a behavior from a need, press Back, and you land on that need again instead of the Cues screen. They slide up twice as fast as before.',
        screen: 'Sunlight',
        linkPhrase: 'Sunlight',
      },
      'The Cook a batch button is now called Cook a meal (the button on Routines, its Settings section and the screen title).',
      {
        text: 'New reminder on the Reminders tab, Add location in Saved places and Add item in the Shop are now round + buttons floating at the bottom right, like Add behavior and Add task. They shrink to a circle while you scroll down.',
        screen: 'Shop',
        linkPhrase: 'Add item in the Shop',
      },
      'App and site logs that are less than 3 minutes apart now join into one log, and the gap counts as time too (so tabbing out of Claude to test your app no longer makes a pile of 1% logs). Your existing logs were cleaned up the same way, except ones you edited. Change the 3 minutes in Settings > Join app logs closer than.',
      'Cook a batch is now a button above Add behavior on Routines, shown only while the Food category is selected (it shrinks while you scroll, like Add behavior). Choose which categories show it in Settings > Cook a batch button. The chip on the New behavior screen is gone.',
      'Tasks has 3 tabs now: Today, Shopping and Later. Tasks linked to a shopping app or behavior (like Shopee) moved to the Shopping tab by themselves.',
      "Today's 3: pick up to 3 tasks to focus on each day. Finish all 3 for +5 bonus stars and a day on your streak, shown at the top of Today.",
      'Every task now earns its stars and money, including tasks linked to a behavior (they used to earn nothing). Open tasks that had 0 stars got 1. The reward shows as a +★ chip on the right of each task.',
      "Long-press a task for its menu: Edit, add to Today's 3, move to Today, Shopping or Later, or Delete. The trash can on each row is gone.",
      'Shopping: tick an item when you have bought it. It moves to "Got it" with the date.',
      {
        text: 'New Settings option "Shopping timer app": pick an app (like Shopee) to open when you press the play button on a Shopping task. The timer starts first, and the floating timer pill shows the item you are shopping for (like "Buy MacBook case") over that app. Allow "Display over other apps" there if asked. Needs the newest APK.',
        screen: 'Settings',
        linkPhrase: 'Settings',
      },
      'Task tick boxes are rounded squares now, like the ones on your Routines checklists. Only the box ticks a task off; tapping anywhere else on the task opens its menu (same as long-press).',
      'Ingredients of a meal batch now get a log of their own (so "last time" works for them), without counting toward Hunger or daily totals. Tapping one opens the batch instead. Batches you already cooked got their ingredient logs too.',
      'The running-timer pill now always shows the full time (like 1:05:12) once it passes an hour. A long behavior name is shortened instead.',
      {
        text: 'In Needs settings, a need can now fill from several metadata fields at once (each log adds them up), and you can pick which categories they come from. The list of metadata shrinks to those categories. Needs you set up before keep working as they were.',
        screen: 'NeedsSettings',
        params: { needId: 'movement' },
        linkPhrase: 'Needs settings',
      },
      {
        text: 'In the icon picker, the Image tab now uses an image link from your clipboard if you copied one. Otherwise it opens Google Images search straight away.',
        screen: 'Settings',
        linkLabel: 'Settings',
      },
      "Tap a behavior's name at the top of its Log or Details screen to rename it. Its history stays.",
      {
        text: 'Every need screen (Fun, Hunger, ...) now has a Settings cog in the top right corner that opens Needs settings, scrolled to that need.',
        screen: 'NeedsSettings',
        params: { needId: 'fun' },
        linkPhrase: 'Needs settings',
      },
      {
        text: 'Patch notes now have a checkbox on every line so you can tick off what you have tested (it is remembered), and some lines have an underlined link that jumps straight to the screen that changed.',
        screen: 'PatchNotes',
        linkPhrase: 'Patch notes',
      },
      'Fill rates now have a linked "% per min" field next to the minutes field; edit either one and the other updates.',
      'An app can now fill a need only while it is playing music or video in the background, e.g. Spotify filling Fun. Pick the app, tick "Only while it\'s playing" and turn on Notification access (needs the newest app install).',
      "The app picker now shows each app's icon (needs the newest app install).",
      'Websites you track can now have a friendly name like "Reddit" instead of "reddit.com". Recupero fetches the site name for you and you can edit it; existing sites named by their address are renamed too.',
      "When you log something that fills a need (like a meal or a glass of water), a card now slides down from the top of the Routines screen showing that need's bar filling up with the percentage counting up.",
      'The Sunlight notification bar is now yellow with rounded ends, like the bar in the app (needs the newest app install).',
      'The Outside Mode notification now has a Stop button, so you can turn Outside Mode off without opening Recupero.',
      'Timed logs can now run past midnight, e.g. 9 PM to 5 AM. Set an End earlier than the Start and it ends the next day, with the day shown under End.',
      'Running timers now float over other apps and your browser while Recupero is in the background. Drag the pill to move it, swipe it up to dismiss it, tap it to come back to Recupero. A notification also shows the timer and, if the behavior fills a need, how full that need is, with a Show overlay button to bring the pill back. It needs "Display over other apps" turned on for Recupero and the newest app install.',
      'Apps and websites you add to a need now use their real icon (the app icon, or the site favicon) instead of the stopwatch. App icons need the newest app install; websites work right away. Existing ones get their icon next time you open Recupero.',
      'You can set how many minutes of an app or website fill a need to 100%: type it when adding, or tap the "Full after …" pill on its row in the need to change it.',
      'Needs can now fill from app and website usage. Open a need (for example Fun) and tap "Fill Fun from an app or website", then pick an app like YouTube, or a site in Firefox. Time spent there fills the need when you open Recupero.',
      'Cardio and Sunlight now show progress as 0/30m on the right of the bar, with the unit kept on the same line.',
      {
        text: 'You can now run several timers at once. On the Timer screen tap Start another timer, and open any other running timer from the list below. Each running timer gets its own pill above the bottom bar, and needs fill from all of them together.',
        screen: 'Timer',
        linkPhrase: 'Timer screen',
      },
      'Needs now fill up live while a behavior timer is running (for example Comfort while timing Lie in bed). Cancel the timer and the need goes back to its current level. While it runs, the need says "Full in …" instead of "Low in …", with a timer icon and the name of the behavior being timed.',
      "You can now change the icon of any need, including the built-in ones: Settings > Needs, tap the icon next to the need's name. Needs with a changed built-in icon show a Reset option.",
      {
        text: 'Settings > Needs has a Sort button to put your needs in the order you want (Cues, history and settings follow it).',
        screen: 'NeedsSettings',
        linkPhrase: 'Settings > Needs',
      },
      'Every main tab (Cues, Cravings, Routines, Daily, Tasks) now has the same header with a Settings cog in the top right corner. The Home tab is now titled Routines, so the title is no longer cut off.',
      'Search is now a round button at the bottom left of Routines. Cook a batch moved to the top of the New behavior screen.',
      'Cues and Cravings no longer show a Back arrow next to the title.',
      'Needs: tap the amount of a log in Logged today (for example +42%) to type how much it really refilled. Use usual puts the original amount back.',
      'Needs: a new Custom button next to the check-in choices (How hungry are you?) and the top-up choices (Ate something you did not log?) lets you type your own number.',
      'Needs: you can now remove a check-in. Check-ins show in the Logged today list with an X, and tapping a check-in dot on the chart has a bin button.',
      'Needs: the need screen now shows its icon and title right next to the Back button, so there is more room for the chart.',
      'Cues: a new Check-in card at the top shows your current mood and body as two squares. Tap one to log how you feel in one tap, with an Undo. A square turns amber when the last log is a few hours old.',
      {
        text: 'Check-in streak and XP: logging a mood (+5 XP) or a body sensation (+3 XP, first 4 logs a day) now levels up Check-in and keeps a daily streak. Tap the card header to see your level, best streak, 2-week calendar and mood mix.',
        screen: 'CheckIn',
        linkPhrase: 'Check-in',
      },
      'Check-in nudges (off by default, turn on from the Check in screen): a notification at times you pick, with mood buttons you can tap without opening the app, plus an optional streak-saver at 21:00.',
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
