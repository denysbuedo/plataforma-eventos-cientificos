# ADR-006: designación de organizadores

Estado: implementado; validación funcional pendiente a petición del propietario.

El administrador de organización puede consultar el equipo de un evento de su organización, designar organizadores y retirar asignaciones. La selección se limita a personas activas con una membresía activa en esa organización. Puede designarse a sí mismo; esto crea una asignación explícita por evento, sin convertir el rol de organización en permiso editorial global.

La API expone GET/POST `/api/v1/events/:eventId/organizers` y DELETE `/api/v1/events/:eventId/organizers/:personId`. Los cambios bloquean la fila del evento y registran auditoría en la misma transacción. La revocación no admite la asignación propia ni dejar cero organizadores activos. No se desactiva la membresía ni se eliminan otros roles al retirar el rol de organizador.

RLS permite al administrador ya autorizado consultar personas afiliadas y membresías de su organización. La autorización inicial continúa consultando únicamente las asignaciones de la persona autenticada. Los privilegios de escritura del runtime se limitan a insertar membresías/asignaciones y actualizar sus campos de vigencia. Los triggers requieren un administrador de organización activo y solo permiten delegar el rol organizador en el evento del contexto; no admiten cambiar personas, organización o evento de una membresía.

La sesión puede consultarse también mediante `/api/v1/events/:eventId/session`, necesario para trabajar sobre un evento desde el dominio de organización antes de registrar su dominio propio. La demo traduce los UUID de esos eventos al dominio organizativo fijo; la API sigue validando organización, evento y permisos. No se permite elegir un host arbitrario.

Invitaciones, alta de personas, transferencia de responsabilidades y otros roles quedan para incrementos posteriores. No se ejecutan nuevas suites en este incremento por indicación expresa del propietario.
