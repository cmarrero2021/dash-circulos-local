import { boot } from 'quasar/wrappers';
import { api } from 'boot/axios'; // Importa la instancia de Axios
import { useAuthStore } from 'stores/auth-store';

// Este boot file se asegura de que cada petición de Axios incluya el token de autenticación si existe.
export default boot(({ store }) => {
  // Variable para mantener la instancia del store una vez inicializada.
  let authStore;

  api.interceptors.request.use(config => {
    // Si authStore aún no está definido, lo inicializamos.
    // Esto previene errores si el interceptor se ejecuta antes de que el store esté completamente listo.
    if (!authStore) {
      authStore = useAuthStore(store);
    }

    if (authStore.token) {
      // Si hay un token en el store, lo adjuntamos al encabezado de la petición.
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    return config;
  });
});
