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
  const hasNotificationBadge = concept === 'B2' || concept === 'D2';
  const isRotated = concept === 'B' || concept === 'B2';

  const pillPath = isRotated ? SVG_PATHS.pill.original : SVG_PATHS.pill.mirrored;
  const circlePath = isRotated ? SVG_PATHS.circle.original : SVG_PATHS.circle.mirrored;

  const svgSize = size * 0.73;
  const dotSize = size * 0.27;
  const badgeSize = size * 0.33;
  const badgeFontSize = size * 0.2;

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
            <path fill="white" d={circlePath} />
          </g>
        ) : (
          <>
            <path fill="white" d={pillPath} />
            <path fill="white" d={circlePath} />
          </>
        )}
      </svg>

      {/* Green presence dot (B and D only, no border) */}
      {!hasNotificationBadge && (
        <span
          className="absolute presence-dot rounded-full"
          style={{
            top: 2,
            right: 2,
            width: dotSize,
            height: dotSize,
            backgroundColor: presenceColor,
          }}
        />
      )}

      {/* Notification badge (B2 and D2) */}
      {hasNotificationBadge && (
        <span
          className="absolute flex items-center justify-center"
          style={{
            top: -2,
            right: -2,
            width: badgeSize,
            height: badgeSize,
            backgroundColor: '#ef4444',
            borderRadius: '50%',
            fontSize: badgeFontSize,
            fontWeight: 700,
            color: 'white',
            lineHeight: 1,
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)',
          }}
        >
          1
        </span>
      )}
    </button>
  );
}
