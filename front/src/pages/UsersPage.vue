<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h4">Gestión de Usuarios</div>
      <q-btn color="primary" icon="person_add" label="Crear Usuario" @click="openCreateDialog" />
    </div>

    <q-table
      :rows="users"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat
      bordered
    >
      <template #body-cell-activo="props">
        <q-td :props="props">
          <q-chip
            :color="props.row.activo ? 'green' : 'red'"
            text-color="white"
            dense
            :label="props.row.activo ? 'Activo' : 'Inactivo'"
          />
        </q-td>
      </template>

      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat round icon="edit" @click="openEditDialog(props.row)" />
        </q-td>
      </template>
    </q-table>

    <!-- Diálogo de Edición -->
    <q-dialog v-model="editDialog.show">
      <q-card style="width: 600px; max-width: 90vw;">
        <q-card-section>
          <div class="text-h6">{{ dialogTitle }}</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input v-model="editDialog.user.nombre" label="Nombre Completo" outlined dense />
          <q-input v-model="editDialog.user.cedula" label="Cédula" outlined dense />
          <q-input v-model="editDialog.user.email" label="Email" outlined dense />
          <q-input
            v-if="isCreateMode"
            v-model="editDialog.user.password"
            label="Contraseña"
            type="password"
            outlined
            dense
          />
          <q-select
            v-model="editDialog.user.rol_id"
            :options="roles"
            option-value="id"
            option-label="nombre"
            emit-value
            map-options
            label="Rol"
            outlined
            dense
          />
          <q-toggle
            v-model="editDialog.user.activo"
            :label="`Estado: ${editDialog.user.activo ? 'Activo' : 'Inactivo'}`"
            :color="editDialog.user.activo ? 'green' : 'red'"
          />

          <!-- Selector de Estados Permitidos (solo para rol 'Estadal') -->
          <div v-if="isEstadalRole(editDialog.user.rol_id)">
            <q-separator class="q-my-md" />
            <div class="text-subtitle1 q-mb-sm">Estados Permitidos</div>
            <q-select
              v-model="editDialog.permittedStates"
              :options="allStates"
              option-value="id"
              option-label="estado"
              multiple
              use-chips
              stack-label
              label="Seleccione uno o varios estados"
              outlined
              dense
              :loading="loadingStates"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancelar" />
          <q-btn color="primary" label="Guardar Cambios" :loading="saving" @click="saveUserChanges" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { api } from 'boot/axios';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const users = ref([]);
const roles = ref([]);
const allStates = ref([]);
const loading = ref(true);
const saving = ref(false);
const loadingStates = ref(false);

const editDialog = ref({
  show: false,
  mode: 'edit',
  user: {},
  permittedStates: []
});

const isCreateMode = computed(() => editDialog.value.mode === 'create');
const dialogTitle = computed(() => {
  return isCreateMode.value
    ? 'Crear Usuario'
    : `Editar Usuario: ${editDialog.value.user?.nombre || ''}`;
});

const columns = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left', sortable: true },
  { name: 'rol_nombre', label: 'Rol', field: 'rol_nombre', align: 'center', sortable: true },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'center' },
  { name: 'actions', label: 'Acciones', align: 'right' }
];

async function fetchData() {
  try {
    loading.value = true;
    const [usersRes, rolesRes, statesRes] = await Promise.all([
      api.get('/admin/users'),
      api.get('/admin/roles'),
      api.get('/admin/states')
    ]);
    users.value = usersRes.data;
    roles.value = rolesRes.data;
    allStates.value = statesRes.data;
  } catch (error) {
    console.error('Error al cargar datos iniciales:', error);
    $q.notify({ color: 'negative', message: 'Error al cargar los datos. Revise la consola.' });
  } finally {
    loading.value = false;
  }
}

function isEstadalRole(rolId) {
  const role = roles.value.find(r => r.id === rolId);
  return role?.nombre === 'Estadal';
}

function openCreateDialog() {
  editDialog.value = {
    show: true,
    mode: 'create',
    user: {
      nombre: '',
      email: '',
      cedula: '',
      password: '',
      rol_id: roles.value[0]?.id ?? null,
      activo: true,
    },
    permittedStates: [],
  };
}

async function openEditDialog(user) {
  editDialog.value.mode = 'edit';
  editDialog.value.user = { ...user };
  editDialog.value.show = true;
  editDialog.value.permittedStates = [];

  if (isEstadalRole(user.rol_id)) {
    try {
      loadingStates.value = true;
      const res = await api.get(`/admin/users/${user.id}/states`);
      // El q-select con `multiple` espera el objeto completo, no solo el ID
      editDialog.value.permittedStates = allStates.value.filter(state => res.data.includes(state.id));
    } catch (error) {
      console.error(`Error al cargar estados para el usuario ${user.id}:`, error);
      $q.notify({ color: 'negative', message: 'Error al cargar los estados del usuario.' });
    } finally {
      loadingStates.value = false;
    }
  }
}

async function saveUserChanges() {
  saving.value = true;
  const userToSave = editDialog.value.user;

  try {
    if (isCreateMode.value) {
      await createUser(userToSave);
    } else {
      await updateExistingUser(userToSave);
    }
  } catch (error) {
    console.error('Error al guardar cambios del usuario:', error);
    $q.notify({ color: 'negative', message: 'Error al guardar los cambios. Revise la consola.' });
  } finally {
    saving.value = false;
  }
}

async function updateExistingUser(userToSave) {
  await api.put(`/admin/users/${userToSave.id}`, {
    nombre: userToSave.nombre,
    email: userToSave.email,
    rol_id: userToSave.rol_id,
    activo: userToSave.activo
  });

  if (isEstadalRole(userToSave.rol_id)) {
    const stateIds = editDialog.value.permittedStates.map(state => state.id);
    await api.put(`/admin/users/${userToSave.id}/states`, { stateIds });
  }

  $q.notify({ color: 'positive', message: 'Usuario actualizado correctamente.' });
  editDialog.value.show = false;
  await fetchData();
}

async function createUser(userToSave) {
  if (!userToSave.nombre || !userToSave.email || !userToSave.password || !userToSave.cedula || !userToSave.rol_id) {
    throw new Error('Información incompleta');
  }

  const payload = {
    nombre: userToSave.nombre,
    email: userToSave.email,
    password: userToSave.password,
    cedula: userToSave.cedula,
    rol_id: userToSave.rol_id,
    activo: userToSave.activo,
  };

  const { data } = await api.post('/admin/users', payload);

  if (isEstadalRole(userToSave.rol_id) && editDialog.value.permittedStates.length > 0) {
    const stateIds = editDialog.value.permittedStates.map(state => state.id);
    await api.put(`/admin/users/${data.id}/states`, { stateIds });
  }

  $q.notify({ color: 'positive', message: 'Usuario creado correctamente.' });
  editDialog.value.show = false;
  await fetchData();
}

onMounted(fetchData);

</script>
