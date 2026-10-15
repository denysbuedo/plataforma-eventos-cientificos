# Solicitud de incorporación de SEP a RedUniv

Preparado para revisión; no acredita que los clientes ya existan. Referencia: [Entrar con RedUniv](../reference/entrar-con-reduniv.md).

Proveedor: `https://identidad.reduniv.edu.cu/realms/reduniv-institucional`.

| Dato | Desarrollo local | Pruebas compartidas | Producción |
|---|---|---|---|
| Aplicación | Plataforma de Eventos Científicos — SEP | SEP | SEP |
| Client ID propuesto | sep-admin-dev | sep-admin-test | sep-admin-prod |
| Tipo | Web con backend confidencial | Web con backend confidencial | Web con backend confidencial |
| URL principal | http://127.0.0.1:6789 | HTTPS por confirmar | HTTPS por confirmar |
| Callback | http://127.0.0.1:6789/api/auth/callback | Origen de pruebas + /api/auth/callback | Origen productivo + /api/auth/callback |
| Post-logout | http://127.0.0.1:6789/es y /en | Origen de pruebas + /es y /en | Origen productivo + /es y /en |
| Web Origin | http://127.0.0.1:6789 | Origen HTTPS exacto | Origen HTTPS exacto |
| Roles generales del cliente | ROLE_USER, ROLE_ADMIN | ROLE_USER, ROLE_ADMIN | ROLE_USER, ROLE_ADMIN |
| Audience de API propuesta | sep-api | sep-api | sep-api |
| Responsable técnico | Por confirmar | Por confirmar | Por confirmar |
| Responsable funcional | Por confirmar | Por confirmar | Por confirmar |

El puerto local corresponde a la demo conservada durante el desarrollo; si cambia, regenerar la configuración del cliente antes de conectar OIDC. El administrador web de cada despliegue se sirve bajo un dominio organizativo registrado. La audience se combina con `azp` del cliente de cada ambiente; una instancia no debe aceptar tokens de otro ambiente. Es posible asignar audiencias distintas por ambiente si así lo requiere Identidad.

Configuración: Authorization Code, PKCE S256, intercambio backend, scopes openid/profile/email/roles, audience de API dentro del access token, callbacks/orígenes exactos. Implicit, Direct Access Grants y cuentas de servicio deshabilitados. LDAP, TOTP y recuperación se administran exclusivamente en RedUniv.

Crear o confirmar los roles del cliente y asignar al menos uno a las personas/grupos autorizados. ROLE_ADMIN es un permiso general de entrada: los administradores de organización y organizadores de evento se asignan explícitamente en SEP.

Entregar el secreto mediante el canal seguro institucional y configurarlo únicamente en el entorno local privado correspondiente. No incluirlo en este documento, el repositorio o el chat. El generador `scripts/keycloak-client.mjs` produce los archivos locales de cliente y roles para revisión; no modifica Keycloak.

Antes de habilitar producción queda pendiente la aceptación institucional de login LDAP, TOTP, recuperación, claims, roles, renovación, revocación, logout y conservación de historial indicada en la guía. Las pruebas funcionales se han pospuesto por solicitud del propietario.
