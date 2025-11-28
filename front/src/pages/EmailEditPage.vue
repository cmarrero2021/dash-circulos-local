<template>
    <q-page class="q-pa-md">
        <q-card class="q-mx-auto" style="max-width: 700px;">
            <q-card-section>
                <div class="text-h5 text-weight-bold text-primary q-mb-md">Edición de Correo Electrónico</div>

                <!-- Formulario de Búsqueda -->
                <q-form class="q-gutter-md" @submit.prevent="buscarRegistro">
                    <div class="row q-col-gutter-md">
                        <div class="col-12 col-md-3">
                            <q-select
v-model="nationality" :options="nationalityOptions" emit-value map-options
                                label="Nacionalidad" dense outlined :rules="[val => !!val || 'Requerido']" />
                        </div>
                        <div class="col-12 col-md-6">
                            <q-input
v-model="vat" label="Cédula (VAT)" dense outlined :rules="[
                                val => !!val || 'Campo requerido',
                                val => /^\d+$/.test(val) || 'Solo números sin espacios ni caracteres especiales'
                            ]" />
                        </div>
                        <div class="col-12 col-md-3">
                            <q-btn
type="submit" label="Buscar" color="primary" icon="search" :loading="loading"
                                class="full-width" />
                        </div>
                    </div>
                </q-form>

                <q-separator class="q-my-md" />

                <!-- Resultados de Búsqueda -->
                <div v-if="registroEncontrado">
                    <div class="text-h6 q-mb-sm">Registro Encontrado</div>

                    <q-input v-model="displayVat" label="Cédula" readonly dense outlined class="q-mb-md" />

                    <q-input v-model="currentEmail" label="Email Actual" readonly dense outlined class="q-mb-md" />

                    <q-input
v-model="newEmail" label="Nuevo Email" type="email" dense outlined :rules="[
                        val => !!val || 'Campo requerido',
                        val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Formato de email inválido'
                    ]" class="q-mb-md" />

                    <q-btn
label="Actualizar Email" color="positive" icon="save" :loading="updating"
                        :disable="!newEmail || newEmail === currentEmail" @click="mostrarConfirmacion" />
                </div>

                <!-- Estado Vacío -->
                <div v-else-if="!loading" class="text-center text-grey-6 q-pa-lg">
                    <q-icon name="search" size="64px" />
                    <div class="q-mt-md">Ingrese una cédula para buscar el registro</div>
                </div>
            </q-card-section>
        </q-card>
    </q-page>
</template>

<script setup>
import { ref, computed } from 'vue';
import { api } from 'boot/axios';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const nationality = ref('venezuelan');
const vat = ref('');
const currentEmail = ref('');
const newEmail = ref('');
const stateId = ref(null);
const registroEncontrado = ref(false);
const loading = ref(false);
const updating = ref(false);

const nationalityOptions = [
    { label: 'V', value: 'venezuelan' },
    { label: 'E', value: 'foreign' }
];

const displayVat = computed(() => {
    const prefix = nationality.value === 'venezuelan' ? 'V' : 'E';
    return `${prefix}-${vat.value}`;
});

const buscarRegistro = async () => {
    if (!vat.value || !/^\d+$/.test(vat.value)) {
        $q.notify({
            type: 'warning',
            message: 'Por favor ingrese un VAT válido (solo números)'
        });
        return;
    }

    loading.value = true;
    registroEncontrado.value = false;

    try {
        const response = await api.get(`/email/${vat.value}/${nationality.value}`);

        currentEmail.value = response.data.email;
        stateId.value = response.data.state_id;
        newEmail.value = '';
        registroEncontrado.value = true;

        $q.notify({
            type: 'positive',
            message: 'Registro encontrado'
        });

    } catch (error) {
        if (error.response?.status === 404) {
            $q.notify({
                type: 'warning',
                message: 'No se encontró registro con esta cédula y nacionalidad'
            });
        } else if (error.response?.status === 403) {
            $q.notify({
                type: 'negative',
                message: error.response.data.error || 'No tiene permisos para editar este registro'
            });
        } else {
            $q.notify({
                type: 'negative',
                message: 'Error al buscar el registro'
            });
        }
    } finally {
        loading.value = false;
    }
};

const mostrarConfirmacion = () => {
    $q.dialog({
        title: '¿Confirmar cambio de correo?',
        message: `
      <div><strong>Cédula:</strong> ${displayVat.value}</div>
      <div><strong>Email actual:</strong> ${currentEmail.value}</div>
      <div><strong>Nuevo email:</strong> ${newEmail.value}</div>
    `,
        html: true,
        cancel: {
            label: 'Cancelar',
            flat: true
        },
        ok: {
            label: 'Confirmar',
            color: 'positive'
        }
    }).onOk(() => {
        actualizarEmail();
    });
};

const actualizarEmail = async () => {
    updating.value = true;

    try {
        await api.put(`/email/${vat.value}/${nationality.value}`, {
            newEmail: newEmail.value
        });

        $q.notify({
            type: 'positive',
            message: 'Email actualizado correctamente',
            icon: 'check_circle'
        });

        // Limpiar formulario
        vat.value = '';
        currentEmail.value = '';
        newEmail.value = '';
        registroEncontrado.value = false;

    } catch (error) {
        if (error.response?.status === 403) {
            $q.notify({
                type: 'negative',
                message: error.response.data.error || 'No tiene permisos para editar este registro'
            });
        } else {
            $q.notify({
                type: 'negative',
                message: 'Error al actualizar el email'
            });
        }
    } finally {
        updating.value = false;
    }
};
</script>
