# Contrato API de Fase 0

Estado: incremento mínimo implementado; consultar [OpenAPI generado](openapi.json) y [ejecución local](../development/desarrollo-local.md).

## Operaciones disponibles

| Método y ruta | Acceso y comportamiento |
|---|---|
| `GET /api/v1/health` | Público, sin resolución de host; comprueba BD y devuelve solo `status`. |
| `GET /api/v1/public/event` | Host de evento activo/verificado; devuelve proyección permitida solo si está publicado. |
| `GET /api/v1/events` | Organizador del evento o administrador de organización; lista paginada limitada por contexto. |
| `GET /api/v1/events/{eventId}` | Mismos permisos de lectura de metadatos; comprueba host, organización e ID. |
| `POST /api/v1/events` | Administrador en host de organización; genera UUID y borrador en su organización. |
| `PATCH /api/v1/events/{eventId}` | Organizador explícito; modifica únicamente `nameEs` y `nameEn`, con auditoría transaccional. |

No existen endpoints de eliminación, publicación, administración de roles, registro de dominios, edición de identidad ni módulos científicos. Un borrador recién creado no obtiene automáticamente dominio u organizadores; esas operaciones requieren el siguiente incremento administrativo.

## Contexto y autorización

El `Host` se normaliza y resuelve mediante un registro de dominios activos y verificados cuya organización está activa. Los hosts de evento fijan también el evento. En un host de organización, un ID de ruta es candidato que debe corresponder a esa organización y a los permisos vigentes. Solo un administrador de organización puede listar sus eventos sin un ID concreto.

La aplicación no confía en proxies reenviados: `trust proxy=false`; `Forwarded` y `X-Forwarded-*` no cambian contexto. Un proxy futuro deberá preservar y validar `Host` hasta que se diseñe una política de confianza específica. Las cabeceras `X-Tenant-ID`, `X-Organization-ID`, `X-Event-ID`, `X-Role` y `X-Person-ID` se rechazan.

El adaptador de desarrollo asocia un token opaco configurado en servidor con una persona; no acepta un UUID como token. Es reemplazable por OIDC y está bloqueado en producción. La persona activa, membresía, rol, vigencia y ámbito se consultan en cada transacción de operación. No se toman roles del token ni se combinan entre eventos.

Organizador puede consultar y editar metadatos de su evento. Participante no obtiene acceso administrativo. Administrador de organización puede consultar metadatos de sus eventos y crear borradores, pero necesita asignación explícita de organizador para editarlos. Estas capacidades no implican acceso a datos científicos futuros.

Las consultas mantienen filtros de organización/ID además de RLS. Contexto local a transacción incluye persona, organización, evento y capacidad administrativa obtenida en servidor. RLS no autentica por sí sola esas variables.

## Entradas, salidas y errores

Los DTO rechazan propiedades desconocidas y valores inválidos. `limit` acepta 1–100 y `offset` 0–10000; orden fijo por UUID. La creación exige ambos nombres (3–200 caracteres) y zona horaria válida. PATCH rechaza valores nulos y actualizaciones vacías; no modifica organización, estado o permisos.

La vista pública solo devuelve ID, nombres y zona horaria; no incluye organización, estado interno ni datos de personas. Los eventos borrador o archivados no son públicos. Un evento archivado no admite PATCH.

Errores: `error.code`, `error.message`, `error.requestId` y opcionalmente `error.issues` con campos/códigos de validación, sin valores de entrada. `Accept-Language` selecciona español/inglés; fallback español. `X-Request-ID` se genera en servidor y coincide con el error y la auditoría. No se reutiliza un identificador arbitrario del cliente.

| Estado | Uso |
|---|---|
| 400 | Host inválido/desconocido, contexto por cabeceras o entrada no válida. |
| 401 | Token ausente/inválido o persona desactivada. |
| 403 | Membresía/ámbito visible pero sin la capacidad necesaria. |
| 404 | Recurso fuera de contexto, persona sin pertenencia válida o recurso inexistente. |
| 409 | Estado archivado incompatible con actualización. |
| 500 | Fallo interno con respuesta sanitizada. |
| 503 | Comprobación de salud no puede acceder a BD. |

## Privilegios y auditoría

El runtime no es propietario ni superusuario y no tiene `BYPASSRLS`. Carece de acceso directo al registro de dominios y organizaciones; una función `SECURITY DEFINER` de búsqueda exacta, con `search_path` fijo y ejecución restringida, devuelve únicamente IDs de contexto.

Las tablas privadas usan RLS/FORCE. Runtime solo lee persona propia, membresías/roles propios del tenant y metadatos de eventos autorizados; solo inserta eventos y auditoría y actualiza las columnas de nombres. No puede asignar roles, modificar identidades, borrar auditoría ni truncar.

Crear/editar evento y su auditoría se confirman en la misma transacción. La prueba fuerza un fallo de auditoría y comprueba rollback. Los intentos denegados todavía no tienen una bitácora persistente de seguridad; el hardening operativo y esa bitácora quedan pendientes.

Los controles de revocación se evalúan en cada operación; no se implementa invalidación global de sesiones OIDC ni un protocolo de revocación de operaciones que ya estén en curso.
