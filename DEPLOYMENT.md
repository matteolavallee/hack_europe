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

## Comportement identique en prod

Le frontend déployé sur Vercel offre les mêmes fonctionnalités qu'en local :

- Dashboard, calendrier, timeline, device, kiosk
- Mode mock (`NEXT_PUBLIC_USE_MOCK=true`) si backend non disponible
- Bandeau de configuration si `NEXT_PUBLIC_API_URL` pointe vers localhost en production
