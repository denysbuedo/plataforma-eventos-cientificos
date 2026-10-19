# Identidad institucional: Keycloak de RedUniv

Estado: acceso local validado por el propietario el 18 de octubre de 2026 con `sep-admin-dev`, autenticación institucional, segundo factor y retorno a SEP. Siguen pendientes las comprobaciones específicas de renovación, revocación y cierre central. Véase el [estado de activación local](reduniv-y-google.md#activación-local-de-reduniv--18-de-octubre-de-2026).

Para usuarios internacionales, la [guía RedUniv y Google](reduniv-y-google.md) describe el acceso Google directo con callback y credenciales de SEP. Se mantienen dos opciones independientes; Google no se configura como broker en Keycloak ni requiere cuentas LDAP. Los detalles de esta guía corresponden al flujo RedUniv.

Configuración ajustada a la guía institucional [Entrar con RedUniv](../reference/entrar-con-reduniv.md), facilitada desde el proyecto `identidad-2FA`. Realm confirmado: `reduniv-institucional`. Su [documento de descubrimiento](https://identidad.reduniv.edu.cu/realms/reduniv-institucional/.well-known/openid-configuration) respondió HTTP 200 y coincide con los endpoints de la guía; anuncia PKCE S256. Esto comprueba los metadatos públicos, no un login de usuario. No se ha instalado otro Keycloak ni modificado el servidor institucional.

## Datos necesarios

1. Issuer: `https://identidad.reduniv.edu.cu/realms/reduniv-institucional`.
2. Client ID y secreto de un cliente confidencial, con Authorization Code y PKCE S256. Configurar el secreto directamente en el entorno privado del servidor.
3. URL administrativa definitiva. La única redirección del cliente debe ser `<SEP_ADMIN_ORIGIN>/api/auth/callback`.
4. Audience de la API, distinta del Client ID web. El cliente debe emitir access tokens JWT con esa audience y los claims `sub`, `exp`, `iat`, `name` o `preferred_username`, `email` y `email_verified`.
5. Roles generales del cliente: se exige uno de `OIDC_ALLOWED_CLIENT_ROLES`, dentro de `resource_access[OIDC_ROLE_CLIENT_ID].roles`. La propuesta permite ROLE_USER o ROLE_ADMIN. Ninguno concede automáticamente administración de organizaciones o eventos.

Cliente local comunicado por Identidad: `sep-admin-dev`, con audience `sep-api`; el proveedor acepta la solicitud de autorización con su retorno local. `sep-admin-test` y `sep-admin-prod` siguen siendo propuestas. Cada ambiente tendrá secreto, URLs y sesiones independientes.

## Preparar el cliente para revisión

```powershell
$env:SEP_ADMIN_ORIGIN = 'https://eventos.example.org'
$env:SEP_DEPLOYMENT_ENV = 'prod'
$env:OIDC_CLIENT_ID = 'sep-admin-prod'
$env:OIDC_AUDIENCE = 'sep-api'
node scripts/keycloak-client.mjs
```

El generador escribe `.local/keycloak-client.json` y `.local/keycloak-client-roles.json`, sin secretos. Un administrador del realm puede revisar el cliente e importarlo o reproducir sus opciones manualmente, crear los roles indicados y asignar al menos uno a las personas/grupos autorizados. No ejecutar una importación sobre un cliente existente sin revisar su configuración actual. La propuesta habilita el flujo estándar, exige S256, deshabilita implicit/password grants y cuentas de servicio, configura scopes profile/email/roles y añade la audience de API solo al access token. Registra el Web Origin exacto y los retornos de logout `<origin>/es` y `<origin>/en`, sin comodines. No incorpora roles de organización o evento.

## Configuración local del sistema

Copiar [.env.oidc.example](../../.env.oidc.example) a un archivo local ignorado por Git. Realm y JWKS ya están definidos según la guía. Completar cliente, secreto, roles generales, URLs, base de datos y directorio de sesiones. La URL JWKS debe coincidir con `jwks_uri` del documento de descubrimiento. No desactivar la verificación TLS.

API: `AUTH_MODE=oidc`, `OIDC_ISSUER`, `OIDC_JWKS_URL`, `OIDC_AUDIENCE`, `OIDC_AUTHORIZED_PARTY`, `OIDC_ROLE_CLIENT_ID` y `OIDC_ALLOWED_CLIENT_ROLES`. La parte autorizada y el cliente de roles deben corresponder al ambiente. El mapa de tokens demo debe estar vacío. `NODE_ENV=production` solo admite el modo OIDC, nunca el adaptador de demostración.

Web: `SEP_AUTH_MODE=oidc`, `SEP_DEMO_MODE=0`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `SEP_ADMIN_ORIGIN`, `SEP_API_URL`, `SEP_SESSION_ENCRYPTION_KEY` y `SEP_SESSION_DIRECTORY`. `OIDC_ID_TOKEN_ALGORITHM` admite RS256 o ES256 y debe coincidir con el cliente. La clave de cifrado es de 32 bytes en hexadecimal, generada y guardada localmente; no es el secreto del cliente.

El directorio de sesiones debe ser absoluto, privado para la cuenta del servicio y fuera de cualquier raíz pública. En Windows utilizar una ruta como `D:/SEP-private/sessions`; en Linux, `/var/lib/sep/sessions`. Los archivos están cifrados con AES-256-GCM. Varias instancias web requieren el mismo directorio privado y clave, o sustituir este almacén por uno compartido. No copiar sesiones a backups públicos.

El administrador web debe servirse bajo el dominio registrado de la organización. Los eventos se pueden abrir por UUID desde ese dominio. Para desarrollo exclusivamente en loopback, `SEP_LOCAL_CONTEXT_HOST` permite fijar un host organizativo registrado, como el fixture `org-a.sep.test`; el navegador no puede seleccionar un host arbitrario. `OIDC_ALLOW_LOOPBACK_HTTP=1` permite HTTP únicamente en endpoints y origen de loopback, conservando HTTPS para el proveedor institucional.

Después de configurar y preparar una base persistente:

```powershell
npm run build
node --env-file=.env.oidc apps/api/dist/database/migrate.js
node --env-file=.env.oidc apps/api/dist/main.js
node --env-file=.env.oidc node_modules/next/dist/bin/next start apps/admin-web --hostname 127.0.0.1 --port 3002
```

El comando de migración usa exclusivamente `MIGRATION_DATABASE_URL`. El runtime conserva su propio rol restringido. El proxy HTTPS debe conservar el dominio registrado hacia el servidor web; la API recibe ese contexto desde el gateway. Esta guía no configura DNS, TLS ni despliegue de producción.

## Primer administrador

La primera entrada autorizada por un rol general del cliente crea únicamente Person/Identity, mediante `(issuer, sub)`; no concede organizaciones ni roles funcionales. Contraseña LDAP, TOTP y códigos de recuperación se introducen únicamente en Identidad RedUniv. SEP no consulta LDAP ni recibe esos secretos. La pantalla informa si falta una invitación o asignación.

Para iniciar la administración de una organización ya aprovisionada, un operador autorizado puede conceder el primer rol desde el servidor:

```powershell
node --env-file=.env.oidc scripts/grant-organization-admin.mjs <person-uuid> <organization-uuid>
```

Configurar `SEP_BOOTSTRAP_DATABASE_URL` solo para esa operación con un rol de aprovisionamiento explícito, nunca con el runtime ni en el proceso web. El script requiere una persona activa con identidad del issuer configurado, una organización activa y privilegios de aprovisionamiento; registra la operación en auditoría. La persona puede consultar su UUID mediante `/api/backend/me` después del login. No se ejecuta este paso automáticamente ni se promocionan cuentas por correo, nombre o roles recibidos de Keycloak.

## Invitaciones y sesiones

En OIDC, aceptar una invitación requiere que el access token incluya `email_verified=true` y el correo coincida con el destinatario. El retorno al enlace se conserva durante el login. No se fusionan personas por coincidencia de correo. El modo demo conserva su aceptación ficticia para desarrollo.

La cookie OIDC es opaca, HttpOnly y SameSite=Lax; usa Secure con HTTPS. Access token, refresh token, ID token y estado de login permanecen cifrados en el servidor. Se comprueban PKCE, state, nonce y firma del ID token; cada login crea un identificador de sesión nuevo. La API verifica firma, issuer, audience, exp, iat, la parte autorizada y un rol general del cliente. Los permisos detallados de SEP se comprueban por organización/evento en PostgreSQL.

La sesión tiene un límite absoluto de ocho horas. Se renueva el access token cuando restan treinta segundos o menos, utilizando el refresh token y guardando su rotación. Los bloqueos de archivo serializan renovaciones concurrentes. Si falla la renovación o cambia el subject, se invalida la sesión y se retiran los tokens; un marcador de revocación impide que una renovación simultánea restaure una sesión cerrada. Sin refresh token, la sesión queda limitada por la vigencia del access token.

Cerrar sesión elimina primero los tokens locales y redirige al endpoint central descubierto, con `id_token_hint` cuando existe y una URL post-logout registrada. Si no puede construirse el retorno central, la pantalla informa que solo se completó el cierre local. Los access tokens JWT ya emitidos pueden seguir siendo válidos hasta expirar; la revocación central se detecta al renovar. Los permisos funcionales locales se vuelven a consultar en cada operación.

Rotar la clave invalida el almacén. Los archivos caducados se eliminan cuando se consultan; el mantenimiento debe retirar archivos antiguos, marcadores y bloqueos abandonados una vez superado el máximo de sesión. Los bloqueos abandonados hacen fallar la renovación y exigen un nuevo login; no se recuperan mediante acceso sin autorización.

El botón muestra «Entrar con RedUniv» e identifica SEP. No se encontró un archivo de logo oficial en el proyecto de referencia; su incorporación queda pendiente de ese recurso. No se ha inventado una marca ni se incluyen formularios de contraseña/OTP institucionales.

Quedan pendientes el alta/configuración efectiva de los clientes por ambiente, secretos y orígenes definitivos, logo oficial y validación de extremo a extremo según los doce casos de la guía institucional. También quedan la operación de MFA en el proveedor, el mantenimiento del almacén y la observabilidad de autenticación. No se han ejecutado las pruebas funcionales en este incremento por indicación del propietario.

Los procesos de aplicación no registran respuestas de tokens ni parámetros de callback. En el proxy, los logs deben excluir query strings, Authorization, Cookie y Set-Cookie; el callback contiene un código de autorización. Usar el path normalizado sin argumentos y el identificador de solicitud para correlación. No activar trazas que impriman respuestas de openid-client/jose. La [solicitud de cliente](solicitud-cliente-reduniv.md) recoge los datos para el equipo de Identidad.

Referencias: [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html), [seguridad OAuth — RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html), [openid-client](https://github.com/panva/openid-client), [jose](https://github.com/panva/jose).
