'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { CONCEPTS, CONCEPT_LETTER, isCurrentWidget, DEFAULT_BUTTON_COLOR, DEFAULT_PRESENCE_COLOR } from '@/lib/types';
import { extractDominantColor, getFaviconUrl } from '@/lib/colorExtractor';
import WidgetButton from '@/components/WidgetButton';
import ColorPicker from '@/components/ColorPicker';
import ViaSayLogo from '@/components/ViaSayLogo';
import {
  GlobeAltIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  QueueListIcon,
  XMarkIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

type Lang = 'fr' | 'en' | 'es';

const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
];

interface BatchItem {
  url: string;
  clientName: string;
  screenshotUrl: string | null;
  buttonColor: string;
  presenceColor: string;
  voteUrl: string;
  status: 'pending' | 'loaded' | 'published' | 'error';
  error?: string;
}

export default function GeneratePage() {
  // Mode selection
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Form state
  const [clientName, setClientName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [lang, setLang] = useState<Lang>('fr');
  const [buttonColor, setButtonColor] = useState(DEFAULT_BUTTON_COLOR);
  const [presenceColor, setPresenceColor] = useState(DEFAULT_PRESENCE_COLOR);

  // Process state
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isLoadingSite, setIsLoadingSite] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedColor, setExtractedColor] = useState<string | null>(null);
  const [notionPageUrl, setNotionPageUrl] = useState<string | null>(null);
  const [votePageId, setVotePageId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Batch mode state
  const [batchUrls, setBatchUrls] = useState('');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(-1);
  const [batchStep, setBatchStep] = useState<'input' | 'review' | 'done'>('input');
  const [isLoadingBatchItem, setIsLoadingBatchItem] = useState(false);

  // Sanitize client name for filename
  const sanitizedClientName = clientName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'client';

  // Slug for vote URL
  const clientSlug = clientName
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || '';

  // Extract client name from URL
  const extractClientNameFromUrl = (url: string): string => {
    try {
      const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      const domain = hostname.replace(/^www\./, '').split('.')[0];
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch {
      return url;
    }
  };

  // Paste image from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // For single mode step 2
      if (mode === 'single' && currentStep === 2) {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (!file) continue;
            const reader = new FileReader();
            reader.onload = () => setScreenshotUrl(reader.result as string);
            reader.readAsDataURL(file);
            break;
          }
        }
      }
      // For batch mode review
      if (mode === 'batch' && batchStep === 'review' && currentBatchIndex >= 0) {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (!file) continue;
            const reader = new FileReader();
            reader.onload = () => {
              setBatchItems(prev => prev.map((item, idx) =>
                idx === currentBatchIndex ? { ...item, screenshotUrl: reader.result as string } : item
              ));
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [currentStep, mode, batchStep, currentBatchIndex]);

  // Load site and extract color
  const handleLoadSite = useCallback(async () => {
    if (!siteUrl.trim()) return;

    setIsLoadingSite(true);
    setError(null);

    try {
      let url = siteUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      // Extract color from favicon
      const faviconUrl = getFaviconUrl(url, 64);
      if (faviconUrl) {
        try {
          const color = await extractDominantColor(faviconUrl);
          if (color) {
            setExtractedColor(color);
            setButtonColor(color);
          }
        } catch (e) {
          console.error('Color extraction failed:', e);
        }
      }

      // Get screenshot
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.error && !data.screenshotUrl) {
        setError(data.error);
      } else if (data.screenshotUrl) {
        setScreenshotUrl(data.screenshotUrl);
        setCurrentStep(2);
      }
    } catch (err) {
      console.error(err);
      setError('Erreur de connexion');
    } finally {
      setIsLoadingSite(false);
    }
  }, [siteUrl]);

  // Export images in memory + publish to Notion
  const handlePublishToNotion = useCallback(async () => {
    if (!screenshotUrl) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const response = await fetch('/api/notion/create-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName || undefined,
          siteUrl,
          lang,
          screenshotUrl: screenshotUrl,
          buttonColor,
          presenceColor,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setPublishError(data.error || 'Erreur lors de la publication');
      } else {
        setNotionPageUrl(data.pageUrl);
        setVotePageId(data.pageId);
        if (data.clientName && !clientName) {
          setClientName(data.clientName);
        }
        setCurrentStep(3);
      }
    } catch (err) {
      console.error('Publish to Notion failed:', err);
      setPublishError('Erreur de connexion au serveur');
    } finally {
      setIsPublishing(false);
    }
  }, [screenshotUrl, clientName, siteUrl, lang, buttonColor, presenceColor]);

  // Batch: Parse URLs and start review
  const handleStartBatchReview = useCallback(() => {
    const urls = batchUrls
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));

    if (urls.length === 0) return;

    const items: BatchItem[] = urls.map(url => ({
      url,
      clientName: extractClientNameFromUrl(url),
      screenshotUrl: null,
      buttonColor: DEFAULT_BUTTON_COLOR,
      presenceColor: presenceColor,
      voteUrl: '',
      status: 'pending',
    }));

    setBatchItems(items);
    setCurrentBatchIndex(0);
    setBatchStep('review');
  }, [batchUrls, presenceColor]);

  // Batch: Load current item's screenshot and color
  const handleLoadBatchItem = useCallback(async () => {
    if (currentBatchIndex < 0 || currentBatchIndex >= batchItems.length) return;

    const item = batchItems[currentBatchIndex];
    setIsLoadingBatchItem(true);

    try {
      let url = item.url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      // Extract color from favicon
      let extractedButtonColor = item.buttonColor;
      const faviconUrl = getFaviconUrl(url, 64);
      if (faviconUrl) {
        try {
          const color = await extractDominantColor(faviconUrl);
          if (color) {
            extractedButtonColor = color;
          }
        } catch {
          // Keep default
        }
      }

      // Get screenshot
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();

      setBatchItems(prev => prev.map((it, idx) =>
        idx === currentBatchIndex ? {
          ...it,
          screenshotUrl: data.screenshotUrl || null,
          buttonColor: extractedButtonColor,
          status: data.screenshotUrl ? 'loaded' : 'error',
          error: data.screenshotUrl ? undefined : (data.error || 'Screenshot failed'),
        } : it
      ));
    } catch (err) {
      setBatchItems(prev => prev.map((it, idx) =>
        idx === currentBatchIndex ? {
          ...it,
          status: 'error',
          error: err instanceof Error ? err.message : 'Erreur inconnue',
        } : it
      ));
    } finally {
      setIsLoadingBatchItem(false);
    }
  }, [currentBatchIndex, batchItems]);

  // Load batch item when index changes
  useEffect(() => {
    if (batchStep === 'review' && currentBatchIndex >= 0 && currentBatchIndex < batchItems.length) {
      const item = batchItems[currentBatchIndex];
      if (item.status === 'pending') {
        handleLoadBatchItem();
      }
    }
  }, [currentBatchIndex, batchStep, batchItems, handleLoadBatchItem]);

  // Batch: Publish current item and move to next
  const handlePublishBatchItem = useCallback(async () => {
    if (currentBatchIndex < 0 || currentBatchIndex >= batchItems.length) return;

    const item = batchItems[currentBatchIndex];
    if (!item.screenshotUrl) return;

    setIsPublishing(true);

    try {
      const response = await fetch('/api/notion/create-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: item.clientName,
          siteUrl: item.url,
          lang,
          screenshotUrl: item.screenshotUrl,
          buttonColor: item.buttonColor,
          presenceColor: item.presenceColor,
        }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setBatchItems(prev => prev.map((it, idx) =>
          idx === currentBatchIndex ? { ...it, status: 'error', error: data.error } : it
        ));
      } else {
        setBatchItems(prev => prev.map((it, idx) =>
          idx === currentBatchIndex ? {
            ...it,
            status: 'published',
            voteUrl: data.voteUrl,
            clientName: data.clientName || it.clientName,
          } : it
        ));

        // Move to next item or finish
        if (currentBatchIndex < batchItems.length - 1) {
          setCurrentBatchIndex(currentBatchIndex + 1);
        } else {
          setBatchStep('done');
        }
      }
    } catch (err) {
      setBatchItems(prev => prev.map((it, idx) =>
        idx === currentBatchIndex ? {
          ...it,
          status: 'error',
          error: err instanceof Error ? err.message : 'Erreur inconnue',
        } : it
      ));
    } finally {
      setIsPublishing(false);
    }
  }, [currentBatchIndex, batchItems, lang]);

  // Batch: Skip current item
  const handleSkipBatchItem = useCallback(() => {
    if (currentBatchIndex < batchItems.length - 1) {
      setCurrentBatchIndex(currentBatchIndex + 1);
    } else {
      setBatchStep('done');
    }
  }, [currentBatchIndex, batchItems.length]);

  // Batch: Update current item's properties
  const updateCurrentBatchItem = useCallback((updates: Partial<BatchItem>) => {
    setBatchItems(prev => prev.map((item, idx) =>
      idx === currentBatchIndex ? { ...item, ...updates } : item
    ));
  }, [currentBatchIndex]);

  // Current batch item
  const currentItem = currentBatchIndex >= 0 && currentBatchIndex < batchItems.length
    ? batchItems[currentBatchIndex]
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ViaSayLogo className="h-8 w-auto" />
              <div>
                <h1 className="text-xl font-semibold text-white">Générateur de Vote</h1>
                <p className="text-xs text-slate-400">Créez les previews pour vos clients</p>
              </div>
            </div>
            <a
              href="/"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Retour au sélecteur
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Mode Toggle */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            onClick={() => { setMode('single'); setBatchStep('input'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'single'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            <GlobeAltIcon className="w-4 h-4" />
            Un seul site
          </button>
          <button
            onClick={() => { setMode('batch'); setCurrentStep(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'batch'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            <QueueListIcon className="w-4 h-4" />
            Batch (plusieurs URLs)
          </button>
        </div>

        {/* ============== BATCH MODE ============== */}
        {mode === 'batch' && (
          <>
            {/* Batch Step 1: Input URLs */}
            {batchStep === 'input' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Génération en lot
                  </h2>
                  <p className="text-slate-400">
                    Collez une liste d&apos;URLs (une par ligne) pour les vérifier et publier une par une
                  </p>
                </div>

                {/* Language & Presence Color */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Langue
                    </label>
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as Lang)}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {LANG_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.flag} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Couleur présence (par défaut)
                    </label>
                    <input
                      type="color"
                      value={presenceColor}
                      onChange={(e) => setPresenceColor(e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Liste des URLs (une par ligne)
                  </label>
                  <textarea
                    value={batchUrls}
                    onChange={(e) => setBatchUrls(e.target.value)}
                    placeholder="www.example1.com&#10;www.example2.com&#10;www.example3.com"
                    rows={10}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Les lignes commençant par # sont ignorées
                  </p>
                </div>

                {/* Start Button */}
                <button
                  onClick={handleStartBatchReview}
                  disabled={!batchUrls.trim()}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3"
                >
                  <SparklesIcon className="w-5 h-5" />
                  Commencer la vérification
                </button>
              </div>
            )}

            {/* Batch Step 2: Review each item */}
            {batchStep === 'review' && currentItem && (
              <div className="space-y-6">
                {/* Progress indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">
                      Client {currentBatchIndex + 1} / {batchItems.length}
                    </span>
                    <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${((currentBatchIndex + 1) / batchItems.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {batchItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          item.status === 'published' ? 'bg-green-500/20 text-green-400' :
                          item.status === 'error' ? 'bg-red-500/20 text-red-400' :
                          idx === currentBatchIndex ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500' :
                          'bg-slate-700 text-slate-500'
                        }`}
                      >
                        {item.status === 'published' ? '✓' : item.status === 'error' ? '✗' : idx + 1}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current item header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {currentItem.clientName}
                    </h2>
                    <p className="text-slate-400 text-sm">{currentItem.url}</p>
                  </div>
                  <button
                    onClick={handleSkipBatchItem}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Passer →
                  </button>
                </div>

                {/* Loading state */}
                {isLoadingBatchItem && (
                  <div className="flex items-center justify-center py-20">
                    <ArrowPathIcon className="w-8 h-8 text-blue-400 animate-spin" />
                    <span className="ml-3 text-slate-400">Chargement du screenshot...</span>
                  </div>
                )}

                {/* Error state */}
                {currentItem.status === 'error' && !isLoadingBatchItem && (
                  <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                    <XMarkIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <p className="text-red-400 mb-4">{currentItem.error}</p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={handleLoadBatchItem}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                      >
                        Réessayer
                      </button>
                      <button
                        onClick={handleSkipBatchItem}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                      >
                        Passer
                      </button>
                    </div>
                  </div>
                )}

                {/* Loaded state - show preview and controls */}
                {currentItem.status === 'loaded' && currentItem.screenshotUrl && !isLoadingBatchItem && (
                  <>
                    {/* Client name edit */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Nom du client
                      </label>
                      <input
                        type="text"
                        value={currentItem.clientName}
                        onChange={(e) => updateCurrentBatchItem({ clientName: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Replace screenshot */}
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Remplacer le screenshot
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors cursor-pointer">
                          Choisir un fichier
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => updateCurrentBatchItem({ screenshotUrl: reader.result as string });
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        <span className="text-xs text-slate-500">ou collez une image (Ctrl+V)</span>
                      </div>
                    </div>

                    {/* Color pickers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                          Couleur du bouton
                        </label>
                        <ColorPicker
                          value={currentItem.buttonColor}
                          onChange={(color) => updateCurrentBatchItem({ buttonColor: color })}
                          label="Bouton"
                        />
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                          Couleur de présence
                        </label>
                        <ColorPicker
                          value={currentItem.presenceColor}
                          onChange={(color) => updateCurrentBatchItem({ presenceColor: color })}
                          label="Présence"
                        />
                      </div>
                    </div>

                    {/* Preview Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {CONCEPTS.map((concept) => {
                        const letter = CONCEPT_LETTER[concept.id];
                        const isCurrent = isCurrentWidget(concept.id);
                        return (
                          <div key={concept.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${isCurrent ? 'text-slate-500' : 'text-slate-300'}`}>
                                Option {letter}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 bg-slate-600 text-slate-400 text-[10px] font-medium rounded">actuel</span>
                              )}
                            </div>
                            <div
                              className={`relative aspect-video bg-slate-900 rounded-xl overflow-hidden border ${isCurrent ? 'border-slate-600 border-dashed' : 'border-slate-700'}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={currentItem.screenshotUrl || ''}
                                alt={`Preview ${concept.id}`}
                                className="w-full h-full object-cover object-top"
                              />
                              <div className="absolute bottom-4 right-4">
                                <WidgetButton
                                  concept={concept.id}
                                  buttonColor={currentItem.buttonColor}
                                  presenceColor={currentItem.presenceColor}
                                  size={48}
                                />
                              </div>
                              <div className={`absolute top-2 left-2 px-2 py-1 backdrop-blur-sm rounded text-xs font-bold text-white ${isCurrent ? 'bg-slate-500/60' : 'bg-black/60'}`}>
                                {letter}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Publish Button */}
                    <button
                      onClick={handlePublishBatchItem}
                      disabled={isPublishing}
                      className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg"
                    >
                      {isPublishing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Publication en cours...
                        </>
                      ) : (
                        <>
                          <ArrowTopRightOnSquareIcon className="w-6 h-6" />
                          Publier et passer au suivant
                          <ChevronRightIcon className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Batch Step 3: Done */}
            {batchStep === 'done' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-2xl mb-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Génération terminée !
                  </h2>
                  <p className="text-slate-400">
                    {batchItems.filter(i => i.status === 'published').length} / {batchItems.length} clients publiés
                  </p>
                </div>

                {/* Results list */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {batchItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border ${
                        item.status === 'published'
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {item.status === 'published' ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-400" />
                          ) : (
                            <XMarkIcon className="w-5 h-5 text-red-400" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">{item.clientName}</p>
                            <p className="text-xs text-slate-400">{item.url}</p>
                            {item.error && (
                              <p className="text-xs text-red-400">{item.error}</p>
                            )}
                          </div>
                        </div>
                        {item.status === 'published' && item.voteUrl && (
                          <button
                            onClick={() => navigator.clipboard.writeText(item.voteUrl)}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
                          >
                            Copier lien
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Copy all + Reset */}
                <div className="flex gap-3">
                  {batchItems.filter(i => i.status === 'published').length > 0 && (
                    <button
                      onClick={() => {
                        const links = batchItems
                          .filter(i => i.status === 'published')
                          .map(i => `${i.clientName}: ${i.voteUrl}`)
                          .join('\n');
                        navigator.clipboard.writeText(links);
                      }}
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                    >
                      Copier tous les liens ({batchItems.filter(i => i.status === 'published').length})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setBatchItems([]);
                      setBatchUrls('');
                      setCurrentBatchIndex(-1);
                      setBatchStep('input');
                    }}
                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
                  >
                    Nouveau batch
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============== SINGLE MODE ============== */}
        {mode === 'single' && (
          <>
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-4 mb-12">
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                      currentStep >= step
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {currentStep > step ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    ) : (
                      <span className="w-5 h-5 flex items-center justify-center text-sm font-medium">
                        {step}
                      </span>
                    )}
                    <span className="text-sm font-medium">
                      {step === 1 && 'Configuration'}
                      {step === 2 && 'Personnalisation'}
                      {step === 3 && 'Publié'}
                    </span>
                  </div>
                  {step < 3 && <div className="w-12 h-px bg-slate-700" />}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Configuration */}
            {currentStep === 1 && (
              <div className="max-w-xl mx-auto space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Configuration du client
                  </h2>
                  <p className="text-slate-400">
                    Entrez les informations du client pour générer les previews
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nom du client <span className="text-slate-500">(optionnel - auto-extrait de l&apos;URL)</span>
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: Société ABC"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Fichiers: {sanitizedClientName}-widget-B.png, etc.
                    </p>
                    {clientSlug && (
                      <p className="mt-1 text-xs text-blue-400">
                        Lien de vote : /vote/{clientSlug}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      URL du site client
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <GlobeAltIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                          type="text"
                          value={siteUrl}
                          onChange={(e) => setSiteUrl(e.target.value)}
                          placeholder="www.exemple.fr"
                          className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onKeyDown={(e) => e.key === 'Enter' && handleLoadSite()}
                        />
                      </div>
                      <button
                        onClick={handleLoadSite}
                        disabled={isLoadingSite || !siteUrl.trim()}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                      >
                        {isLoadingSite ? (
                          <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        ) : (
                          <SparklesIcon className="w-5 h-5" />
                        )}
                        Charger
                      </button>
                    </div>
                  </div>

                  {/* Language selector */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Langue du formulaire
                    </label>
                    <div className="flex gap-2">
                      {LANG_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setLang(opt.value)}
                          className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                            lang === opt.value
                              ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <span className="mr-2">{opt.flag}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Customization & Publish */}
            {currentStep === 2 && screenshotUrl && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      Personnalisation
                    </h2>
                    <p className="text-slate-400">
                      Ajustez les couleurs puis publiez sur Notion
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    ← Modifier l&apos;URL
                  </button>
                </div>

                {/* Replace screenshot */}
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Remplacer le screenshot
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors cursor-pointer">
                      Choisir un fichier
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => setScreenshotUrl(reader.result as string);
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    <span className="text-xs text-slate-500">ou collez une image (Ctrl+V)</span>
                  </div>
                </div>

                {/* Color pickers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Couleur du bouton
                      {extractedColor && (
                        <span className="ml-2 text-xs text-green-400">
                          (extraite du favicon)
                        </span>
                      )}
                    </label>
                    <ColorPicker
                      value={buttonColor}
                      onChange={setButtonColor}
                      label="Bouton"
                    />
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Couleur de présence
                    </label>
                    <ColorPicker
                      value={presenceColor}
                      onChange={setPresenceColor}
                      label="Présence"
                    />
                  </div>
                </div>

                {/* Preview Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {CONCEPTS.map((concept) => {
                    const letter = CONCEPT_LETTER[concept.id];
                    const isCurrent = isCurrentWidget(concept.id);
                    return (
                    <div key={concept.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isCurrent ? 'text-slate-500' : 'text-slate-300'}`}>
                          Option {letter}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 bg-slate-600 text-slate-400 text-[10px] font-medium rounded">actuel</span>
                        )}
                        {concept.recommended && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                            ⭐ Recommandé
                          </span>
                        )}
                      </div>
                      <div
                        className={`relative aspect-video bg-slate-900 rounded-xl overflow-hidden border ${isCurrent ? 'border-slate-600 border-dashed' : 'border-slate-700'}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={screenshotUrl}
                          alt={`Preview ${concept.id}`}
                          className="w-full h-full object-cover object-top"
                        />
                        <div className="absolute bottom-4 right-4">
                          <WidgetButton
                            concept={concept.id}
                            buttonColor={buttonColor}
                            presenceColor={presenceColor}
                            size={48}
                          />
                        </div>
                        <div className={`absolute top-2 left-2 px-2 py-1 backdrop-blur-sm rounded text-xs font-bold text-white ${isCurrent ? 'bg-slate-500/60' : 'bg-black/60'}`}>
                          {letter}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>

                {/* Publish Button */}
                <button
                  onClick={handlePublishToNotion}
                  disabled={isPublishing}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg"
                >
                  {isPublishing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Publication en cours...
                    </>
                  ) : (
                    <>
                      <ArrowTopRightOnSquareIcon className="w-6 h-6" />
                      Publier sur Notion
                    </>
                  )}
                </button>

                {publishError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {publishError}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Published */}
            {currentStep === 3 && votePageId && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-2xl mb-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Page de vote créée !
                  </h2>
                  <p className="text-slate-400">
                    Partagez le lien ci-dessous avec votre client
                  </p>
                </div>

                {/* Vote link + copy */}
                <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl space-y-4">
                  <label className="block text-sm font-medium text-slate-300">
                    Lien de vote à partager :
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={`${window.location.origin}/vote/${clientSlug || votePageId}`}
                      className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm font-mono select-all"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/vote/${clientSlug || votePageId}`);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      {linkCopied ? '✓ Copié !' : 'Copier le lien'}
                    </button>
                  </div>
                </div>

                {/* Secondary: Notion link */}
                {notionPageUrl && (
                  <div className="text-center">
                    <a
                      href={notionPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      Voir les résultats dans Notion
                    </a>
                  </div>
                )}

                {/* New export button */}
                <button
                  onClick={() => {
                    setCurrentStep(1);
                    setScreenshotUrl(null);
                    setNotionPageUrl(null);
                    setVotePageId(null);
                    setPublishError(null);
                    setClientName('');
                    setSiteUrl('');
                    setLinkCopied(false);
                  }}
                  className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
                >
                  Générer pour un autre client
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
