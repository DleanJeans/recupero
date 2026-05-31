export interface BehaviorEntry {
  id: string;
  name: string;
  icon?: string | { uri: string };
  lastTimestamp: number | null;
  metadata: Record<string, string | number>;
}
