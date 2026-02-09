'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CONCEPTS, ConceptId, CONCEPT_LETTER, isCurrentWidget, DEFAULT_BUTTON_COLOR, DEFAULT_PRESENCE_COLOR } from '@/lib/types';
import { extractDominantColor, getFaviconUrl } from '@/lib/colorExtractor';
import WidgetButton from '@/components/WidgetButton';
import ViaSayLogo from '@/components/ViaSayLogo';

const CONCEPT_LABELS: Record<ConceptId, { name: string; description: string }> = {
  B:  { name: 'Nouveau + Présence', description: 'Nouveau logo avec point vert de présence' },
  B2: { name: 'Nouveau + Badge', description: 'Nouveau logo avec badge de notification' },
  D:  { name: 'Nouveau + Présence', description: 'Nouveau logo symétrique avec point vert' },
  D2: { name: 'Nouveau + Badge', description: 'Nouveau logo symétrique avec badge' },
  OLD: { name: 'Actuel + Présence', description: 'Widget actuel avec point vert de présence' },
  OLD2: { name: 'Actuel + Badge', description: 'Widget actuel avec badge de notification' },
};

export default function DemoPage() {
  // Example preview state (loaded from Notion)
  const [exampleLoaded, setExampleLoaded] = useState(false);
  const [exampleScreenshot, setExampleScreenshot] = useState<string | null>(null);
  const [exampleColor, setExampleColor] = useState(DEFAULT_BUTTON_COLOR);
  const [isUsingExample, setIsUsingExample] = useState(true);

  // Site test state
  const [siteUrl, setSiteUrl] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isLoadingSite, setIsLoadingSite] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [buttonColor, setButtonColor] = useState(DEFAULT_BUTTON_COLOR);
  const [presenceColor] = useState(DEFAULT_PRESENCE_COLOR);

  // Load Viasay example on mount
  useEffect(() => {
    async function loadExample() {
      try {
        const response = await fetch('/api/notion/get-example');
        if (response.ok) {
          const data = await response.json();
          if (data.screenshotUrl) {
            setExampleScreenshot(data.screenshotUrl);
            setExampleColor(data.buttonColor || DEFAULT_BUTTON_COLOR);
            setExampleLoaded(true);
          }
        }
      } catch {
        // Silently fail - example is optional
      }
    }
    loadExample();
  }, []);

  // Vote state
  const [selectedConcept, setSelectedConcept] = useState<ConceptId | null>(null);
  const [voterName, setVoterName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  // Section refs for scroll
  const testSectionRef = useRef<HTMLElement>(null);
  const voteSectionRef = useRef<HTMLElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Load site screenshot
  const handleLoadSite = useCallback(async () => {
    if (!siteUrl.trim()) return;
    setIsLoadingSite(true);
    setSiteError(null);

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
          if (color) setButtonColor(color);
        } catch { /* ignore */ }
      }

      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      if (data.error && !data.screenshotUrl) {
        setSiteError(data.error);
      } else if (data.screenshotUrl) {
        setScreenshotUrl(data.screenshotUrl);
        setIsUsingExample(false); // User loaded their own site
      }
    } catch {
      setSiteError('Erreur de connexion');
    } finally {
      setIsLoadingSite(false);
    }
  }, [siteUrl]);

  // Submit community vote
  const handleVote = useCallback(async () => {
    if (!selectedConcept) return;
    setIsSubmitting(true);
    setVoteError(null);

    try {
      const label = `Option ${CONCEPT_LETTER[selectedConcept]} - ${CONCEPT_LABELS[selectedConcept].name}`;

      const response = await fetch('/api/notion/submit-community-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterName: voterName.trim() || undefined,
          conceptId: selectedConcept,
          conceptLabel: label,
          siteUrl: siteUrl.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        setVoteError(data.error || 'Erreur lors du vote');
      } else {
        setVoteSubmitted(true);
      }
    } catch {
      setVoteError('Erreur de connexion');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedConcept, voterName, siteUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="https://www.viasay.io/" target="_blank" rel="noopener noreferrer">
              <ViaSayLogo className="h-7 sm:h-8 w-auto" />
            </a>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scrollTo(testSectionRef)}
              className="text-xs sm:text-sm px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Tester
            </button>
            <button
              onClick={() => scrollTo(voteSectionRef)}
              className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Voter
            </button>
          </div>
        </div>
      </header>

      {/* Section 1: Hero + Concepts */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-12">
          <a href="https://www.viasay.io/" target="_blank" rel="noopener noreferrer" className="inline-block">
            <ViaSayLogo className="h-10 sm:h-12 w-auto mx-auto mb-6" />
          </a>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Quel design de widget préférez-vous ?
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Nous redesignons notre widget de chat. Testez les 6 concepts sur votre site et votez pour votre préféré !
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {CONCEPTS.map((concept) => {
            const meta = CONCEPT_LABELS[concept.id];
            const letter = CONCEPT_LETTER[concept.id];
            const isCurrent = isCurrentWidget(concept.id);
            return (
              <div
                key={concept.id}
                className={`relative rounded-2xl border p-4 sm:p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow ${
                  isCurrent
                    ? 'bg-slate-50 border-slate-300 border-dashed'
                    : 'bg-white border-slate-200'
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-slate-200 text-slate-500 text-[10px] font-medium rounded">
                    actuel
                  </span>
                )}
                <div className="my-6 sm:my-8">
                  <WidgetButton
                    concept={concept.id}
                    buttonColor={isCurrent ? '#636480' : DEFAULT_BUTTON_COLOR}
                    presenceColor={DEFAULT_PRESENCE_COLOR}
                    size={72}
                  />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-1">
                  Option {letter}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {meta.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => scrollTo(testSectionRef)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
          >
            Tester sur votre site
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      </section>

      {/* Section 2: Test on your site */}
      <section ref={testSectionRef} className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              Testez sur votre site
            </h2>
            <p className="text-slate-500">
              Entrez l&apos;URL de votre site pour voir à quoi ressemblera chaque widget
            </p>
          </div>

          {/* URL input */}
          <div className="max-w-xl mx-auto mb-8">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <input
                  type="text"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="www.votre-site.fr"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadSite()}
                />
              </div>
              <button
                onClick={handleLoadSite}
                disabled={isLoadingSite || !siteUrl.trim()}
                className="px-5 sm:px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                {isLoadingSite ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Charger'
                )}
              </button>
            </div>
            {siteError && (
              <p className="mt-2 text-sm text-red-500">{siteError}</p>
            )}
            <p className="mt-2 text-xs text-slate-400 text-center">Certains sites peuvent bloquer la capture automatique</p>
          </div>

          {/* Preview grid - show example by default or user's site */}
          {(() => {
            const currentScreenshot = isUsingExample ? exampleScreenshot : screenshotUrl;
            const currentColor = isUsingExample ? exampleColor : buttonColor;
            const showPreview = currentScreenshot || isLoadingSite;

            if (!showPreview && !exampleLoaded) {
              // Loading state for example
              return (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Chargement de l&apos;exemple...</p>
                </div>
              );
            }

            if (!showPreview) {
              // No example available and no user site
              return (
                <div className="text-center py-12 text-slate-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p>Entrez une URL ci-dessus pour voir les previews</p>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {/* Example banner */}
                {isUsingExample && exampleScreenshot && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-center">
                    <p className="text-blue-800 font-medium mb-1">
                      Exemple : ViaSay.io
                    </p>
                    <p className="text-blue-600 text-sm">
                      Voici à quoi ressemblent les widgets sur un site réel. Testez avec votre propre site ci-dessus !
                    </p>
                  </div>
                )}

                {/* Color picker (only for user's site) */}
                {!isUsingExample && (
                  <div className="max-w-xs mx-auto">
                    <label className="block text-sm font-medium text-slate-600 mb-2 text-center">
                      Couleur du bouton
                    </label>
                    <div className="flex items-center justify-center gap-2">
                      <div className="relative w-10 h-10">
                        <div
                          className="absolute inset-0 rounded-lg border-2 border-slate-300 pointer-events-none"
                          style={{ backgroundColor: buttonColor }}
                        />
                        <input
                          type="color"
                          value={buttonColor}
                          onChange={(e) => setButtonColor(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <input
                        type="text"
                        value={buttonColor}
                        onChange={(e) => setButtonColor(e.target.value)}
                        className="w-24 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CONCEPTS.map((concept) => {
                    const letter = CONCEPT_LETTER[concept.id];
                    const isCurrent = isCurrentWidget(concept.id);
                    return (
                    <div key={concept.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isCurrent ? 'text-slate-400' : 'text-slate-700'}`}>
                          Option {letter}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-500 text-[10px] font-medium rounded">actuel</span>
                        )}
                      </div>
                      <div className={`relative aspect-video bg-white rounded-xl overflow-hidden border shadow-sm ${isCurrent ? 'border-slate-300 border-dashed' : 'border-slate-200'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentScreenshot || ''}
                          alt={`Preview ${concept.id}`}
                          className="w-full h-full object-cover object-top"
                        />
                        <div className="absolute bottom-2 right-2">
                          <WidgetButton
                            concept={concept.id}
                            buttonColor={isCurrent ? '#636480' : currentColor}
                            presenceColor={presenceColor}
                            size={36}
                          />
                        </div>
                        <div className={`absolute top-2 left-2 px-2 py-0.5 backdrop-blur-sm rounded text-xs font-bold text-white ${isCurrent ? 'bg-slate-500/60' : 'bg-black/50'}`}>
                          {letter}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>

                <div className="text-center space-y-3">
                  {isUsingExample && (
                    <p className="text-sm text-slate-500">
                      Entrez votre URL ci-dessus pour personnaliser la preview
                    </p>
                  )}
                  <button
                    onClick={() => scrollTo(voteSectionRef)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Votez pour votre préféré
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Section 3: Vote */}
      <section ref={voteSectionRef} className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {!voteSubmitted ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                Votez pour votre préféré
              </h2>
              <p className="text-slate-500">
                Sélectionnez le concept que vous préférez parmi les 6 propositions
              </p>
            </div>

            {/* Vote cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
              {CONCEPTS.map((concept) => {
                const isSelected = selectedConcept === concept.id;
                const letter = CONCEPT_LETTER[concept.id];
                const isCurrent = isCurrentWidget(concept.id);
                return (
                  <div
                    key={concept.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedConcept(concept.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedConcept(concept.id); } }}
                    className={`relative p-4 sm:p-6 rounded-2xl border-2 transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10'
                        : isCurrent
                          ? 'border-slate-300 border-dashed bg-slate-50 hover:border-slate-400 hover:shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-slate-200 text-slate-500 text-[10px] font-medium rounded">actuel</span>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <WidgetButton
                        concept={concept.id}
                        buttonColor={isCurrent ? '#636480' : DEFAULT_BUTTON_COLOR}
                        presenceColor={DEFAULT_PRESENCE_COLOR}
                        size={40}
                      />
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                      Option {letter}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 hidden sm:block">
                      {CONCEPT_LABELS[concept.id].description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Name field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Votre nom ou pseudo (optionnel)
              </label>
              <input
                type="text"
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
                placeholder="Anonyme"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleVote}
              disabled={!selectedConcept || isSubmitting}
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3 shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Vote en cours...
                </>
              ) : (
                'Voter'
              )}
            </button>

            {voteError && (
              <p className="mt-3 text-sm text-red-500 text-center">{voteError}</p>
            )}
          </div>
        ) : (
          /* Success screen */
          <div className="max-w-md mx-auto text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Merci pour votre vote !
            </h2>
            <p className="text-slate-500 mb-2">
              Vous avez voté pour <span className="font-semibold text-slate-700">Option {CONCEPT_LETTER[selectedConcept!]}</span>
            </p>
            <p className="text-sm text-slate-400">
              Votre avis nous aide à choisir le meilleur design pour notre widget.
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center">
          <a href="https://www.viasay.io/" target="_blank" rel="noopener noreferrer" className="inline-block">
            <ViaSayLogo className="h-6 w-auto mx-auto opacity-40" />
          </a>
          <p className="text-xs text-slate-400 mt-2">Powered by ViaSay</p>
        </div>
      </footer>
    </div>
  );
}
