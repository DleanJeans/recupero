export type RootStackParamList = {
  Home: undefined;
  Timeline: undefined;
  BehaviorDetails: {
    behaviorId: string;
  };
  BehaviorLog: {
    behaviorId: string;
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
