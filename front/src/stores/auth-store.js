// src/stores/auth-store.js
import { defineStore } from 'pinia';
import { api } from 'boot/axios'; // Importamos la instancia de Axios
import { ref, computed } from 'vue'; // Importamos ref y computed de Vue
import { jwtDecode } from 'jwt-decode'; // Importamos la librería para decodificar JWT

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const token = ref(localStorage.getItem('token') || null);
  const user = ref(null); // El usuario se inicializa como nulo y se carga con init()

  const normalizeUser = payload => {
    if (!payload) return null;
    return {
      ...payload,
      allowedStates: Array.isArray(payload.allowedStates) ? payload.allowedStates : [],
    };
  };

  // --- GETTERS ---
  // Un usuario está autenticado solo si hay un token Y un objeto de usuario.
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const allowedStates = computed(() => user.value?.allowedStates || []);

  // --- ACTIONS ---

  // Acción para inicializar el estado desde el token en localStorage
  const init = async () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        // Decodificar el token para obtener el payload completo del usuario
        const decodedPayload = jwtDecode(storedToken);
        token.value = storedToken;
        user.value = normalizeUser(decodedPayload.user || decodedPayload);
        // Configurar el header de Axios para las peticiones de la sesión actual
      } catch (error) {
        console.error('Token inválido o expirado, limpiando sesión.', error);
        logout(); // Si el token no es válido, limpiamos todo
      }
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;

    // Guardar en el estado de Pinia
    token.value = newToken;
    user.value = normalizeUser(newUser); // El backend ya nos devuelve el objeto de usuario completo

    // Guardar token en localStorage para persistencia
    localStorage.setItem('token', newToken);

    // Devolver true para indicar que el login fue exitoso
    return true;
  };

  const logout = async () => {
    // Limpiar el estado de Pinia
    token.value = null;
    user.value = null;
    // Limpiar localStorage y el header de Axios
    localStorage.removeItem('token');
    // Forzar recarga para una limpieza completa y segura
    location.reload();
  };

  return {
    // State & Getters
    token,
    user,
    isAuthenticated,
    allowedStates,
    // Actions
    init,
    login,
    logout,
  };
});
