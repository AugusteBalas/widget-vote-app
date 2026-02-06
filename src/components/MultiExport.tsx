'use client';

import React, { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { CONCEPTS, ConceptId } from '@/lib/types';
import WidgetButton from './WidgetButton';
import { ArrowDownTrayIcon, PhotoIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface MultiExportProps {
  screenshotUrl: string;
  buttonColor: string;
  presenceColor: string;
  clientName?: string;
}

interface ExportStatus {
  [key: string]: 'pending' | 'exporting' | 'done' | 'error';
}

export default function MultiExport({
  screenshotUrl,
  buttonColor,
  presenceColor,
  clientName = 'client',
}: MultiExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>({});
  const previewRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Sanitize client name for filename
  const sanitizedClientName = clientName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'client';

  const exportSingleVariant = useCallback(async (conceptId: ConceptId): Promise<string | null> => {
    const ref = previewRefs.current[conceptId];
    if (!ref) return null;

    try {
      const dataUrl = await toPng(ref, {
        quality: 1,
        pixelRatio: 2,
      });
      return dataUrl;
    } catch (err) {
      console.error(`Export failed for ${conceptId}:`, err);
      return null;
    }
  }, []);

  const downloadImage = useCallback((dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }, []);

  const handleExportAll = useCallback(async () => {
    setIsExporting(true);

    // Initialize status
    const initialStatus: ExportStatus = {};
    CONCEPTS.forEach(c => { initialStatus[c.id] = 'pending'; });
    setExportStatus(initialStatus);

    // Export each variant sequentially with small delay
    for (const concept of CONCEPTS) {
      setExportStatus(prev => ({ ...prev, [concept.id]: 'exporting' }));

      const dataUrl = await exportSingleVariant(concept.id);

      if (dataUrl) {
        const filename = `${sanitizedClientName}-widget-${concept.id}.png`;
        downloadImage(dataUrl, filename);
        setExportStatus(prev => ({ ...prev, [concept.id]: 'done' }));
      } else {
        setExportStatus(prev => ({ ...prev, [concept.id]: 'error' }));
      }

      // Small delay between downloads to avoid browser blocking
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsExporting(false);
  }, [exportSingleVariant, downloadImage, sanitizedClientName]);

  const handleExportSingle = useCallback(async (conceptId: ConceptId) => {
    setExportStatus(prev => ({ ...prev, [conceptId]: 'exporting' }));

    const dataUrl = await exportSingleVariant(conceptId);

    if (dataUrl) {
      const filename = `${sanitizedClientName}-widget-${conceptId}.png`;
      downloadImage(dataUrl, filename);
      setExportStatus(prev => ({ ...prev, [conceptId]: 'done' }));
    } else {
      setExportStatus(prev => ({ ...prev, [conceptId]: 'error' }));
    }
  }, [exportSingleVariant, downloadImage, sanitizedClientName]);

  return (
    <div className="space-y-6">
      {/* Export All Button */}
      <button
        onClick={handleExportAll}
        disabled={isExporting}
        className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg"
      >
        {isExporting ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Export en cours...
          </>
        ) : (
          <>
            <ArrowDownTrayIcon className="w-6 h-6" />
            Exporter les 4 variants
          </>
        )}
      </button>

      {/* Preview Grid - Hidden but used for export */}
      <div className="grid grid-cols-2 gap-4">
        {CONCEPTS.map((concept) => (
          <div key={concept.id} className="space-y-2">
            {/* Label */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">
                {concept.name} ({concept.id})
                {concept.recommended && (
                  <span className="ml-2 text-xs text-green-400">★ Recommandé</span>
                )}
              </span>
              <button
                onClick={() => handleExportSingle(concept.id)}
                disabled={isExporting}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                title={`Exporter ${concept.id}`}
              >
                {exportStatus[concept.id] === 'done' ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                ) : exportStatus[concept.id] === 'exporting' ? (
                  <div className="w-5 h-5 border-2 border-slate-500 border-t-blue-400 rounded-full animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="w-5 h-5 text-slate-400" />
                )}
              </button>
            </div>

            {/* Preview Card */}
            <div
              ref={(el) => { previewRefs.current[concept.id] = el; }}
              className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-700"
            >
              {/* Screenshot */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotUrl}
                alt={`Preview ${concept.id}`}
                className="w-full h-full object-cover object-top"
              />

              {/* Widget overlay */}
              <div className="absolute bottom-3 right-3">
                <WidgetButton
                  concept={concept.id}
                  buttonColor={buttonColor}
                  presenceColor={presenceColor}
                  size={40}
                />
              </div>

              {/* Concept badge */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs font-medium text-white">
                {concept.id}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filename preview */}
      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
          <PhotoIcon className="w-4 h-4" />
          Fichiers générés :
        </div>
        <div className="space-y-1 text-xs font-mono text-slate-500">
          {CONCEPTS.map(c => (
            <div key={c.id} className="flex items-center gap-2">
              {exportStatus[c.id] === 'done' && <CheckCircleIcon className="w-4 h-4 text-green-400" />}
              <span>{sanitizedClientName}-widget-{c.id}.png</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
