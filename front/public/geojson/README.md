# 📍 Archivos GeoJSON Requeridos

Este directorio debe contener los archivos GeoJSON para el mapa de Venezuela.

## Archivos Necesarios

### 1. `contorno_venezuela.geojson`
Contorno del país (capa base fija, sin interacción)

### 2. `estados_final.geojson`  
Estados de Venezuela (capa interactiva)

**Atributo requerido:**
- `state_id` - ID del estado que correlaciona con `estado_id` de la vista `vcumplimiento_circulos_estados`

## Ubicación

```
front/
└── public/
    └── geojson/
        ├── contorno_venezuela.geojson  ← Colocar aquí
        ├── estados_final.geojson       ← Colocar aquí
        └── README.md                   ← Este archivo
```

## Verificación

Una vez colocados los archivos:
1. Ejecutar `quasar dev`
2. Navegar al dashboard
3. El mapa debería mostrar Venezuela con colores según porcentaje de cumplimiento

Si el mapa no se muestra, verificar la consola del navegador para errores.
