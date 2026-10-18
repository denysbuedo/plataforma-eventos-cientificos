# Logística, reservas y sesiones híbridas

Estado: implementado; comprobaciones dirigidas de API y navegador. Validación funcional integral pendiente.

## Organización

En **Gestionar evento → Logística y sesiones**:

- **Recursos**: catálogo propio de equipos, materiales y servicios, existencias, unidad, reutilización y archivo. No se escriben nombres libres al asignar un recurso.
- **Necesidades y entregas**: cantidad, sesión o evento completo, responsable del evento, instrucciones y constancia de entrega. Flujo Solicitado → Confirmado → Preparado → Entregado; cancelación y reapertura según estado. Se exige motivo y evidencia para la entrega.
- **Cupos de sesiones**: sobre el programa publicado, reserva obligatoria, apertura de nuevas reservas, cupos por modalidad y lista de espera. El presencial no supera la capacidad de la sala. Cerrar nuevas reservas conserva las confirmadas y el requisito de acceso.
- **Salas virtuales**: plataforma, enlace HTTPS privado, grabación y autorización de difusión. No se agregan enlaces privados al programa público.
- **Reservas** e **Historial**: consulta nominal y últimos cien movimientos.

Los recursos reutilizables no pueden superar sus existencias durante intervalos solapados; los consumibles descuentan cantidades comprometidas y entregadas. Los intervalos son semiabiertos: una asignación puede comenzar cuando otra termina. Las necesidades desactualizadas por cambios del programa reservan conservadoramente disponibilidad hasta su revisión. Las entregas conservan su contexto histórico.

## Participantes

**Mi espacio → Mis sesiones** requiere inscripción confirmada y modalidad compatible. Se impiden reservas confirmadas en horarios solapados. Al agotarse un cupo se entra en espera si está permitida. Una cancelación promueve en orden de solicitud a la primera persona compatible; las promociones y cambios generan avisos internos.

Las operaciones se serializan mediante bloqueo del evento; las revisiones impiden sobrescribir cambios concurrentes. Cambios de fecha, horario, sala, modalidad, zona horaria o revisión de inscripción invalidan reservas afectadas. No se trasladan silenciosamente. Al consultar el módulo o realizar una operación se reconcilian reservas; no existe un proceso periódico independiente. Si cambia la programación, el organizador revisa de nuevo cupos y accesos.

Los enlaces se solicitan en servidor y solo se entregan al participante autorizado entre quince minutos antes del inicio y quince minutos después del cierre. Las grabaciones autorizadas se habilitan después del fin. Abrir una sala no registra asistencia. Acreditación vuelve a comprobar la reserva vigente cuando la sesión la exige.

## Límites y ampliaciones

Catálogo: cien recursos, quinientas asignaciones, cinco mil reservas y cien movimientos recientes. Para ampliar estos límites se necesitará paginación y validación de carga. No incluye duración/salida, sincronización sin conexión, conexión con plataformas de videoconferencia ni comprobación automática de presencia virtual. Un enlace de ejemplo no representa una sala contratada.

API: `/events/:eventId/operations`, rutas de recursos, asignaciones, políticas y canales; `/mine` y acciones `book`, `cancel`, `join`, `recording`. Ver [OpenAPI](../api/openapi.json).
