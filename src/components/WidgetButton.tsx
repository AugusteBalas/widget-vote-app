'use client';

import React from 'react';
import { ConceptId } from '@/lib/types';
import { SVG_PATHS, VIEWBOX } from '@/lib/svgPaths';

interface WidgetButtonProps {
  concept: ConceptId;
  buttonColor: string;
  presenceColor: string;
  size?: number;
  className?: string;
}

export default function WidgetButton({
  concept,
  buttonColor,
  presenceColor,
  size = 60,
  className = '',
}: WidgetButtonProps) {
  const hasIntegratedPresence = concept === 'B2' || concept === 'D2';
  const isRotated = concept === 'B' || concept === 'B2';

  const pillPath = isRotated ? SVG_PATHS.pill.original : SVG_PATHS.pill.mirrored;
  const circlePath = isRotated ? SVG_PATHS.circle.original : SVG_PATHS.circle.mirrored;

  const svgSize = size * 0.73; // SVG takes ~73% of button size
  const dotSize = size * 0.27;
  const dotBorder = size * 0.05;

  return (
    <button
      className={`relative rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: buttonColor,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={VIEWBOX}
        fill="none"
        style={{ overflow: 'visible' }}
      >
        {isRotated ? (
          <g transform="rotate(180, 218, 280)">
            <path fill="white" d={pillPath} />
            <path
              fill={hasIntegratedPresence ? presenceColor : 'white'}
              className={hasIntegratedPresence ? 'presence-integrated' : ''}
              d={circlePath}
            />
          </g>
        ) : (
          <>
            <path fill="white" d={pillPath} />
            <path
              fill={hasIntegratedPresence ? presenceColor : 'white'}
              className={hasIntegratedPresence ? 'presence-integrated' : ''}
              d={circlePath}
            />
          </>
        )}
      </svg>

      {/* External presence dot */}
      {!hasIntegratedPresence && (
        <span
          className="absolute presence-dot rounded-full"
          style={{
            top: 2,
            right: 2,
            width: dotSize,
            height: dotSize,
            backgroundColor: presenceColor,
            border: `${dotBorder}px solid ${buttonColor}`,
          }}
        />
      )}
    </button>
  );
}
