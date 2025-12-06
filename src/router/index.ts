import { createRouter, createWebHistory } from "vue-router";
import CoursesView from "@/views/CoursesView.vue";
import TemplatesView from "@/views/TemplatesView.vue";
import HelpView from "@/views/HelpView.vue";
import HomeView from "@/views/HomeView.vue";
import LoginView from "@/views/LoginView.vue";
import RegisterView from "@/views/RegisterView.vue";
import DashboardView from "@/views/DashboardView.vue";
import UserView from "@/views/UserView.vue";
import ConfigView from "@/views/ConfigView.vue";

// benötigt für Authentifizierung
//import { useAuthStore } from '@/stores/auth.store'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // AUTH LAYOUT
    {
      path: "/login",
      component: LoginView,
      meta: { layout: "auth" },
    },
    {
      path: "/register",
      component: RegisterView,
      meta: { layout: "auth" },
    },

    // APP LAYOUT
    {
      path: "/courses",
      component: CoursesView,
      meta: { layout: "app", requiresAuth: true },
    },
    {
      path: "/templates",
      component: TemplatesView,
      meta: { layout: "app", requiresAuth: true },
    },
    {
      path: "/help",
      component: HelpView,
      meta: { layout: "app", requiresAuth: true },
    },
    {
      path: "/",
      alias: "/home",
      component: HomeView,
      meta: { layout: "app", requiresAuth: true },
    },
    {
      path: "/dashboard",
      component: DashboardView,
      meta: { layout: "app", requiresAuth: true },
    },
    {
      path: "/config",
      component: ConfigView,
      meta: { layout: "app", requiresAuth: true },
    },
    // User Profile
    {
      path: "/user",
      component: UserView,
      meta: { layout: "user", requiresAuth: true },
    },
  ],
});

// wieder reinmachen, wenn Auth gewünscht ist (das backend muss stehen dafür)

//router.beforeEach((to) => {
//  const auth = useAuthStore()

//  if (to.meta.requiresAuth && !auth.isAuthenticated) {
//    return '/login'
//  }
//})

export default router;
