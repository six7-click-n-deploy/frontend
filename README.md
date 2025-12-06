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

---

# Architektur und Projektaufbau

Dieses Projekt folgt einer klaren, modularen Architektur, die eine saubere Trennung von Präsentation, State-Management, Business-Logik und API-Kommunikation gewährleistet. Ziel ist eine gut wartbare, skalierbare und verständliche Codebasis.


## Einstiegspunkt der Anwendung

### main.ts

Die Datei `main.ts` ist der technische Einstiegspunkt der Anwendung. Hier wird die Vue-App initialisiert und mit allen globalen Plugins verbunden.

Aufgaben von `main.ts`:

- Initialisierung der Vue-App mit `createApp`
- Einbinden von:
  - Pinia (State Management)
  - Vue Router (Routing)
  - i18n (Mehrsprachigkeit)
- Mounten der App auf das DOM-Element `#app`
- Optional: Automatisches Wiederherstellen des Login-Zustands (z. B. über `auth.fetchMe()`)

Kurz gesagt:  
`main.ts` ist der Bootloader der gesamten Anwendung.

## App.vue – Root-Komponente

`App.vue` ist die Root-Komponente der Anwendung. Sie enthält kein direktes Fachwissen über einzelne Seiten, sondern dient als übergeordnete Hülle für das gesamte Routing-System.

Aufgaben von `App.vue`:

- Umschalten zwischen verschiedenen Layouts (z. B. Auth-Layout oder App-Layout)
- Bereitstellen einer einheitlichen Struktur für alle Views
- Enthält die `<RouterView />`, in der die jeweiligen Seiten gerendert werden

Beispielhafte Funktion:  
Die App entscheidet anhand von Route-Metadaten (`meta.layout`), ob ein Login-Layout oder ein App-Layout angezeigt wird.

## Layouts

Die Layouts befinden sich im Ordner:

src/layouts/

Typische Layouts:

- `AuthLayout.vue`  
  Layout für Login- und Registrierungsseiten ohne Sidebar und Navigation.

- `AppLayout.vue`  
  Hauptlayout der Anwendung mit Sidebar, Header/Navbar und Content-Bereich.

Aufgabe der Layouts:

- Einheitliches Design für zusammengehörige Seiten
- Trennung zwischen Seitenstruktur (Layout) und Seiteninhalt (Views)
- Vermeidung von doppeltem Layout-Code in jeder View

Technisch umschließen Layouts die aktuelle View über `<slot />`.

## Routing

Das Routing befindet sich in:

src/router/index.ts

Aufgaben des Routers:

- Definition aller Routen (z. B. `/login`, `/dashboard`, `/user`)
- Zuordnung von Routen zu Views
- Definition von Meta-Informationen:
  - `layout` zur Auswahl des entsprechenden Layouts
  - `requiresAuth` für geschützte Routen
- Globale Navigation Guards zur Zugriffskontrolle

Beispiel für eine geschützte Route:

```ts
{
  path: '/dashboard',
  component: DashboardView,
  meta: { requiresAuth: true, layout: 'app' }
}
```

Der globale Guard prüft, ob der Benutzer eingeloggt ist. Falls nicht, erfolgt eine Weiterleitung zum Login.

## Views (Seiten)

Die Views befinden sich im Ordner:

`src/views/`

Views sind vollständige Seiten der Anwendung, z. B.:
- LoginView
- RegisterView
- DashboardView
- UserView
- ConfigView

Aufgaben der Views:
- Darstellung der Benutzeroberfläche
- Entgegennahme von Benutzereingaben
- Aufruf von Store-Actions oder Services
- Keine direkte API-Kommunikation
- Keine direkte Geschäftslogik

Das bedeutet:  
Views enthalten hauptsächlich UI-Logik und Präsentation.

## Components (Wiederverwendbare Komponenten)

Der Ordner:

`src/components/`

enthält wiederverwendbare UI-Bausteine, z. B.:

- Buttons
- Input-Felder
- Modals
- Karten (Cards)
- Formular-Komponenten

Unterschied zu Views:

- Components sind keine eigenständigen Seiten
- Sie werden von Views oder Layouts eingebunden
- Sie sind möglichst generisch und wiederverwendbar gehalten

## i18n – Mehrsprachigkeit

Die Internationalisierung befindet sich unter:

`src/i18n/`

mit den Sprachdateien:
```
src/i18n/locales/
├─ de.ts
└─ en.ts
```
Aufgaben von i18n:

- Bereitstellung aller Texte in mehreren Sprachen
- Zentrale Verwaltung der Übersetzungen
- Umschaltung der Sprache zur Laufzeit

Verwendung im Template:
```
{{ $t('auth.login.title') }}
```
Damit wird der Text sprachabhängig geladen.

## Assets

Der Ordner:

`src/assets/`

enthält alle statischen Ressourcen, z. B.:

- Bilder
- Logos
- Icons
- Schriftarten

Diese Dateien werden nicht durch Vue verarbeitet, sondern direkt vom Build-System eingebunden.

## API Layer (Axios)

Der API-Layer befindet sich unter:

`src/api/`

Typische Dateien:

- axios.ts – Zentrale Axios-Konfiguration
- auth.api.ts – Authentifizierungs-Endpunkte
- user.api.ts – Benutzerbezogene Endpunkte

Aufgaben des API-Layers:

- Ausschließlich HTTP-Kommunikation
- Enthält keine Geschäftslogik
- Kennt nur Endpunkte, Header und Payloads

Beispiel:
```ts
export const loginApi = (data) => {
  return api.post('/auth/login', data)
}
```

## Service Layer (Business-Logik)

Der Service-Layer befindet sich unter:

`src/services/`

Beispiel:

- auth.service.ts

Aufgaben des Service-Layers:

- Verarbeitung der vom API gelieferten Daten
- Speicherung von Tokens (z. B. im LocalStorage)
- Umwandlung von Rohdaten in verwertbare Objekte
- Bereitstellung einer klaren Schnittstelle für Stores

Der Service kennt:

- den API-Layer
- aber keine Views

## Store Layer (Pinia)

Der globale Zustand der Anwendung wird in:

`src/stores/`

verwaltet, z. B.:

- auth.store.ts

Aufgaben des Stores:

- Speichern des eingeloggten Benutzers
- Verwaltung des Login-Status
- Globale Ladezustände
- Fehlerzustände
- Bereitstellung von Gettern für andere Komponenten

Der Store verbindet:

- Views mit den Services
- und stellt reaktive Daten für die gesamte Anwendung bereit

## Datenfluss: Von der View bis zum Backend
```
LoginView → AuthStore → AuthService → AuthAPI (Axios) → Backend
```

Erklärung Schritt für Schritt:
1. Der Benutzer gibt E-Mail und Passwort in der LoginView ein.
2. Die LoginView ruft `authStore.login(email, password)` auf.
3. Der AuthStore ruft den loginService auf.
4. Der loginService ruft die Funktion `loginApi` auf.
5. Die `loginApi` sendet eine HTTP-Anfrage per Axios an das Backend.
6. Das Backend sendet Token und User-Daten zurück.
7. Der Service speichert das Token.
8. Der Store speichert den User im globalen State.
9. Alle Komponenten, die auf den User zugreifen, aktualisieren sich automatisch.

## Vorteile dieses Aufbaus

- Keine direkte API-Nutzung in der UI
- Saubere Trennung von Verantwortlichkeiten
- Gute Testbarkeit
- Einfache Erweiterbarkeit
- Klar definierte Zuständigkeiten

## Wie das Repository verwendet wird

- Neue Seiten werden im Ordner `src/views/` angelegt
- Neue globale Zustände kommen in `src/stores/`
- Neue Backend-Endpunkte werden in `src/api/` ergänzt
- Die dazugehörige Logik kommt in `src/services/`
- Texte werden ausschließlich in `src/i18n/locales/` gepflegt
- Wiederverwendbare UI-Bausteine gehören in `src/components/`
- Layout-Anpassungen erfolgen in `src/layouts/`
- Neue Routen werden im `src/router/index.ts` ergänzt

Diese Struktur sorgt dafür, dass das Projekt langfristig wartbar und übersichtlich bleibt.


## Entwicklungs-Workflow
```
git add .
git commit -m "Beschreibung der Änderung"
git push
```