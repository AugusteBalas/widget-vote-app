'use client';

import React from 'react';
import { ConceptInfo } from '@/lib/types';
import WidgetButton from './WidgetButton';
import { CheckIcon } from '@heroicons/react/24/solid';

interface ConceptCardProps {
  concept: ConceptInfo;
  buttonColor: string;
  presenceColor: string;
  isSelected: boolean;
  onSelect: () => void;
}

export default function ConceptCard({
  concept,
  buttonColor,
  presenceColor,
  isSelected,
  onSelect,
}: ConceptCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300
        bg-slate-800/50 border-2
        ${isSelected
          ? 'border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.2),0_20px_40px_rgba(0,0,0,0.3)]'
          : 'border-slate-700/50 hover:border-blue-500/50 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]'
        }
        hover:-translate-y-1
      `}
    >
      {/* Gradient overlay when selected */}
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none z-10" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              concept.recommended
                ? 'bg-green-500/20 text-green-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            Concept {concept.id}
          </span>
          <span className="text-lg font-semibold text-white">{concept.name}</span>
        </div>

        {/* Vote checkbox */}
        <div
          className={`
            w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300
            ${isSelected
              ? 'bg-blue-500 border-blue-500'
              : 'border-slate-600'
            }
          `}
        >
          <CheckIcon
            className={`w-4 h-4 text-white transition-all duration-300 ${
              isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
          />
        </div>
      </div>

      {/* Preview area */}
      <div className="relative h-48 flex items-center justify-center">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-50">
          <div className="absolute w-32 h-32 rounded-full bg-blue-500/20 blur-3xl top-1/4 left-1/4" />
          <div className="absolute w-32 h-32 rounded-full bg-purple-500/20 blur-3xl bottom-1/4 right-1/4" />
        </div>

        <WidgetButton
          concept={concept.id}
          buttonColor={buttonColor}
          presenceColor={presenceColor}
          size={72}
        />
      </div>

      {/* Description */}
      <div className="p-5 border-t border-slate-700/50">
        <p className="text-sm text-slate-400">{concept.description}</p>
      </div>
    </div>
  );
}
