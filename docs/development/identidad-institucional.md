# Identidad institucional: Keycloak de RedUniv

Estado: integración implementada y compilada; conexión funcional pendiente. Las nuevas pruebas se posponen por indicación del propietario.

Proveedor indicado por el propietario: `https://identidad.reduniv.edu.cu/`. El servidor respondió desde el equipo de desarrollo y redirigió a `/admin/`. Eso no identifica el realm de usuarios ni acredita un inicio de sesión. El realm y el cliente institucional siguen pendientes de confirmar. No se ha instalado otro Keycloak ni modificado el servidor institucional.

## Datos necesarios

1. Issuer exacto del realm, normalmente `https://identidad.reduniv.edu.cu/realms/<realm>`. Confirmarlo en `/.well-known/openid-configuration` dentro del issuer; no asumir el realm `master`.
2. Client ID y secreto de un cliente confidencial, con Authorization Code y PKCE S256. Configurar el secreto directamente en el entorno privado del servidor.
3. URL administrativa definitiva. La única redirección del cliente debe ser `<SEP_ADMIN_ORIGIN>/api/auth/callback`.
4. Audience de la API, distinta del Client ID web. El cliente debe emitir access tokens JWT con esa audience y los claims `sub`, `exp`, `iat`, `name` o `preferred_username`, `email` y `email_verified`.

Los nombres `sep-admin` y `sep-api` de los ejemplos son propuestas de configuración, no clientes comprobados en el proveedor.

## Preparar el cliente para revisión

```powershell
$env:SEP_ADMIN_ORIGIN = 'https://eventos.example.org'
$env:OIDC_CLIENT_ID = 'sep-admin'
$env:OIDC_AUDIENCE = 'sep-api'
node scripts/keycloak-client.mjs
```

El generador escribe `.local/keycloak-client.json`, sin secretos. Un administrador del realm puede revisarlo e importarlo o reproducir sus opciones manualmente. No ejecutar una importación sobre un cliente existente sin revisar su configuración actual. La propuesta habilita el flujo estándar, exige S256, deshabilita implicit/password grants y cuentas de servicio, configura scopes profile/email y añade la audience de API solo al access token. No incorpora roles de organización o evento.

## Configuración local del sistema

Copiar [.env.oidc.example](../../.env.oidc.example) a un archivo local ignorado por Git. Completar realm, JWKS, cliente, secreto, URLs, base de datos y directorio de sesiones. La URL JWKS debe coincidir con `jwks_uri` del documento de descubrimiento. No desactivar la verificación TLS.

API: `AUTH_MODE=oidc`, `OIDC_ISSUER`, `OIDC_JWKS_URL`, `OIDC_AUDIENCE` y, para este cliente, `OIDC_AUTHORIZED_PARTY`. El mapa de tokens demo debe estar vacío. `NODE_ENV=production` solo admite el modo OIDC, nunca el adaptador de demostración.

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

La primera entrada crea únicamente Person/Identity, mediante `(issuer, sub)`; no concede organizaciones ni roles. El registro de cuentas y las políticas MFA dependen del proveedor. La pantalla informa si falta una invitación o asignación.

Para iniciar la administración de una organización ya aprovisionada, un operador autorizado puede conceder el primer rol desde el servidor:

```powershell
node --env-file=.env.oidc scripts/grant-organization-admin.mjs <person-uuid> <organization-uuid>
```

Configurar `SEP_BOOTSTRAP_DATABASE_URL` solo para esa operación con un rol de aprovisionamiento explícito, nunca con el runtime ni en el proceso web. El script requiere una persona activa con identidad del issuer configurado, una organización activa y privilegios de aprovisionamiento; registra la operación en auditoría. La persona puede consultar su UUID mediante `/api/backend/me` después del login. No se ejecuta este paso automáticamente ni se promocionan cuentas por correo, nombre o roles recibidos de Keycloak.

## Invitaciones y sesiones

En OIDC, aceptar una invitación requiere que el access token incluya `email_verified=true` y el correo coincida con el destinatario. El retorno al enlace se conserva durante el login. No se fusionan personas por coincidencia de correo. El modo demo conserva su aceptación ficticia para desarrollo.

La cookie OIDC es opaca, HttpOnly y SameSite=Lax; usa Secure con HTTPS. Tokens y estado de login permanecen cifrados en el servidor. Se comprueban PKCE, state, nonce y firma del ID token. La API verifica firma, issuer, audience, caducidad y la parte autorizada configurada. Los roles del proveedor no otorgan permisos de SEP.

La sesión dura como máximo la vigencia del access token, con un límite de ocho horas. No se almacenan refresh tokens ni se renuevan automáticamente. El cierre de sesión elimina la sesión local; no cierra la sesión SSO de Keycloak. Rotar la clave invalida el almacén. Los archivos caducados se eliminan cuando se consultan; el mantenimiento del servicio debe retirar los antiguos no consultados.

Quedan pendientes la configuración institucional efectiva, validación de extremo a extremo, renovación, cierre global SSO, políticas MFA, mantenimiento del almacén y observabilidad de autenticación.

Referencias: [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html), [seguridad OAuth — RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html), [openid-client](https://github.com/panva/openid-client), [jose](https://github.com/panva/jose).
