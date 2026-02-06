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
    description: 'Rotation 180° avec temoin de presence externe',
    hasIntegratedPresence: false,
  },
  {
    id: 'B2',
    name: 'Presence Integree',
    description: 'Le cercle du logo devient le temoin de presence',
    hasIntegratedPresence: true,
    recommended: true,
  },
  {
    id: 'D',
    name: 'Symetrie Verticale',
    description: 'Pill en haut, cercle en bas avec temoin externe',
    hasIntegratedPresence: false,
  },
  {
    id: 'D2',
    name: 'Symetrie + Glow',
    description: 'Symetrie verticale avec cercle vert integre',
    hasIntegratedPresence: true,
    recommended: true,
  },
];

export const DEFAULT_BUTTON_COLOR = '#4A90D9';
export const DEFAULT_PRESENCE_COLOR = '#22c55e';
