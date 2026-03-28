# vastu@home

**AI-powered Vastu Shastra mapping platform for professional consultants.**

Built on classical texts (Vishwakarma Prakash, Mayamatam, Brihat Samhita) — not simplified approximations.

---

## What It Does

- Upload a floor plan → draw the perimeter → auto-detect Brahmasthan
- Overlay authentic 16-zone Shakti Chakra (22.5° equal divisions, rotated to True North)
- Exact zone area percentages via polygon clipping (Sutherland-Hodgman)
- Mark irregular cuts → see severity scoring per zone
- Vastu AI advisor (multi-turn, grounded in classical texts + live zone data)
- Project + client management for consultants
- PDF report export (Phase 2)

## Stack

Next.js 15 · React 19 · TypeScript · Konva.js · Zustand · Tailwind CSS  
Claude API · Supabase (PostgreSQL + pgvector) · Razorpay · Vercel

## Quick Start

```bash
npm install
cp .env.local.example .env.local   # add your API keys
npm run dev
```

See **[CLAUDE.md](./CLAUDE.md)** for full architecture, domain rules, and build order.

## Prototype

The complete Phase 1 HTML prototype is in `docs/prototype/vastu_at_home.html`.  
Open it in a browser — it's the visual and functional reference for all components.

## Phase Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Canvas workspace, zone analysis, AI chat, project management | 🔨 Building |
| 2 | Auth, Supabase persistence, PDF export, GPS north, AI cut detection | 📋 Planned |
| 3 | Custom floor plan builder, room creator, furniture library | 📋 Planned |
| 4 | Report builder, team accounts, mobile polish, B2C flow | 📋 Planned |
