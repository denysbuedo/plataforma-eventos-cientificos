# ADR-003: Drizzle para PostgreSQL y contexto transaccional

Estado: aceptado para el siguiente incremento técnico de Fase 0, con límites de evidencia documentados.

Fecha: 14 de octubre de 2026.

## Contexto

El proyecto requiere integridad compuesta, migraciones versionadas y defensa por organización/evento. ADR-002 propone RLS y contexto local a transacción, sin roles de ejecución privilegiados. Se necesitaba comprobar estas capacidades antes de elegir ORM.

Se ejecutó una [prueba reproducible](../../tests/orm-spike/README.md) con PostgreSQL real y las mismas operaciones en ambos ORM. El [informe](../architecture/prueba-orm.md) registra resultados y límites.

## Alternativas evaluadas

| Criterio observado | Prisma 7.10.0 | Drizzle 0.45.4 / Kit 0.31.11 |
|---|---|---|
| Modelo y consultas tipadas | Schema Prisma y cliente generado. | Modelo TypeScript y consultas tipadas. |
| Migraciones inicial/evolución | SQL generado por `migrate diff`, aplicado por `migrate deploy`. | SQL y snapshots generados por Kit, aplicados por migrador. |
| Política RLS de esta prueba | SQL manual versionado. | `pgPolicy` en esquema, SQL generado. |
| FORCE y grants | SQL manual. | SQL manual. |
| Contexto de transacción | `$transaction` y consultas parametrizadas en `tx`. | `transaction` y consultas parametrizadas en `tx`. |
| Pool, rollback y concurrencia | Supera los casos evaluados. | Supera los casos evaluados. |
| Integridad compuesta | Supera el caso evaluado. | Supera el caso evaluado. |

Prisma 8 no se evaluó: la etiqueta del CLI consultada devolvía una release candidate y el cliente estable seguía en 7.10.0. No se extrapolan estos resultados a otra versión.

## Decisión

Usar Drizzle ORM con `node-postgres` y Drizzle Kit para la primera implementación PostgreSQL de SEP. Las versiones de partida evaluadas son ORM 0.45.4, Kit 0.31.11 y `pg` 8.23.1. La elección mantiene la arquitectura y el alcance aprobados; no incorpora ambos ORM a la aplicación.

La comparación con Prisma queda confinada a `tests/orm-spike` como evidencia. Sus dependencias no son dependencias de producción de la futura API. El monorepo definitivo se inicializará en el siguiente incremento.

Definir un servicio interno que reciba un contexto ya autenticado y autorizado, abra una transacción y establezca las variables de organización/evento con alcance local. Sus repositorios solo usarán el objeto `tx`; no ejecutarán consultas tenant sobre una conexión global fuera de esa operación. Además de RLS se conservarán filtros de aplicación y claves compuestas.

Las políticas se declararán en el esquema Drizzle cuando puedan representarse. FORCE, grants y operaciones especiales se conservarán en migraciones SQL revisables. El runtime usará un rol distinto del migrador, sin privilegios de propietario, superusuario, `BYPASSRLS` ni `TRUNCATE` sobre tablas privadas.

## Motivos

Ambas alternativas demostraron aislamiento bajo el contexto de prueba. Drizzle permite mantener la política junto al esquema TypeScript y generar su SQL, lo que reduce la separación entre modelo y reglas de datos en esta implementación. La cercanía a SQL facilita revisar restricciones y contexto transaccional. Es una valoración de adecuación al proyecto, no una medición de productividad o rendimiento.

La documentación oficial describe [políticas RLS en Drizzle](https://orm.drizzle.team/docs/rls), [transacciones en Drizzle](https://orm.drizzle.team/docs/transactions), [transacciones de Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions) y [migraciones personalizadas para características no representadas en Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/unsupported-database-features). PostgreSQL documenta los [límites y roles de RLS](https://www.postgresql.org/docs/18/ddl-rowsecurity.html). Estas fuentes complementan la ejecución local; no sustituyen sus pruebas.

## Consecuencias y pendientes

- Las migraciones y snapshots de Drizzle deben revisarse y versionarse juntos. Generación de SQL no sustituye revisión de permisos.
- RLS no autentica variables de sesión: un código comprometido que use el rol runtime podría establecer otro contexto. La protección sigue requiriendo autorización de servidor y prevención de inyección SQL.
- La API necesitará políticas de organización, identidad global, permisos contextuales, resolución de host y revocación; no están implementadas por esta prueba.
- Antes de migrar datos persistentes deben probarse errores parciales, recuperación, drift y restauración. No se ha probado PgBouncer ni Linux.
- Se revisará el ADR si cambian requisitos de aislamiento, herramientas o capacidad operativa. Actualizar dependencias exige repetir los casos relevantes.

## Evidencia de aceptación técnica

Generación de cliente/esquema, typecheck y aplicación de migraciones comprobadas. Suite final: 32 comprobaciones funcionales, 2 grupos; 34 tests aprobados, 0 fallidos. No hay API de producción ni cierre de Fase 0.
