# Reconocimiento de autorías

Estado: implementado en API y web ES/EN. La validación funcional completa y las pruebas de interacción por navegador siguen aplazadas. No se envían correos externos.

## Flujo de las personas

Desde Mis trabajos o Mi perfil, abrir **Autorías** en el evento. La sección ofrece declaraciones cuyo personId sea la cuenta seleccionada, o declaraciones manuales sin personId cuyo correo coincida con el correo **verificado de la sesión** o cuyo ORCID coincida con una conexión autenticada **de producción**. Nombre y afiliación no son evidencia para asociar cuentas. El ORCID Sandbox no participa en coincidencias retrospectivas.

La pantalla separa **Pendientes**, **Mis autorías** y **Actividad**. Pendientes distingue confirmaciones propias («Sí, soy yo» / «No soy yo»), solicitudes que la persona debe revisar y solicitudes ya enviadas que esperan respuesta. Los detalles de identidad y las opciones de cancelación/revocación están plegados. La responsabilidad de aprobación aparece en un apartado desplegable. Cada acción abre una confirmación que explica su efecto; el campo de motivo aparece solo cuando es obligatorio. Se revisó esta presentación en navegador de escritorio y móvil usando datos de ejemplo interceptados exclusivamente en el navegador, sin modificar trabajos.

La lista previa a aprobación muestra solo la declaración de nombre y la clase de coincidencia. No incluye título, resumen, PDF, contactos, otras personas o versiones. La persona puede solicitar reconocimiento o indicar que no es ella; la respuesta queda registrada. Las declaraciones rechazadas sin cambios dejan de ofrecerse como candidatas. Una solicitud pendiente se puede cancelar.

La aprobación enlaza la declaración vigente a la cuenta y muestra título y estado en **Mis autorías reconocidas**. No concede lectura del manuscrito, edición ni reenvío. Esos permisos requieren la invitación de gestión compartida. La persona puede retirar expresamente su reconocimiento con un motivo, incluso si originalmente lo confirmó al añadirse a su propio trabajo o al aceptar una invitación. Se revoca la vinculación actual y cualquier colaboración de esa declaración; las versiones oficiales permanecen intactas. La propiedad original del envío no se transfiere.

Las coincidencias se consultan por evento y organización. No existe búsqueda general de trabajos privados por nombres, correo arbitrario o ORCID de terceros. Las declaraciones sin evidencia coincidente deben ser revisadas con el remitente y vinculadas expresamente desde la edición cuando esta esté permitida. No se crean personas ficticias ni se fusionan cuentas.

## Responsables y conflictos

El remitente original atiende provisionalmente las solicitudes. **Aceptar gestión compartida no transfiere por sí solo esta responsabilidad.** El autor de correspondencia con cuenta, autoría confirmada e invitación aceptada dispone de **Aceptar responsabilidad** en Autorías. La aceptación queda registrada en la colaboración, en el historial y en auditoría. El responsable o el remitente pueden devolverla al remitente. Cambiar la correspondencia, retirar el reconocimiento, revocar la colaboración o desactivar la cuenta de correspondencia hace volver a la responsabilidad provisional. Se comprueba la autoridad vigente al decidir, no solo la que existía al solicitar.

El responsable aprueba o rechaza. Nadie aprueba su propia solicitud. La bandeja **Trabajos recibidos → Revisión independiente de autorías** permite intervenir a un organizador vigente del evento que no sea remitente, coautor vinculado actual/oficial ni solicitante. La decisión administrativa exige explicar la evidencia o motivo. Si no existe un organizador independiente, se debe designar uno; no hay una excepción que permita autoaprobar. Los administradores de organización no obtienen esta facultad sin asignación de organizador.

Las solicitudes conservan la declaración exacta presentada, la clase de evidencia y, si existe, el ORCID autenticado de producción del solicitante. Cambiar la declaración vuelve obsoleta una solicitud pendiente: no se aprueba sobre datos distintos. Debe cancelarse y recrearse, o rechazarse. Una cuenta no puede ocupar dos declaraciones del mismo trabajo. Solicitudes contradictorias no fusionan identidades; aprobar una cambia la declaración y bloquea aprobar otra incompatible. Las asociaciones aprobadas que el remitente retira al editar se revocan explícitamente en el registro de solicitudes.

## Avisos internos

La sección de solicitudes muestra pendientes, decisiones, motivos y fechas. La navegación del autor muestra un contador de declaraciones por reconocer, revisiones a su cargo y decisiones sin leer. Las decisiones de terceros generan avisos para el solicitante. Al mostrar **Actividad**, se guardan automáticamente como leídos los avisos de las versiones mostradas; consultar una autoría aprobada en **Mis autorías** también marca su aprobación. Si solo hay respuestas nuevas y ninguna tarea pendiente, se abre Actividad directamente. La lectura se conserva al volver a Mis trabajos o recargar, y una decisión posterior vuelve a notificar. No se marcan avisos ocultos en otras secciones. **Marcar avisos como leídos** permite reintentar si falla la lectura automática. Leer un aviso no cambia su decisión ni otorga permisos. SMTP, plantillas, colas y entrega por email siguen pendientes de un módulo de comunicaciones.

## API

Rutas bajo `/api/v1/events/:eventId`:

| Método/ruta | Operación |
|---|---|
| GET `/authorship` | Candidatas, contribuciones, solicitudes propias/a cargo y responsabilidad vigente |
| POST `/authorship` | workId, authorId, action=request/decline/disown; message obligatorio para disown |
| POST `/authorship/read` | Recibe claims=[{id,revision}] (1–100) y marca solo esas decisiones propias y vigentes como leídas |
| POST `/authorship/claims/:claimId` | action=approve/reject/cancel/revoke, revision, message |
| POST `/authorship/works/:workId/responsibility` | action=accept_responsibility/release_responsibility y revision del trabajo |
| GET `/authorship-review` | Bandeja de organizadores, sin acceso adicional a borradores |
| POST `/authorship-review/claims/:claimId` | Resolución independiente: approve/reject/revoke, revision, motivo obligatorio |

Límites: 100 entradas por sección/evento, con solicitudes pendientes primero; 200 solicitudes históricas por trabajo para nuevas solicitudes. Retirar un reconocimiento no se bloquea por ese límite. La paginación de esta bandeja deberá ampliarse para eventos que superen estos volúmenes. La administración de autoría puede continuar tras cerrar la convocatoria: no reabre la edición científica ni reescribe envíos oficiales.

Aplicar migraciones **0037–0044**. `authorship_claims` tiene RLS/FORCE y no tiene permisos directos para sep_runtime. La función `sep_authorship` SECURITY DEFINER usa search_path fijo, SQL parametrizado y políticas exclusivas de sep_migrator, comprueba actor activo, organización/evento, autoridad y revisión; restablece su contexto al finalizar o fallar. Sus proyecciones no amplían las políticas de trabajos/PDF/versiones del runtime. El correo de evidencia viene exclusivamente de la autenticación real; los tokens demo no simulan correos verificados. Las decisiones bloquean el trabajo antes de la solicitud para serializar aprobaciones contradictorias.

## Verificación realizada

Compilación, análisis estático y comprobaciones dirigidas con sep_runtime, funciones y servicios reales dentro de transacciones revertidas. Se verificaron: correo correcto/incorrecto y ausencia de prueba en demo; cuenta seleccionada; ORCID de producción frente a Sandbox; ocultación del título antes de aprobación; reconocimiento sin acceso al trabajo; aprobación, rechazo propio de coincidencia, cancelación, revocación y retirada directa; avisos y lectura; revisiones obsoletas y aislamiento entre organizaciones; aceptación/devolución explícita de responsabilidad; autoaprobación bloqueada y resolución independiente. Se volvió a comprobar el flujo existente de gestión compartida y correcciones. Se verificó que tanto el snapshot enviado como la versión oficial permanecieran idénticos después de los reconocimientos y revocaciones. Se conservaron los trabajos y las conexiones ORCID existentes de la demo. Las comprobaciones HTTP verificaron las páginas ES/EN, el gateway, el rechazo anónimo, la separación entre organizador y administrador de organización, la ocultación de solicitudes inexistentes, la lectura de avisos y la continuidad del portal y de Mis trabajos.

No se ejecutó la batería funcional completa ni se validó manualmente toda la interacción de estas pantallas. La activación real de RedUniv/Google, ORCID de producción, correo y antivirus sigue pendiente.

Corrección de lectura: se comprobó en navegador el recorrido Mis trabajos → Autorías → Mis trabajos y la recarga posterior, con datos interceptados solo en navegador. El aviso leído no reaparece, una revisión posterior vuelve a notificar y abrir Pendientes no consume actividad oculta. En transacciones revertidas se verificó que una lectura obsoleta, de otra cuenta o de otro evento no consume la decisión vigente.
