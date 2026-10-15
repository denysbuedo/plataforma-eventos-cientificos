# ADR-007: personas e invitaciones de organización

Estado: implementado para desarrollo; validación funcional pendiente por indicación del propietario.

El administrador dispone de un directorio de personas activas vinculadas a su organización y un registro de invitaciones. Crear una invitación exige el dominio de organización, nombre y correo de contacto. El enlace caduca a los siete días, se presenta una sola vez y se comparte manualmente. No se envían correos en este incremento.

El token aleatorio tiene 256 bits; PostgreSQL conserva únicamente su hash SHA-256. Una invitación pendiente por organización/correo evita duplicados; las caducadas se cierran antes de permitir otra. Los estados son pendiente, aceptada y cancelada; la caducidad se deriva del plazo. Crear, cancelar y aceptar registran auditoría en la misma transacción. El directorio muestra como máximo 200 personas y las últimas 200 invitaciones; paginación y búsqueda quedan pendientes.

La aceptación exige una persona autenticada y activa, el dominio organizativo correcto y posesión del enlace. No se concede ningún rol automáticamente: se crea o reactiva únicamente la membresía de organización. El administrador puede designar después a esa persona como organizadora de un evento. La fila de invitación se bloquea durante la aceptación; no puede utilizarla otra persona después de aceptada. Repetir la aceptación con la misma cuenta devuelve el resultado ya realizado, sin nuevas membresías ni auditorías.

El correo de la invitación es una dirección de contacto, no una identidad verificada ni una clave para fusionar cuentas. En esta etapa el enlace es transferible: quien posea el enlace y una cuenta puede aceptarlo. Debe entregarse solo a su destinatario. La restricción a correo verificado por OIDC y la entrega autenticada por correo se incorporarán con identidad real. El adaptador de desarrollo continúa bloqueado en producción.

La demo permite cambiar explícitamente al perfil ficticio Invitado en la pantalla de aceptación. Ese perfil ya existe en los fixtures; este incremento no crea identidades nuevas ni sustituye el registro/inicio de sesión institucional. La vista de cuenta vinculada sin roles informa que falta una asignación de evento.

La tabla de invitaciones usa RLS forzada. Un administrador autorizado puede leer las de su organización; la aceptación habilita temporalmente solo la fila que coincide con el hash del enlace. Los triggers restringen las transiciones y la creación de la membresía propia mediante una invitación vigente. La auditoría de aceptación admite únicamente la invitación aceptada por la persona del contexto. Los tokens no se incluyen en listados ni auditoría.

Operaciones: GET `/api/v1/people`, POST `/api/v1/invitations`, POST `/api/v1/invitations/:invitationId/revoke` y POST `/api/v1/invitations/accept`. El contrato generado está en OpenAPI. Desactivar personas o membresías, reasignar responsabilidades, invitaciones por evento y otros roles se abordarán después.
