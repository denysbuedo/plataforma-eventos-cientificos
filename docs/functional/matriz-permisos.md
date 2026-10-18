# Matriz inicial de permisos

Estado: matriz objetivo con subconjunto implementado. La API incorpora lectura de metadatos, creación de borradores por administrador, edición/publicación por organizador y gestión de organizadores por administrador de organización. Consultar el [OpenAPI](../api/openapi.json) y el [incremento de Fase 1](fase-1.md); el resto de capacidades continúa propuesto.

## Reglas generales

Denegar por defecto. Autorizar requiere principal válido cuando corresponda, organización/evento coincidentes, membresía y asignación activas, capacidad explícita y condiciones de estado, propiedad y confidencialidad satisfechas. Un módulo deshabilitado no concede acceso aunque exista el rol.

Los permisos de diferentes eventos nunca se combinan. Dentro de un mismo ámbito pueden combinarse capacidades compatibles; un conflicto de intereses o una prohibición de confidencialidad prevalece. Ningún rol permite escribir directamente estados o propiedades protegidas para evitar el flujo de negocio.

## Capacidades mínimas

`Sí` habilita solo el ámbito indicado; `Explícito` exige además asignación del rol correspondiente en ese evento; `Propio` exige titularidad. Cualquier celda negativa deniega, salvo otro rol válido en el mismo contexto.

| Acción | Superadmin técnico | Admin. organización | Organizador | Miembro de evento sin rol gestor | Público |
|---|---|---|---|---|---|
| Aprovisionar o suspender organizaciones | Sí, plataforma | No | No | No | No |
| Modificar configuración de organización | No | Sí, su organización | No | No | No |
| Crear serie, edición o evento | No | Sí, su organización | No | No | No |
| Consultar metadatos administrativos de eventos | No | Sí, su organización | Sí, su evento | No | No |
| Editar configuración de evento | No | Explícito | Sí, su evento | No | No |
| Gestionar dominios de organización | No | Sí, su organización | No | No | No |
| Registrar o activar dominios de evento | No | Sí, su organización | No | No | No |
| Designar organizadores | No | Sí, su organización | No | No | No |
| Gestionar roles operativos delegables | No | Explícito | Sí, su evento | No | No |
| Leer datos personales operativos | No | Explícito | Mínimos de su evento | Propio | No |
| Consultar/asignar roles de plataforma | Sí, plataforma | No | No | No | No |
| Consultar contenido publicado | Sí | Sí | Sí | Sí | Sí |
| Consultar/modificar perfil personal | Propio | Propio | Propio | Propio | No |

Publicar o archivar un evento será una acción separada de editarlo, reservada al organizador en su evento y auditada. Suspender una organización es una operación técnica distinta del estado editorial de sus eventos.

En Fase 0 el organizador es el rol mínimo para probar gestión de evento. Los roles operativos siguientes se documentan para evolución; sus capacidades no se activan hasta implementar cada módulo. Los roles delegables nunca incluyen superadmin técnico ni administrador de organización. La gestión de organizadores impide retirar la asignación propia y la del último organizador activo; serializa los cambios mediante el bloqueo del evento. Los candidatos deben tener una membresía activa en la misma organización y una persona activa. La validación funcional de este incremento queda pendiente por indicación del propietario.

## Catálogo de roles de evento y límites futuros

| Rol | Capacidades previstas | Condiciones y límites |
|---|---|---|
| Organizador | Configuración y coordinación operativa. | No recibe por defecto identidades protegidas ni revisiones confidenciales. |
| Secretaría | Inscripciones, comunicaciones y acreditación. | Acceso mínimo a participantes; sin dictámenes científicos. |
| Coordinador científico | Configurar evaluación, asignar y decidir. | Áreas asignadas, conflictos y auditoría; anonimato según política aprobada. |
| Miembro de comité | Consultar y debatir expedientes asignados. | No decide ni accede a todo el evento por el nombre del rol. |
| Revisor | Leer material anonimizado y completar evaluaciones. | Asignación vigente, plazo, ausencia de conflicto; no evalúa trabajos propios. |
| Editor | Preparar y publicar memorias. | Autorización editorial y derechos; sin acceso automático a informes de revisión. |
| Autor/ponente | Gestionar contribuciones propias y presentación. | Titularidad/correspondencia y estado; no modifica autorías o versiones cerradas sin procedimiento. |
| Participante | Inscripción, agenda y documentos propios. | No accede a listas privadas ni a certificados de terceros. |
| Acreditador | Verificar credenciales y registrar acceso. | Evento, sede/sesión y dispositivo autorizados; datos mínimos. |
| Público | Leer programa, pósteres, memorias y verificación pública permitida. | Solo contenido publicado y campos permitidos; no es una asignación persistida. |

Los nombres autor y participante no sustituyen relaciones de autoría e inscripción. Tener el rol de autor no concede acceso a todas las contribuciones; tener una inscripción no concede capacidades de revisión.

## Casos de autorización para la futura suite

| Caso | Resultado esperado |
|---|---|
| Organizador de A1 cambia el ID para editar A2, ambos de organización A. | Denegado; aislamiento por evento. |
| Organizador de A1 solicita un recurso de B1. | Denegado; aislamiento por organización. |
| Misma persona es organizadora de A1 y participante de B1 e intenta editar B1. | Denegado; no combinar roles entre contextos. |
| Admin. de A crea un evento en A. | Permitido; capacidad de organización, con auditoría. |
| Admin. de A intenta acceder a una revisión privada sin rol científico de evento. | Denegado. |
| Superadmin técnico intenta descargar un trabajo inédito. | Denegado por defecto. |
| Usuario cambia host, cabecera, query o cuerpo para simular otro tenant. | Denegado; validar contexto y recurso en servidor. |
| Membresía o rol revocado conserva una sesión autenticada. | Denegado al reevaluar asignaciones; no confiar solo en roles del token. |
| Usuario sin membresía solicita contenido público publicado. | Permitido, únicamente proyección pública. |
| Autor solicita revisión privada del comité o trabajo de otro autor. | Denegado aunque comparta evento. |
| Revisor asignado tiene conflicto de intereses. | Denegado y registrado, incluso con rol activo. |
| Organizador intenta delegar administrador de organización. | Denegado por ámbito y lista de delegación. |

Los casos científicos corresponden a fases posteriores. Cada operación implementada necesitará DTO, respuesta de error y pruebas positivas y negativas; esta tabla no acredita ejecución.

Referencias: [modelo de dominio](../architecture/modelo-dominio.md), [ADR-002](../adr/ADR-002-tenancy.md), [Fase 0](fase-0.md).

## Inscripciones

| Operación | Permiso |
|---|---|
| Consultar recepción publicada | Público; sin lista de participantes |
| Solicitar, consultar y cancelar inscripción propia | Persona activa autenticada |
| Configurar/publicar/retirar recepción | Organizador del evento; capacidad `registrations-manage` |
| Listar participantes y decidir solicitudes | Organizador del evento; motivo e historial obligatorio |

Ser autor, revisor, participante o administrador de organización sin asignación de organizador no concede gestión de inscripciones. La inscripción no crea roles ni concede acceso científico.

## Acreditación y asistencia

La persona autenticada consulta sus registros y emite/renueva/revoca su propia credencial si la inscripción está confirmada. Solo el organizador del evento, con `attendance-manage`, consulta la bandeja, busca códigos, registra presencia y corrige evidencias. Esta capacidad no activa acceso a manuscritos, decisiones de inscripción ni revisión científica. La delegación a acreditadores está pendiente.
