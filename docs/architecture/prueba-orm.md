# Resultados de la prueba de ORM y aislamiento

Fecha: 14 de octubre de 2026.

## Alcance ejecutado

Comparación de Prisma 7.10.0 y Drizzle 0.45.4 sobre PostgreSQL 18.4 real, en Windows con Node.js 22.23.2 y npm 10.9.2. Se generaron y aplicaron migraciones con las herramientas de cada ORM. No se usaron mocks de base de datos ni la instancia PostgreSQL preexistente.

El cluster temporal contiene dos bases independientes con el mismo modelo: dos organizaciones, eventos A1/A2/B1 y tres recursos privados. El rol de migraciones es propietario de tablas; el de ejecución no es propietario, superusuario ni tiene `BYPASSRLS`. Una política verifica ambas claves mediante `current_setting`; cada transacción recibe contexto con `set_config(..., true)` parametrizado.

## Evidencia

| Comprobación | Prisma | Drizzle |
|---|---|---|
| Generación de esquema inicial y evolución de columna | Correcta | Correcta |
| Aplicación de tres migraciones y segunda ejecución sin pendientes | Correcta | Correcta |
| RLS y FORCE presentes tras evolución | Correcto | Correcto |
| Sin contexto no hay filas ni escrituras permitidas | Correcto | Correcto |
| Separación A1/A2 dentro de A y separación frente a B1 | Correcta | Correcta |
| Sustitución de ID y operaciones sobre otros ámbitos | Denegadas | Denegadas |
| CRUD dentro del ámbito permitido | Correcto | Correcto |
| Rollback de escritura y limpieza del contexto | Correcto | Correcto |
| Misma conexión reutilizada después de commit/rollback | Sin fuga | Sin fuga |
| 12 transacciones con pool de 4 conexiones | Sin mezcla | Sin mezcla |
| FK compuesta impide relaciones cruzadas | Correcto | Correcto |
| FORCE impide lectura por propietario sin política aplicable | Correcto | Correcto |
| Runtime no puede desactivar RLS ni truncar | Correcto | Correcto |
| Cambio directo de ámbito de una fila | Denegado | Denegado |

Comandos ejecutados: `npm run generate:prisma`, `npm run generate:drizzle`, `npm run typecheck` y `npm test`, desde `tests/orm-spike`. El lanzador ejecutó `migrate:prisma` y `migrate:drizzle` dos veces cada uno. Resultado final: 16 casos por ORM, 32 comprobaciones y 2 grupos; Node informó 34 tests aprobados, 0 fallidos, 0 omitidos.

Las migraciones iniciales y de evolución se generaron con Prisma CLI y Drizzle Kit. La política RLS requirió SQL manual en Prisma 7. Drizzle Kit la generó desde `pgPolicy`. FORCE y grants se escribieron como SQL manual en ambos casos. Esto puede inspeccionarse en las migraciones versionadas.

El primer intento quedó bloqueado por restricciones del lanzador Windows. El segundo arrancó PostgreSQL pero retuvo handles de pipe; se detuvo esa instancia y se corrigió `pg_ctl` para usar descriptores de archivo. La ejecución final terminó correctamente y cerró su cluster. No se cambió el servicio PostgreSQL existente.

## Conclusión y límites

Ambas opciones superan el alcance evaluado. La selección propuesta de Drizzle responde a la representación de RLS en el esquema y al acceso explícito a SQL y transacciones; no a una supuesta incompatibilidad de Prisma con RLS ni a un benchmark de velocidad.

Esta prueba demuestra defensa de datos bajo un contexto confiable. No demuestra que un usuario HTTP esté autorizado a establecerlo. Tampoco cubre el modelo completo, autenticación, proxies, dominios, cachés, workers o revisión científica. El ADR-002 permanece propuesto hasta validar esas superficies de Fase 0.

Las migraciones se probaron completas y en una base nueva. La atomicidad ante errores de DDL, recuperación de migraciones fallidas, shadow database de Prisma, drift completo y upgrades quedan fuera de esta evidencia. Deben verificarse antes de usar migraciones sobre datos persistentes. Las políticas de tablas de identidad global requieren diseño adicional.

Reproducción: [README de la prueba](../../tests/orm-spike/README.md). Decisión: [ADR-003](../adr/ADR-003-orm-aislamiento.md).
