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
  // Current widget (OLD = presence dot, OLD2 = notification badge)
  if (concept === 'OLD' || concept === 'OLD2') {
    const svgSize = size * 0.53;
    const dotSize = size * 0.27;
    const badgeSize = size * 0.33;
    const badgeFontSize = size * 0.2;
    const hasBadge = concept === 'OLD2';

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
        {/* Chat bubble icon from current widget */}
        <svg width={svgSize} height={svgSize} viewBox="0 0 32 32" fill="none">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M16 31.253C24.8366 31.253 32 24.2568 32 15.6265C32 6.99622 24.8366 0 16 0C7.16344 0 0 6.99622 0 15.6265C0 20.3246 2.12281 24.5384 5.48275 27.403C5.6737 27.5658 5.66679 28.2956 5.65892 29.1261C5.64783 30.2967 5.63485 31.6674 6.17143 31.9324C6.69349 32.1902 8.10215 31.6603 9.34549 31.1925C10.2867 30.8384 11.1331 30.52 11.4286 30.6059C12.8771 31.0269 14.4115 31.253 16 31.253ZM15.3555 18.7658C14.6524 18.7658 14.0324 18.2114 14.179 17.5237C14.4684 16.1658 15.4476 15.4685 16.3645 14.8156C17.304 14.1466 18.1781 13.5241 18.1781 12.2854C18.1781 11.0563 17.3077 10.2072 16.0021 10.2072C14.9538 10.2072 14.1803 10.6841 13.8131 11.4902C13.4847 12.2108 12.8616 12.9037 12.0738 12.8228C11.4442 12.7581 10.9396 12.2345 11.0373 11.6091C11.4038 9.26202 13.2741 7.77143 16.0021 7.77143C19.0267 7.77143 21.0286 9.55914 21.0286 12.263C21.0286 14.4969 19.7312 15.3918 18.5671 16.1948C18.0048 16.5827 17.4736 16.9491 17.1348 17.4345C16.6958 18.0634 16.1224 18.7658 15.3555 18.7658ZM17.2424 22.0508C17.2424 23.034 16.5026 23.7714 15.5452 23.7714C14.566 23.7714 13.8479 23.034 13.8479 22.0508C13.8479 21.0675 14.566 20.3301 15.5452 20.3301C16.5026 20.3301 17.2424 21.0675 17.2424 22.0508Z"
            fill="white"
          />
        </svg>

        {/* Green presence dot (OLD only) */}
        {!hasBadge && (
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

        {/* Notification badge (OLD2 only) */}
        {hasBadge && (
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
