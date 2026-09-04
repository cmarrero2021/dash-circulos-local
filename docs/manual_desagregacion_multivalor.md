# Manual de Usuario: Desagregación de Columnas con Selección Múltiple

Este manual explica cómo utilizar la función de **Desagregación de Multiselección** en el módulo de **Consultas y Análisis Dinámico (Pivot)**, permitiendo analizar de forma limpia, individual e independiente aquellos datos donde una persona puede tener más de una opción seleccionada (por ejemplo: múltiples enfermedades, varias discapacidades, distintas habilidades o diversas fuentes de ingreso).

---

## 1. ¿Qué es la Desagregación de Multiselección?

En muchas de las preguntas del registro, los adultos mayores pueden marcar **más de una respuesta a la vez**. Por ejemplo, una misma persona puede indicar que tiene:
> *"Hipertensión arterial, Diabetes y Artrosis severa"*.

### ¿Cómo funcionaba antes (sin desagregación)?
El sistema agrupaba todo el texto junto como si fuera una sola categoría gigante:
* `Hipertensión arterial` ➔ *120 personas*
* `Hipertensión arterial, Diabetes` ➔ *45 personas*
* `Hipertensión arterial, Diabetes, Artrosis severa` ➔ *18 personas*

Esto dificultaba responder una pregunta tan sencilla como: **"¿Cuántas personas en total sufren de Hipertensión arterial?"**.

### ¿Cómo funciona ahora (con la desagregación activada)?
El sistema separa automáticamente cada una de las opciones y le otorga un conteo individual a cada elemento:
* `Hipertensión arterial` ➔ **183 personas** *(la suma de todos los que la padecen, solos o acompañados)*
* `Diabetes` ➔ **63 personas**
* `Artrosis severa` ➔ **18 personas**

---

## 2. ¿Cómo identificar en cuáles columnas se puede aplicar?

En la lista de **Campos de Datos** (panel izquierdo del Generador Dinámico), todas las columnas que admiten esta función están identificadas visualmente con una etiqueta azul **`[Multi]`**.

A continuación se detalla la lista completa de columnas de selección múltiple disponibles:

| Categoría | Nombre del Campo | Etiqueta | ¿Qué información contiene? (Ejemplos) |
| :--- | :--- | :---: | :--- |
| **Salud y Social** | `Enfermedades` | `[Multi]` | *Hipertensión arterial, Diabetes, Alzheimer, Artritis, Osteoporosis, Demencia senil, etc.* |
| **Salud y Social** | `Discapacidades` | `[Multi]` | *Motora, Visual, Auditiva, Intelectual, Múltiple, etc.* |
| **Salud y Social** | `Centros de Salud` | `[Multi]` | *Hospital Público, CDI, Ambulatorio, Clínica Privada, etc.* |
| **Salud y Social** | `Organización Social` | `[Multi]` | *Consejo Comunal, Comité de Salud, Círculo de Abuelos, UBCh, etc.* |
| **Educación** | `Habilidades` | `[Multi]` | *Cocina, Costura, Carpintería, Agricultura, Manualidades, Canto, etc.* |
| **Socioeconómico** | `Fuente de Ingresos` | `[Multi]` | *Pensión Amor Mayor, Jubilación, Empleo Formal, Emprendimiento, Ayuda Familiar, etc.* |
| **Socioeconómico** | `Fuente de Gastos` | `[Multi]` | *Medicina, Alimentación, Servicios Básicos, Vivienda, etc.* |
| **Socioeconómico** | `Misiones Sociales` | `[Multi]` | *Gran Misión Amor Mayor, Misión José Gregorio Hernández, Hogares de la Patria, etc.* |
| **Registro** | `Tipo de Actividades` | `[Multi]` | *Actividades Recreativas, Culturales, Deportivas, Productivas, etc.* |
| **Vivienda** | `Vive con` | `[Multi]` | *Hijo/Hija, Esposo/Esposa, Nieto/Nieta, Solo/Sola, Otros Familiares, etc.* |

---

## 3. Guía Paso a Paso para Generar una Consulta Desagregada

### Paso 1: Seleccionar el Origen de Datos
En la pestaña correspondiente, asegúrate de estar en el módulo de **Consultas y Análisis Dinámico (Pivot)** sobre el catálogo de *Registros*.

### Paso 2: Arrastrar los Campos deseados
1. Arrastra la columna con `[Multi]` (por ejemplo: **`Enfermedades`**) a la zona de **Filas (Dimensiones)**.
2. Arrastra una columna de agrupación a **Columnas (Pivote)** si deseas cruzar datos (por ejemplo: **`Género`** o **`Estado`**).
3. Arrastra la métrica que deseas contar a **Valores** (por ejemplo: **`Cédula (COUNT)`** o cualquier campo con conteo).
4. *(Opcional)* Agrega filtros si deseas limitar por un estado o municipio específico.

### Paso 3: Configurar Desagregación y Ranking (Top N)
Debajo de las cajas de configuración, cuentas con dos controles clave:

1. 🔘 **Desagregar multiselección (comas):**
   * **Activado (por defecto):** Cada enfermedad o habilidad aparecerá en su propia fila individual y limpia.
   * **Desactivado:** Muestra las combinaciones exactas tal como fueron registradas.

2. 🏆 **Ranking / Top N (Opcional):**
   * **Desactivado (por defecto):** Muestra el listado completo con todos los resultados en su orden natural.
   * **Activado:** Ordena automáticamente de **mayor a menor incidencia** y restringe la vista a los **N principales** resultados (por ejemplo: Top 3, Top 5, Top 10 o el número que escribas manualmente).
   * *Si la cantidad de resultados disponibles es menor al Top seleccionado (por ejemplo, pides un Top 10 pero solo existen 7 enfermedades registradas), el sistema mostrará automáticamente los 7 registros sin omitir ninguno.*

### Paso 4: Ejecutar la Consulta
Haz clic en el botón azul **"Ejecutar Consulta Dinámica"**.

---

## 4. Visualización en Tablas y Gráficos

Una vez ejecutada la consulta, dispones de dos vistas principales:

### A. Tabla Dinámica
* Muestra cada elemento individual con sus conteos por columna (ej. Total Femenino, Total Masculino y Gran Total).
* Puedes alternar entre ver **Valores**, **Porcentajes (%)** o **Ambos**.

### B. Gráficos Dinámicos
* **Gráfico de Barras / Barras Horizontales:** Ideal para ver el ranking de enfermedades o habilidades ordenadas de mayor a menor frecuencia.
* **Gráfico de Torta / Dona:** Excelente para visualizar la proporción de cada elemento respecto al conjunto de respuestas.
* **Apilar / Intercambiar Ejes:** Permite comparar fácilmente cómo se distribuyen las opciones entre géneros o estados.

---

## 5. ¿Cómo interpretar los Totales y Porcentajes?

> [!IMPORTANT]
> **Regla de oro de los campos multiselección:**
> Cuando una persona declara tener más de una opción (por ejemplo: *Hipertensión* y *Diabetes*), esa persona suma **1 punto en la fila de Hipertensión** y **1 punto en la fila de Diabetes**.

Por esta razón:
1. **La suma de todas las filas puede ser mayor al número total de personas encuestadas**, ya que representa el **total de ocurrencias o afecciones detectadas**.
2. Por ejemplo, en una comunidad de 1.000 abuelos:
   * 600 pueden tener Hipertensión.
   * 400 pueden tener Diabetes.
   * 300 pueden tener Problemas Visuales.
   * *Total de afecciones registradas:* 1.300 (porque muchos abuelos tienen más de una patología).

---

## 6. Ejemplos Prácticos de Aplicación

### Caso A: Top 10 de Enfermedades en mi Estado
1. **Filtros:** `Estado` = *Mi Estado*.
2. **Filas:** `Enfermedades` (con `[Multi]`).
3. **Valores:** `Cédula (COUNT)`.
4. **Gráfico:** Selecciona *H. Barras (Barras Horizontales)*.
5. **Resultado:** Obtienes un gráfico de barras ordenado con las 10 enfermedades más recurrentes en el estado.

---

### Caso B: Habilidades de los Adultos Mayores según Género
1. **Filas:** `Habilidades` (con `[Multi]`).
2. **Columnas:** `Género`.
3. **Valores:** `Cédula (COUNT)`.
4. **Gráfico:** Barras apiladas con modo *Ambos (Valores y %)*.
5. **Resultado:** Una matriz que indica en qué oficios (Costura, Cocina, Carpintería, etc.) destacan las mujeres y los hombres.

---

### Caso C: Guardar y Fijar en el Dashboard de Indicadores
1. Una vez obtenida la tabla o gráfica perfecta, haz clic en **"Guardar"** en la barra superior.
2. Asígnale un nombre descriptivo (ej. *"Prevalencia de Enfermedades Nacional"*).
3. Haz clic en el icono de **Fijar (Pin)** 📌 en la tabla o en la gráfica.
4. Esa consulta quedará fijada automáticamente en la pantalla de inicio para que todo el equipo pueda consultarla de inmediato sin necesidad de volver a configurarla.
