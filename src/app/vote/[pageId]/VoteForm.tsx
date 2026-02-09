'use client';

import { useState, useRef } from 'react';
import WidgetButton from '@/components/WidgetButton';
import { DEFAULT_BUTTON_COLOR, DEFAULT_PRESENCE_COLOR, CONCEPT_LETTER, isCurrentWidget } from '@/lib/types';
import ViaSayLogo from '@/components/ViaSayLogo';

interface Design {
  pageId: string;
  title: string;
  description: string;
  recommended: boolean;
  imageUrl: string;
  ranking: string | null;
  comment: string;
}

interface VoteData {
  clientName: string;
  databaseId: string;
  lang: 'fr' | 'en' | 'es';
  labels: {
    ranking: string;
    description: string;
    recommended: string;
    image: string;
    comment: string;
  };
  designs: Design[];
  hasVoted: boolean;
  resultRowId?: string;
  buttonColor?: string;
  presenceColor?: string;
}

const UI_TEXT = {
  fr: {
    heroTitle: 'Quel design de widget préférez-vous ?',
    heroSubtitle: 'Découvrez nos 6 concepts et classez vos 3 préférés',
    previewTitle: 'Aperçu des designs',
    previewSubtitle: 'Voici à quoi ressemblera chaque widget sur votre site',
    buttonColor: 'Couleur du bouton',
    voteTitle: 'Classez vos préférences',
    voteSubtitle: 'Sélectionnez vos 3 designs préférés parmi les 6 propositions',
    rank: 'Classement',
    rankPlaceholder: '—',
    rankOptions: ['1er choix', '2e choix', '3e choix'],
    comment: 'Commentaire (optionnel)',
    commentPlaceholder: 'Dites-nous ce que vous pensez...',
    submit: 'Envoyer mon vote',
    submitting: 'Envoi en cours...',
    success: 'Merci pour votre vote !',
    successSub: 'Vos préférences ont été enregistrées.',
    errorDuplicate: 'Chaque rang ne peut être utilisé qu\'une seule fois',
    errorAll: 'Veuillez sélectionner vos 3 préférés',
    modifyBanner: 'Vous avez déjà voté — vous pouvez modifier vos choix ci-dessous',
    successModified: 'Vote modifié !',
    successModifiedSub: 'Vos nouvelles préférences ont été enregistrées.',
  },
  en: {
    heroTitle: 'Which widget design do you prefer?',
    heroSubtitle: 'Discover our 6 concepts and pick your top 3',
    previewTitle: 'Design preview',
    previewSubtitle: 'Here\'s what each widget will look like on your site',
    buttonColor: 'Button color',
    voteTitle: 'Rank your preferences',
    voteSubtitle: 'Select your top 3 designs from the 6 options',
    rank: 'Ranking',
    rankPlaceholder: '—',
    rankOptions: ['1st choice', '2nd choice', '3rd choice'],
    comment: 'Comment (optional)',
    commentPlaceholder: 'Tell us what you think...',
    submit: 'Submit my vote',
    submitting: 'Submitting...',
    success: 'Thank you for your vote!',
    successSub: 'Your preferences have been recorded.',
    errorDuplicate: 'Each rank can only be used once',
    errorAll: 'Please select your top 3 designs',
    modifyBanner: 'You have already voted — you can modify your choices below',
    successModified: 'Vote modified!',
    successModifiedSub: 'Your new preferences have been recorded.',
  },
  es: {
    heroTitle: '¿Qué diseño de widget prefiere?',
    heroSubtitle: 'Descubra nuestros 6 conceptos y elija sus 3 favoritos',
    previewTitle: 'Vista previa de los diseños',
    previewSubtitle: 'Así es como se verá cada widget en su sitio',
    buttonColor: 'Color del botón',
    voteTitle: 'Clasifique sus preferencias',
    voteSubtitle: 'Seleccione sus 3 diseños favoritos entre las 6 opciones',
    rank: 'Clasificación',
    rankPlaceholder: '—',
    rankOptions: ['1ª opción', '2ª opción', '3ª opción'],
    comment: 'Comentario (opcional)',
    commentPlaceholder: 'Díganos lo que piensa...',
    submit: 'Enviar mi voto',
    submitting: 'Enviando...',
    success: '¡Gracias por su voto!',
    successSub: 'Sus preferencias han sido registradas.',
    errorDuplicate: 'Cada rango solo se puede usar una vez',
    errorAll: 'Por favor seleccione sus 3 diseños favoritos',
    modifyBanner: 'Ya ha votado — puede modificar sus opciones a continuación',
    successModified: '¡Voto modificado!',
    successModifiedSub: 'Sus nuevas preferencias han sido registradas.',
  },
};

// Letter-to-concept mapping (new format: "Option A", "Option B", etc.)
const LETTER_TO_CONCEPT: Record<string, 'B' | 'B2' | 'D' | 'D2' | 'OLD' | 'OLD2'> = {
  A: 'B', B: 'B2', C: 'D', D: 'D2', E: 'OLD', F: 'OLD2',
};

// Order of options (A through F)
const OPTION_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];

// Extract letter from title (e.g., "Option A - ..." -> "A")
function extractLetter(title: string): string | null {
  const match = title.match(/^Option ([A-F])\b/);
  return match ? match[1] : null;
}

// Map design titles to concept IDs for WidgetButton
// Supports both old format ("Option B - ...") and new format ("Option A - ...")
function extractConceptId(title: string): 'B' | 'B2' | 'D' | 'D2' | 'OLD' | 'OLD2' | null {
  // New letter format: "Option A - ...", "Option B - ...", etc.
  const letterMatch = title.match(/^Option ([A-F])\b/);
  if (letterMatch) {
    const mapped = LETTER_TO_CONCEPT[letterMatch[1]];
    if (mapped) return mapped;
  }
  // Legacy format: internal IDs in the title
  if (/\bOLD2\b/i.test(title)) return 'OLD2';
  if (/\bOLD\b/i.test(title)) return 'OLD';
  const match = title.match(/\b(B2|D2|B|D)\b/);
  return match ? (match[1] as 'B' | 'B2' | 'D' | 'D2') : null;
}

// Sort designs by option letter (A, B, C, D, E, F)
function sortDesignsByLetter(designs: Design[]): Design[] {
  return [...designs].sort((a, b) => {
    const letterA = extractLetter(a.title) || 'Z';
    const letterB = extractLetter(b.title) || 'Z';
    return OPTION_ORDER.indexOf(letterA) - OPTION_ORDER.indexOf(letterB);
  });
}

export default function VoteForm({ data, clientPageId }: { data: VoteData; clientPageId: string }) {
  const t = UI_TEXT[data.lang] || UI_TEXT.fr;

  // Sort designs by option letter (A, B, C, D, E, F)
  const sortedDesigns = sortDesignsByLetter(data.designs);

  // Use stored color from Notion if available, otherwise use default
  const [buttonColor, setButtonColor] = useState(data.buttonColor || DEFAULT_BUTTON_COLOR);
  const [rankings, setRankings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const design of sortedDesigns) {
      if (design.ranking) initial[design.pageId] = design.ranking;
    }
    return initial;
  });
  const [comment, setComment] = useState(() => {
    const firstChoice = sortedDesigns.find(d => d.ranking?.includes('1'));
    return firstChoice?.comment || '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const voteSectionRef = useRef<HTMLElement>(null);

  const scrollToVote = () => {
    voteSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Success state
  if (submitted) {
    return (
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-md mx-auto text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {data.hasVoted ? t.successModified : t.success}
          </h2>
          <p className="text-slate-500">
            {data.hasVoted ? t.successModifiedSub : t.successSub}
          </p>
        </div>
      </section>
    );
  }

  const handleRankChange = (designPageId: string, rank: string) => {
    setError(null);
    setRankings((prev) => {
      const next = { ...prev };
      if (rank === '') {
        delete next[designPageId];
      } else {
        for (const key of Object.keys(next)) {
          if (next[key] === rank) delete next[key];
        }
        next[designPageId] = rank;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (Object.keys(rankings).length !== t.rankOptions.length) {
      setError(t.errorAll);
      return;
    }
    const usedRanks = Object.values(rankings);
    if (new Set(usedRanks).size !== usedRanks.length) {
      setError(t.errorDuplicate);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const votes = Object.entries(rankings).map(([pageId, ranking]) => ({
        pageId,
        ranking,
      }));

      const res = await fetch('/api/notion/submit-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          votes,
          comment: comment.trim() || undefined,
          commentPropertyName: data.labels.comment,
          rankingPropertyName: data.labels.ranking,
          clientPageId,
          resultRowId: data.resultRowId,
          lang: data.lang,
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        setError(result.error || 'Error');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Section 1: Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-12">
          <a href="https://www.viasay.io/" target="_blank" rel="noopener noreferrer" className="inline-block">
            <ViaSayLogo className="h-10 sm:h-12 w-auto mx-auto mb-6" />
          </a>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            {t.heroTitle}
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            {t.heroSubtitle}
          </p>
        </div>

        {/* Widget concepts overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {sortedDesigns.map((design) => {
            const conceptId = extractConceptId(design.title);
            const letter = conceptId ? CONCEPT_LETTER[conceptId] : null;
            const isCurrent = conceptId ? isCurrentWidget(conceptId) : false;
            return (
              <div
                key={design.pageId}
                className={`relative rounded-2xl border p-4 sm:p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow ${
                  isCurrent
                    ? 'bg-slate-50 border-slate-300 border-dashed'
                    : 'bg-white border-slate-200'
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-slate-200 text-slate-500 text-[10px] font-medium rounded">
                    {data.lang === 'en' ? 'current' : data.lang === 'es' ? 'actual' : 'actuel'}
                  </span>
                )}
                <div className="my-6 sm:my-8">
                  {conceptId ? (
                    <WidgetButton
                      concept={conceptId}
                      buttonColor={isCurrent ? '#636480' : buttonColor}
                      presenceColor={DEFAULT_PRESENCE_COLOR}
                      size={72}
                    />
                  ) : (
                    <div className="w-[72px] h-[72px] bg-slate-200 rounded-full" />
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-1">
                  {letter ? `Option ${letter}` : design.description}
                </h3>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={scrollToVote}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
          >
            {t.voteTitle}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      </section>

      {/* Section 2: Preview images + color picker */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              {t.previewTitle}
            </h2>
            <p className="text-slate-500">
              {t.previewSubtitle}
            </p>
          </div>

          {/* Color picker */}
          <div className="max-w-xs mx-auto mb-8">
            <label className="block text-sm font-medium text-slate-600 mb-2 text-center">
              {t.buttonColor}
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

          {/* Preview grid with Notion images */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedDesigns.map((design) => {
              const conceptId = extractConceptId(design.title);
              const letter = conceptId ? CONCEPT_LETTER[conceptId] : null;
              const isCurrent = conceptId ? isCurrentWidget(conceptId) : false;
              return (
                <div key={design.pageId} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isCurrent ? 'text-slate-400' : 'text-slate-700'}`}>
                      {letter ? `Option ${letter}` : design.description}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 bg-slate-200 text-slate-500 text-[10px] font-medium rounded">
                        {data.lang === 'en' ? 'current' : data.lang === 'es' ? 'actual' : 'actuel'}
                      </span>
                    )}
                  </div>
                  <div className={`relative aspect-video bg-white rounded-xl overflow-hidden border shadow-sm ${isCurrent ? 'border-slate-300 border-dashed' : 'border-slate-200'}`}>
                    {design.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={design.imageUrl}
                        alt={design.title}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
                        No preview
                      </div>
                    )}
                    {conceptId && (
                      <div className="absolute bottom-2 right-2">
                        <WidgetButton
                          concept={conceptId}
                          buttonColor={isCurrent ? '#636480' : buttonColor}
                          presenceColor={DEFAULT_PRESENCE_COLOR}
                          size={36}
                        />
                      </div>
                    )}
                    <div className={`absolute top-2 left-2 px-2 py-0.5 backdrop-blur-sm rounded text-xs font-bold text-white ${isCurrent ? 'bg-slate-500/60' : 'bg-black/50'}`}>
                      {letter || '?'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={scrollToVote}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              {t.voteTitle}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Vote */}
      <section ref={voteSectionRef} className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              {t.voteTitle}
            </h2>
            <p className="text-slate-500">
              {t.voteSubtitle}
            </p>
          </div>

          {/* Modify banner */}
          {data.hasVoted && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm text-center">
              {t.modifyBanner}
            </div>
          )}

          {/* Design vote cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {sortedDesigns.map((design) => {
              const currentRank = rankings[design.pageId] || '';
              const conceptId = extractConceptId(design.title);
              const letter = conceptId ? CONCEPT_LETTER[conceptId] : null;
              const isCurrent = conceptId ? isCurrentWidget(conceptId) : false;

              return (
                <div
                  key={design.pageId}
                  className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                    currentRank
                      ? 'border-blue-400 bg-blue-50 shadow-lg shadow-blue-100'
                      : isCurrent
                        ? 'border-slate-300 border-dashed bg-slate-50 hover:border-slate-400 hover:shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {isCurrent && !currentRank && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-slate-200 text-slate-500 text-[10px] font-medium rounded">
                      {data.lang === 'en' ? 'current' : data.lang === 'es' ? 'actual' : 'actuel'}
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    {conceptId && (
                      <WidgetButton
                        concept={conceptId}
                        buttonColor={isCurrent ? '#636480' : buttonColor}
                        presenceColor={DEFAULT_PRESENCE_COLOR}
                        size={40}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                        {letter ? `Option ${letter}` : design.description}
                      </h3>
                    </div>
                  </div>

                  {/* Rank selector */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700">{t.rank}:</label>
                    <div className="relative flex-1">
                      <select
                        value={currentRank}
                        onChange={(e) => handleRankChange(design.pageId, e.target.value)}
                        className={`w-full appearance-none px-3 py-2 pr-8 rounded-lg border text-sm cursor-pointer transition-colors ${
                          currentRank
                            ? 'border-blue-300 bg-blue-50 text-blue-700 font-medium'
                            : 'border-slate-300 bg-white text-slate-600'
                        }`}
                      >
                        <option value="">{t.rankPlaceholder}</option>
                        {t.rankOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-600 mb-2">
              {t.comment}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t.commentPlaceholder}
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3 shadow-lg"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t.submitting}
              </>
            ) : (
              t.submit
            )}
          </button>
        </div>
      </section>
    </>
  );
}
