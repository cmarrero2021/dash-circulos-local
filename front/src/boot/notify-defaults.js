// src/boot/notify-defaults.js
import { boot } from 'quasar/wrappers';
import { Notify } from 'quasar';

// Configuración por defecto para las notificaciones de error
Notify.setDefaults({
  position: 'top',
  timeout: 4000,
  textColor: 'white',
  actions: [{ icon: 'close', color: 'white' }]
});

// No necesitamos exportar nada aquí, solo estamos configurando los defaults.
export default boot(() => {});
