export type ConceptId = 'B' | 'B2' | 'D' | 'D2' | 'OLD' | 'OLD2';

export interface WidgetConfig {
  concept: ConceptId;
  buttonColor: string;
  presenceColor: string;
}

export interface ConceptInfo {
  id: ConceptId;
  name: string;
  description: string;
  hasIntegratedPresence: boolean;
  recommended?: boolean;
}

export const CONCEPTS: ConceptInfo[] = [
  {
    id: 'B',
    name: 'Rotation + Presence',
    description: 'Logo inverse avec point vert de presence',
    hasIntegratedPresence: false,
  },
  {
    id: 'B2',
    name: 'Rotation + Badge',
    description: 'Logo inverse avec badge de notification',
    hasIntegratedPresence: false,
  },
  {
    id: 'D',
    name: 'Symetrie + Presence',
    description: 'Logo symetrique avec point vert de presence',
    hasIntegratedPresence: false,
  },
  {
    id: 'D2',
    name: 'Symetrie + Badge',
    description: 'Logo symetrique avec badge de notification',
    hasIntegratedPresence: false,
  },
  {
    id: 'OLD',
    name: 'Actuel + Presence',
    description: 'Widget actuel avec point vert de presence',
    hasIntegratedPresence: false,
  },
  {
    id: 'OLD2',
    name: 'Actuel + Badge',
    description: 'Widget actuel avec badge de notification',
    hasIntegratedPresence: false,
  },
];

// Display letter for each concept (used in UI labels)
export const CONCEPT_LETTER: Record<ConceptId, string> = {
  B: 'A',
  B2: 'B',
  D: 'C',
  D2: 'D',
  OLD: 'E',
  OLD2: 'F',
};

// Whether a concept is the "current" widget (vs new design)
export function isCurrentWidget(concept: ConceptId): boolean {
  return concept === 'OLD' || concept === 'OLD2';
}

export const DEFAULT_BUTTON_COLOR = '#4A90D9';
export const DEFAULT_PRESENCE_COLOR = '#22c55e';
