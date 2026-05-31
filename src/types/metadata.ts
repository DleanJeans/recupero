export type MetadataType = 'integer' | 'duration' | 'string';

export interface MetadataField {
  id: string;
  name: string;
  type: MetadataType;
  value: string | number;
  unit?: string; // Optional unit for integer types (e.g., 'reps', 'grams')
}
