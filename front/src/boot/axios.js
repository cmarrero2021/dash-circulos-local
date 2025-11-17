// src/boot/axios.js
import { boot } from 'quasar/wrappers';
import axios from 'axios';
import { useAuthStore } from 'stores/auth-store';
import { storeInstance, routerInstance } from 'src/router/index'; // <-- Importación clave

const api = axios.create({ baseURL: 'http://localhost:3000/api' });

// Ya no necesitamos pasar { store, router } a la función boot
export default boot(({ app }) => {
  const authStore = useAuthStore(storeInstance);

  api.interceptors.request.use((config) => {
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        if (routerInstance.currentRoute.value.path !== '/login') {
          // Token inválido o expirado. Forzando logout.
          authStore.logout();
        }
      }
      return Promise.reject(error);
    }
  );

  app.config.globalProperties.$api = api;
});

export { api };
