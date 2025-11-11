<template>
  <q-page class="flex flex-center bg-grey-2">
    <q-card class="q-pa-md shadow-2 my_card" bordered>
      <q-card-section class="text-center">
        <div class="text-grey-9 text-h5 text-weight-bold">Iniciar Sesión</div>
        <div class="text-grey-8">Accede a tu cuenta para ver el dashboard</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="handleLogin" >
          <!-- Atributos reordenados -->
          <q-input
            ref="emailRef"
            v-model="form.email"
            filled
            label="Email"
            type="email"
            lazy-rules
            :rules="[val => !!val || 'El email es requerido', val => /.+@.+\..+/.test(val) || 'Email inválido']"
          />

          <!-- Atributos reordenados -->
          <q-input
            ref="passwordRef"
            v-model="form.password"
            filled
            label="Contraseña"
            type="password"
            lazy-rules
            :rules="[val => !!val || 'La contraseña es requerida']"
          />

          <div>
            <q-btn
              class="full-width"
              label="Ingresar"
              type="submit"
              color="primary"
              :loading="isLoading"
            />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <div class="text-grey-8">
          ¿Olvidaste tu contraseña?
          <a href="#" class="text-primary text-weight-bold" style="text-decoration: none">Recuperar</a>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from 'stores/auth-store';
import { useRouter } from 'vue-router';
// Importa 'Notify' directamente desde Quasar
import { Notify } from 'quasar';

const authStore = useAuthStore();
const router = useRouter();
// Ya no necesitamos useQuasar() para las notificaciones
// const $q = useQuasar();

const form = ref({
  email: '',
  password: '',
});
const isLoading = ref(false);
const emailRef = ref(null);
const passwordRef = ref(null);

const handleLogin = async () => {
  const emailIsValid = await emailRef.value.validate();
  const passwordIsValid = await passwordRef.value.validate();
  if (!emailIsValid || !passwordIsValid) {
    return;
  }

  if (isLoading.value) return;
  isLoading.value = true;

  try {
    await authStore.login(form.value.email, form.value.password);
    router.push('/');
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Error al iniciar sesión.';

    // --- CORRECCIÓN FINAL ---
    // Llamar a Notify.create() que es la función estática importada
    Notify.create({
      color: 'negative',
      message: errorMessage,
      icon: 'report_problem',
      // Las opciones por defecto (posición, timeout) las tomará del boot file
    });
    // ----------------------

  } finally {
    isLoading.value = false;
  }
};
</script>


<style scoped>
.my_card {
  width: 400px;
  border-radius: 8px;
}
</style>
