# Inscripciones y participantes

Primer paquete de Fase 3. Implementación disponible en español e inglés; validación funcional del usuario pendiente.

## Organizador

1. Entrar al evento y abrir **Inscripciones → Configuración → Editar configuración**.
2. Definir fechas opcionales, modalidades presencial/virtual, cupos independientes y aprobación del organizador. Un cupo vacío significa sin límite; cero envía las solicitudes de esa modalidad a espera.
3. Crear categorías con nombre en ambos idiomas e indicaciones opcionales. Debe existir al menos una categoría activa y una modalidad.
4. Guardar el borrador y **Publicar recepción**. La publicación es independiente del portal y la convocatoria. El evento debe estar publicado para recibir solicitudes. Si cambia su zona horaria, volver a publicar la recepción.
5. En **Participantes**, buscar, filtrar estados y abrir una solicitud con Ver. Aprobar, rechazar, cancelar o reabrir exige un motivo de al menos diez caracteres, visible para la persona y conservado en el historial.
6. Retirar recepción impide nuevas solicitudes y conserva los registros, el historial y las últimas condiciones publicadas. No borra participantes.

Pendientes y confirmadas reservan cupo; espera no. No se puede publicar un cupo inferior a las reservas ni deshabilitar una modalidad con reservas. Una promoción desde espera requiere cupo libre y decisión explícita; liberar una plaza no promueve automáticamente a nadie. La lista se ordena por fecha de solicitud e identificador. Búsqueda y filtros se aplican al pulsar Buscar; la paginación es de veinte filas.

## Participante

Desde Mi espacio, abrir **Mi inscripción**; también hay un enlace en el portal cuando existe una recepción publicada. No hace falta ser autor ni tener un trabajo aceptado.

Seleccionar categoría y modalidad, revisar las indicaciones y confirmar la solicitud. El servidor fija una copia de las condiciones publicadas, nombre, afiliaciones y correo solo si la sesión lo acredita. Los cambios de perfil posteriores no reescriben esa copia. La demo puede no tener correo acreditado y no lo inventa.

Con cupo, la solicitud queda pendiente o confirmada según la configuración; sin cupo, entra en espera. Se muestra el estado, historial y posición propia en espera dentro de su modalidad. Actualizar permite consultar cambios del organizador. No hay correo ni avisos automáticos en este paquete.

La persona puede cancelar una solicitud activa mientras el evento no esté completado, cancelado o archivado. Puede volver a solicitar después de cancelar; se conserva el mismo registro y todo su historial, y se actualiza el orden de llegada. Después de un rechazo necesita una reapertura motivada del organizador. Reabrir deja la solicitud pendiente si hay cupo o en espera si no lo hay; siempre requiere decisión posterior de aprobación.

Inscripción, aceptación científica, funciones en el programa y asistencia son procesos diferentes. Inscribirse no concede permisos ni acredita presencia. El autor puede enviar trabajos sin estar inscrito.

## API y datos

- Público: `GET public/registration` devuelve condiciones y contadores agregados, sin lista de personas.
- Propia: `GET/POST events/:eventId/registration/mine` y `POST .../mine/cancel`.
- Organizador: `GET/PUT .../settings`, `POST .../settings/publish`, `POST .../settings/withdraw`, `GET .../entries`, `GET .../entries/:id`, `POST .../entries/:id/decision`.
- Las mutaciones usan revisión optimista. La solicitud exige también el identificador de la publicación aceptada. Todas las escrituras bloquean el evento para serializar cupos; una pantalla antigua no sobrescribe cambios nuevos.
- Capacidad separada `registrations-manage`, limitada a organizadores del evento. No otorga acceso a manuscritos. RLS/FORCE en cuatro tablas, historial de inserción y auditoría de decisiones. Los contadores se obtienen mediante una función de lectura acotada al contexto.
- Migración `0058_messy_chameleon.sql`; contratos compartidos y OpenAPI generado.

## Comprobación realizada

Compilación, lint y comprobaciones puntuales con transacción revertida: reserva, espera, posición propia, aprobación, cancelación, promoción explícita, reapertura, condiciones antiguas, publicación con cupos incompatibles, retirada y aislamiento de registros/historial. Revisión adicional en navegador con respuestas aisladas: solicitud, historial, cancelación, edición/guardado/publicación del organizador, detalle, portal ES/EN y pantallas de 1440, 390 y 320 píxeles, sin modificar inscripciones reales. La batería completa permanece aplazada según lo acordado.

## Siguiente paquete

Control de asistencia y acreditación: credenciales, lectura/check-in, permisos de acreditador, registros por evento/sesión y correcciones auditadas. El [módulo de certificados](certificados.md) ya incorpora reglas iniciales y emisión; su prueba funcional está pendiente. Pagos, correos, exportaciones y requisitos particulares de categorías quedan fuera de este primer paquete.
