# ZumaDash Frontend (Vite + React + Tailwind)

## Setup

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:3000 (proxies `/api` → `http://localhost:5000`).

## Build

```bash
npm run build
npm run preview
```

## Env

Copy `.env.example` to `.env` if the API is not on the same host:

```
VITE_API_URL=http://localhost:5000
```

## Notes

- Tailwind CSS for layout/utilities; legacy class names (`.btn`, `.card`, `.form-group`) still work via `@layer components`.
- Navbars: green (`primary`) for public/customer/rider; dark slate for admin. Mobile menus are dark with **white** links.
- Logo default size ~44px in the navbar.
