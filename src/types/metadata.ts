export type MetadataType = 'integer' | 'duration' | 'string';
export type MetadataScope = 'global' | 'log'; // global = behavior-level (e.g. cooldown), log = per-log (e.g. reps, duration)

export interface MetadataField {
  id: string;
  name: string;
  type: MetadataType;
  scope: MetadataScope; // Determines if this metadata is global to behavior or per-log
  value: string | number; // Default value for global metadata, or template for log metadata
  unit?: string; // Optional unit for integer types (e.g., 'reps', 'grams') or 'time'
  isDefault?: boolean; // Marks if this is a default metadata field (cooldown, unit)
}
