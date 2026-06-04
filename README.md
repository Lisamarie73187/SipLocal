# SipSocial

**Find your happy hour.** Happy hour discovery for Bend, OR — built to scale to any city.

## Stack

- [TanStack Start](https://tanstack.com/start) (SSR React)
- TypeScript, Tailwind CSS v4, shadcn/ui + Radix UI
- Supabase (auth + database)

## Getting started

```bash
cd SipLocal
cp .env.example .env.local
# Fill in Supabase and Mapbox keys in .env.local
npm install
npm run dev
```

Open [http://localhost:3002](http://localhost:3002).

## Project layout

See [claude.md](./claude.md) for architecture, conventions, design tokens, and agent guidelines.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 3002) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest |

## shadcn/ui

```bash
npx shadcn@latest add button
```

Components are added under `app/components/ui/`.
