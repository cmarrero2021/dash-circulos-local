-- back/sql/indicadores_estados.sql
-- Vista que expone los indicadores (meta, avance y métricas auxiliares) por cada estado.
-- Requiere las tablas: vestados, metas_estado y rm_circulos_remoto.
-- Ajusta la fecha objetivo si cambia el deadline del dashboard.

CREATE OR REPLACE VIEW vindicadores_estados AS
WITH metas AS (
    SELECT estado_id, SUM(circulos)::integer AS meta
    FROM metas_estado
    GROUP BY estado_id
),
acumulados AS (
    SELECT
        estado_id,
        COUNT(*)::integer AS acumulado,
        COUNT(DISTINCT certificacion::date)::integer AS dias_con_registro
    FROM rm_circulos_remoto
    GROUP BY estado_id
),
picos AS (
    SELECT estado_id, fecha, total
    FROM (
        SELECT
            estado_id,
            certificacion::date AS fecha,
            COUNT(*)::integer AS total,
            ROW_NUMBER() OVER (PARTITION BY estado_id ORDER BY COUNT(*)::integer DESC, certificacion::date DESC) AS rn
        FROM rm_circulos_remoto
        GROUP BY estado_id, certificacion::date
    ) ranked
    WHERE rn = 1
),
constants AS (
    SELECT GREATEST((DATE '2025-11-30' - CURRENT_DATE)::integer, 0) AS dias_faltantes
)
SELECT
    e.id AS estado_id,
    e.estado AS estado_nombre,
    COALESCE(m.meta, 0) AS meta,
    COALESCE(a.acumulado, 0) AS acumulado,
    COALESCE(m.meta, 0) - COALESCE(a.acumulado, 0) AS diferencia,
    c.dias_faltantes,
    CASE
        WHEN c.dias_faltantes > 0 THEN FLOOR(GREATEST(COALESCE(m.meta, 0) - COALESCE(a.acumulado, 0), 0)::numeric / c.dias_faltantes)
        ELSE GREATEST(COALESCE(m.meta, 0) - COALESCE(a.acumulado, 0), 0)
    END AS promedio_necesario,
    CASE
        WHEN COALESCE(a.dias_con_registro, 0) > 0 THEN FLOOR(COALESCE(a.acumulado, 0)::numeric / a.dias_con_registro)
        ELSE 0
    END AS promedio_diario,
    COALESCE(p.total, 0) AS maximo_por_fecha,
    p.fecha AS fecha_maxima
FROM vestados e
LEFT JOIN metas m ON m.estado_id = e.id
LEFT JOIN acumulados a ON a.estado_id = e.id
LEFT JOIN picos p ON p.estado_id = e.id,
constants c;
