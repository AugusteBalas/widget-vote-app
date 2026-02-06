'use client';

import { useState, useCallback } from 'react';
import {
  ConceptId,
  CONCEPTS,
  DEFAULT_BUTTON_COLOR,
  DEFAULT_PRESENCE_COLOR,
} from '@/lib/types';
import { extractDominantColor, getFaviconUrl } from '@/lib/colorExtractor';
import ConceptCard from '@/components/ConceptCard';
import ColorPicker from '@/components/ColorPicker';
import SitePreview from '@/components/SitePreview';
import ViaSayLogo from '@/components/ViaSayLogo';
import WidgetButton from '@/components/WidgetButton';
import {
  CursorArrowRaysIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  EyeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export default function Home() {
  // State
  const [selectedConcept, setSelectedConcept] = useState<ConceptId>('B2');
  const [buttonColor, setButtonColor] = useState(DEFAULT_BUTTON_COLOR);
  const [presenceColor, setPresenceColor] = useState(DEFAULT_PRESENCE_COLOR);
  const [siteUrl, setSiteUrl] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [extractedColor, setExtractedColor] = useState<string | null>(null);
  const [isExtractingColor, setIsExtractingColor] = useState(false);

  // Extract color from favicon
  const extractColorFromSite = useCallback(async (url: string) => {
    setIsExtractingColor(true);
    try {
      const faviconUrl = getFaviconUrl(url, 64);
      if (faviconUrl) {
        const color = await extractDominantColor(faviconUrl);
        if (color) {
          setExtractedColor(color);
          // Auto-apply the color
          setButtonColor(color);
        }
      }
    } catch (e) {
      console.error('Color extraction failed:', e);
    } finally {
      setIsExtractingColor(false);
    }
  }, []);

  // Load site screenshot
  const handleLoadSite = useCallback(async () => {
    if (!siteUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setExtractedColor(null);

    try {
      let url = siteUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      // Start color extraction in parallel
      extractColorFromSite(url);

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
      } else if (data.useIframe) {
        setError(
          'Ce site ne peut pas etre capture automatiquement. Essayez un autre site.'
        );
      }
    } catch (err) {
      console.error(err);
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  }, [siteUrl, extractColorFromSite]);

  // Apply extracted color
  const handleApplyExtractedColor = useCallback(() => {
    if (extractedColor) {
      setButtonColor(extractedColor);
    }
  }, [extractedColor]);

  // Submit vote
  const handleSubmitVote = useCallback(() => {
    console.log('Vote submitted:', {
      concept: selectedConcept,
      buttonColor,
      presenceColor,
    });
    setVoteSubmitted(true);
  }, [selectedConcept, buttonColor, presenceColor]);

  const selectedConceptInfo = CONCEPTS.find((c) => c.id === selectedConcept);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <ViaSayLogo className="h-8 w-auto" />
            <h1 className="text-xl font-semibold text-white">Widget Selector</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Choisissez votre icone de widget
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Selectionnez le design qui represente le mieux votre marque, personnalisez les couleurs
            et previsualiser le widget sur votre site.
          </p>

          <div className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-sm">
            <CursorArrowRaysIcon className="w-5 h-5" />
            Cliquez sur une carte pour selectionner
          </div>
        </section>

        {/* Concepts Grid */}
        <section>
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">1</span>
            Selectionnez un concept
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CONCEPTS.map((concept) => (
              <ConceptCard
                key={concept.id}
                concept={concept}
                buttonColor={buttonColor}
                presenceColor={presenceColor}
                isSelected={selectedConcept === concept.id}
                onSelect={() => setSelectedConcept(concept.id)}
              />
            ))}
          </div>
        </section>

        {/* Site Preview - Step 2 */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">2</span>
            <EyeIcon className="w-5 h-5 text-slate-400" />
            Previsualiser sur votre site
          </h3>

          <p className="text-slate-400 text-sm mb-4">
            Entrez l&apos;URL de votre site. La couleur dominante de votre logo sera extraite automatiquement.
          </p>

          <div className="flex gap-4 mb-6">
            <input
              type="url"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://votre-site.com"
              className="flex-1 bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleLoadSite()}
            />
            <button
              onClick={handleLoadSite}
              disabled={isLoading || !siteUrl.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Chargement...
                </>
              ) : (
                'Charger'
              )}
            </button>
          </div>

          {/* Extracted color notification */}
          {extractedColor && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <SparklesIcon className="w-5 h-5 text-green-400" />
                <span className="text-green-400 text-sm">
                  Couleur extraite du favicon :
                </span>
                <div
                  className="w-8 h-8 rounded-lg border-2 border-white/20"
                  style={{ backgroundColor: extractedColor }}
                />
                <span className="text-white font-mono text-sm">{extractedColor}</span>
              </div>
              {buttonColor !== extractedColor && (
                <button
                  onClick={handleApplyExtractedColor}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Appliquer
                </button>
              )}
              {buttonColor === extractedColor && (
                <span className="text-green-400 text-sm flex items-center gap-1">
                  <CheckCircleIcon className="w-4 h-4" />
                  Appliquee
                </span>
              )}
            </div>
          )}

          {isExtractingColor && (
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-blue-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-blue-400 text-sm">Extraction de la couleur en cours...</span>
            </div>
          )}

          <SitePreview
            screenshotUrl={screenshotUrl}
            isLoading={isLoading}
            error={error}
            concept={selectedConcept}
            buttonColor={buttonColor}
            presenceColor={presenceColor}
            onRetry={handleLoadSite}
          />
        </section>

        {/* Customization - Step 3 */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">3</span>
            <Cog6ToothIcon className="w-5 h-5 text-slate-400" />
            Personnalisez les couleurs
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ColorPicker
              label="Couleur du bouton"
              value={buttonColor}
              onChange={setButtonColor}
            />
            <ColorPicker
              label="Couleur de presence"
              value={presenceColor}
              onChange={setPresenceColor}
              presets={['#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899']}
            />
          </div>

          {/* Live preview */}
          <div className="mt-8 pt-6 border-t border-slate-700/50">
            <p className="text-sm text-slate-400 mb-4">Apercu en direct :</p>
            <div className="flex items-center justify-center gap-8 p-8 bg-slate-900/50 rounded-xl flex-wrap">
              {/* Light background */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                  <WidgetButton
                    concept={selectedConcept}
                    buttonColor={buttonColor}
                    presenceColor={presenceColor}
                    size={48}
                  />
                </div>
                <span className="text-xs text-slate-500">Fond clair</span>
              </div>

              {/* Dark background */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
                  <WidgetButton
                    concept={selectedConcept}
                    buttonColor={buttonColor}
                    presenceColor={presenceColor}
                    size={48}
                  />
                </div>
                <span className="text-xs text-slate-500">Fond sombre</span>
              </div>

              {/* Gradient background */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <WidgetButton
                    concept={selectedConcept}
                    buttonColor={buttonColor}
                    presenceColor={presenceColor}
                    size={48}
                  />
                </div>
                <span className="text-xs text-slate-500">Gradient</span>
              </div>
            </div>
          </div>
        </section>

        {/* Vote Section */}
        <section className="text-center py-8 border-t border-slate-700/50">
          {!voteSubmitted ? (
            <>
              <p className="text-slate-400 mb-4">
                Vous avez selectionne :{' '}
                <span className="text-blue-400 font-semibold">
                  Concept {selectedConcept} - {selectedConceptInfo?.name}
                </span>
              </p>

              <button
                onClick={handleSubmitVote}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
              >
                Confirmer mon choix
              </button>
            </>
          ) : (
            <div className="inline-flex flex-col items-center gap-4 p-8 bg-green-500/10 border border-green-500/30 rounded-2xl">
              <CheckCircleIcon className="w-16 h-16 text-green-400" />
              <h3 className="text-xl font-semibold text-white">Merci pour votre choix !</h3>
              <p className="text-slate-400">
                Vous avez selectionne le{' '}
                <span className="text-green-400 font-semibold">
                  Concept {selectedConcept}
                </span>
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-500 text-sm">
            Powered by{' '}
            <a
              href="https://viasay.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              ViaSay
            </a>{' '}
            - L&apos;assistant IA qui comprend vos clients
          </p>
        </div>
      </footer>
    </main>
  );
}
