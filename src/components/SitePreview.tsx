'use client';

import React, { useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { ConceptId } from '@/lib/types';
import WidgetButton from './WidgetButton';
import { ArrowDownTrayIcon, ArrowPathIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface SitePreviewProps {
  screenshotUrl: string | null;
  isLoading: boolean;
  error: string | null;
  concept: ConceptId;
  buttonColor: string;
  presenceColor: string;
  onRetry?: () => void;
}

export default function SitePreview({
  screenshotUrl,
  isLoading,
  error,
  concept,
  buttonColor,
  presenceColor,
  onRetry,
}: SitePreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    if (!previewRef.current || !screenshotUrl) return;

    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `widget-preview-${concept}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [screenshotUrl, concept]);

  return (
    <div className="space-y-4">
      {/* Preview container */}
      <div
        ref={previewRef}
        className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-700"
      >
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-20">
            <div className="w-10 h-10 border-3 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
            <span className="mt-4 text-slate-400 text-sm">Chargement du site...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
              <GlobeAltIcon className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 text-sm mb-4">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reessayer
              </button>
            )}
          </div>
        )}

        {!screenshotUrl && !isLoading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
            <GlobeAltIcon className="w-16 h-16 mb-4 opacity-50" />
            <span className="text-sm">Entrez une URL pour previsualiser</span>
          </div>
        )}

        {screenshotUrl && !isLoading && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshotUrl}
              alt="Site preview"
              className="w-full h-full object-cover object-top"
            />

            {/* Widget overlay */}
            <div className="absolute bottom-6 right-6 z-10">
              <WidgetButton
                concept={concept}
                buttonColor={buttonColor}
                presenceColor={presenceColor}
                size={60}
              />
            </div>
          </>
        )}
      </div>

      {/* Export button */}
      {screenshotUrl && !isLoading && (
        <button
          onClick={handleExport}
          className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          Telecharger l&apos;image
        </button>
      )}
    </div>
  );
}
