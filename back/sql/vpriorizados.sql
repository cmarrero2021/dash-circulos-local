-- Vista vpriorizados: une la tabla priorizados con las tablas de geografía
-- para mostrar los nombres de estado, municipio y parroquia, y convierte
-- los booleanos registro/circulo a texto Si/No.

CREATE OR REPLACE VIEW vpriorizados AS
SELECT 
  p.id,
  p.estado_id,
  UPPER(e.name) AS estado,
  p.municipio_id,
  UPPER(m.name) AS municipio,
  p.parroquia_id,
  UPPER(pa.name) AS parroquia,
  p.nac,
  p.cedula,
  p.nombre,
  p.telefono,
  p.fecha_nac,
  p.sexo,
  p.comunidad,
  p.integrantes,
  p.menores,
  CASE WHEN p.registro THEN 'Si' ELSE 'No' END AS registro,
  CASE WHEN p.circulo THEN 'Si' ELSE 'No' END AS circulo
FROM priorizados p
LEFT JOIN rm_estados e ON p.estado_id = e.id
LEFT JOIN rm_municipios m ON p.municipio_id = m.id AND m.state_id = p.estado_id
LEFT JOIN rm_parroquias pa ON p.parroquia_id = pa.id AND pa.municipality_id = p.municipio_id
WHERE p.deleted_at IS NULL;
