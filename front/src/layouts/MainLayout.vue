<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> Dashboard de Círculos </q-toolbar-title>

        <!-- Info de Usuario (siempre visible) -->
        <div class="text-body2 q-mr-sm text-right gt-xs">
          {{ authStore.user?.email || 'Usuario' }}
          <q-chip
            dense
            size="sm"
            color="white"
            text-color="primary"
            class="q-ml-xs"
          >
            {{ authStore.user?.role || 'Sin rol' }}
          </q-chip>
        </div>

        <!-- Menú de Usuario -->
        <q-btn-dropdown stretch flat icon="account_circle">
          <q-list>
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

        <!-- Sección de Administración -->
        <div v-if="authStore.user?.role === 'Administrador'">
          <q-separator class="q-my-md" />
          <q-item-label header>Administración</q-item-label>
          <EssentialLink v-for="link in adminLinksList" :key="link.title" v-bind="link" />
        </div>
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
    link: '/',
  },
  {
    title: 'Edición de Correo',
    caption: 'Modificar correos electrónicos',
    icon: 'email',
    link: '/admin/email-edit',
  },
];

const adminLinksList = [
  {
    title: 'Gestión de Usuarios',
    caption: 'Administrar usuarios y permisos',
    icon: 'manage_accounts',
    link: '/admin/users',
  },
  // Aquí puedes agregar links para Roles, Permisos, etc.
  // { title: 'Roles', icon: 'shield', link: '/admin/roles' },
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
