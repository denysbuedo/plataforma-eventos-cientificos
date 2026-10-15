# Documentación de SEP

## Fuentes del proyecto

- [README del repositorio](../README.md): visión, arquitectura de partida y estado real.
- [Proyecto técnico inicial](../PROYECTO_TECNICO_INICIAL.md): referencia inicial de alcance y requisitos.
- [PDF del proyecto técnico](reference/Proyecto_Tecnico_Inicial_SEP_v1.pdf).
- [DOCX del proyecto técnico](reference/Proyecto_Tecnico_Inicial_SEP_v1.docx).
- [Prompt maestro para Codex](development/PROMPT_MAESTRO_CODEX.md): guía de ejecución por fases. Las rutas a `README.md` y `PROYECTO_TECNICO_INICIAL.md` que contiene se refieren a la raíz del repositorio.

## Documentos de trabajo

- [Análisis inicial](architecture/analisis-inicial.md).
- [Arquitectura C4 y mapa de módulos](architecture/arquitectura.md).
- [Modelo inicial de dominio](architecture/modelo-dominio.md).
- [Matriz inicial de permisos](functional/matriz-permisos.md).
- [ADR-001: arquitectura modular API-first](adr/ADR-001-arquitectura.md).
- [ADR-002: tenancy y autorización por evento](adr/ADR-002-tenancy.md).
- [ADR-003: Drizzle y aislamiento transaccional](adr/ADR-003-orm-aislamiento.md).
- [Resultados de la prueba ORM](architecture/prueba-orm.md).
- [Ejecución de la prueba técnica](../tests/orm-spike/README.md).
- [Plan de Fase 0](functional/fase-0.md).

## Organización

| Directorio | Contenido previsto |
|---|---|
| `architecture/` | Contexto, contenedores C4, límites de módulos, modelos e invariantes. |
| `adr/` | Decisiones con contexto, alternativas, consecuencias y estado. |
| `api/` | OpenAPI, autorización, errores y convenciones de contratos. |
| `functional/` | Requisitos, flujos, alcance de fases y criterios de aceptación. |
| `development/` | Guías de desarrollo y colaboración. |
| `reference/` | Documentos de referencia en formatos de distribución. |

Los documentos de planificación describen trabajo futuro. No constituyen evidencia de funcionalidades implementadas. Las decisiones pendientes se resolverán mediante ADR y validación del producto.
