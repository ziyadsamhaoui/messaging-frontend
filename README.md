# BadrLink — Frontend

The web client for BadrLink, a real-time messaging platform. Built with the
Next.js App Router, React 19, TanStack Query, Zustand, STOMP over SockJS, and
Tailwind CSS v4.

The frontend talks to **one** origin: the BadrLink API Gateway. It never calls
the backend microservices directly.

---

## Requirements

- Node.js 20 or newer
- npm (a `package-lock.json` is committed, so use `npm ci` for reproducible installs)
- A running BadrLink backend behind the API Gateway (see the workspace
  `docs/RUNBOOK.md`)

---

## Setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The app starts on `http://localhost:3000` and expects the gateway on
`http://localhost:8080` unless configured otherwise.

Both `npm run dev` and `npm run build` run `scripts/check-env.mjs` first, which
validates that the public URL variables are absolute `http(s)` URLs. Set the
values correctly in `.env.local` before starting.

---

## Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `node scripts/check-env.mjs && next dev` | Validate env, then start the dev server on `:3000`. |
| `npm run build` | `node scripts/check-env.mjs && next build` | Validate env, then produce a production build. |
| `npm run start` | `next start` | Serve a production build. |
| `npm run lint` | `eslint` | Lint the project. |
| `npm run check:env` | `node scripts/check-env.mjs` | Validate the environment on its own. |

---

## Configuration

Variables are read in `lib/env.ts`. Copy `.env.example` to `.env.local` and fill
them in.

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_GATEWAY_URL` | `http://localhost:8080` | Base URL of the API Gateway. Must be an absolute `http(s)` URL. |
| `NEXT_PUBLIC_WS_URL` | `${NEXT_PUBLIC_API_GATEWAY_URL}/ws` | SockJS endpoint for the STOMP connection, routed through the gateway. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | *(empty)* | Public VAPID key for Web Push. Must match the notification service's key for push notifications to work. |

`NEXT_PUBLIC_*` values are inlined into the client bundle at build time, so a
production image must be built with the correct values. `NEXT_PUBLIC_API_BASE_URL`
is accepted as a legacy fallback for the gateway URL.

---

## Architecture

```
app/
  layout.tsx          Root layout: fonts, providers, toasts
  providers.tsx       TanStack Query + Auth context + reduced-motion config
  page.tsx            Public landing page
  login/page.tsx      Sign in / register
  app/page.tsx        Authenticated workspace shell
  error.tsx           Route error boundary
  not-found.tsx       404
  globals.css         Design tokens, keyframes, reduced-motion handling
components/
  ui/                 Button, Input, Textarea, Modal, Toast, Avatar,
                      Skeleton, UserSearchCombobox
  chat/               MessageList, MessageInput, MessageBubble, ParticipantsDrawer
  sidebar/            ConversationItem, NewConversationModal, ConnectionsModal,
                      BlockedUsersModal, InvitationsModal
  notifications/      NotificationPanel, NotificationPreferencesModal
  layout/             AppShell
hooks/                Query and realtime hooks (rooms, messages, connections,
                      notifications, blocks, socket, user search)
lib/
  apiClient.ts        Fetch wrapper: auth header, 401 refresh, error normalization
  errors.ts           ApiError + error classification and user-facing messages
  services/           Typed endpoint functions (auth, rooms, users, notifications)
  socketManager.ts    Singleton STOMP client with pre-connect subscription queue
  stompClient.ts      Destination map and connection state
  realtimeFrames.ts   Classifies slim realtime frames by shape
  queryClient.ts      TanStack Query client
  pagination.ts       Cursor-page flattening
  presence.ts         Presence derivation from `lastSeen`
  push.ts             Service-worker registration and Web Push subscription
  types.ts            Shared DTO and frame types
  utils.ts            `cn()` Tailwind class merger (clsx + tailwind-merge)
  env.ts              Environment access
context/AuthContext.tsx  Session, login, register, refresh, logout
store/uiStore.ts         Ephemeral UI state (selection, drafts, socket status)
public/                  Static assets, manifest, service worker
```

### Request flow

```
Browser -> API Gateway :8080 -> Auth / User / Chat / Notification services
Browser -> API Gateway :8080 (WebSocket) -> Realtime Gateway
```

HTTP calls go through `lib/apiClient.ts`, which injects the access token and
transparently refreshes on `401`. Realtime uses a single STOMP client from
`lib/socketManager.ts`; subscriptions made before CONNECT are queued and
delivered once the connection is established.

### Styling

Design tokens live in `app/globals.css` as CSS custom properties under `:root`
(the single source of truth). Components reference them through Tailwind
arbitrary values, e.g. `bg-[var(--color-surface)]`. Class names are merged with
`cn()` so conflicting utilities resolve deterministically.

---

## Backend contract

The gateway is the source of truth for paths and payloads. Key conventions:

- Auth: `POST /auth/register`, `POST /auth/login` `{email, password}`,
  `POST /auth/refresh`, `POST /auth/logout`.
- Rooms and messages: `/rooms`, `/rooms/{roomId}/messages`.
- Realtime destinations: `/topic/rooms/{roomId}`, `/topic/rooms/{roomId}/typing`,
  `/topic/users/{userId}`, `/user/queue/errors`.
- Cursor pagination returns `{items, nextCursor, hasMore}` with opaque cursors.

See the workspace `docs/` for the full contract matrix, ADRs, and the local boot
runbook.
