# GoDrive Frontend

React + Vite frontend for GoDrive cloud storage.  
Uses TailwindCSS, React Router, React Query, Axios, react-dropzone, and Headless UI.

## Install

```bash
cd frontend
npm install
```

## Run (development)

```bash
npm run dev
```

- App: **http://localhost:5173**
- Vite proxies `/api` to the backend (default `http://localhost:3001`). Set `server.proxy` in `vite.config.js` if your API runs elsewhere.

## Build (production)

```bash
npm run build
```

Output is in `dist/`. Serve with any static host or use the Docker setup (see `docker/`).

## Environment

- Copy `.env.example` to `.env`.
- `VITE_API_URL`: leave empty when using the Vite dev proxy or when the app is served under the same origin as the API (e.g. nginx routing `/api` to the backend).

## Features

- **Welcome** – Landing, login/register links
- **Auth** – Login, Register, JWT in `localStorage`
- **Dashboard** – File explorer: grid/list, breadcrumbs, upload, new folder, search
- **Drag & drop** – Upload via react-dropzone (progress, multiple files)
- **Sidebar** – Folder tree, My Drive, Shared, Trash
- **File actions** – Preview, Download, Rename, Move, Share, Trash
- **File preview** – Image, video, PDF, text in a modal
- **File info panel** – Details and actions in right sidebar
- **Share** – Create share link, optional password and expiry
- **Trash** – Restore or permanently delete
- **Settings** – Profile and storage usage
- **Toasts** – Success/error notifications

## Tech

- React 18, Vite 5, TailwindCSS 3
- React Router 6, TanStack React Query, Axios
- react-dropzone, Headless UI, Heroicons, clsx
