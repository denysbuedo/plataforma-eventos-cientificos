# Vinculación de accesos y permisos de cuentas reales

## Preparación de la base de datos

Antes de aplicar la migración 0081, un administrador de PostgreSQL debe ejecutar [scripts/account-link-role.sql](../../scripts/account-link-role.sql). El lanzador de pruebas lo hace en su clúster aislado. El script permite al migrador transferir la propiedad de estas funciones sin heredar los permisos del rol. El arranque de la API comprueba esta separación además de las 80 tablas con RLS forzada.

## Accesos a una misma cuenta

Mi perfil incluye **Accesos a tu cuenta**. Google y RedUniv se vinculan mediante una autenticación independiente del segundo acceso; las cuentas locales existentes requieren correo confirmado y su contraseña. La sesión principal permanece abierta durante la comprobación. Se muestra la identidad y el perfil anterior antes de pedir una confirmación expresa de que ambas cuentas pertenecen a la misma persona.

La coincidencia de nombre o correo nunca vincula cuentas automáticamente. Las operaciones se autorizan con ambas credenciales y un comprobante de diez minutos, de un solo uso y asociado a la persona principal. El comprobante queda cifrado en el servidor web y ligado a la sesión que inició el proceso. El navegador solo recibe una cookie opaca HttpOnly; no recibe tokens del proveedor ni contraseñas almacenadas. Cambiar de sesión impide confirmar un proceso anterior.

La cuenta desde la que se inicia el proceso conserva su perfil, trabajos, inscripciones y permisos. Los accesos de una segunda cuenta sin actividad se trasladan a ella; su perfil anterior queda archivado en el historial de vinculación, consultable por el titular. La persona duplicada se desactiva, sin borrar sus datos. Al trasladar una cuenta local se invalidan sus sesiones y enlaces anteriores, y su siguiente acceso utiliza la cuenta principal.

### Límites deliberados de consolidación

Una segunda cuenta con membresías, roles, trabajos, autorías declaradas, revisiones, certificados, ORCID u otra actividad no se consolida automáticamente. Se comprueba al preparar y nuevamente al confirmar, incluyendo relaciones con personas de futuras tablas. Cuando la segunda cuenta tiene actividad y la actual no, se debe iniciar sesión en la cuenta con actividad y vincular desde allí el acceso sin actividad. Si ambas tienen actividad, hace falta una consolidación específica que resuelva conflictos: este bloque la bloquea y explica la causa, conservando ambos historiales. Tampoco se fusionan dos cuentas con contraseña local. No se expone retirada de métodos de acceso en este bloque.

El historial de vinculaciones es inmutable y solo lo consulta su titular. Las funciones privilegiadas pertenecen a `sep_account_linker`, un rol sin login ni bypass de RLS, que no heredan ni runtime ni las demás funciones del migrador. Sus permisos son acotados, tienen RLS forzada y restablecen sus indicadores al salir. Las operaciones ordinarias comprueban que la persona siga activa y se coordinan con la vinculación para no guardar nuevos datos en una identidad consolidada.

## Incorporar personas y asignar roles

En **Usuarios y roles**, el administrador puede buscar el correo exacto confirmado de una cuenta activa. La búsqueda muestra únicamente nombre, métodos de acceso y pertenencia a su organización. No muestra sus datos académicos, actividades o permisos de otras organizaciones.

Seleccionar **Incorporar** exige un motivo y confirmación. Se crea o reactiva la membresía de la organización, sin otorgar administración, roles en eventos ni una inscripción. La operación es idempotente y queda en el historial, diferenciada de las asignaciones de administración.

Después se puede asignar administración desde la misma pantalla, o seleccionar un evento para gestionar sus organizadores. Los organizadores gestionan el comité revisor y el equipo de acreditación en los módulos correspondientes. Los roles del proveedor de identidad siguen siendo permisos generales de autenticación; no sustituyen las asignaciones de SEP. La retirada de administración propia y del último administrador siguen protegidas.

Las invitaciones comprueban el correo verificado del acceso actual también para cuentas locales. Debe coincidir con el destinatario; disponer únicamente del enlace no basta.

## Correo: activación pendiente

El servicio SMTP se configura mañana. Se preparó `.local/smtp.env`, ignorado por Git y deshabilitado. No copiar contraseñas al repositorio ni al chat. El lanzador local de la API solo lo carga cuando `SEP_MAIL_ENABLED=1`; entonces desactiva la bandeja privada de pruebas. Los parámetros SMTP no se transmiten a los procesos web.

Se necesitan host, puerto, modalidad TLS, remitente y, cuando corresponda, usuario y contraseña. Con el servicio configurado deben comprobarse primero un registro local, su confirmación y la recuperación de contraseña con cuentas controladas. Las invitaciones de organización conservan por ahora su entrega mediante enlace; integrar su envío por correo forma parte del bloque de correo pendiente. Las notificaciones de eventos mantienen su cola y proceso de entrega existentes.

## Verificación

`npm run test:account-links` comprueba comprobantes, propiedad de ambas cuentas, ausencia de vinculación por correo, conservación de datos y roles, conflictos, caducidad, sesiones locales y aislamiento de tablas.

Después de compilar el administrador y `@sep/web-server`, `npm run test:account-links:web` ejecuta un navegador y un proveedor OIDC local de prueba con firmas reales, PKCE y nonce. Comprueba el retorno sin reemplazar la sesión principal, confirmación, acceso posterior por ambos métodos, vinculación local, bloqueo de cuentas con actividad, cambio de sesión, origen externo, incorporación de una cuenta registrada y asignación de administración. No utiliza credenciales institucionales ni de Google reales. `SEP_ADMIN_NEXT_DIST_DIR` permite elegir una compilación aislada.

Se ampliaron también las pruebas de identidad y cuentas locales para incorporar personas, asignar organización de un evento y rechazar invitaciones dirigidas a un correo diferente.
