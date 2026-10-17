# Revisión científica por evento

Estado: circuito de revisión de simple ciego implementado. No implica cierre de la validación funcional completa aplazada ni de la activación productiva de identidad, correo y antivirus.

## Recorrido del organizador

1. Entrar como organizador del evento y abrir **Comité y revisores**. Un administrador de organización necesita una asignación de organizador para gestionarlo.
2. Buscar una persona registrada por nombre, institución u ORCID. Debe tener activada su visibilidad en Mi perfil. Seleccionarla, indicar su especialidad si procede e invitarla. La invitación es interna; no se envía correo.
3. La persona entra en **Mi espacio → Mis revisiones** y acepta o rechaza pertenecer al comité. Una invitación al comité no da acceso a trabajos por sí sola.
4. En **Trabajos recibidos → Ver → Revisión científica**, abrir una ronda sobre la versión oficial más reciente del trabajo. Configurar fecha límite, mínimo de evaluaciones (1–5) y criterios bilingües (1–10). La interfaz propone cuatro criterios y dos evaluaciones; el organizador puede modificarlos antes de crear la ronda.
5. Asignar revisores disponibles. Cada persona recibe una asignación independiente, pendiente de aceptación. Al consultar el expediente se vuelven a detectar conflictos automáticos y los informes afectados se excluyen del contador de evaluaciones válidas. No puede repetirse una persona en la misma ronda.
6. Consultar estados y evaluaciones enviadas. Los borradores privados del revisor no se muestran al organizador. Las notas confidenciales de evaluaciones enviadas se consultan en el expediente de la ronda. El organizador puede invalidar motivadamente un informe enviado: se conserva íntegro, pero deja de contar para el mínimo de evaluaciones. Si ya había dictamen, no se modifica automáticamente y debe revisarse editorialmente.
7. Emitir el dictamen desde la gestión de estado existente. Si hay rondas, aceptar, rechazar o solicitar correcciones requiere una ronda abierta de la versión oficial actual y el mínimo de informes enviados que sigan libres de conflictos. El dictamen cierra la ronda y publica solamente los comentarios dirigidos al autor.
8. Tras un reenvío, abrir otra ronda sobre la nueva versión si necesita evaluación. Las rondas anteriores, sus informes y sus criterios se conservan. Se permite cerrar una ronda sin dictamen, con motivo, para preparar otra; eso no publica comentarios.

La demo incorpora accesos **Revisor de prueba 1** y **Revisor de prueba 2**, cuentas independientes de autor, administrador y organizador. Sus perfiles ficticios se preparan con institución/país y visibilidad para poder encontrarlas. El organizador debe invitarlas desde Comité y revisores; cada una acepta desde Mis revisiones antes de poder recibir asignaciones. No se conceden permisos de organizador ni se evitan conflictos. Se conservan los perfiles y trabajos anteriores; no se crean invitaciones o asignaciones automáticamente. Para personas reales sigue siendo necesario completar Mi perfil y activar «Permitir que me encuentren como autor o revisor».

## Recorrido del revisor

**Mis revisiones** incluye un contador de tareas pendientes (aceptar el comité o atender asignaciones vigentes), que se actualiza al responder o enviar. No es un contador de mensajes sin leer. Aparece en la navegación compartida de Mi espacio. Permite aceptar el comité, consultar asignaciones y abrir una contribución. Antes de aceptar una asignación se muestra la versión oficial con autores y afiliaciones para valorar conflictos, sin correo, ORCID ni IDs de autores. El PDF no se habilita hasta aceptar.

Aceptar declara independencia, ausencia de conflicto y confidencialidad. El revisor puede rechazar con motivo o declarar un conflicto. La declaración de conflicto se conserva por trabajo/persona y bloquea futuras asignaciones a esa persona; no se puede retirar desde este incremento.

La evaluación admite puntuaciones de 1 a 5 por criterio, recomendación (aceptar, correcciones menores, correcciones mayores o rechazar), comentarios para el autor y notas confidenciales para el comité. **Guardar borrador** admite una evaluación incompleta; **Enviar evaluación** exige todos los criterios, recomendación y al menos diez caracteres de comentarios para el autor, con confirmación explícita. El envío congela el informe. Declarar posteriormente un conflicto no reescribe lo enviado; lo invalida para el cómputo de informes y conserva la declaración y el informe para el comité.

Se confirma guardar o descartar al cerrar o navegar con cambios, incluyendo idioma y cierre de sesión. La recarga del navegador activa el aviso de cambios sin guardar. Cada operación usa revisión optimista y los botones se bloquean mientras se procesa.

## Privacidad, plazos y permisos

El modo implementado es **simple ciego**: el revisor conoce a los autores. Estos no reciben nombres de revisores, puntuaciones, recomendaciones internas ni comentarios confidenciales. El organizador mantiene el dictamen; una recomendación no cambia automáticamente el estado del trabajo. Los archivos asignados no se alteran para simular anonimato.

Las evaluaciones se vinculan a una versión oficial y a una rúbrica inmutable. Un revisor no accede a borradores del autor, otras versiones, archivos distintos del asignado, informes de otros revisores ni a la bandeja administrativa. Incluso un organizador que sea autor o gestor compartido del trabajo queda excluido de su expediente de revisión y de decisiones sobre él.

La aceptación de comité y la asignación son relaciones propias por evento, no roles globales heredados. Los conflictos automáticos comprueban remitente, autores vinculados actuales y de versiones oficiales, ORCID autenticado de producción, correo verificado de la propia sesión y gestión compartida vigente. Las coincidencias por nombre no se usan para afirmar identidad. El revisor debe declarar otros conflictos académicos o personales: no se infieren relaciones no registradas.

El acceso a contenido/PDF y el guardado se revalidan en cada solicitud. Una retirada, una versión oficial nueva, revocación, conflicto, evento no publicado/completado/cancelado, ronda cerrada o vencimiento de su fecha límite deshabilitan la evaluación. Se conservan la asignación y los informes propios enviados cuando la membresía permite consultarlos. Revocar al miembro retira su acceso e invalida sus asignaciones pendientes; no borra informes ya enviados.

La fecha límite es un día completo en la zona horaria de la ronda. La apertura de recepción del autor no limita la evaluación; se comprueba el ciclo activo del evento. Versiones finales pueden evaluarse con otra ronda cuando su estado sea versión final enviada.

## Dictámenes y excepciones

Un trabajo sin rondas admite dictamen editorial directo; aceptarlo exige una justificación excepcional y no se presenta como evaluación por pares. Si existe una ronda, la API comprueba los informes de la versión actual antes de aceptar, rechazar o pedir correcciones. Los cambios a «En revisión» y la solicitud de versión final no publican informes por sí solos.

El organizador debe justificar una excepción editorial con 20–2000 caracteres para aceptar sin revisión suficiente, con valoraciones de respuesta pendientes o pese a desacuerdos vigentes. La razón se registra en auditoría y en el historial visible al autor. No constituye una evaluación ni elimina el expediente. Los comentarios solo se publican una vez al cerrar mediante dictamen una ronda abierta que corresponda a la versión actual; nunca se publican notas confidenciales, puntuaciones ni nombres de revisores.

Una declaración de conflicto tardía no modifica automáticamente un dictamen ni comentarios históricos ya publicados. El comité debe revisar esa incidencia y resolverla por el procedimiento editorial apropiado. Este incremento no implementa apelaciones ni reapertura automática de dictámenes finales.

## Datos y API

Migraciones **0046 y 0047**: `review_members`, `review_rounds`, `review_assignments`, `review_conflicts`, con claves compuestas de organización/evento/trabajo, RLS/FORCE, índices y revisiones. Funciones SECURITY DEFINER acotadas comprueban disponibilidad y conflictos sin conceder lectura directa de trabajos al revisor. El archivo tiene una política limitada a la asignación y versión vigentes. Los triggers impiden reescribir versiones asignadas, rúbricas de rondas e informes enviados. Se amplía la comprobación de arranque a 27 tablas de negocio con RLS obligatorio.

Todas las rutas están bajo `/api/v1/events/:eventId/peer-review`:

| Ruta | Uso |
|---|---|
| GET/POST `committee` | Comité, carga pendiente y nominación por organizador |
| POST `committee/:personId/revoke` | Revocación con revisión y motivo |
| GET `mine/status` | Contador de tareas propias vigentes |
| GET `mine` | Membresía y resúmenes de asignaciones propias |
| POST `mine/membership` | Aceptar/rechazar invitación al comité |
| GET/PUT `mine/:assignmentId` | Consulta propia y guardado privado |
| POST `mine/:assignmentId/respond` | Aceptar, rechazar o declarar conflicto |
| POST `mine/:assignmentId/submit` | Enviar evaluación inmutable |
| GET `mine/:assignmentId/files/:fileId` | PDF oficial asignado, con acceso revalidado |
| GET `works/:workId` | Expediente de revisión para organizador sin conflicto |
| POST `works/:workId/rounds` | Abrir ronda, con revisión del trabajo |
| POST `works/:workId/rounds/:roundId/assign` | Asignar revisor, con revisión de la ronda |
| POST `works/:workId/rounds/:roundId/close` | Cierre motivado sin dictamen |
| POST `works/:workId/assignments/:assignmentId/revoke` | Revocación motivada de una asignación o invalidación de un informe, conservándolo |

El dictamen sigue en `/submissions/:workId/decision`, con `reviewOverrideReason` opcional y validado. OpenAPI incluye contratos y el gateway web admite estas rutas con las mismas comprobaciones de sesión y origen. Las operaciones quedan auditadas sin incluir textos confidenciales en auditoría pública.

Límites del incremento: 200 miembros por evento, 20 rondas por trabajo, 20 asignaciones por ronda, 1000 asignaciones históricas por persona/evento. Se rechaza crear más al alcanzar el límite; el listado propio devuelve hasta ese máximo. Estos límites no representan una validación de capacidad de producción.

## Comprobaciones realizadas

Compilación y lint, comprobaciones acotadas con servicios reales y sep_runtime en transacciones revertidas: dos aceptaciones, versión oficial fijada, bloqueo de autor/revisor, PDF antes/después de aceptar, ausencia de lectura directa de borradores/versiones, borrador privado frente al organizador, informe inmutable también en PostgreSQL, versión nueva, retirada, revocación, conflicto declarado, correo verificado, cambio de autoría, revisión optimista, aislamiento entre personas/organizaciones y dictamen condicionado con publicación de comentarios sin notas privadas o identidad del revisor. También se comprobó la excepción editorial auditada.

En navegador: comité, apertura de ronda y criterios, asignación, aceptación de comité y trabajo, PDF condicionado, guardado y envío de evaluación, cambios sin guardar, lectura del informe enviado, español/inglés y móvil de 390/320 píxeles. Las mutaciones de esa revisión visual se interceptaron en el navegador; no cambiaron trabajos o perfiles reales. La validación funcional completa continúa aplazada.

## Ampliaciones fuera de este incremento

Doble ciego con manuscritos anonimizados y reglas específicas de acceso, asignación automática por especialidad/carga, rúbricas ponderadas y plantillas reutilizables por evento, debate entre revisores, apelaciones, notificaciones por correo y exportaciones editoriales. No se simulan estas capacidades ni se presentan como implementadas.

## Consulta por los autores y avisos de novedades

Al emitir el dictamen, los comentarios para autores se publican en un bloque propio visible al consultar y al editar el trabajo, junto al mensaje del equipo y al plazo de respuesta. Las notas confidenciales permanecen reservadas al organizador; no se publican identidades, puntuaciones ni recomendaciones internas. La publicación conserva una copia de los comentarios con ronda y versión. Los dictámenes anteriores a la migración 0048 se muestran íntegramente desde su copia pública histórica, sin acceder a informes privados ni exigir repetir la revisión.

Mis trabajos muestra un aviso destacado y un contador lateral de trabajos con novedades. Se consideran el último dictamen y la última publicación de comentarios de cada trabajo. La lectura se guarda por persona y trabajo cuando el bloque aparece en pantalla, mediante los identificadores concretos mostrados; una petición de lectura antigua no marca mensajes nuevos. Las lecturas parciales se acumulan y no reaparecen al cambiar de pestaña. Los colaboradores con gestión aceptada tienen sus propias lecturas. No se envían correos en este incremento.

La migración 0048 incorpora `work_history.author_feedback` y `work_notice_reads`, con RLS forzada por organización, evento, trabajo accesible y persona. Rutas nuevas: GET `/events/:eventId/my-works/notices` y POST `/events/:eventId/my-works/:workId/notices/read` con `noticeIds`. OpenAPI y el proxy web incluyen ambos contratos.

El bloque público de dictamen y revisiones está integrado en Seguimiento del trabajo, tanto en consulta como debajo del editor. No antecede al título ni al contenido. El envío de correcciones se prepara desde el editor sobre datos guardados, con una confirmación independiente que identifica la siguiente versión y su documento.

## Respuesta del autor y siguiente ronda

El autor puede preparar una respuesta general y contestar cada evaluación publicada desde Editar. Guardarla conserva un borrador privado; enviarla junto con la nueva versión genera una copia oficial que no se reescribe. Es válido justificar la no aplicación de una observación. Los comentarios históricos sin estructura se responden conjuntamente, conservando íntegro el texto público.

El organizador consulta la respuesta enviada en el detalle y en las versiones oficiales. Al asignar la siguiente ronda se copia únicamente esa respuesta oficial y sus observaciones públicas; no se copia el borrador del autor ni informes privados. El revisor recibe la respuesta después de aceptar la asignación y mientras tenga acceso a la versión. Una invitación pendiente mantiene los metadatos limitados existentes. Los comentarios publicados de rondas anteriores se distinguen de las evaluaciones privadas de otros revisores: no se incluyen recomendaciones, puntuaciones, notas confidenciales ni identidad del revisor.

El autor puede consultar la respuesta enviada en Seguimiento y en la versión correspondiente. Una solicitud de correcciones posterior requiere una respuesta nueva al nuevo dictamen; no reutiliza automáticamente el borrador anterior. Este bloque no incorpora debate entre revisores ni un procedimiento de apelación. Véase el detalle de contratos, migraciones 0049/0050 y verificaciones en [Trabajos y envíos](trabajos-envios.md#respuesta-del-autor-al-dictamen).

## Avisos y valoración de las respuestas por revisores anteriores

El envío de una respuesta crea una tarea independiente para cada revisor cuyo comentario se publicó. Aparece en Mis revisiones → Respuestas de los autores y suma al contador de tareas pendientes. Abrirla no la da por resuelta: se completa al enviar una valoración. No crea una ronda, no asigna una nueva revisión y no concede acceso al PDF o al contenido de una versión nueva.

Cada revisor recibe su propia observación publicada, la respuesta general y, cuando existe, la contestación dirigida a su evaluación. No recibe respuestas individuales de otros revisores, informes privados ni notas confidenciales. Puede indicar Atiende mis observaciones o No atiende mis observaciones, con una explicación de 10–4000 caracteres y confirmación explícita. La valoración queda fija y no cambia por sí sola el estado del trabajo. El organizador consulta todas las valoraciones, sus autores y su elegibilidad desde el expediente de revisión.

El acceso requiere persona activa, membresía aceptada, informe de origen válido y ausencia de conflictos. Se revalida al consultar y al enviar. Solo se valora la respuesta de la última versión mientras el trabajo espera dictamen; tras dictamen o una versión posterior queda en consulta. Revocación, conflicto, retirada o cierre del evento restringen el acceso. La valoración de respuesta y una nueva revisión completa son operaciones independientes.

Las valoraciones completas de los revisores de origen pueden respaldar el dictamen de correcciones sin abrir otra ronda, respetando el mínimo de la ronda original. Para aceptar con valoraciones pendientes, desacuerdos vigentes o revisión insuficiente, se exige la excepción editorial motivada. También se consideran desacuerdos las recomendaciones de la ronda actual que no sean aceptar. Se conserva la autoridad final del organizador y no se simulan votos vinculantes.

La aceptación añade al historial una de estas acciones: review_decision_with_reviews, review_decision_with_dissent o review_decision_without_reviews. Se registra la versión y el cómputo de informes/valoraciones; la excepción conserva su justificación. El autor ve esta trazabilidad sin nombres de revisores ni sus explicaciones privadas. Las valoraciones posteriores no reescriben dictámenes previos.

Si el organizador solicita más aclaraciones sin abrir otra ronda, se conservan las observaciones públicas de origen y la siguiente respuesta vuelve a los revisores originales. Las respuestas y sus valoraciones permanecen ligadas a sus respectivas versiones.

La correspondencia entre comentario publicado y revisor se guarda internamente en work_history.review_recipients; no se expone en la API del autor. Para publicaciones antiguas solo se reconstruye cuando el texto público completo coincide exactamente con una única ronda. Si no puede establecerse de forma inequívoca, no se adivinan destinatarios; el organizador debe resolver por excepción o abrir una ronda explícita. La sincronización es idempotente y permite reconocer también respuestas ya enviadas antes de este incremento.

Migraciones 0051–0054: review_response_checks con RLS/FORCE, permisos limitados, funciones de sincronización/acceso y protección de valoraciones enviadas; se amplía la comprobación de arranque a 29 tablas de negocio. Las rutas nuevas son GET peer-review/response-checks y POST peer-review/response-checks/:checkId/assess. El expediente peer-review/works/:workId incluye responseChecks para el organizador. Se documentan en OpenAPI y pasan por las mismas protecciones del proxy. El listado propio prioriza tareas por valorar y admite 1000 elementos; el contador consulta las tareas vigentes sin depender de ese límite.

Comprobaciones acotadas: notificación sin asignación nueva, separación por persona, notas privadas ausentes, valoración definitiva, bloqueo en PostgreSQL, aceptación ordinaria y excepcional, desacuerdo, pendientes, repetición de correcciones sin ronda nueva y conservación de la versión original. Se usaron servicios reales en transacciones revertidas. En navegador se comprobaron ambas cuentas reales receptoras de la versión 3, protección de cambios sin enviar, contador, consulta del organizador, justificación de excepción, historial y ES/EN a 390/320 píxeles. Las valoraciones y decisiones visuales se interceptaron: ambas valoraciones reales quedaron pendientes.
