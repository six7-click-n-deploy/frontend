import { createRouter, createWebHistory } from "vue-router";
import { useDeploymentStore } from '@/stores/deployment.store'
import CoursesView from "@/views/CoursesView.vue";
import CourseDetailView from "@/views/CourseDetailView.vue";
import AppsView from "@/views/AppsView.vue";
import HelpView from "@/views/HelpView.vue";
import DeploymentsView from "@/views/DeploymentsView.vue";
import DeploymentsListView from "@/views/DeploymentsListView.vue";
import DeploymentCreateView from "@/views/DeploymentCreateView.vue";
import DeploymentDetailView from "@/views/DeploymentDetailView.vue";
import LoginView from "@/views/LoginView.vue";
import DashboardView from "@/views/DashboardView.vue";
import UserView from "@/views/UserView.vue";
import AddAppsView from "@/views/AddAppsView.vue";
import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types'
import NewDeploymentConfigView from '@/views/NewDeploymentConfigView.vue';
import NewDeploymentSummaryView from '@/views/NewDeploymentSummaryView.vue';
import NewDeploymentVariableView from '@/views/NewDeploymentVariableView.vue';
import AppsDetailView from "@/views/AppsDetailView.vue";
import NewDeploymentGroupsAssignmentView from '@/views/NewDeploymentGroupsAssignmentView.vue'


/**
 * Guard für die Wizard-Steps. Verhindert Deep-Links, die das Wizard-State-
 * Modell überspringen — z.B. ``/deployment/new/summary`` ohne dass je ein
 * App ausgewählt wurde, was sonst stillschweigend zu leeren Lists/Submits
 * führt. Bei fehlenden Feldern leitet der Guard auf den passenden vorigen
 * Schritt weiter, statt 404 oder weißen Bildschirm zu produzieren.
 *
 * Akzeptierte Felder:
 *  - ``appId``      → vorhanden = String, sonst zurück zur App-Übersicht
 *  - ``name``       → nicht-leerer String
 *  - ``studentIds`` → mind. 1 Eintrag
 */
type WizardField = 'appId' | 'name' | 'studentIds'

function requireWizardStep(required: WizardField[]) {
  return () => {
    const draft = useDeploymentStore().draft
    for (const field of required) {
      const val = (draft as any)[field]
      if (field === 'studentIds') {
        if (!Array.isArray(val) || val.length === 0) {
          // Ohne Studenten gibt's nichts zu tun → Step 1.
          return { name: 'deployment.config' }
        }
      } else if (field === 'appId') {
        if (!val) {
          // Ohne App kein Wizard-Eintrittspunkt → zurück zur App-Liste.
          return '/apps'
        }
      } else if (typeof val !== 'string' || val.trim() === '') {
        return { name: 'deployment.config' }
      }
    }
    return true
  }
}


const router = createRouter({
  history: createWebHistory(),
  routes: [
    // AUTH LAYOUT
    {
      path: "/login",
      component: LoginView,
      meta: { layout: "auth", requiresGuest: true },
    },
    {
      path: "/callback",
      name: "callback",
      component: () => import('@/views/CallbackView.vue'),
      meta: { layout: "auth" },
    },

    // APP LAYOUT
    {
      path: "/",
      name: "home",
      component: DashboardView,
      meta: { layout: "app", requiresAuth: true },
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: DashboardView,
      meta: { layout: "app", requiresAuth: true, useMeshBg: true },
    },
    {
      path: "/courses",
      component: CoursesView,
      meta: {
        layout: "app",
        requiresAuth: true,
        requiresRole: ['teacher', 'admin']
      },
    },
    {
      path: "/courses/:id",
      name: "courses.detail",
      component: CourseDetailView,
      meta: {
        layout: "app",
        requiresAuth: true,
        requiresRole: ['teacher', 'admin']
      },
    },
    {
      path: "/apps",
      name: "apps",
      component: AppsView,
      meta: { layout: "app", requiresAuth: true },
    },
    {
      path: "/apps/create",
      name: "apps.create",
      component: AddAppsView,
      meta: { layout: "app", requiresAuth: true },
    },
    {
      path: "/apps/:id",
      name: "apps.detail",
      component: AppsDetailView,
      meta: { layout: "app", requiresAuth: true },
    },
    {
      path: "/help",
      component: HelpView,
      meta: { layout: "app", requiresAuth: true },
    },
    {
      path: "/deployments",
      component: DeploymentsView,
      meta: { layout: "app", requiresAuth: true },
      children: [
        {
          path: '',
          name: 'deployments.list',
          component: DeploymentsListView,
        },
        {
          path: '',
          component: DeploymentCreateView,
        },
        {
          path: '/deployments/:id',
          name: 'deployments.detail',
          component: DeploymentDetailView,
          props: true,
        }
      ],
    },
    // User Profile
    {
      path: "/user",
      component: UserView,
      meta: { layout: "user", requiresAuth: true },
    },
    {
      path: '/deployment/new/config',
      name: 'deployment.config',
      component: NewDeploymentConfigView,
      meta: { requiresAuth: true, layout: 'app' }
    },
    {
      path: '/deployment/new/teams',
      name: 'deployment.teams',
      component: NewDeploymentGroupsAssignmentView,
      meta: { requiresAuth: true, layout: 'app' },
      // Schritt 2 setzt voraus, dass Schritt 1 (App + Name + mind. ein
      // Student) befüllt wurde. Deep-Links sonst → Redirect auf Schritt 1.
      beforeEnter: requireWizardStep(['appId', 'name', 'studentIds']),
    },
    {
      path: '/deployment/new/variables',
      name: 'deployment.variables',
      component: NewDeploymentVariableView,
      meta: { requiresAuth: true, layout: 'app' },
      // Variablen-Schritt braucht Team-Setup (mind. groupCount/assignments
      // muss befüllt sein). Sonst zurück zur passenden Vorstufe.
      beforeEnter: requireWizardStep(['appId', 'name', 'studentIds']),
    },
    {
      path: '/deployment/new/summary',
      name: 'deployment.summary',
      component: NewDeploymentSummaryView,
      meta: { requiresAuth: true, layout: 'app' },
      // Summary nur erreichbar, wenn alle vorherigen Schritte Daten haben.
      beforeEnter: requireWizardStep(['appId', 'name', 'studentIds']),
    },
    {
      path: '/user/openstack',
      name: 'user.openstack',
      component: () => import('@/views/SettingsOpenStackView.vue'),
      meta: { requiresAuth: true, layout: 'user' },
    },
  ],
});

// Navigation Guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (authStore.isLoading) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  if (!authStore.user && to.path !== '/callback' && to.path !== '/login') {
    await authStore.initialize()
  }

  const requiresAuth = to.meta.requiresAuth as boolean
  const requiresGuest = to.meta.requiresGuest as boolean
  const requiresRole = to.meta.requiresRole as UserRole[] | undefined

  if (requiresGuest && authStore.isAuthenticated) {
    return next('/dashboard')
  }

  if (requiresAuth && !authStore.isAuthenticated) {
    const returnUrl = to.fullPath
    return next(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
  }

  if (requiresRole && requiresRole.length > 0) {
    if (!authStore.hasAnyRole(...requiresRole)) {
      return next(from.path || '/dashboard')
    }
  }

  next()
})

export default router;
