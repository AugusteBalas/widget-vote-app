import VoteForm from './VoteForm';
import ViaSayLogo from '@/components/ViaSayLogo';
import { getVoteData } from '@/lib/notion';

interface VotePageProps {
  params: Promise<{ pageId: string }>;
}

export default async function VotePage({ params }: VotePageProps) {
  const { pageId } = await params;

  // Call Notion directly instead of going through API route
  const result = await getVoteData(pageId);

  if (result.error || !result.data) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="text-6xl">😵</div>
          <h1 className="text-2xl font-bold text-slate-800">Page introuvable</h1>
          <p className="text-slate-500">{result.error || 'Cette page de vote n\'existe pas ou a été supprimée.'}</p>
        </div>
      </main>
    );
  }

  const data = result.data;

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
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">{data.clientName}</span>
          </div>
        </div>
      </header>

      <VoteForm data={data} clientPageId={pageId} />

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
