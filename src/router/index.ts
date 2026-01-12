import { createRouter, createWebHistory } from "vue-router";
import CoursesView from "@/views/CoursesView.vue";
import AppsView from "@/views/AppsView.vue";
import HelpView from "@/views/HelpView.vue";
import DeploymentsView from "@/views/DeploymentsView.vue";
import DeploymentsListView from "@/views/DeploymentsListView.vue";
import DeploymentCreateView from "@/views/DeploymentCreateView.vue";
import DeploymentDetailView from "@/views/DeploymentDetailView.vue";
import LoginView from "@/views/LoginView.vue";
import DashboardView from "@/views/DashboardView.vue";
import UserView from "@/views/UserView.vue";
import ConfigView from "@/views/ConfigView.vue";
import AddAppsView from "@/views/AddAppsView.vue";
import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types'
import NewDeploymentView from '../views/NewDeploymentView.vue';
import NewDeploymentConfigView from '@/views/NewDeploymentConfigView.vue';
import NewDeploymentGroupsView from '@/views/NewDeploymentGroupsView.vue';
import NewDeploymentAssignmentView from '@/views/NewDeploymentAssignmentView.vue';
import NewDeploymentSummaryView from '@/views/NewDeploymentSummaryView.vue';


const router = createRouter({
  history: createWebHistory(),
  routes: [
    // AUTH LAYOUT
    {
      path: "/login",
      component: LoginView,
      meta: { layout: "auth", requiresGuest: true },
    },
    // Callback route for Keycloak OAuth redirect
    {
      path: "/callback",
      name: "callback",
      component: () => import('@/views/CallbackView.vue'),
      meta: { layout: "auth" },
    },

    // APP LAYOUT
    {
      path: "/",
      component: DashboardView,
      meta: { layout: "app", requiresAuth: true },
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: DashboardView,
      meta: { layout: "app", requiresAuth: true },
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
      path: "/apps",
      component: AppsView,
      meta: { layout: "app", requiresAuth: true },
    },
    {
      path: "/apps/create",
      name: "apps.create",  // Wichtig: Dieser Name wird im Button benutzt
      component: AddAppsView,
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
          //name: 'deployments.create',
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
    {
      path: "/config",
      component: ConfigView,
      meta: { 
        layout: "app", 
        requiresAuth: true,
        requiresRole: ['admin']
      },
    },
    // User Profile
    {
      path: "/user",
      component: UserView,
      meta: { layout: "user", requiresAuth: true },
    },

    {
    path: "/user",
    component: UserView,
    meta: { layout: "user", requiresAuth: true },
  },
  {
    path: "/deployment",
    name: 'deployments.create',
    component: NewDeploymentView,
    meta: { 
      requiresAuth: true, 
      layout: 'app' // Nutzt das AppLayout mit Sidebar etc.
    }
  },
  {
    path: '/deployment/config',
    name: 'deployment-config',
    component: NewDeploymentConfigView,
    meta: { 
      requiresAuth: true, 
      layout: 'app' 
    }
  },
  {
    path: '/deployment/groups',
    name: 'deployment-groups',
    component: NewDeploymentGroupsView,
    meta: { 
      requiresAuth: true, 
      layout: 'app' 
    }
  },
  {
    path: '/deployment/assignment',
    name: 'deployment-assignment',
    component: NewDeploymentAssignmentView,
    meta: { 
      requiresAuth: true, 
      layout: 'app' 
    }
  },
  {
    path: '/deployment/summary',
    name: 'deployment-summary',
    component: NewDeploymentSummaryView,
    meta: { 
      requiresAuth: true, 
      layout: 'app' 
    }
  },
  ],
});

// Navigation Guards with Keycloak
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Wait for auth initialization
  if (authStore.isLoading) {
    // Wait a bit for initialization
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Initialize auth if not done yet
  if (!authStore.user && to.path !== '/callback' && to.path !== '/login') {
    await authStore.initialize()
  }

  const requiresAuth = to.meta.requiresAuth as boolean
  const requiresGuest = to.meta.requiresGuest as boolean
  const requiresRole = to.meta.requiresRole as UserRole[] | undefined

  // Guest-Only Routes (Login)
  if (requiresGuest && authStore.isAuthenticated) {
    return next('/dashboard')
  }

  // Auth Required Routes
  if (requiresAuth && !authStore.isAuthenticated) {
    // Store return URL for after login
    const returnUrl = to.fullPath
    return next(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
  }

  // Role-Based Access Control
  if (requiresRole && requiresRole.length > 0) {
    if (!authStore.hasAnyRole(...requiresRole)) {
      // Not authorized -> back or dashboard
      return next(from.path || '/dashboard')
    }
  }

  next()
})

export default router;