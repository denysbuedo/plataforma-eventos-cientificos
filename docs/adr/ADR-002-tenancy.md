# ADR-002: organización como tenant y autorización por evento

Estado: propuesto; pendiente de validación y prueba técnica.

Fecha: 14 de octubre de 2026.

## Contexto

Una organización administra varios eventos. Una persona puede trabajar para varias organizaciones con roles diferentes en cada evento. El host identifica un contexto, pero no demuestra autorización. Deben impedirse cruces entre organizaciones y entre eventos de una organización.

## Alternativas

| Alternativa | Evaluación |
|---|---|
| Base de datos por organización | Mayor separación operativa; complica identidad compartida, migraciones y operación inicial. |
| Esquema PostgreSQL por organización | Multiplica objetos y migraciones; requiere gestionar búsquedas y conexiones con cuidado. |
| Tablas compartidas con organización/evento | Facilita operación inicial; exige controles de aplicación, integridad y RLS verificables. |

## Decisión propuesta

Usar inicialmente tablas compartidas. `organization_id` identifica el tenant y `event_id` delimita los recursos propios de un evento. Las personas e identidades son globales y se protegen mediante políticas específicas; no son un directorio público de usuarios de la plataforma.

Un recurso de evento conserva ambas claves. Las referencias compuestas `(organization_id, event_id)` y, cuando corresponda, `(organization_id, event_id, resource_id)` impedirán vincular registros de contextos distintos. Las tablas de organización carecen de `event_id`; no se interpreta un valor nulo como permiso global.

### Resolución y autorización

1. El proxy solo acepta hosts configurados. La API normaliza y consulta el hostname en un registro de dominios activos y verificados.
2. Solo se interpretan cabeceras reenviadas cuando la conexión procede de un proxy configurado como confiable. Cabeceras como `X-Tenant-ID` nunca conceden contexto ni permisos.
3. Un dominio de evento fija organización y evento. Un dominio de organización permite seleccionar un evento de esa organización después de verificar pertenencia y autorización. Un host administrativo de plataforma tiene rutas de gestión explícitas y no activa un contexto omnipotente.
4. Se valida el principal autenticado. El contexto efectivo combina dominio, recurso solicitado y asignaciones vigentes del servidor. IDs de ruta o cuerpo son candidatos que se verifican, nunca autoridad.
5. Se comprueban acción, ámbito, estado, propiedad y confidencialidad. La ausencia de permiso deniega la operación.
6. Se abre una transacción con contexto de BD limitado a la operación. Una incompatibilidad entre host y recurso se rechaza antes de devolver datos.

Las listas, búsquedas, contadores y exportaciones aplican el mismo contexto que los detalles. Autenticación inválida produce 401. Un recurso privado inexistente o fuera del contexto produce una respuesta 404 indistinguible. Una acción prohibida sobre un recurso visible produce 403. Un host desconocido se rechaza con 400 sin revelar el registro de dominios.

### Defensa en PostgreSQL

Proponer RLS en tablas privadas de organización/evento, además de filtros y restricciones. El rol de ejecución no será propietario de tablas, superusuario ni tendrá `BYPASSRLS`; las migraciones usarán otro rol. Evaluar `FORCE ROW LEVEL SECURITY` por tabla en la prueba técnica.

El contexto se establecerá localmente en la transacción, nunca como estado persistente de una conexión del pool. Sin contexto, las políticas deben denegar. Verificar rollback, reutilización de conexiones y solicitudes concurrentes. RLS refuerza el ámbito de datos; la aplicación conserva la responsabilidad de autorizar acciones y proteger la identidad global.

No se ha elegido ORM ni se afirma que estas políticas estén implementadas. ADR-003 dependerá de la prueba técnica de migraciones, RLS y transacciones.

### Administración y datos públicos

El administrador de organización gestiona configuración y delegación de su organización. No recibe acceso automático a expedientes científicos ni a datos operativos privados de todos sus eventos. Para esas acciones necesita asignaciones explícitas de evento.

El superadmin técnico gestiona aprovisionamiento y estado técnico. No obtiene lectura científica privada por defecto. Un futuro acceso excepcional de soporte necesita propósito, alcance, caducidad y auditoría; no forma parte de la primera entrega.

Las lecturas públicas exponen una proyección permitida de contenido publicado, sin desactivar políticas de acceso a tablas privadas. Los roles de una serie, edición o evento padre no se heredan de forma implícita.

### Superficies posteriores

Archivos y URLs firmadas requieren autorización previa y ámbito de objeto. Los mensajes de cola incluirán contexto generado por servidor; el worker lo validará y abrirá su propia transacción. Cachés, idempotencia, reportes y webhooks incluirán el ámbito en sus claves y verificaciones. Recibir un identificador de tenant en un mensaje no basta para confiar en él.

## Consecuencias y riesgos

- La identidad global facilita reutilización, pero requiere proyecciones mínimas por contexto.
- RLS exige disciplina con roles, pools y transacciones; se verificará antes de aceptar el ORM.
- Exportaciones administrativas entre eventos requieren capacidades explícitas; no hay consultas globales por comodidad.
- Una futura organización con infraestructura dedicada requerirá una estrategia de migración adicional.

## Criterios para validar la propuesta

Cubrir A1/A2 en organización A y B1 en B; sustitución de IDs; host y cabeceras falsificados; ausencia/revocación de membresía; roles diferentes de una misma persona; consultas directas con el rol de ejecución; conexiones reutilizadas y concurrencia. Ninguna prueba se ha ejecutado todavía.

Referencias: [modelo de dominio](../architecture/modelo-dominio.md), [matriz de permisos](../functional/matriz-permisos.md).
