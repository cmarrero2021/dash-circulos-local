-- ═══════════════════════════════════════════════════════════════════
-- Migración: Soporte de "Pin" (Fijar) en saved_queries
-- Permite que una Consulta Guardada marque su Tabla y/o Gráfica como
-- fijadas para mostrarse por defecto en el dashboard de Registros.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.saved_queries
    ADD COLUMN IF NOT EXISTS pin_table BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pin_chart BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para listar rápidamente las consultas fijadas (por usuario/rol).
CREATE INDEX IF NOT EXISTS saved_queries_pin_table_idx
    ON public.saved_queries (created_by)
    WHERE pin_table = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS saved_queries_pin_chart_idx
    ON public.saved_queries (created_by)
    WHERE pin_chart = TRUE AND deleted_at IS NULL;
