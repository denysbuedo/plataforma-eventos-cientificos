# Gestión compartida de trabajos

Implementado: el remitente original puede invitar al autor de correspondencia a consultar, corregir contenido, gestionar PDF y reenviar. La colaboración se activa solo después de aceptar. No transfiere propiedad ni permite gestionar autoría, invitaciones, retiro o eliminación del borrador.

## Recorrido

1. En **Editar**, el remitente guarda a otro coautor como autor de correspondencia con correo. Si la correspondencia es del propio remitente, ya tiene acceso y no necesita invitarse.
2. En **Ver → Gestión compartida**, pulsa **Invitar al autor de correspondencia** y confirma. Copia el enlace que aparece y compártelo con el destinatario. No se envía email automáticamente. El token solo se devuelve al crear la invitación; no puede recuperarse después.
3. El destinatario abre el enlace y entra con RedUniv o Google. En acceso real, el correo verificado debe coincidir exactamente con el destinatario. Debe confirmar expresamente que acepta la función y la gestión compartida.
4. El trabajo aparece en **Mis trabajos**, identificado como **Compartido contigo**. Puede consultar versiones y archivos; editar y reenviar solo cuando el estado y el plazo lo permitan. Un trabajo enviado permanece bloqueado hasta que el organizador pida correcciones o versión final.
5. El remitente puede revocar desde **Gestión compartida**. También se revoca si cambia el autor de correspondencia, su correo, su vinculación de persona o se elimina el borrador. La revocación corta el acceso a detalle, PDF y versiones en las siguientes solicitudes, incluso si el colaborador había subido esos archivos.

El responsable original conserva el control de la lista de autores. El colaborador puede corregir título, resumen, palabras clave y clasificación cuando las reglas lo permitan, además del PDF y reenvío. Cada envío conserva una versión; no sobrescribe las anteriores. Se registra la cuenta que realmente acepta, cambia archivos o reenvía. La aceptación vincula expresamente la declaración de correspondencia con esa cuenta, sin alterar versiones previas.

## Demo

Abrir el enlace en la misma demo. La pantalla permite elegir **colaborador de prueba** (perfil mixed) o **autor remitente** (outsider). Si el remitente es outsider, usar mixed para aceptar; si el remitente es mixed, usar outsider. No se puede aceptar desde la misma cuenta que creó la invitación. En demo development-token se omite la verificación de correo, indicado en pantalla; ese comportamiento no está permitido con autenticación real.

Las credenciales de ORCID Sandbox existentes se conservan y no son necesarias para aceptar una invitación de gestión. Una conexión ORCID no concede gestión automáticamente.

## Reglas y API

Las invitaciones caducan a los siete días; la aceptación antes del vencimiento crea acceso hasta revocación. El vínculo caducado o revocado no reactiva acceso. Volver a aceptar con la misma cuenta una invitación ya aceptada no duplica permisos. Hay un máximo de 100 invitaciones históricas por trabajo y una pendiente/aceptada por declaración de correspondencia. Revocar y crear otra permite renovar el enlace.

Rutas bajo `/api/v1/events/:eventId`:

| Método y ruta | Permiso |
|---|---|
| GET `/my-works/:workId/collaborations` | Remitente original |
| POST `/my-works/:workId/collaborations` | Remitente; authorId y revision |
| POST `/my-works/:workId/collaborations/:id/revoke` | Remitente; revision |
| POST `/work-collaborations/accept` | Persona activa; token y correo verificado del destinatario en acceso real |

La tabla de permisos tiene RLS/FORCE propio, ámbito organización/evento y FK que acredita al propietario del trabajo. Las políticas de trabajos consultan los permisos aceptados sin depender de roles institucionales. Las políticas de archivos/versiones/historial respetan ese acceso. El colaborador puede leer todas las versiones del trabajo mientras conserve permiso. No puede dictaminar sobre él aunque sea organizador.

Aplicar migraciones 0032–0033 antes de arrancar la nueva API. El contexto de invitación se reinicia en cada transacción. Historial y auditoría registran actor; versiones e historial siguen sin permisos runtime de UPDATE/DELETE.

## Verificación y pendientes

Pasó la comprobación dirigida con rol runtime y autorización real, dentro de una transacción revertida: privacidad previa a aceptación, correo incorrecto, autoaceptación, aceptación, lectura compartida de versiones/PDF, corrección, carga, reenvío, versiones inmutables, restricciones de autoría/retiro/invitaciones, autoevaluación, caducidad, revocación y cambio de correspondencia. Se comprobó que revocar corta acceso incluso al PDF subido por el propio colaborador. Se conservaron datos y ORCID existentes de la demo. La compilación y el análisis estático complementan estas comprobaciones; la batería completa y las interacciones por navegador siguen pendientes.

La búsqueda voluntaria de personas registradas se añadió después y se describe en [su guía](busqueda-autores.md). Las reclamaciones de autoría, su aprobación y el correo siguen pendientes. Cuando se implemente reconocimiento, el remitente lo gestionará provisionalmente hasta que el autor de correspondencia tenga cuenta y acepte esa responsabilidad. Es una autoridad distinta de editar: no se debe conceder automáticamente por nombre, correo escrito u ORCID declarado.

Las comprobaciones HTTP verificaron el listado privado de invitaciones, la página de aceptación en ambos idiomas, el rechazo de un token inexistente a través del gateway y los indicadores de gestión del propietario. Las pantallas anteriores y el portal siguieron respondiendo, y se comprobó que la conexión ORCID Sandbox existente seguía presente.
