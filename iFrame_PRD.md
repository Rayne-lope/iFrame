# 🎬 iFrame – Personal Streaming Website
## Product Requirements Document (PRD) v1.0

| Field | Value |
|-------|-------|
| **Project Name** | iFrame |
| **Version** | 1.0.0 |
| **Status** | Draft – March 2026 |
| **Tech Stack** | React 18 + Vite 5 + Tailwind CSS + shadcn/ui |
| **API Stack** | TMDB API + VidSrc Embed + OpenSubtitles API |
| **State Management** | Zustand + TanStack Query |
| **Deployment** | Vercel (Free Tier) |
| **Target User** | Personal Use Only |
| **Estimated Timeline** | 6 Weeks · 3 Phases |

---

## 1. Project Overview

### 1.1 Vision
iFrame adalah website streaming personal dengan UI ala Netflix. Browse dan tonton film/series menggunakan TMDB sebagai metadata, VidSrc sebagai video player, dan OpenSubtitles untuk Bahasa Indonesia subtitle support.

### 1.2 Problem Statement
- Subscription services mahal dan ada regional content lock
- Free streaming sites penuh ads dan UX yang buruk
- Apps seperti LokLok require APK install dengan security risk nyata
- Tidak ada solusi personal yang combine UI bagus + konten lengkap + sub Indo

### 1.3 Goals
- Build personal streaming website yang cepat dan responsive, zero cost
- Browse 66,000+ film dan 320,000+ TV episodes via TMDB + VidSrc
- Support Bahasa Indonesia subtitles via OpenSubtitles
- Persist watchlist dan watch history di localStorage
- Deploy ke Vercel gratis tanpa ongoing server cost

### 1.4 Non-Goals (Out of Scope)
- Tidak ada backend server, database, atau user authentication
- Bukan platform publik – personal use only
- Tidak ada video file hosting atau uploading
- Tidak ada monetization atau ads
- Tidak ada mobile app (APK/IPA)

---

## 2. Technology Stack

### 2.1 Core Frontend Stack

| Layer | Technology | Purpose | Why This Choice |
|-------|-----------|---------|----------------|
| Build Tool | Vite 5.x | Dev server + bundler | HMR tercepat, config minimal |
| UI Framework | React 18 | Component-based UI | Sudah familiar, ecosystem besar |
| Routing | React Router v6 | Client-side navigation | Standard SPA routing, API simpel |
| Styling | Tailwind CSS v3 | Utility-first CSS | Cepat ditulis, design token konsisten |
| Components | shadcn/ui | Pre-built UI primitives | Beautiful, accessible, copy-paste no lock-in |
| Server State | TanStack Query v5 | API fetching + caching | Auto cache, loading/error states built-in |
| Client State | Zustand | Watchlist + history | Jauh lebih simpel dari Redux, persist middleware built-in |
| Icons | Lucide React | Icon set | Ringan, design language konsisten |

### 2.2 External APIs

| API | Usage | Auth Required | Cost |
|-----|-------|--------------|------|
| TMDB API | Semua metadata film/TV: search, trending, detail, cast, images | Free API Key (themoviedb.org) | Gratis |
| VidSrc Embed | Video streaming player embed via iframe menggunakan TMDB ID | Tidak perlu | Gratis |
| OpenSubtitles | Subtitle files semua bahasa termasuk Bahasa Indonesia | Free API Key + account | Gratis (100 req/day) |
| TMDB Image CDN | Posters, backdrops, foto aktor | Via TMDB key | Gratis |

### 2.3 System Architecture

```
[User Browser]
      ↓
[React SPA – Vite]
      ↓
[React Router v6]  ──>  9 client-side routes
      ↓
  ────┴────────────────┬──────────────────
  │               │              │
TMDB API     VidSrc Embed   OpenSubtitles
(metadata)   (video iframe)  (subtitle VTT)
  │
Zustand Store  ──>  localStorage persistence
(watchlist, history, player settings)
```

---

## 3. Feature Requirements

### 3.1 Pages & Routing

| Route | Page Name | Description |
|-------|-----------|-------------|
| `/` | Home | Hero banner trending, horizontal genre rows, search bar |
| `/search?q=...` | Search Results | Real-time search results grid, filter movie atau TV |
| `/movie/:id` | Movie Detail | Poster, backdrop, synopsis, rating, cast, trailer, Play button |
| `/tv/:id` | TV Series Detail | Series overview, season tabs, episode list + descriptions |
| `/watch/movie/:id` | Movie Player | Full-screen VidSrc player + source switcher + subtitle selector |
| `/watch/tv/:id/:s/:e` | Episode Player | Episode player dengan next/prev episode navigation |
| `/watchlist` | My Watchlist | Grid film dan series yang di-bookmark |
| `/history` | Watch History | Riwayat tonton + Continue Watching row |
| `/genre/:id` | Browse by Genre | Paginated grid film filtered by TMDB genre |

### 3.2 Features by Priority

#### P0 – Must Have (MVP Core)

| Feature | Description | Phase |
|---------|-------------|-------|
| Home Page | Hero banner + 4 content rows: Trending, Popular, Top Rated, Upcoming | 1 |
| TMDB Browse | Metadata lengkap: posters, sinopsis, rating, cast, runtime | 1 |
| Movie Detail Page | Info page lengkap dengan play button | 1 |
| Movie Streaming | VidSrc iframe embed yang berfungsi untuk film | 2 |
| TV Series + Episodes | Season selector, episode list, episode player | 2 |
| Search | Real-time search di movies dan TV shows | 2 |
| Subtitle Support | Integrasi OpenSubtitles, default Bahasa Indonesia | 2 |
| Responsive Design | Works on mobile 375px, tablet, dan desktop 1440px | 1–3 |

#### P1 – Should Have

| Feature | Description | Phase |
|---------|-------------|-------|
| Watchlist / Bookmark | Save film ke watchlist pribadi, persist ke localStorage | 3 |
| Watch History | Auto-record 20 judul terakhir ditonton beserta timestamp | 3 |
| Continue Watching | Row di halaman Home dari history lokal | 3 |
| Multiple Sources | Fallback source: VidSrc → 2embed → embed.su | 2 |
| Genre Browsing | Browse dan filter by genre via TMDB discover endpoint | 3 |
| Skeleton Loading | Placeholder cards saat data sedang dimuat | 3 |

#### P2 – Nice to Have

| Feature | Description | Phase |
|---------|-------------|-------|
| Dark / Light Mode | Toggle tema, detect system preference secara default | 3 |
| Keyboard Shortcuts | Space = pause, F = fullscreen, arrow keys = seek 10s | 3 |
| Page Transitions | Smooth route transitions dengan Framer Motion | 3 |
| Similar Recommendations | TMDB similar movies di bagian bawah detail page | 3 |
| Anime Support | Integrasi AniList + GogoAnime embed source | Future |

---

## 4. API Integration Details

### 4.1 TMDB API Endpoints Used

| Endpoint | Used In | Returns |
|----------|---------|---------|
| `/trending/all/week` | Home Hero + Row | Top 20 trending konten minggu ini |
| `/movie/popular` | Home – Popular Row | Film populer secara global |
| `/movie/top_rated` | Home – Top Rated Row | Film dengan rating terbaik sepanjang masa |
| `/movie/upcoming` | Home – Upcoming Row | Film yang akan segera rilis |
| `/movie/{id}` | Movie Detail | Detail film lengkap, genre, runtime |
| `/movie/{id}/credits` | Cast Section | Daftar cast dan crew lengkap |
| `/movie/{id}/videos` | Trailer Section | YouTube trailer keys |
| `/movie/{id}/similar` | Related Section | Rekomendasi film serupa |
| `/tv/{id}` | TV Detail | Info series, seasons, status, network |
| `/tv/{id}/season/{n}` | Episode List | Semua episode untuk satu season |
| `/search/multi` | Search Page | Film + TV shows berdasarkan keyword |
| `/genre/movie/list` | Genre Dropdown | Semua kategori genre |
| `/discover/movie` | Genre Browse Page | Film difilter by genre_id, sortable |

### 4.2 VidSrc Embed URL Patterns

| Type | Embed URL | Source |
|------|-----------|--------|
| Movie (Primary) | `https://vidsrc.cc/v2/embed/movie/{tmdb_id}` | VidSrc.cc |
| TV Episode (Primary) | `https://vidsrc.cc/v2/embed/tv/{tmdb_id}/{season}/{episode}` | VidSrc.cc |
| Movie (Fallback 1) | `https://www.2embed.cc/embed/{imdb_id}` | 2embed.cc |
| Movie (Fallback 2) | `https://embed.su/embed/movie/{tmdb_id}` | embed.su |
| TV Episode (Fallback) | `https://embed.su/embed/tv/{tmdb_id}/{season}/{episode}` | embed.su |

### 4.3 OpenSubtitles Integration Flow

1. **Auth**: `POST /api/v1/login` dengan API key + credentials → dapat Bearer token
2. **Search**: `GET /api/v1/subtitles?tmdb_id={id}&languages=id,en` → list subtitle files
3. **Download**: `POST /api/v1/download` dengan `file_id` → URL download file `.srt`
4. **Inject**: Convert SRT → VTT blob URL → inject sebagai `<track>` element di video

> ⚠️ Rate limit: 100 requests/day di free plan. Dimitigasi dengan cache hasil di `sessionStorage` per TMDB ID.

### 4.4 Zustand State Design

| Store | State Shape | Actions |
|-------|-------------|---------|
| `watchlistStore` | `items: Movie[]` | `add(movie)`, `remove(id)`, `isAdded(id)`, `clear()` |
| `historyStore` | `items: WatchedItem[]` (max 20) | `add(item)`, `remove(id)`, `clear()`, `getLast(id)` |
| `playerStore` | `source, lang, quality` | `setSource(url)`, `setLang(code)`, `setQuality(q)` |

> Semua Zustand stores menggunakan `persist` middleware → data tetap ada setelah browser di-refresh atau ditutup.

---

## 5. Development Phases

### 🔵 PHASE 1 – Foundation + Catalog + Core UI
**Durasi: Week 1–2 | Estimasi: ~26 jam**

**Goal:** Website bisa dibuka, browse film dari TMDB, lihat detail film, dan sudah deploy ke Vercel.

#### Tasks

| # | Task | Priority | Est. |
|---|------|----------|------|
| 1.1 | Scaffold project: Vite + React + TypeScript | P0 | 1h |
| 1.2 | Install & configure Tailwind CSS + shadcn/ui + theme | P0 | 1h |
| 1.3 | Setup React Router v6 dengan semua 9 route shells | P0 | 1h |
| 1.4 | Buat `api/tmdb.js` dengan semua endpoint functions | P0 | 2h |
| 1.5 | Setup TanStack Query + QueryClientProvider di main.jsx | P0 | 30m |
| 1.6 | Configure `.env.local` + `.env.example` | P0 | 30m |
| 1.7 | Build Navbar (logo, nav links, search input) | P0 | 2h |
| 1.8 | Build HeroSection dengan backdrop trending dari TMDB | P0 | 3h |
| 1.9 | Build MovieCard (poster, title, year, rating badge) | P0 | 2h |
| 1.10 | Build MovieRow (horizontal scroll + arrow buttons) | P0 | 2h |
| 1.11 | Rakit Home page: Hero + 4 rows (Trending, Popular, Top Rated, Upcoming) | P0 | 2h |
| 1.12 | Build Movie Detail page (backdrop, poster, info lengkap, cast, trailer) | P0 | 4h |
| 1.13 | Build TV Detail page (info series + season tabs placeholder) | P0 | 3h |
| 1.14 | Responsive grid: 2 col mobile → 4 col tablet → 6 col desktop | P0 | 1h |
| 1.15 | Initial deploy ke Vercel dengan VITE_TMDB_KEY env var | P0 | 1h |

**✅ Acceptance Criteria Phase 1**
- [ ] Home page load dengan data trending live dari TMDB
- [ ] MovieCard tampil poster, judul, tahun, dan rating
- [ ] Movie Detail page menampilkan info TMDB yang lengkap
- [ ] Site live dan accessible di Vercel URL
- [ ] Zero console error di production build
- [ ] Mobile layout bekerja dengan baik di 375px viewport

---

### 🟠 PHASE 2 – Streaming Core + TV + Search + Subtitles
**Durasi: Week 3–4 | Estimasi: ~31 jam**

**Goal:** Fungsi streaming penuh. User bisa play film dan episode TV, switch source kalau mati, dan pilih subtitle Bahasa Indonesia.

#### Tasks

| # | Task | Priority | Est. |
|---|------|----------|------|
| 2.1 | Build VideoPlayer component wrapping VidSrc iframe | P0 | 3h |
| 2.2 | Buat Watch page untuk film (`/watch/movie/:id`) | P0 | 2h |
| 2.3 | Build SourceSelector component (VidSrc / 2embed / embed.su) | P1 | 2h |
| 2.4 | Build EpisodeList: season tabs + episode cards + deskripsi | P0 | 4h |
| 2.5 | Lengkapi TV Detail page dengan data season/episode asli | P0 | 3h |
| 2.6 | Buat Watch page untuk episode (`/watch/tv/:id/:s/:e`) | P0 | 2h |
| 2.7 | Buat `api/opensubtitles.js` (auth, search, download functions) | P1 | 3h |
| 2.8 | Build SubtitleSelector dropdown component | P1 | 2h |
| 2.9 | SRT → VTT converter, inject sebagai `<track>` di player | P1 | 3h |
| 2.10 | Build Search page dengan MovieGrid + debounced input | P0 | 3h |
| 2.11 | Buat `useDebounce` hook (mencegah API spam saat mengetik) | P0 | 1h |
| 2.12 | Error states: "Not available", "Server error", "No results" | P0 | 2h |
| 2.13 | Loading states di semua komponen yang fetch data | P0 | 1h |

**✅ Acceptance Criteria Phase 2**
- [ ] Film berhasil play via VidSrc embed
- [ ] TV series bisa memilih season + episode mana saja dan play dengan benar
- [ ] Subtitle selector muncul, sub Indo tersedia untuk film-film populer
- [ ] Source switching bekerja tanpa page reload
- [ ] Search mengembalikan hasil dalam <1 detik setelah debounce
- [ ] Semua error states menampilkan pesan yang user-friendly

---

### 🟢 PHASE 3 – Persistence + Polish + QA
**Durasi: Week 5–6 | Estimasi: ~31 jam**

**Goal:** Polish siap produksi. Watchlist dan history berfungsi sempurna. UI smooth dengan animasi dan dark mode. Final QA pass.

#### Tasks

| # | Task | Priority | Est. |
|---|------|----------|------|
| 3.1 | Buat `watchlistStore.js` dengan Zustand + persist middleware | P1 | 1.5h |
| 3.2 | Buat `historyStore.js` dengan logika max-20 items | P1 | 1.5h |
| 3.3 | Tambah watchlist toggle button di Movie Detail + TV Detail | P1 | 1h |
| 3.4 | Build Watchlist page dengan empty state yang bagus | P1 | 2h |
| 3.5 | Auto-record ke history saat Watch page dibuka | P1 | 1h |
| 3.6 | Build History page + Continue Watching row di Home | P1 | 2h |
| 3.7 | Build Genre browse page (`/genre/:id`) dengan pagination | P1 | 3h |
| 3.8 | Tambah genre pill filters di Home page | P1 | 1.5h |
| 3.9 | Build SkeletonCard + SkeletonRow untuk loading states | P1 | 2h |
| 3.10 | Framer Motion page transitions + card hover animations | P2 | 3h |
| 3.11 | Implementasi dark mode toggle (Tailwind `dark:` classes) | P2 | 2h |
| 3.12 | Route-based code splitting dengan `React.lazy` + Suspense | P1 | 1.5h |
| 3.13 | Image lazy loading dengan `loading="lazy"` + blur placeholder | P1 | 1h |
| 3.14 | Full QA: test semua routes di Chrome, Firefox, Safari desktop | P0 | 3h |
| 3.15 | Mobile QA: semua halaman di 375px, 768px, 1024px, 1440px | P0 | 2h |
| 3.16 | Jalankan Lighthouse audit, fix semua yang di bawah skor 80 | P1 | 2h |
| 3.17 | Final production deploy ke Vercel | P0 | 30m |

**✅ Acceptance Criteria Phase 3**
- [ ] Watchlist persist dengan benar setelah browser ditutup dan dibuka kembali
- [ ] History menampilkan 20 item terakhir dengan urutan yang benar
- [ ] Genre browsing mengembalikan film yang sesuai dengan genre
- [ ] Tidak ada layout break dari 375px sampai 1440px
- [ ] Lighthouse Performance score >= 80
- [ ] Lighthouse Accessibility score >= 90
- [ ] Semua halaman memiliki skeleton loading state
- [ ] Dark mode toggle bekerja dan preferensi tersimpan

---

## 6. Project Folder Structure

```
iframe/
├── public/
│   └── favicon.svg
├── src/
│   ├── api/
│   │   ├── tmdb.js              # Semua TMDB API calls
│   │   └── opensubtitles.js     # Auth, search, download
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx       # Logo, nav links, search, watchlist icon
│   │   │   └── Footer.jsx
│   │   ├── home/
│   │   │   ├── HeroSection.jsx  # Featured movie backdrop + CTA button
│   │   │   └── MovieRow.jsx     # Horizontal scrollable row of cards
│   │   ├── ui/
│   │   │   ├── MovieCard.jsx    # Poster, title, rating, hover overlay
│   │   │   ├── MovieGrid.jsx    # Responsive CSS grid layout
│   │   │   └── SkeletonCard.jsx # Loading placeholder card
│   │   ├── player/
│   │   │   ├── VideoPlayer.jsx      # VidSrc iframe wrapper
│   │   │   ├── SourceSelector.jsx   # Switch video source button group
│   │   │   └── SubtitleSelector.jsx # Language dropdown
│   │   ├── tv/
│   │   │   └── EpisodeList.jsx  # Season tabs + episode cards
│   │   └── detail/
│   │       └── CastCard.jsx     # Foto aktor + nama
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Search.jsx
│   │   ├── MovieDetail.jsx
│   │   ├── TVDetail.jsx
│   │   ├── Watch.jsx
│   │   ├── Watchlist.jsx
│   │   ├── History.jsx
│   │   └── Genre.jsx
│   ├── store/
│   │   ├── watchlistStore.js
│   │   └── historyStore.js
│   ├── hooks/
│   │   ├── useDebounce.js
│   │   └── useSubtitle.js
│   ├── utils/
│   │   └── helpers.js
│   ├── App.jsx
│   └── main.jsx
├── .env.local              # Kunci asli – wajib di .gitignore!
├── .env.example            # Template untuk referensi
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 7. Environment Variables

| Variable | Dari Mana | Wajib |
|----------|-----------|-------|
| `VITE_TMDB_KEY` | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) | ✅ Ya |
| `VITE_OPENSUBTITLES_KEY` | [opensubtitles.com/en/consumers](https://www.opensubtitles.com/en/consumers) | ✅ Ya |
| `VITE_OPENSUBTITLES_USER` | Username akun OpenSubtitles | ✅ Ya |
| `VITE_OPENSUBTITLES_PASS` | Password akun OpenSubtitles | ✅ Ya |

> ⚠️ Selalu tambahkan `.env.local` ke `.gitignore`. Jangan pernah commit API keys ke Git.

---

## 8. Timeline & Effort Summary

| Phase | Fokus | Durasi | State di Akhir Phase |
|-------|-------|--------|---------------------|
| Phase 1 | Scaffold + TMDB + Home + Detail pages | Week 1–2 | Katalog film browsable, live di Vercel |
| Phase 2 | VidSrc player + TV + Search + Subtitles | Week 3–4 | Fungsi streaming penuh berjalan |
| Phase 3 | Watchlist + History + Genre + Polish + QA | Week 5–6 | Website streaming personal siap produksi |

| Phase | Estimasi Jam |
|-------|-------------|
| Phase 1: Foundation | ~26 jam |
| Phase 2: Streaming Core | ~31 jam |
| Phase 3: Polish & QA | ~31 jam |
| **Total** | **~88 jam (~15 jam/minggu)** |

---

## 9. Risks & Mitigations

| Risk | Kemungkinan | Dampak | Mitigasi |
|------|------------|--------|---------|
| VidSrc server down | Sedang | Tinggi | Multi-source fallback otomatis: 2embed → embed.su |
| VidSrc ganti format URL embed | Sedang | Tinggi | Isolasi URL construction di satu file config, mudah di-update |
| OpenSubtitles rate limit 100/day terlampaui | Rendah | Sedang | Cache hasil subtitle di `sessionStorage` by TMDB ID |
| TMDB API key terekspos di client bundle | Rendah | Rendah | Acceptable untuk personal use; restrict referrer di TMDB dashboard |
| Konten tidak tersedia di VidSrc | Sedang | Sedang | Tampilkan state "Not available" yang jelas, sarankan sumber alternatif |
| CORS issue saat download subtitle | Sedang | Sedang | Gunakan CORS proxy jika diperlukan |

---

## 10. Definition of Done ✅

**MVP dianggap selesai ketika SEMUA poin berikut terpenuhi:**

- [ ] Semua fitur P0 berfungsi end-to-end
- [ ] Aplikasi deployed dan accessible di Vercel URL
- [ ] Berfungsi dengan benar di Chrome, Firefox, Safari desktop
- [ ] Berfungsi di mobile viewport 375px – tidak ada broken layout, tidak ada horizontal scroll
- [ ] Lighthouse Performance score >= 80 pada production build
- [ ] Lighthouse Accessibility score >= 90
- [ ] Subtitle Indonesia tersedia untuk minimal 80% judul populer yang ditest
- [ ] Watchlist dan history persist setelah browser ditutup dan dibuka kembali
- [ ] Semua 9 routes render tanpa crash atau blank screen
- [ ] Semua error states di-handle dengan pesan yang clean dan user-friendly

---

*iFrame PRD v1.0 · Personal Streaming Website · Siap dibangun 🚀*
