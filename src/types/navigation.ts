export type RootStackParamList = {
  Home: undefined;
  Timer: undefined;
  Tasks: undefined;
  Day: undefined;
  BehaviorLog: {
    behaviorId: string;
    /** Initial view mode. Defaults to 'details' (log list). */
    initialMode?: 'log' | 'details';
    logId?: string;
    initialTimestamp?: number;
    initialNotes?: string;
    timerStartTimestamp?: number;
    timerEndTimestamp?: number;
  };
  BehaviorForm: {
    behaviorId?: string;
    defaultCategoryId?: string;
    defaultXpEnabled?: boolean;
    defaultDurationXpEnabled?: boolean;
    selectedCategoryId?: string;
  };
  CategoryForm: {
    categoryId?: string;
    selectOnSave?: boolean;
  };
  Shop: undefined;
  MoneyLog: undefined;
  Settings: undefined;
  Cues: undefined;
  CueForm: { cueId?: string } | undefined;
  CueActivity: undefined;
  SavedPlaces: undefined;
  LocationEdit: { placeId?: string } | undefined;
  MoodLog: undefined;
};
