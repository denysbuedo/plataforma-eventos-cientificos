# Vinculación de accesos y permisos de cuentas reales

## Preparación de la base de datos

Antes de aplicar la migración 0081, un administrador de PostgreSQL debe ejecutar [scripts/account-link-role.sql](../../scripts/account-link-role.sql). El lanzador de pruebas lo hace en su clúster aislado. El script permite al migrador transferir la propiedad de estas funciones sin heredar los permisos del rol. El arranque de la API comprueba esta separación además de las 80 tablas con RLS forzada.

## Accesos a una misma cuenta

Mi perfil incluye **Accesos a tu cuenta**. Google y RedUniv se vinculan mediante una autenticación independiente del segundo acceso; las cuentas locales existentes requieren correo confirmado y su contraseña. La sesión principal permanece abierta durante la comprobación. Se muestra la identidad y el perfil anterior antes de pedir una confirmación expresa de que ambas cuentas pertenecen a la misma persona.

La coincidencia de nombre o correo nunca vincula cuentas automáticamente. Las operaciones se autorizan con ambas credenciales y un comprobante de diez minutos, de un solo uso y asociado a la persona principal. El comprobante queda cifrado en el servidor web y ligado a la sesión que inició el proceso. El navegador solo recibe una cookie opaca HttpOnly; no recibe tokens del proveedor ni contraseñas almacenadas. Cambiar de sesión impide confirmar un proceso anterior.

La cuenta desde la que se inicia el proceso conserva su identificador. Después de autenticar la segunda cuenta se abre una confirmación con ambos nombres y correos verificados, los perfiles disponibles, un resumen de la actividad que se incorporará y las coincidencias detectadas. La persona elige el perfil académico que conservará y confirma expresamente que ambas cuentas le pertenecen. Cancelar no mueve datos ni desactiva cuentas.

Se pueden reunir cuentas con actividad, incorporar una tercera repitiendo el proceso y añadir varios accesos de un mismo proveedor. Las contraseñas locales conservan cada correo y credencial; todas resuelven a la persona principal. Se invalidan las sesiones y enlaces anteriores de las cuentas locales incorporadas. La recuperación de contraseña continúa funcionando por cada correo.

### Conservación y conflictos

- Se trasladan los trabajos, archivos, autorías y colaboraciones, revisiones, inscripciones, asistencias, certificados, pagos, avisos y demás referencias operativas. Las organizaciones y eventos de cada registro permanecen iguales.
- Las membresías coincidentes se conservan con su procedencia y sus asignaciones originales. No se amplían fechas, no se reactivan permisos vencidos ni se combinan períodos discontinuos. La consulta de roles reúne las asignaciones vigentes y su retirada abarca las membresías consolidadas.
- Las inscripciones coincidentes conservan sus historiales, asistencias y credenciales. Mi inscripción prioriza un registro confirmado y permite consultar los adicionales. Cancelar la participación cancela todos los registros activos de esa persona en el evento. Los contadores de inscripción y asistencia cuentan personas distintas.
- Las evaluaciones coincidentes se conservan, pero una persona cuenta como un solo revisor para el mínimo del dictamen. Se detectan conflictos con autorías, colaboraciones y ORCID verificados, incluyendo versiones anteriores. Los informes afectados dejan de ser elegibles; se avisa al organizador. La decisión excepcional con justificación sigue disponible en el módulo de revisión.
- Se conservan todos los certificados, sus códigos, PDF, huellas y datos originales, aunque existan certificados coincidentes.
- Se conservan todos los cobros, estados, importes, monedas y justificantes. No se cancelan pagos ni se generan reembolsos automáticamente; los posibles duplicados deben revisarse desde cobros.
- Si hay ORCID distintos, se muestra la advertencia y se conserva el del perfil elegido cuando esté vinculado. Los identificadores anteriores quedan archivados. Las declaraciones y documentos históricos no se cambian.
- Si una persona aparece varias veces entre los autores de un trabajo, se conserva la declaración y se avisa al responsable del envío para revisarla.
- Las preferencias de correo respetan el rechazo de cualquiera de las dos cuentas. Los avisos y sus entregas se conservan.

Los perfiles anteriores, el perfil elegido, el resumen de actividad, las observaciones y el identificador de solicitud quedan en el historial inmutable de vinculación. Los actores originales de las operaciones históricas se conservan. Los cambios de referencias de titularidad se realizan en una sola transacción; no se reescriben los documentos ni las versiones publicadas. Una referencia histórica a una persona consolidada se resuelve siguiendo ese historial, también después de consolidaciones sucesivas.

### Migración y concurrencia

Aplicar las migraciones **0082 y 0083** antes de arrancar esta versión de la API. Añade la procedencia de registros coincidentes y la persona principal de las credenciales locales; no fusiona cuentas por sí sola. La decisión siempre la toma su titular después de autenticar ambos accesos.

La confirmación toma bloqueos exclusivos de ambas personas, en orden estable, y espera a las operaciones en curso. Antes de mover datos vuelve a comparar el plan con la información vigente. Si cambiaron trabajos, permisos, credenciales o conflictos desde la comprobación, rechaza el comprobante y solicita iniciar de nuevo; no aplica una confirmación desactualizada. Las credenciales locales también se bloquean durante esa comprobación.

Las restricciones de procedencia y las excepciones de los disparadores de inmutabilidad solo admiten cambios desde `sep_account_linker`. El runtime no puede introducir procedencias falsas ni utilizar las funciones internas de consolidación. Las claves foráneas de titularidad se comprueban al concluir la operación. Las relaciones nuevas con personas deben incorporarse expresamente al inventario de consolidación; una relación desconocida impide trasladar silenciosamente una cuenta con referencias pendientes.

La confirmación se muestra en un diálogo accesible al volver del proveedor. Un comprobante caducado o invalidado por cambios libera los controles y permite repetir el proceso.

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

`npm run test:account-links` comprueba comprobantes, propiedad de ambas cuentas, ausencia de vinculación por correo, conservación de datos y roles, conflictos, caducidad, tres cuentas con actividad y registros coincidentes, conservación de documentos y pagos, recuperación local y aislamiento de tablas.

Después de compilar el administrador y `@sep/web-server`, `npm run test:account-links:web` ejecuta un navegador y un proveedor OIDC local de prueba con firmas reales, PKCE y nonce. Comprueba el retorno sin reemplazar la sesión principal, confirmación, acceso posterior por ambos métodos, vinculación local, consolidación de cuentas con actividad, cancelación, caducidad y actualización del plan, cambio de sesión, origen externo, incorporación de una cuenta registrada y asignación de administración. No utiliza credenciales institucionales ni de Google reales. `SEP_ADMIN_NEXT_DIST_DIR` permite elegir una compilación aislada.

Se ampliaron también las pruebas de identidad y cuentas locales para incorporar personas, asignar organización de un evento y rechazar invitaciones dirigidas a un correo diferente.
