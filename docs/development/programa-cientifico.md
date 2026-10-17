# Programa científico por evento

Estado: primer bloque funcional implementado. La validación completa aplazada y la activación productiva de identidad/correo siguen pendientes.

## Organizador

El módulo se divide en **Sesiones**, **Actividades científicas** y **Salas y espacios**. Los tres pertenecen al evento y requieren una asignación de organizador.

1. En Salas y espacios, registrar cada sala física y canal virtual con código único, nombre, ubicación y capacidad opcional. Un espacio se selecciona al programar; su nombre no se escribe de nuevo en la sesión. Se puede editar y desactivar cuando no está asignado en el borrador.
2. En Actividades científicas, crear simposios, talleres, mesas redondas, paneles, debates, foros, seminarios, coloquios, cursos o programas temáticos. Cada actividad tiene identidad propia, descripción bilingüe y coordinación científica opcional; puede agrupar varias sesiones y días. El coordinador debe estar disponible en el directorio y no recibe permisos de organizador por esta asignación.
3. Crear una sesión en cuatro pasos: **Identificación**, **Horario y espacios**, **Participantes** y **Presentaciones**. El primer paso elige la actividad opcional, el tipo de sesión, nombre y descripción. Los textos adicionales pueden completarse en ambos idiomas.
4. Elegir fecha, horario y modalidad. Una sesión presencial requiere sala física; una virtual requiere canal virtual; una híbrida necesita ambos. Gestionar espacios abre un diálogo y conserva los datos de la sesión.
5. Incorporar moderadores, conferencistas, panelistas, debatientes o facilitadores desde el directorio voluntario. La coordinación de la actividad y las funciones de una sesión son diferentes.
6. Añadir trabajos aceptados cuando corresponda, elegir explícitamente un autor como presentador e indicar formato, participación presencial/virtual, inicio/fin e identificación de póster. El formato no cambia el tipo de contribución ni el dictamen. Las sesiones híbridas permiten presentadores remotos o presenciales.
7. Guardar al terminar el cuarto paso. Continuar no guarda la sesión. Cancelar, cambiar de pestaña/evento o cerrar sesión protege las modificaciones locales. El listado identifica la actividad, tipo de sesión, fecha, recursos, participantes y presentaciones.
8. Publicar revalida el evento, sus fechas, recursos, personas y versiones. Las sesiones de ponencias y pósteres requieren trabajos; los demás tipos pueden publicarse sin ellos si tienen descripción y participantes. Se exigen nombres bilingües de las sesiones y de las actividades vinculadas. Las actividades sin sesiones no se publican.
9. Retirar publicación la oculta del portal y de Mi participación, conservando el borrador. El retiro sigue disponible para un evento finalizado/cancelado.

El programa se publica independientemente del CMS. Los cambios de fechas o zona horaria requieren revisar ambos antes de publicarlos. Renombrar un espacio utilizado actualiza el borrador y aumenta su revisión; no reescribe la publicación vigente. No se puede desactivar ni cambiar el tipo de un espacio usado hasta reasignar sus sesiones.

La [comparación internacional](../architecture/estudio-organizacion-cientifica-eventos.md) fundamenta las distinciones y explica los catálogos. No es una clasificación normativa ni una investigación exhaustiva de todos los congresos del mundo.

## Horarios y conflictos

Todos los horarios son locales a la zona horaria del evento. Sesiones y presentaciones comienzan y terminan en el mismo día; para una actividad que cruza medianoche se requieren sesiones en días distintos. Se rechazan horas inexistentes o ambiguas durante cambios de horario estacional. Las fechas deben quedar dentro del intervalo del evento cuando este está configurado.

Las presentaciones no pueden salir de su sesión. En sesiones orales no pueden solaparse; en sesiones de pósteres sí pueden compartir horario. Un trabajo aparece una sola vez en el programa. Las sesiones simultáneas no comparten sala física, canal virtual ni participantes con funciones. Se comprueban cruces del presentador entre presentaciones y con moderaciones de otras sesiones; presentar en la propia sesión que modera está permitido. Las reservas se comparan por ID de espacio, con independencia de su nombre visible. El código de identificación de un póster no se repite dentro de su sesión.

Los presentadores se identifican por cuenta vinculada; si no existe, se compara el correo declarado para evitar cruces evidentes. Esto solo sirve para planificar y no vincula identidades, autorías ni permisos. Los nombres iguales no bastan para afirmar que se trata de la misma persona. Un presentador externo puede figurar sin cuenta: no obtiene una agenda personal hasta disponer de una vinculación válida y volver a publicar el programa.

Se permiten hasta cien actividades, cien sesiones, cien presentaciones por sesión y quinientas en total; el guardado admite hasta 384 KiB. El catálogo admite hasta doscientos espacios. Cada actividad puede tener diez coordinadores; una sesión admite cinco moderadores y veinte participantes adicionales. El selector de trabajos pagina de 25 en 25. No se implementan aún actividades con inscripción propia, varias presentaciones de una contribución, copresentadores, confirmaciones, exportaciones, streaming, reuniones virtuales ni asistencia. «Vídeo» es una clasificación de formato, sin alojamiento ni reproducción integrada.


## Portal y Mi participación

El portal incorpora **Programa** únicamente si existe publicación. Permite filtrar por actividad científica, agrupa por día y actividad, y muestra tipo de sesión, modalidad, horarios, espacios, participantes y presentaciones con su formato y modalidad individual. No expone correos, ORCID, identificadores de cuenta, informes de evaluación ni PDF. Conserva la última publicación hasta sustituirla o retirarla; una decisión científica posterior no reescribe automáticamente lo publicado, por lo que el organizador debe corregir o retirar el programa si procede.

**Mi espacio → Mi participación** muestra las presentaciones, moderaciones y demás funciones publicadas ligadas a la cuenta, además de las actividades que coordina. No implica asistencia realizada ni genera certificados. Autoría, presentación, responsabilidad del envío y moderación siguen siendo conceptos distintos. La publicación de un evento completado permanece consultable; un evento cancelado o archivado no expone agenda pública.

## API y persistencia

| Método y ruta | Uso |
|---|---|
| GET `/events/:eventId/program` | Borrador e información de publicación, organizador |
| PUT `/events/:eventId/program` | Guardar `revision`, `sessions` y `activities` (omitir activities conserva las existentes) |
| GET `/events/:eventId/program/candidates` | Trabajos aceptados: `q`, `limit` (1–100), `offset` |
| POST `/events/:eventId/program/publish` | Publicar la revisión guardada |
| POST `/events/:eventId/program/withdraw` | Retirar indicando revisión publicada |
| GET `/events/:eventId/program/mine` | Agenda publicada de la propia persona autenticada |
| GET `/events/:eventId/program/spaces` | Catálogo administrativo de espacios |
| POST `/events/:eventId/program/spaces` | Registrar espacio con revisión 0 |
| PUT `/events/:eventId/program/spaces/:spaceId` | Editar disponibilidad y datos con revisión vigente |
| GET `/public/program` | Proyección anónima del programa del dominio |

La migración **0056** crea program_drafts y program_publications, con claves de organización/evento y RLS/FORCE. Los borradores requieren la capacidad del organizador. Las escrituras se serializan sobre el evento y validan las contribuciones dentro de la misma transacción; usan revisión optimista. Se registran program.saved, program.published y program.withdrawn en auditoría. Con la migración 0057 se añade program_spaces y el catálogo de actividades del borrador; la comprobación de arranque abarca 32 tablas de negocio. Véase [ADR-023](../adr/ADR-023-estructura-cientifica-espacios-y-formatos.md). Contratos y OpenAPI distinguen las proyecciones administrativas, públicas y personales.

La instantánea publicada fija nombres, asignaciones y versiones. Los cambios posteriores del perfil o reconocimiento de autoría se incorporan al guardar y publicar de nuevo. No hay asociación automática por coincidencia de nombre o correo de registro.

## Comprobaciones del incremento

Compilación de API, bibliotecas, administración y portal, lint y comprobaciones focalizadas con servicios y PostgreSQL reales en transacciones revertidas: elegibilidad, versión oficial, concurrencia, conflictos de sala/presentador/moderador, límites de horarios, publicación independiente, privacidad, agenda personal, retiro, cambio de versión y cambio de zona horaria. Se verificaron horas de cambio estacional y zonas con desplazamiento fraccionario.

En navegador: creación/edición de sesión, búsqueda de moderador, selector de trabajos, elección de presentador, publicación y retiro mediante respuestas interceptadas, cancelación con cambios y ES/EN a 390/320 píxeles. La agenda pública y la participación de presentador/moderador se comprobaron con servidores temporales y respuestas simuladas; se retiraron al terminar. No se programaron ni publicaron trabajos reales. La batería completa permanece pendiente.

La comprobación HTTP confirmó rechazo de entradas anidadas inválidas y trabajos inexistentes sin persistir borradores, y rechazo del administrador sin asignación de organizador. En navegador se verificó cancelar el cambio de evento y el cierre de sesión con datos sin guardar antes de enviar logout. El menú del organizador permite desplazamiento vertical en pantallas bajas, conservando accesible Cerrar sesión.


## Conversión de datos previos

La migración 0057 conserva el programa publicado y convierte las salas del borrador a referencias de catálogo. Solo agrupa coincidencias de mayúsculas y espacios; no adivina equivalencias entre nombres distintos. La revisión del borrador aumenta para hacer visible que la representación cambió. Las sesiones antiguas reciben el tipo inicial de presentación de trabajos y las presentaciones el formato oral. El organizador puede reclasificarlas explícitamente. Una sesión híbrida antigua debe completar su canal virtual antes de volver a guardar o publicar.


## Comprobaciones del segundo bloque

La compilación de API, administración, portal y bibliotecas y el análisis estático pasaron. Con PostgreSQL/servicios reales en transacciones revertidas se verificaron catálogo, códigos duplicados, desactivación de espacios usados, cambio de nombre con revisión de borrador y publicación conservada, simposio con varias sesiones, borrado de una actividad referenciada, taller sin trabajos con facilitador, privacidad, coordinación personal, modo individual virtual en sesión híbrida y pósteres simultáneos/identificadores duplicados.

En navegador se recorrieron actividades y coordinación, creación de espacios en página y en diálogo sin perder la sesión, los cuatro pasos, presentación remota con formato independiente, cancelación, inglés y anchuras de 390/320 píxeles. Las escrituras se interceptaron y se compararon los datos reales antes/después. Las vistas públicas con agrupación/filtro de actividad y la participación de facilitador/coordinador se verificaron con servidores temporales y respuestas simuladas; se cerraron al terminar. Por HTTP se comprobó el contrato de edición de espacios, revisión obsoleta y código duplicado sin modificar datos. Cambiar pestaña/contexto y cerrar sesión protegen cambios sin guardar; avanzar al cuarto paso no guarda automáticamente. Los avisos del módulo mantienen fondo transparente y no tienen sombra.

La migración se aplicó a la demo y la API arrancó con la comprobación de 32 tablas RLS/FORCE. La publicación existente se conserva; las salas del borrador se convirtieron al catálogo. La validación funcional completa continúa aplazada.
