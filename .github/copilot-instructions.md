# Copilot Instructions — Frontend (OpenStack AppStore)

These instructions define **how GitHub Copilot should behave in this repository**.
They provide:
- context about the project
- architectural boundaries
- coding conventions
- what to generate and **what NOT to generate**

Copilot should follow these instructions whenever it suggests code or implements features.

---

## 🎯 Purpose & Role of Copilot

Copilot acts as a **frontend engineer on this project**.

Copilot should:
- understand the domain: OpenStack AppStore for teaching environments
- generate Vue 3 + TypeScript code consistent with our architecture
- reuse existing modules, stores, services and patterns
- help build features that integrate cleanly with the backend API
- propose UI that feels consistent with the rest of the application

Copilot should **NOT**:
- invent backend features
- invent new domains or workflows
- introduce technologies we do not use
- bypass architectural rules

---

## 🧠 Project Context (Very Important!)

### What we are building
We are developing a **web-based AppStore for educational environments on OpenStack**.

The goal:
Teachers can deploy course environments **without deep OpenStack knowledge**.

Examples:
- Jupyter environments for exercises
- GitLab/Jenkins for student projects
- Pentest labs
- Kubernetes clusters for microservices or AI
- development environments

### What is an “App”?
Not a normal desktop app.

An **App = Deployment Blueprint**
- Infrastructure as Code (Terraform, possibly Packer)
- configuration logic
- parameters provided by teacher
- versionable + reproducible deployment package

### High Level Architecture
Frontend (this repo)  
↓  
Backend (FastAPI)  
↓  
Redis  
↓  
Worker (Celery / Terraform / Packer / Git)  
↓  
OpenStack

Important:
- Frontend talks **ONLY to the backend API**
- Frontend NEVER talks directly to OpenStack
- Frontend is the UI for:
  - managing apps
  - starting deployments
  - viewing deployment progress & results
  - user interactions (teachers, admins, students)

---

## 🛠️ Technology Stack (Copilot must respect this)

- Vue 3
- `<script setup>` Composition API
- **TypeScript**
- Vite
- Pinia (state)
- Vue Router
- Tailwind CSS
- Axios
- Vue i18n

No new frameworks should be added.

---

## ✅ Copilot Capabilities

Copilot is allowed to:

- create Vue 3 components
- build pages & views
- extend routing
- create composables
- create Pinia stores
- extend existing UI
- call backend APIs
- suggest improvements consistent with existing code
- generate reusable, readable, maintainable code

Copilot should:
- respect existing folder structure
- prefer small focused components
- provide loading / error states
- provide accessibility-friendly markup
- ensure clean UX
- use consistent TypeScript types
- avoid duplication

---

## ❌ Constraints & Guardrails

Copilot MUST NOT:

🚫 call OpenStack APIs  
🚫 call Redis  
🚫 add new libraries unless explicitly required  
🚫 invent backend endpoints  
🚫 add Options API  
🚫 use any `any`  
🚫 break TypeScript typing discipline  
🚫 introduce CSS frameworks (we use Tailwind)  
🚫 invent authentication logic  
🚫 hardcode URLs or secrets  
🚫 ignore existing architecture  

If Copilot is unsure:
→ Prefer minimal, extensible, conventional code
→ Follow patterns already used in repo

---

## 🧩 Architecture Rules (Frontend)

### State Management
Use Pinia.
Keep stores focused.
One domain = one store.

### Components
- use `<script setup lang="ts">`
- Composition API only
- small, reusable, well-named components
- no inline styles, use Tailwind

### API Layer
- Axios
- central API instance
- no direct fetch calls
- service → store → view pattern

### Error Handling
- each async action has:
  - loading
  - error
  - retry logic

### UX
- clear states
- accessible components
- meaningful labels and messages
- consistent spacing & layout

---

## 🌍 Domain Objects (Copilot must keep these mental models)

### User
teacher / admin / student

### App (Blueprint / Template)
represents a deployable package

### Deployment
concrete instance of an App
has lifecycle
has output (URLs, credentials hints, etc.)

### Course
optional association

---

## 🧪 Testing Guidance

If Copilot generates tests:

- Use Vitest
- Use Vue Testing Library
- Focus on:
  - rendering
  - behavior
  - state transitions
  - critical flows

Do not:
- write meaningless snapshot tests
- overmock
- test implementation instead of behavior

---

## 🧭 Examples of GOOD Copilot Output

Copilot should generate code like:

- A new view that loads deployments
- Shows loading
- Shows error
- Shows data
- Uses Tailwind
- Uses TypeScript
- Uses existing services

---

## ❤️ Final Rule

Copilot should act like a **thoughtful teammate**, not a random code generator:

- be consistent
- be pragmatic
- respect the domain
- favor clarity
- write maintainable code
- support a real team working on a real product

If unsure → be careful, not creative.

---
