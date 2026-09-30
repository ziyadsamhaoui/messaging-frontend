# Verdant Messages Frontend

A Next.js + Tailwind frontend for the messaging backend. It follows `frontend/FRONTEND_INSTRUCTIONS.md` and ships with a botanical theme, STOMP WebSocket support, and cursor-based pagination UI.

## Requirements
- Node.js 18+ (or 20+ recommended)
- Backend running (see root README or backend docs)

## Environment
Create a `.env.local` file in `frontend/`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=http://localhost:8000/ws
```

## Run
```
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts
```
npm run check:env   # quick env validation
npm run lint
npm run build
```

## Structure
- `app` pages for `/`, `/login`, `/app`
- `components` UI, chat, sidebar, and layout building blocks
- `lib` API client, auth context, STOMP client, and types
- `hooks` data and websocket hooks

## Notes
- Tokens are stored in memory only (refreshing the page logs you out).
- WebSocket errors surface via `/user/queue/errors` and show a toast.
