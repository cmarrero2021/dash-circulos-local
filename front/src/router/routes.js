// src/router/routes.js
const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') }
    ],
    meta: { requiresAuth: true }
  },
  {
    // Nueva ruta contenedora para las páginas públicas
    path: '/',
    component: () => import('layouts/BlankLayout.vue'),
    children: [
      {
        path: 'login',
        component: () => import('pages/LoginPage.vue'),
        meta: { requiresGuest: true }
      },
      // Aquí podrías añadir en el futuro la página de 'recuperar-password', etc.
    ]
  },

  // Siempre al final para manejar errores 404
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
