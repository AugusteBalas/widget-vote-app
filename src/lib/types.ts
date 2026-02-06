export type ConceptId = 'B' | 'B2' | 'D' | 'D2';

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
    name: 'Classique',
    description: 'Rotation 180° avec point de presence',
    hasIntegratedPresence: false,
  },
  {
    id: 'B2',
    name: 'Notification',
    description: 'Rotation 180° avec badge de notification',
    hasIntegratedPresence: false,
  },
  {
    id: 'D',
    name: 'Symetrie Verticale',
    description: 'Pill en haut, cercle en bas avec point de presence',
    hasIntegratedPresence: false,
  },
  {
    id: 'D2',
    name: 'Symetrie + Notification',
    description: 'Symetrie verticale avec badge de notification',
    hasIntegratedPresence: false,
  },
];

export const DEFAULT_BUTTON_COLOR = '#4A90D9';
export const DEFAULT_PRESENCE_COLOR = '#22c55e';
