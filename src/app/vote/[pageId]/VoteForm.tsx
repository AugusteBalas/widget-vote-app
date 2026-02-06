'use client';

import { useState } from 'react';

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
}

const UI_TEXT = {
  fr: {
    title: 'Quel design préférez-vous ?',
    subtitle: 'Classez les 4 designs du plus au moins apprécié',
    rank: 'Classement',
    rankPlaceholder: '—',
    rankOptions: ['1er choix', '2e choix', '3e choix', '4e choix'],
    comment: 'Commentaire (optionnel)',
    commentPlaceholder: 'Dites-nous ce que vous pensez...',
    submit: 'Envoyer mon vote',
    submitting: 'Envoi en cours...',
    success: 'Merci pour votre vote !',
    successSub: 'Vos préférences ont été enregistrées.',
    alreadyVoted: 'Vote déjà enregistré',
    alreadyVotedSub: 'Les préférences ont déjà été soumises pour ce sondage.',
    recommended: 'Recommandé',
    errorDuplicate: 'Chaque rang ne peut être utilisé qu\'une seule fois',
    errorAll: 'Veuillez classer les 4 designs',
    modifyBanner: 'Vous avez déjà voté — vous pouvez modifier vos choix ci-dessous',
    successModified: 'Vote modifié !',
    successModifiedSub: 'Vos nouvelles préférences ont été enregistrées.',
  },
  en: {
    title: 'Which design do you prefer?',
    subtitle: 'Rank the 4 designs from most to least preferred',
    rank: 'Ranking',
    rankPlaceholder: '—',
    rankOptions: ['1st choice', '2nd choice', '3rd choice', '4th choice'],
    comment: 'Comment (optional)',
    commentPlaceholder: 'Tell us what you think...',
    submit: 'Submit my vote',
    submitting: 'Submitting...',
    success: 'Thank you for your vote!',
    successSub: 'Your preferences have been recorded.',
    alreadyVoted: 'Vote already submitted',
    alreadyVotedSub: 'Preferences have already been submitted for this poll.',
    recommended: 'Recommended',
    errorDuplicate: 'Each rank can only be used once',
    errorAll: 'Please rank all 4 designs',
    modifyBanner: 'You have already voted — you can modify your choices below',
    successModified: 'Vote modified!',
    successModifiedSub: 'Your new preferences have been recorded.',
  },
  es: {
    title: '¿Qué diseño prefiere?',
    subtitle: 'Clasifique los 4 diseños del más al menos preferido',
    rank: 'Clasificación',
    rankPlaceholder: '—',
    rankOptions: ['1ª opción', '2ª opción', '3ª opción', '4ª opción'],
    comment: 'Comentario (opcional)',
    commentPlaceholder: 'Díganos lo que piensa...',
    submit: 'Enviar mi voto',
    submitting: 'Enviando...',
    success: '¡Gracias por su voto!',
    successSub: 'Sus preferencias han sido registradas.',
    alreadyVoted: 'Voto ya registrado',
    alreadyVotedSub: 'Las preferencias ya han sido enviadas para esta encuesta.',
    recommended: 'Recomendado',
    errorDuplicate: 'Cada rango solo se puede usar una vez',
    errorAll: 'Por favor clasifique los 4 diseños',
    modifyBanner: 'Ya ha votado — puede modificar sus opciones a continuación',
    successModified: '¡Voto modificado!',
    successModifiedSub: 'Sus nuevas preferencias han sido registradas.',
  },
};

export default function VoteForm({ data, clientPageId }: { data: VoteData; clientPageId: string }) {
  const t = UI_TEXT[data.lang] || UI_TEXT.fr;

  const [rankings, setRankings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const design of data.designs) {
      if (design.ranking) initial[design.pageId] = design.ranking;
    }
    return initial;
  });
  const [comment, setComment] = useState(() => {
    const firstChoice = data.designs.find(d => d.ranking?.includes('1'));
    return firstChoice?.comment || '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state
  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {data.hasVoted ? t.successModified : t.success}
        </h2>
        <p className="text-slate-500">
          {data.hasVoted ? t.successModifiedSub : t.successSub}
        </p>
      </div>
    );
  }

  const handleRankChange = (designPageId: string, rank: string) => {
    setError(null);
    setRankings((prev) => {
      const next = { ...prev };
      if (rank === '') {
        delete next[designPageId];
      } else {
        // Remove this rank from any other design
        for (const key of Object.keys(next)) {
          if (next[key] === rank) delete next[key];
        }
        next[designPageId] = rank;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    // Validate all 4 designs are ranked
    if (Object.keys(rankings).length !== data.designs.length) {
      setError(t.errorAll);
      return;
    }

    // Check for duplicates
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
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Title */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">{t.title}</h2>
        <p className="text-slate-500">{t.subtitle}</p>
      </div>

      {/* Modify banner */}
      {data.hasVoted && (
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm text-center">
          {t.modifyBanner}
        </div>
      )}

      {/* Design Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {data.designs.map((design) => {
          const currentRank = rankings[design.pageId] || '';

          return (
            <div
              key={design.pageId}
              className={`relative rounded-2xl border-2 transition-all ${
                currentRank
                  ? 'border-blue-400 shadow-lg shadow-blue-100'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Image */}
              {design.imageUrl && (
                <div className="aspect-video bg-slate-100 relative overflow-hidden rounded-t-[14px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={design.imageUrl}
                    alt={design.title}
                    className="w-full h-full object-cover"
                  />
                  {design.recommended && (
                    <span className="absolute top-3 right-3 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full shadow-sm">
                      ⭐ {t.recommended}
                    </span>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="p-5 bg-white">
                <h3 className="font-semibold text-slate-900 text-lg mb-1">{design.title}</h3>
                <p className="text-sm text-slate-500 mb-4">{design.description}</p>

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
            </div>
          );
        })}
      </div>

      {/* Comment */}
      <div className="max-w-2xl mx-auto mb-8">
        <label className="block text-sm font-medium text-slate-700 mb-2">
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
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="max-w-2xl mx-auto">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-200"
        >
          {isSubmitting ? t.submitting : t.submit}
        </button>
      </div>
    </div>
  );
}
