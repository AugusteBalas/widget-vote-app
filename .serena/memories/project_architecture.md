# widget-vote-app Architecture Reference

## Directory Structure
```
src/
├── app/
│   ├── api/
│   │   ├── favicon/route.ts        # Proxy favicon fetching
│   │   ├── screenshot/route.ts     # Website screenshot capture
│   │   └── notion/
│   │       ├── create-vote/route.ts      # Create vote in Notion
│   │       ├── get-vote/route.ts         # Fetch vote data
│   │       ├── submit-vote/route.ts      # Submit internal vote
│   │       └── submit-community-vote/route.ts  # Public vote + Slack
│   ├── vote/[pageId]/
│   │   ├── page.tsx               # Server component for vote page
│   │   └── VoteForm.tsx           # Client form component
│   ├── generate/page.tsx          # Admin widget generator
│   ├── demo/page.tsx              # Public demo/community vote
│   └── page.tsx                   # Homepage
├── components/
│   ├── ConceptCard.tsx            # Widget concept display
│   ├── ColorPicker.tsx            # Color selection UI
│   ├── MultiExport.tsx            # Batch image export
│   ├── SitePreview.tsx            # Website preview component
│   ├── ViaSayLogo.tsx             # Brand logo
│   └── WidgetButton.tsx           # Widget button variants
└── lib/
    ├── colorExtractor.ts          # Dominant color from favicon
    ├── svgPaths.ts                # Widget SVG paths
    └── types.ts                   # Shared TypeScript types
```

## Key APIs

### GET /api/notion/get-vote
- Input: `pageId` (slug or UUID)
- Returns: clientName, designs[], hasVoted, labels, lang

### POST /api/notion/submit-vote
- Input: votes[], comment, rankingPropertyName
- Updates Notion database with rankings

### POST /api/notion/submit-community-vote
- Input: voterName, selectedConcept
- Sends Slack notification with tally

### POST /api/screenshot
- Input: url
- Returns: screenshotUrl (base64 or external)
- Fallbacks: Playwright → Microlink → PageSpeed → Thum.io

## Environment Variables
- NOTION_API_KEY (required)
- SLACK_BOT_TOKEN (optional)
- SLACK_CHANNEL_ID (optional)
- VERCEL_URL (auto-set on Vercel)

## Notion Structure
- Parent page: VOTE_WIDGET_PAGE_ID constant
- Each client has child page with child database
- Results tracked in shared Results database
