# ADR-031: logística, reservas y publicación de pósteres

Estado: aceptada. Fecha: 2026-10-18.

## Contexto

El catálogo de salas no gestiona equipos, materiales, reservas personales ni acceso virtual. La aceptación científica tampoco es una autorización de difusión pública del PDF.

## Decisión

Añadir operaciones por evento con recursos y asignaciones revisionadas, comprobación de existencias/solapamientos y evidencia de entrega. Las reservas se basan en el programa publicado, inscripción confirmada, modalidad y huella de horario/salas/zona horaria. Los cambios invalidan reservas; los cupos no se heredan silenciosamente. Se diferencia requisito de reserva de apertura a nuevas solicitudes. El bloqueo del evento serializa la última plaza y las promociones. La espera avanza por orden entre candidatos elegibles y sin conflicto.

Los canales de acceso permanecen privados y separados del programa. Acceder no acredita asistencia. Acreditación comprueba de nuevo la reserva cuando se requiere. Las operaciones sensibles son transaccionales, auditadas y protegidas por RLS forzada; los indicadores reciben permisos de lectura propios, no de escritura.

La galería utiliza la versión oficial final aceptada con permiso explícito del responsable del envío y aprobación organizativa. Cada publicación conserva una copia PDF y metadatos públicos inmutables. La revocación retira inmediatamente las publicaciones activas, conserva una ficha de retirada y bloquea el archivo. La galería tiene permiso independiente de las memorias.

## Consecuencias

No se dispone de presencia virtual automática ni sincronización sin conexión. La reconciliación se ejecuta al consultar/operar el módulo; una tarea periódica sería una ampliación. Los límites iniciales y futuras necesidades de paginación figuran en las guías. La aceptación funcional integral continúa pendiente.
