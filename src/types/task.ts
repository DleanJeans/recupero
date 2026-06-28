export type TaskStarValue = 0 | 1 | 2 | 3;
export type TaskSource = 'oneOff' | 'behavior';

export interface TaskEntry {
  id: string;
  title: string;
  scheduledDate: string;
  stars: TaskStarValue;
  source?: TaskSource;
  behaviorId?: string;
  completedDates: string[];
  completionLogIds?: Record<string, string>;
  createdAt: number;
  archived?: boolean;
}

export interface AddTaskInput {
  title: string;
  scheduledDate: string;
  stars: TaskStarValue;
  source?: TaskSource;
  behaviorId?: string;
}
