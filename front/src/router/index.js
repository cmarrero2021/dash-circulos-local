// src/router/index.js
import { route } from 'quasar/wrappers';
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router';
import routes from './routes';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

// ==========================================================
let routerInstance = null;
let useAuthStore = null; // <-- Variable para guardar la función del store
let storeInstance = null;
// ==========================================================

export default route(function ({ store /*, ssrContext */ }) {
  // ==========================================================
  storeInstance = store; // <-- Guardamos la instancia
  // ==========================================================
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
    ? createWebHistory
    : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  // ==========================================================
  routerInstance = Router; // <-- Guardamos la instancia del router
  // ==========================================================

  Router.beforeEach(async (to, from, next) => {
    // 1. Asegurarse de que el módulo del store esté cargado.
    if (!useAuthStore) {
      useAuthStore = (await import('stores/auth-store')).useAuthStore;
    }
    const authStore = useAuthStore();

    // 2. Si el store no está inicializado y hay un token, inicializarlo.
    // Esto es crucial para las recargas de página (F5) y previene condiciones de carrera.
    if (!authStore.isAuthenticated && authStore.token) {
      await authStore.init();
    }

    // 3. Lógica de protección de rutas
    const isAuthenticated = authStore.isAuthenticated;

    if (to.meta.requiresGuest && isAuthenticated) {
      // Si el usuario está logueado, no puede acceder a páginas de "invitado" como el login.
      // Redirigir a la página principal.
      next({ path: '/' });
    } else if (to.meta.requiresAuth && !isAuthenticated) {
      // Si la ruta requiere autenticación y el usuario no está logueado, redirigir al login.
      next({ path: '/login' });
    } else if (to.meta.requiresAdmin && authStore.user?.role !== 'Administrador') {
      // Si la ruta requiere ser admin y el usuario no lo es, redirigir a la página principal.
      next({ path: '/' });
    } else {
      // Si ninguna de las condiciones anteriores se cumple, permitir el acceso.
      next();
    }
  });
  return Router;
});

// ==========================================================
// Exportamos las instancias para poder usarlas en otros archivos
export { routerInstance, storeInstance };
// ==========================================================
