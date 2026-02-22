# Déploiement sur Vercel

## Structure du projet

- **Frontend** (Next.js) : `frontend/` — déployé sur Vercel
- **Backend** (FastAPI) : `backend/` — à déployer séparément (Railway, Render, etc.)

## Checklist avant déploiement

- [ ] Le build passe : `cd frontend && npm run build`
- [ ] Le backend est déployé et accessible via HTTPS
- [ ] Variables d'environnement configurées dans Vercel (voir ci-dessous)

## Déploiement du frontend sur Vercel

### 1. Connexion

1. Va sur [vercel.com](https://vercel.com) et connecte ton repo GitHub/GitLab/Bitbucket
2. Importe le projet
3. Vercel détecte automatiquement la config via `vercel.json` (rootDirectory: frontend)

### 2. Variables d'environnement

Dans **Vercel > Project Settings > Environment Variables**, ajoute :

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `NEXT_PUBLIC_API_URL` | URL du backend FastAPI (ex: `https://xxx.railway.app`) | Oui |
| `NEXT_PUBLIC_BACKEND_URL` | Alias de `NEXT_PUBLIC_API_URL` (priorité si les deux sont définis) | Non |
| `NEXT_PUBLIC_USE_MOCK` | `false` en production | Oui |
| `NEXT_PUBLIC_CARE_RECEIVER_ID` | ID du bénéficiaire (ex: `cr-0000-0001`) | Non (défaut: cr-0000-0001) |
| `NEXT_PUBLIC_ELEVENLABS_API_KEY` | Clé ElevenLabs (pour TTS sur la page Device) | Si page Device utilisée |
| `NEXT_PUBLIC_ELEVENLABS_VOICE_ID` | ID de la voix (défaut: 21m00Tcm4TlvDq8ikWAM) | Non |
| `NEXT_PUBLIC_ELEVENLABS_MODEL_ID` | Modèle TTS (défaut: eleven_turbo_v2) | Non |

### 3. CORS du backend

Sur ton backend (Railway, Render…), configure `ALLOWED_ORIGINS` pour inclure ton domaine Vercel :
```
ALLOWED_ORIGINS=https://ton-projet.vercel.app,https://ton-projet-*.vercel.app
```

### 4. Déploiement

- **Production** : push sur `main` déclenche un déploiement
- **Preview** : chaque PR crée une URL de prévisualisation

## Déploiement du backend (indépendant)

Le backend FastAPI doit être déployé séparément. Options courantes :

- **Railway** : `railway up` depuis le dossier `backend/`
- **Render** : créer un Web Service, root directory = `backend`, command = `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
# Deployment on Vercel

## Project Structure

- **Frontend** (Next.js): `frontend/` — deployed on Vercel
- **Backend** (FastAPI): `backend/` — to be deployed separately (Railway, Render, etc.)

## Pre-deployment Checklist

- [ ] Build passes: `cd frontend && npm run build`
- [ ] Backend is deployed and accessible via HTTPS
- [ ] Environment variables are configured in Vercel (see below)

## Deploying the Frontend on Vercel

### 1. Connection

1. Go to [vercel.com](https://vercel.com) and connect your GitHub/GitLab/Bitbucket repo
2. Import the project
3. Vercel automatically detects the configuration via `vercel.json` (rootDirectory: frontend)

### 2. Environment Variables

In **Vercel > Project Settings > Environment Variables**, add:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | FastAPI backend URL (e.g. `https://xxx.railway.app`) | Yes |
| `NEXT_PUBLIC_BACKEND_URL` | Alias of `NEXT_PUBLIC_API_URL` (priority if both are defined) | No |
| `NEXT_PUBLIC_USE_MOCK` | `false` in production | Yes |
| `NEXT_PUBLIC_CARE_RECEIVER_ID` | Beneficiary ID (e.g. `cr-0000-0001`) | No (default: cr-0000-0001) |
| `NEXT_PUBLIC_ELEVENLABS_API_KEY` | ElevenLabs Key (for TTS on the Device page) | If Device page is used |
| `NEXT_PUBLIC_ELEVENLABS_VOICE_ID` | Voice ID (default: 21m00Tcm4TlvDq8ikWAM) | No |
| `NEXT_PUBLIC_ELEVENLABS_MODEL_ID` | TTS Model (default: eleven_turbo_v2) | No |

### 3. Backend CORS

On your backend (Railway, Render…), configure `ALLOWED_ORIGINS` to include your Vercel domain:
```
ALLOWED_ORIGINS=https://your-project.vercel.app,https://your-project-*.vercel.app
```

### 4. Deployment

- **Production**: A push to `main` triggers a deployment
- **Preview**: Every PR creates a preview URL

## Deploying the Backend (Independent)

The FastAPI backend must be deployed separately. Common options:

- **Railway**: `railway up` from the `backend/` folder
- **Render**: Create a Web Service, root directory = `backend`, command = `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## Identical Behavior in Production

The frontend deployed on Vercel offers the same features as locally:

- Dashboard, calendar, timeline, device, kiosk
- Mock mode (`NEXT_PUBLIC_USE_MOCK=true`) if the backend is unavailable
- Configuration banner if `NEXT_PUBLIC_API_URL` points to localhost in production
