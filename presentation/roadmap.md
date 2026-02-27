# 🗺️ Roadmap & Suivi des Bugs - Projet Hack Europe

Ce document recense les bugs connus, la dette technique accumulée pendant le hackathon, ainsi que les pistes d'évolution pour le futur de l'application.

## 🐛 Bugs & Problèmes Connus

### 1. L'agent reste muet sur téléphone (Audio Autoplay bloqué)
* **Description :** Sur les navigateurs mobiles (iOS/Android), l'audio ne se lance pas automatiquement sans interaction préalable de l'utilisateur (politique stricte d'Autoplay). Le code passe silencieusement dans le bloc `catch` et affiche uniquement le texte.
* **Solution :** Ajouter un écran d'accueil type "Toucher pour démarrer l'assistant". Au clic, initialiser le contexte audio (jouer un son vide ou un petit carillon) et basculer l'état pour autoriser la boucle `useEffect` à lancer les actions vocales.

### 2. Fichiers MP3 stockés dans le frontend
* **Description :** Actuellement, des fichiers audios/MP3 sont stockés directement dans le dossier du frontend, ce qui alourdit le build et casse la séparation des responsabilités (sécurité/scalabilité).
* **Solution :** Migrer le stockage de ces fichiers vers le backend (dans un dossier `static` ou idéalement sur un bucket type AWS S3). Le frontend devra uniquement récupérer les URLs via l'API pour les lire.

### 3. Temps de lecture du texte de secours (Fallback) inadapté
* **Description :** Si l'API audio (ElevenLabs) échoue ou que l'appareil bloque le son, le texte de secours s'affiche pendant exactement 3 secondes (`await delay(3000)`), peu importe la longueur de la phrase.
* **Solution :** Calculer le délai dynamiquement en fonction du nombre de mots ou de caractères. 
  * *Exemple :* `await delay(Math.max(3000, text.length * 60))`

### 4. Coupure brutale des audios en conflit
* **Description :** Dans `audio.ts`, la variable `currentAudio` est globale. Si une nouvelle action audio est déclenchée avant la fin de la précédente, la première est coupée net sans transition.
* **Solution :** Mettre en place un système de "file d'attente" (queue) pour les actions audio ou ajouter un léger "fade out" avant d'interrompre un son.

---

## 🧹 Dette Technique & Refactoring

* **[React] Corriger l'avertissement ESLint du `useEffect` :** * Dans `KioskShell.tsx`, la règle d'exhaustivité des dépendances est désactivée (`// eslint-disable-next-line react-hooks/exhaustive-deps`).
  * *Action :* Extraire la logique de `processAction` ou l'envelopper dans un `useCallback` correctement typé pour éviter les effets de bord inattendus de React.
* **[Clean Code] Uniformiser la langue des commentaires :** * Le code est majoritairement en anglais, mais des commentaires en français subsistent (ex: `// ── speak_reminder: parle et s'auto-efface...`).
  * *Action :* Tout passer en anglais pour respecter les standards open-source.

---

## 🚀 Fonctionnalités Futures (Idées)

### Pour le patient (Care Receiver)
* **Support Multi-langues (i18n) :** Permettre à l'agent de parler et comprendre différentes langues ou dialectes locaux.
* **Mode "Offline" (PWA) :** Permettre à l'application de fonctionner avec des fonctionnalités de base (rappels locaux, requêtes d'aide d'urgence en SMS au lieu de l'API) en cas de coupure internet.
* **Exercices cognitifs avancés :** Enrichir les `EXERCISE_QUESTIONS` avec des jeux de mémoire vocaux ou des quiz personnalisés basés sur le passé du patient.

### Pour l'aidant (Caregiver)
* **Tableau de bord de suivi (Dashboard Analytics) :** Un espace web pour voir l'évolution des réponses du patient (humeur quotidienne, taux de complétion des exercices).
* **Alertes intelligentes :** Être notifié (WhatsApp/SMS) non seulement si le patient appuie sur "Aide", mais aussi si l'agent détecte une voix anormale, de la détresse, ou s'il n'y a eu aucune interaction pendant 24h.
* **Customisation de la routine :** Interface permettant à l'aidant d'ajouter facilement des rappels de médicaments personnalisés à distance qui se synchroniseront sur le Kiosque.

### Technique
* **Intégration IoT / Wearables :** Connecter l'application à des montres connectées (Apple Watch, Garmin) pour croiser les données de l'agent (humeur déclarée) avec les données physiologiques (rythme cardiaque, qualité du sommeil).