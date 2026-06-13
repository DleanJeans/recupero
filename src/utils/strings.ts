export const Label = {
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  LAST_PREFIX: 'Last ',
  LAST_WEEK: 'Last Week',
  LAST_MONTH: 'Last Month',
  LAST_YEAR: 'Last Year',
  JUST_NOW: 'Just now',
  NEVER: 'Never',
  AGO: ' ago',
} as const;

export const Group = {
  TODAY: Label.TODAY,
  YESTERDAY: Label.YESTERDAY,
  THIS_WEEK: 'This Week',
  LAST_WEEK: Label.LAST_WEEK,
  LAST_MONTH: Label.LAST_MONTH,
  OLDER: 'Older',
} as const;

export const Unit = {
  MIN: 'm',
  HOUR: 'h',
  DAY: 'd',
  WEEK: 'w',
  MONTH: 'mo',
  YEAR: 'y',
} as const;
