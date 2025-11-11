// src/stores/auth-store.js
import { defineStore } from 'pinia';
import { api } from 'boot/axios'; // Importamos la instancia de Axios
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const token = ref(localStorage.getItem('token') || null);
  const user = ref(JSON.parse(localStorage.getItem('user')) || null);

  // --- GETTERS ---
  const isAuthenticated = computed(() => !!token.value);
  const authToken = computed(() => token.value);

  // --- ACTIONS ---

  // Guardar estado en localStorage
  const setAuthData = (newToken, newUser) => {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // Limpiar estado
  const clearAuthData = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Forzamos un reload para limpiar cualquier otro estado en la app
    location.reload();
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const newToken = response.data.token;

    // Decodificar el payload del token para obtener el ID de usuario
    const payload = JSON.parse(atob(newToken.split('.')[1]));
    const loggedInUser = { id: payload.user.id, email };

    setAuthData(newToken, loggedInUser);
    // The calling component is responsible for handling errors.
  };

  const logout = async () => {
    try {
      // La API de logout necesita el token, que será enviado automáticamente por Axios
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Error en el logout de la API, cerrando sesión localmente de todas formas.', error);
    } finally {
      // Siempre limpiamos los datos locales, incluso si la llamada a la API falla
      clearAuthData();
    }
  };

  return {
    // State & Getters
    token,
    user,
    isAuthenticated,
    authToken,
    // Actions
    login,
    logout,
  };
});
