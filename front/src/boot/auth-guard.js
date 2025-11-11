
// src/boot/auth-guard.js
import { boot } from 'quasar/wrappers';
import { useAuthStore } from 'stores/auth-store';
import { storeInstance } from 'src/router/index'; // <-- ¡Importación clave!

// Ya no necesitamos pasar { store } a la función boot
export default boot(({ router }) => {
  // Obtenemos el authStore usando la instancia importada
  const authStore = useAuthStore(storeInstance);

  router.beforeEach((to, from, next) => {
    // ---- Añade estos logs para la depuración final ----
    console.log(`[Auth Guard] Navegando a: ${to.path}`);
    console.log(`[Auth Guard] isAuthenticated: ${authStore.isAuthenticated}`);
    console.log(`[Auth Guard] Meta:`, to.meta);
    // --------------------------------------------------

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      console.log(`[Auth Guard] DECISIÓN: Redirigir a /login`);
      next({ path: '/login' });
    } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
      console.log(`[Auth Guard] DECISIÓN: Redirigir a /`);
      next({ path: '/' });
    } else {
      console.log(`[Auth Guard] DECISIÓN: Permitir`);
      next();
    }
  });
});

// src/boot/auth-guard.js
// import { boot } from 'quasar/wrappers'

// // Totalmente simplificado. No Pinia, no Router. Solo un log.
// export default boot(() => {
//   console.log('¡¡¡EL BOOT FILE AUTH-GUARD SE ESTÁ EJECUTANDO AHORA!!!');
// })
