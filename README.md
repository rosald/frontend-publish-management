# Frontend Publish Management System

A simple yet fully functional frontend deployment management system, with the following features:

- Deploy frontend assets via web interface
- Specify release versions
- Access different versions using request headers
- Zero-downtime version switching

## Motivation

While cloud services are commonly used for frontend deployments (especially for SPAs where index.html is served through rendering services and assets are hosted on CDNs), there are scenarios where a single Nginx server suffices for lower-traffic applications.

This solution addresses two key challenges:

1. Manual deployment processes are cumbersome
2. Testing parallel features is difficult when only one version is available (merging all feature branches mixes changes, whereas isolated feature testing is often preferable)

## Usage Instructions

### 1. Initialize configuration

Rename ./server/site.db.template.json to ./site.db.json

### 2. Configure sites

Edit site.db.json to define your deployment targets. This file contains site-name → site-path mappings. The path value should match where assets will be stored and must correspond to your Nginx configuration.

```json
{
  "sitea": "/home/ubuntu/sitea"
}
```

### 3. Configure Nginx

Add this map directive to the top of your http block:

```conf
map $http_x_env_version $asset_env_version {
    default      "current";
    "~^[a-z]+$"  $http_x_env_version;
}
```

### 4. Set Nginx root path

In your server/location block, configure the root path:

```
root    /home/ubuntu/sitea/$asset_env_version;
```

> Ensure the directory (in this case /home/ubuntu/sitea) exists with correct permissions

### 5. Start services

```bash
sudo systemctl restart nginx  # Restart Nginx
cd client && npm run build # Build frontend
cd server && npm start # Start backend server
```

### 6. Access management UI

Visit http://localhost:3000/frontend-publish-management

### 7. Deploy assets

- Click "Select site to operate..."
- Select and upload a .tar file
- Click "Publish/Unpublish", then click "Set as Default Version"

Note : File structure: All files must be at the root of the archive (e.g., avoid having a "dist/" folder inside the archive).

### 8. Test deployments

Access your site normally to see the published version

### 9. Environment testing (optional)

- Upload multiple versions
- Enter an environment name (e.g., featurea)
- Visit site with header: x-env-version: featurea
- Use browser extensions like ModHeader for header injection

## Architecture Overview

### Core Components

#### Backend (Koa Server)

- Receives and extracts .tar archives
- Manages symlinks for version switching
- Uses site.db.json for site configuration:

#### Frontend (React + Vite)

- Provides UI for version management
- Visualizes deployment status and history

#### Nginx

- Uses map to convert headers to directory paths
- Serves assets from version-specific directories

### Key Mechanism

The system manages directories where Nginx serves content, enabling:

1. Atomic version switches via symlink updates
2. Header-based version routing (x-env-version)
3. Parallel version testing without DNS changes

## Limitations

The following features are not implemented:

- Authentication/authorization
- Error tracking and reporting
- Operation auditing
- Database persistence
- Deployment locking
- Auto-restart (PM2 recommended)
