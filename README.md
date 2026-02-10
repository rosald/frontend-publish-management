# Frontend Publish Management System

A simple yet fully functional frontend deployment management system, with the following features:

- Deploy frontend assets (`.tar` / `.tar.gz` / `.tar.xz`) via web interface
- Auto-incrementing version directories (001, 002, ...)
- Header-based version routing (`x-env-version`) for parallel testing
- Symlink-based version switching

## Motivation

While cloud services are commonly used for frontend deployments (especially for SPAs where index.html is served through rendering services and assets are hosted on CDNs), there are scenarios where a single Nginx server suffices for lower-traffic applications.

This solution addresses two key challenges:

1. Manual deployment processes are cumbersome
2. Testing parallel features is difficult when only one version is available (merging all feature branches mixes changes, whereas isolated feature testing is often preferable)

## Prerequisites

- Node.js >= 22.6 (uses [TypeScript type stripping](https://nodejs.org/en/learn/typescript/run-natively))
- Nginx (or use the built-in `simulate-nginx` for local development)

## Project Structure

```
.
├── backend/          # Koa server (TypeScript, runs directly via node)
├── frontend/         # Management UI (React 19 + antd 6 + Vite 7)
├── conf/             # Configuration templates
│   ├── nginx.conf    # Example Nginx config
│   └── site.db.json  # Site config template
├── simulate-nginx/   # Koa-based Nginx simulator for local dev
└── site.db.json      # Active site config (gitignored, copy from conf/)
```

## Usage Instructions

### 1. Initialize configuration

Copy `conf/site.db.json` to the project root:

```bash
cp conf/site.db.json site.db.json
```

### 2. Configure sites

Edit `site.db.json` to define your deployment targets. This file contains site-name to directory-path mappings. The path value should match where assets will be stored and must correspond to your Nginx configuration.

```json
{
  "sitea": "/Users/aaa/frontendassets/sitea",
  "siteb": "/Users/aaa/frontendassets/siteb"
}
```

> The backend will automatically create these directories and place a warning file on startup.

### 3. Configure Nginx

See `conf/nginx.conf` for a full example. The key parts:

Add a `map` directive to the `http` block:

```nginx
map $http_x_env_version $asset_env_version {
    default      "current";
    "~^[a-z]+$"  $http_x_env_version;
}
```

Set the `root` in each `server`/`location` block:

```nginx
root /Users/aaa/frontendassets/sitea/$asset_env_version;
```

> If you don't have Nginx, use the `simulate-nginx` directory to run a Koa-based static file server that emulates the same header-routing behavior.

### 4. Start services

```bash
# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Build frontend
cd ../frontend && npm run build

# Start backend (PORT is required as env variable)
cd ../backend && PORT=3000 npm start
```

For frontend development with hot reload:

```bash
cd frontend && npm run dev
```

> The Vite dev server proxies `/frontend-publish-management/api` requests to `http://localhost:3000`.

### 5. Access management UI

Visit http://localhost:3000/frontend-publish-management

### 6. Deploy assets

Prepare your frontend assets tarball:

```bash
tar -cvf a.tar -C ./dist .
# or
tar -czvf a.tar.gz -C ./dist .
```

- Select a site from the dropdown
- Upload a `.tar` / `.tar.gz` / `.tar.xz` file
- Use "Publish/Unpublish" to create/remove symlinks (e.g., link `current` → `003`)

> All files must be at the root of the archive. Avoid having a nested folder (e.g., `dist/`) inside the archive.

### 7. Environment testing (optional)

- Upload multiple versions
- Create a named symlink (e.g., `featurea` → `002`)
- Visit the site with header `x-env-version: featurea`
- Use browser extensions like ModHeader for header injection

## Architecture

### Backend (`backend/`)

- **Runtime**: Node.js with native TypeScript type stripping (no build step)
- **Framework**: Koa 3 + @koa/router
- **Config**: `site.db.json` at project root (site-name → directory-path mapping)
- **APIs**: upload tarball, create/remove symlinks, list versions, inspect files
- **Static serving**: serves `frontend/dist` under the `/frontend-publish-management` prefix

### Frontend (`frontend/`)

- **Stack**: React 19 + antd 6 + TanStack React Query + Vite 7
- **Features**: site selector, tarball upload, version list, symlink management, config editor

### Nginx (or `simulate-nginx/`)

- Maps the `x-env-version` request header to a subdirectory name
- Falls back to `current` when the header is absent or invalid
- Serves static assets from the resolved version directory

### Key Mechanism

```
/Users/aaa/frontendassets/sitea/
├── 001/              # version 001 (uploaded assets)
├── 002/              # version 002
├── 003/              # version 003
├── current -> 003    # symlink: default version
└── featurea -> 002   # symlink: feature branch version
```

- Uploading a tarball extracts it into the next auto-incremented directory
- Creating a symlink (e.g., `current` → `003`) switches the served version
- Nginx resolves `x-env-version: featurea` to serve from `featurea/` → `002/`
- Without the header, Nginx serves from `current/` → `003/`

## Limitations

- No authentication/authorization
- No error tracking or operation auditing
- No deployment locking (concurrent uploads may conflict)
- No auto-restart (use PM2 or systemd in production)
