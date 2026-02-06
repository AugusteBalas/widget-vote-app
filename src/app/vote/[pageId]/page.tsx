import VoteForm from './VoteForm';

interface VotePageProps {
  params: Promise<{ pageId: string }>;
}

export default async function VotePage({ params }: VotePageProps) {
  const { pageId } = await params;

  // Determine base URL for API calls
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const res = await fetch(`${baseUrl}/api/notion/get-vote?pageId=${pageId}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="text-6xl">😵</div>
          <h1 className="text-2xl font-bold text-slate-800">Page introuvable</h1>
          <p className="text-slate-500">{data.error || 'Cette page de vote n\'existe pas ou a été supprimée.'}</p>
        </div>
      </main>
    );
  }

  const data = await res.json();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 96 95" fill="none" className="h-8 w-auto">
              <path fill="#3E83FF" d="M48.182.228C10.405.228.965 9.668.965 47.445c0 37.781 9.44 47.217 47.217 47.217 37.78 0 47.217-9.44 47.217-47.217C95.403 9.668 85.963.228 48.182.228Z" />
              <path fill="#FFF" d="M23.251 37.74a6.93 6.93 0 0 1 6.931-6.93c1.914 0 3.647.776 4.903 2.028a6.896 6.896 0 0 1 2.028 4.903v.014a6.932 6.932 0 0 1-13.862 0v-.014ZM53.711 51.628v9.694c0 6.141-4.976 11.113-11.11 11.113l-8.306.004c-6.13 0-11.11-4.976-11.11-11.114 0-6.138 4.976-11.114 11.114-11.114l17.992-.003h.01c.39 0 .742.16.996.414.254.258.414.609.414.999v.007ZM73.11 57.15a6.932 6.932 0 0 1-13.863 0v-.014a6.932 6.932 0 0 1 13.862 0v.014ZM62.052 44.682l-17.975.004h-.014a1.425 1.425 0 0 1-.996-.414 1.419 1.419 0 0 1-.414-.999v-9.701c0-6.141 4.98-11.113 11.124-11.113l8.275-.004c6.138 0 11.127 4.976 11.127 11.114 0 6.138-4.982 11.113-11.127 11.113Z" />
            </svg>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{data.clientName}</h1>
              <p className="text-xs text-slate-500">ViaSay Widget Vote</p>
            </div>
          </div>
        </div>
      </header>

      <VoteForm data={data} clientPageId={pageId} />
    </main>
  );
}
