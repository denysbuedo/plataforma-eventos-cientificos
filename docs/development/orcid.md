# Conectar ORCID

Estado: código implementado y conexión Sandbox comprobada por el propietario en la demo local; cliente y validación de producción pendientes. RedUniv y Google siguen siendo los accesos de la plataforma. ORCID se conecta desde una cuenta ya autenticada; no crea otra cuenta ni fusiona personas automáticamente.

## En la demo

Abrir **Mi perfil** desde el espacio de autor o la administración. Sin configuración externa se muestra **pendiente de activación** y no se simula un ORCID verificado.

En **Datos del evento → Configuración del evento** el organizador puede activar **Exigir ORCID verificado a la persona que envía el trabajo**. Está desactivado por defecto para conservar el funcionamiento actual. Se comprueba en el envío inicial: la cuenta debe tener un ORCID de producción conectado y figurar expresamente entre los autores. No exige que asistentes o todos los coautores tengan ORCID. Las correcciones y versiones finales de envíos existentes no reciben una exigencia nueva retroactiva.

Al usar los datos propios en autoría se guarda la referencia a la persona autenticada y el identificador de su perfil. En un autor declarado previamente, **Usar mis datos en este autor** hace esa selección explícita. Los ORCID introducidos para coautores no vinculados se validan mediante formato y dígito de control y permanecen **No autenticados**. El servidor recalcula la verificación: escribir un número o enviar un indicador verified desde el navegador no acredita identidad.

El envío conserva esa información en una versión inmutable. Conectar ORCID después no reescribe versiones previas. La búsqueda de personas y las reclamaciones de autoría con aprobación continúan pendientes.

## Activación

1. Registrar un cliente en ORCID Sandbox y validar el flujo antes de producción. La [guía oficial](https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/) explica el registro, alcance `/authenticate` y canje del código.
2. Registrar exactamente `https://<dominio-administrativo>/api/auth/orcid/callback`. Producción exige HTTPS. Para Sandbox local se admite loopback HTTP únicamente si `OIDC_ALLOW_LOOPBACK_HTTP=1`; debe coincidir con `SEP_ADMIN_ORIGIN`.
3. Configurar **en la API** `SEP_ORCID_ENABLED=1`, `ORCID_ENVIRONMENT=sandbox` o `production`, `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET`, `ORCID_REDIRECT_URI` y `SEP_ADMIN_ORIGIN`. Las credenciales pertenecen a SEP y al entorno correspondiente; no se usan las de otros proyectos.
4. Aplicar migraciones 0029–0031 y reiniciar API y web administrativa con su configuración normal. La web solo necesita su sesión existente y el origen administrativo; no recibe el secreto ORCID.
5. Entrar con una cuenta, abrir **Mi perfil → Conectar mi ORCID**, autorizar y comprobar el regreso al perfil. Un ORCID de Sandbox se indica como de pruebas y no satisface el requisito de producción. Registrar otro cliente para producción y repetir la validación allí.

El icono se obtuvo sin modificación de [ORCID](https://info.orcid.org/wp-content/uploads/2019/11/orcid_16x16.png). Los identificadores y su estado deben seguir las [pautas de presentación](https://info.orcid.org/documentation/integration-guide/orcid-id-display-guidelines/).

## Seguridad y limitaciones

La autorización usa estado aleatorio de 256 bits, almacenado como hash en PostgreSQL y vinculado a la persona. Una cookie HttpOnly del navegador debe coincidir al regresar. Caduca a los diez minutos; iniciar otra autorización reemplaza la pendiente. Se consume antes del canje, también si el proveedor rechaza el código. El callback exige sesión activa, comprueba el alcance y el identificador, y no registra códigos, tokens ni respuestas del proveedor. El token ORCID no se conserva ni se solicitan permisos para escribir en el registro.

La conexión queda bajo RLS/FORCE de su propietario. Un identificador es único por entorno; un conflicto requiere revisión de cuentas, no fusión automática. No se ofrece desvinculación o sustitución automática en este incremento. Las conexiones confirmadas se auditan sin abrir acceso a otras cuentas.

Se comprobaron checksum, configuración deshabilitada, caducidad, aislamiento entre cuentas, repetición de callback, rechazo de alcance incorrecto y conflicto de identificador con proveedor simulado y transacciones revertidas. También se verificó que el envío requerido rechaza ausencia de conexión, un indicador de verificación falsificado y un identificador Sandbox, y acepta una conexión de producción comprobada en esa simulación. Los datos originales de la demo se conservaron. Esto no sustituye validación contra ORCID real, pruebas de navegador ni la batería funcional completa aplazada.

Compilación y análisis estático pasaron. Las comprobaciones HTTP verificaron perfil en español e inglés, ausencia de identidades simuladas, rechazo del inicio sin Origin permitido, error explícito sin cliente configurado y rechazo del callback sin cookie coincidente. Las pantallas y APIs existentes de trabajos y el portal público continuaron respondiendo correctamente.
