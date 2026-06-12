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
          <q-btn flat round icon="edit" color="primary" @click="openEditDialog(props.row)">
            <q-tooltip>Editar Usuario</q-tooltip>
          </q-btn>
          <q-btn flat round icon="vpn_key" color="orange" @click="openPasswordDialog(props.row)">
            <q-tooltip>Cambiar Contraseña</q-tooltip>
          </q-btn>
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

          <!-- Permiso especial: editar email sin registro -->
          <q-separator class="q-my-md" />
          <div class="text-subtitle2 q-mb-xs text-grey-7">Permisos especiales</div>
          <q-toggle
            v-model="editDialog.emailPermiso"
            label="Puede editar correo aunque el usuario no tenga registro"
            :color="editDialog.emailPermiso ? 'deep-orange' : 'grey'"
            :icon="editDialog.emailPermiso ? 'mark_email_read' : 'mail_lock'"
          />
          <div class="text-caption text-grey-6 q-ml-md">
            Permiso directo: <em>editar_email_sin_registro</em>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancelar" />
          <q-btn color="primary" label="Guardar Cambios" :loading="saving" @click="saveUserChanges" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Diálogo de Cambio de Contraseña -->
    <q-dialog v-model="passwordDialog.show" persistent>
      <q-card style="width: 400px; max-width: 90vw;">
        <q-card-section>
          <div class="text-h6">Cambiar Contraseña</div>
          <div class="text-subtitle2">{{ passwordDialog.user.nombre }}</div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input
            v-model="passwordDialog.newPassword"
            label="Nueva Contraseña"
            :type="passwordDialog.showNewPassword ? 'text' : 'password'"
            outlined
            dense
            autofocus
          >
            <template #append>
              <q-icon
                :name="passwordDialog.showNewPassword ? 'visibility' : 'visibility_off'"
                class="cursor-pointer"
                @click="passwordDialog.showNewPassword = !passwordDialog.showNewPassword"
              />
            </template>
          </q-input>
          <q-input
            v-model="passwordDialog.confirmPassword"
            label="Confirmar Contraseña"
            :type="passwordDialog.showConfirmPassword ? 'text' : 'password'"
            outlined
            dense
          >
            <template #append>
              <q-icon
                :name="passwordDialog.showConfirmPassword ? 'visibility' : 'visibility_off'"
                class="cursor-pointer"
                @click="passwordDialog.showConfirmPassword = !passwordDialog.showConfirmPassword"
              />
            </template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancelar" @click="resetPasswordDialog" />
          <q-btn
            color="primary"
            label="Confirmar"
            :loading="savingPassword"
            :disable="!canSavePassword"
            @click="savePasswordChange"
          />
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
  permittedStates: [],
  emailPermiso: false
});

const passwordDialog = ref({
  show: false,
  user: {},
  newPassword: '',
  confirmPassword: '',
  showNewPassword: false,
  showConfirmPassword: false
});

const savingPassword = ref(false);

const canSavePassword = computed(() => {
  return passwordDialog.value.newPassword &&
         passwordDialog.value.newPassword.length >= 6 &&
         passwordDialog.value.newPassword === passwordDialog.value.confirmPassword;
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
    emailPermiso: false,
  };
}

async function openEditDialog(user) {
  editDialog.value.mode = 'edit';
  editDialog.value.user = { ...user };
  editDialog.value.show = true;
  editDialog.value.permittedStates = [];
  editDialog.value.emailPermiso = false;

  // Cargar estados y permiso especial en paralelo
  const promises = [];

  if (isEstadalRole(user.rol_id)) {
    promises.push(
      api.get(`/admin/users/${user.id}/states`)
        .then(res => {
          editDialog.value.permittedStates = allStates.value.filter(state => res.data.includes(state.id));
        })
        .catch(error => {
          console.error(`Error al cargar estados para el usuario ${user.id}:`, error);
          $q.notify({ color: 'negative', message: 'Error al cargar los estados del usuario.' });
        })
    );
  }

  promises.push(
    api.get(`/admin/users/${user.id}/email-permission`)
      .then(res => { editDialog.value.emailPermiso = res.data.tienePermiso; })
      .catch(error => {
        console.error(`Error al cargar permiso email para el usuario ${user.id}:`, error);
      })
  );

  if (promises.length > 0) {
    loadingStates.value = true;
    await Promise.all(promises).finally(() => { loadingStates.value = false; });
  }
}

function openPasswordDialog(user) {
  passwordDialog.value = {
    show: true,
    user: { ...user },
    newPassword: '',
    confirmPassword: '',
    showNewPassword: false,
    showConfirmPassword: false
  };
}

function resetPasswordDialog() {
  passwordDialog.value = {
    show: false,
    user: {},
    newPassword: '',
    confirmPassword: '',
    showNewPassword: false,
    showConfirmPassword: false
  };
}

async function savePasswordChange() {
  if (!canSavePassword.value) return;

  savingPassword.value = true;
  try {
    await api.put(`/admin/users/${passwordDialog.value.user.id}/password`, {
      password: passwordDialog.value.newPassword
    });
    $q.notify({
      color: 'positive',
      message: 'Contraseña actualizada correctamente para ' + passwordDialog.value.user.nombre
    });
    resetPasswordDialog();
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    $q.notify({
      color: 'negative',
      message: 'Error al cambiar la contraseña. Revise la consola.'
    });
  } finally {
    savingPassword.value = false;
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

  // Guardar estados permitidos si es rol Estadal
  if (isEstadalRole(userToSave.rol_id)) {
    const stateIds = editDialog.value.permittedStates.map(state => state.id);
    await api.put(`/admin/users/${userToSave.id}/states`, { stateIds });
  }

  // Guardar permiso especial de correo
  await api.put(`/admin/users/${userToSave.id}/email-permission`, {
    activo: editDialog.value.emailPermiso
  });

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

  // Guardar estados permitidos si es rol Estadal
  if (isEstadalRole(userToSave.rol_id) && editDialog.value.permittedStates.length > 0) {
    const stateIds = editDialog.value.permittedStates.map(state => state.id);
    await api.put(`/admin/users/${data.id}/states`, { stateIds });
  }

  // Guardar permiso especial de correo si está activo
  if (editDialog.value.emailPermiso) {
    await api.put(`/admin/users/${data.id}/email-permission`, { activo: true });
  }

  $q.notify({ color: 'positive', message: 'Usuario creado correctamente.' });
  editDialog.value.show = false;
  await fetchData();
}

onMounted(fetchData);

</script>
