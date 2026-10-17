# Programa científico por evento

Estado: primer bloque funcional implementado. La validación completa aplazada y la activación productiva de identidad/correo siguen pendientes.

## Organizador

1. Entrar como organizador del evento y abrir **Programa científico**. El administrador de organización necesita su asignación de organizador, como en la revisión.
2. Crear una sesión: nombre en español, nombre en inglés (obligatorio al publicar), temática opcional en ambos idiomas, fecha, inicio, fin, sala o espacio y modalidad presencial, virtual o híbrida.
3. Añadir moderadores mediante la búsqueda voluntaria de personas registradas. Deben tener visible su perfil y una afiliación; se permiten hasta cinco por sesión. No se crean cuentas ni se envían invitaciones o correos.
4. Añadir trabajos aceptados, elegir explícitamente un autor como presentador y fijar inicio/fin de cada presentación. Se incluyen estados aceptado, versión final solicitada y versión final enviada; cada presentación conserva la última versión oficial al guardar. Guardar la sesión también permite actualizar esos datos sin modificar otros campos.
5. Guardar la sesión. El listado identifica cada sesión, fecha, sala, moderadores, trabajos, presentador y versión. Editar abre el formulario y Cancelar protege los cambios sin guardar. El cambio de evento y el cierre de sesión también respetan esta protección.
6. Publicar el programa. Revalida el evento, fechas, versiones y elegibilidad. Se requiere un portal publicado, al menos una sesión, nombres bilingües y una presentación por sesión. Los cambios de borrador no alteran la publicación actual. Si cambió una versión oficial, hay que revisar/guardar el borrador y volver a publicar.
7. Retirar publicación la oculta del portal y de Mi participación, conservando el borrador. El retiro sigue disponible para un evento finalizado o cancelado; su programación ya no admite cambios.

El programa se publica de manera independiente del contenido del portal. Los cambios de fechas y zona horaria del evento requieren revisar ambos antes de publicarlos. No se modifica un trabajo, dictamen, archivo ni autoría al programarlo.

## Horarios y conflictos

Todos los horarios son locales a la zona horaria del evento. Sesiones y presentaciones comienzan y terminan en el mismo día; para una actividad que cruza medianoche se requieren sesiones en días distintos. Se rechazan horas inexistentes o ambiguas durante cambios de horario estacional. Las fechas deben quedar dentro del intervalo del evento cuando este está configurado.

Las presentaciones no pueden salir de su sesión ni solaparse dentro de ella. Un trabajo aparece una sola vez en el programa. Las sesiones simultáneas no comparten sala ni moderador. Se comprueban cruces del presentador entre presentaciones y con moderaciones de otras sesiones; presentar en la propia sesión que modera está permitido. Las salas se comparan sin diferencias de mayúsculas o espacios repetidos.

Los presentadores se identifican por cuenta vinculada; si no existe, se compara el correo declarado para evitar cruces evidentes. Esto solo sirve para planificar y no vincula identidades, autorías ni permisos. Los nombres iguales no bastan para afirmar que se trata de la misma persona. Un presentador externo puede figurar sin cuenta: no obtiene una agenda personal hasta disponer de una vinculación válida y volver a publicar el programa.

Se permiten hasta cien sesiones, cien presentaciones por sesión y quinientas en total; el cuerpo del guardado admite hasta 384 KiB. El selector de trabajos se busca por título y pagina de 25 en 25. No se implementan aún salas como inventario reutilizable, actividades sin trabajo, varias presentaciones de una contribución, confirmación del ponente, exportación ICS/PDF, correo o control de asistencia.

## Portal y Mi participación

El portal incorpora **Programa** únicamente si existe publicación. Agrupa por día y muestra sesiones, modalidad, horarios, sala, moderadores, título y autores del trabajo, y quién presenta. No expone correos, ORCID, identificadores de cuenta, informes de evaluación ni PDF. Conserva la última publicación hasta sustituirla o retirarla; una decisión científica posterior no reescribe automáticamente lo publicado, por lo que el organizador debe corregir o retirar el programa si procede.

**Mi espacio → Mi participación** muestra las presentaciones y moderaciones publicadas ligadas a la cuenta. No implica asistencia realizada ni genera certificados. Autoría, presentación, responsabilidad del envío y moderación siguen siendo conceptos distintos. La publicación de un evento completado permanece consultable; un evento cancelado o archivado no expone agenda pública.

## API y persistencia

| Método y ruta | Uso |
|---|---|
| GET `/events/:eventId/program` | Borrador e información de publicación, organizador |
| PUT `/events/:eventId/program` | Guardar `revision` y `sessions` |
| GET `/events/:eventId/program/candidates` | Trabajos aceptados: `q`, `limit` (1–100), `offset` |
| POST `/events/:eventId/program/publish` | Publicar la revisión guardada |
| POST `/events/:eventId/program/withdraw` | Retirar indicando revisión publicada |
| GET `/events/:eventId/program/mine` | Agenda publicada de la propia persona autenticada |
| GET `/public/program` | Proyección anónima del programa del dominio |

La migración **0056** crea program_drafts y program_publications, con claves de organización/evento y RLS/FORCE. Los borradores requieren la capacidad del organizador. Las escrituras se serializan sobre el evento y validan las contribuciones dentro de la misma transacción; usan revisión optimista. Se registran program.saved, program.published y program.withdrawn en auditoría. La comprobación de arranque abarca 31 tablas de negocio. Contratos y OpenAPI distinguen las proyecciones administrativas, públicas y personales.

La instantánea publicada fija nombres, asignaciones y versiones. Los cambios posteriores del perfil o reconocimiento de autoría se incorporan al guardar y publicar de nuevo. No hay asociación automática por coincidencia de nombre o correo de registro.

## Comprobaciones del incremento

Compilación de API, bibliotecas, administración y portal, lint y comprobaciones focalizadas con servicios y PostgreSQL reales en transacciones revertidas: elegibilidad, versión oficial, concurrencia, conflictos de sala/presentador/moderador, límites de horarios, publicación independiente, privacidad, agenda personal, retiro, cambio de versión y cambio de zona horaria. Se verificaron horas de cambio estacional y zonas con desplazamiento fraccionario.

En navegador: creación/edición de sesión, búsqueda de moderador, selector de trabajos, elección de presentador, publicación y retiro mediante respuestas interceptadas, cancelación con cambios y ES/EN a 390/320 píxeles. La agenda pública y la participación de presentador/moderador se comprobaron con servidores temporales y respuestas simuladas; se retiraron al terminar. No se programaron ni publicaron trabajos reales. La batería completa permanece pendiente.

La comprobación HTTP confirmó rechazo de entradas anidadas inválidas y trabajos inexistentes sin persistir borradores, y rechazo del administrador sin asignación de organizador. En navegador se verificó cancelar el cambio de evento y el cierre de sesión con datos sin guardar antes de enviar logout. El menú del organizador permite desplazamiento vertical en pantallas bajas, conservando accesible Cerrar sesión.
