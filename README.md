# SIX7 Click’n Deploy – Frontend

Dieses Repository enthält das Frontend der Plattform SIX7 Click’n Deploy.
Es handelt sich um eine moderne Single-Page-Application (SPA) auf Basis von Vue 3, Vite, TypeScript, Tailwind CSS, Pinia, Axios und i18n.

## Technologie-Stack

- Vue 3 – Frontend Framework
- Vite – Build Tool und Dev Server
- TypeScript – Typensicherheit
- Vue Router – Routing
- Pinia – State Management
- Axios – HTTP Client
- Tailwind CSS – Styling
- Vue i18n – Mehrsprachigkeit
- Lucide Icons – Icon Set


## Setup
### 1. Voraussetzungen

Folgende Software muss installiert sein:

- Node.js Version 20 oder höher
- npm Version 9 oder höher
- Git

Prüfen mit:

```bash
node -v
npm -v
git -v
```

### 2. Repositoy klonen

```
git clone https://github.com/six7-click-n-deploy/frontend.git
cd frontend
```

### 3. Abhängigkeiten installieren
```
npm install
```

### 4. Mock-Login aktivieren (optional)

Solange das Backend noch nicht verbunden ist, kann der Mock-Modus verwendet werden.

In der .env Datei (erstellen, wenn nicht vorhanden):
```
VITE_USE_MOCK_API=true
```

### 5. Entwicklungsserver starten
```
npm run dev
```

Die Anwendung ist anschließend erreichbar unter:
http://localhost:5173

>fertig

---

## Projektstruktur
```
src/
 ├─ api/                 HTTP-Aufrufe (Axios)
 │   ├─ axios.ts
 │   ├─ auth.api.ts
 │   └─ user.api.ts
 │
 ├─ services/            Fach- und Geschäftslogik
 │   └─ auth.service.ts
 │
 ├─ stores/              Globaler Zustand (Pinia)
 │   └─ auth.store.ts
 │
 ├─ layouts/             Layout-Komponenten
 │   ├─ AppLayout.vue
 │   └─ AuthLayout.vue
 │
 ├─ views/               Seiten
 │   ├─ LoginView.vue
 │   ├─ RegisterView.vue
 │   ├─ DashboardView.vue
 │   ├─ UserView.vue
 │   ├─ ConfigView.vue
 │   └─ ...
 │
 ├─ router/              Routing
 │   └─ index.ts
 │
 ├─ i18n/                Mehrsprachigkeit
 │   ├─ locales/
 │   │   ├─ de.ts
 │   │   └─ en.ts
 │   └─ index.ts
 │
 ├─ components/          Wiederverwendbare UI-Komponenten
 │
 ├─ assets/              Bilder, Logos, Fonts
 │
 ├─ App.vue              Root-Komponente
 ├─ main.ts              App-Bootstrap
 └─ style.css            Globale Styles
```

## Authentifizierungsarchitektur
```
LoginView → AuthStore → AuthService → AuthAPI → Backend
```
**API Layer (api/):**
Enthält reine HTTP-Aufrufe via Axios

**Service Layer (services/):**
Beinhaltet Geschäftslogik, z. B. Tokenverwaltung

**Store Layer (stores/):**
Globaler Zustand von Benutzer, Login, Fehlermeldungen

**Views (views/):**
Visuelle Komponenten ohne direkte API-Abhängigkeit

## Mehrsprachigkeit (i18n)

Die App unterstützt mehrere Sprachen über vue-i18n.

Sprachdateien:
```
src/i18n/locales/
 ├─ de.ts
 └─ en.ts
```

Beispiel im Template:
```
{{ $t('auth.login.title') }}
```

## Styling

- Tailwind CSS wird für das Layout- und Komponentenstyling verwendet
- Globale Farben sind in der tailwind.config.js definiert
- Layouts sind modular in layouts/ aufgebaut

## Routing und Guards

### Beispiel einer geschützten Route:
```
{
  path: '/dashboard',
  component: DashboardView,
  meta: { requiresAuth: true }
}
```

Der globale Navigation Guard überprüft den Login-Status und leitet Benutzer ohne Authentifizierung zum Login weiter.

## Entwicklungs-Workflow

### Standard-Vorgehensweise:
```
git add .
git commit -m "Beschreibung der Änderung"
git push
```