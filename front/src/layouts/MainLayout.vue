<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> Dashboard de Círculos </q-toolbar-title>

        <!-- Menú de Usuario -->
        <q-btn-dropdown stretch flat icon="account_circle">
          <q-list>
            <q-item-label header>
              {{ authStore.user?.email || 'Usuario' }}
            </q-item-label>
            <q-item v-close-popup clickable @click="handleLogout">
              <q-item-section avatar>
                <q-icon name="logout" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Cerrar Sesión</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" bordered>
      <q-list>
        <q-item-label header> Vistas Principales </q-item-label>

        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from 'stores/auth-store';
import EssentialLink from 'components/EssentialLink.vue';

const leftDrawerOpen = ref(false);
const authStore = useAuthStore();

const linksList = [
  {
    title: 'Dashboard',
    caption: 'Visualización de datos',
    icon: 'dashboard',
    link: '/', // Asumiendo que la ruta principal es el dashboard
  },
  // Puedes añadir más links aquí si es necesario
];

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function handleLogout() {
  await authStore.logout();
  // El store ya maneja el location.reload(), pero si prefieres un redirect:
  // router.push('/login');
}
</script>
