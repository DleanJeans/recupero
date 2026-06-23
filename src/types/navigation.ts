export type RootStackParamList = {
  Home: undefined;
  Day: undefined;
  BehaviorLog: {
    behaviorId: string;
    /** Initial view mode. Defaults to 'details' (log list). */
    initialMode?: 'log' | 'details';
    logId?: string;
    initialTimestamp?: number;
    initialNotes?: string;
  };
  BehaviorForm: {
    behaviorId?: string;
    defaultCategoryId?: string;
  };
  Settings: undefined;
};
