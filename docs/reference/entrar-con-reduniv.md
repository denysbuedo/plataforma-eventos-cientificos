# Entrar con RedUniv

## Objetivo

RedUniv ofrecerá autenticación institucional centralizada mediante un botón similar a «Entrar con Google»:

> **Entrar con RedUniv**

Keycloak actuará como proveedor de identidad institucional. Las aplicaciones delegarán en este servicio el inicio de sesión, el segundo factor, las sesiones y la emisión de tokens.

```text
Usuario → Aplicación → Identidad RedUniv → LDAP + TOTP → Aplicación
```

La aplicación nunca recibirá ni almacenará la contraseña LDAP, la semilla TOTP o los códigos de recuperación del usuario.

## Experiencia de usuario

Mientras un sistema se encuentre en migración, puede mantener temporalmente su acceso local:

```text
┌──────────────────────────────┐
│ Usuario local                │
│ Contraseña                   │
│ [ Entrar ]                   │
│                              │
│ ─────────── o ─────────────  │
│                              │
│ [ Entrar con RedUniv ]       │
└──────────────────────────────┘
```

Una vez validada la integración, se retirará el formulario local y permanecerá únicamente:

```text
[ Entrar con RedUniv ]
```

### Primer acceso

1. El usuario pulsa **Entrar con RedUniv**.
2. La aplicación lo redirige a la página institucional de Identidad.
3. El usuario introduce su cuenta y contraseña institucionales.
4. Keycloak solicita la configuración o validación del TOTP.
5. El usuario regresa autenticado a la aplicación.

### Accesos posteriores

Cuando exista una sesión válida en Identidad, el usuario podrá acceder a otros sistemas mediante inicio de sesión único (SSO). Keycloak solicitará nuevamente contraseña o segundo factor cuando lo determine la política de seguridad.

## Proveedor institucional

```text
Nombre: RedUniv
Protocolo: OpenID Connect
Realm: reduniv-institucional

Issuer:
https://identidad.reduniv.edu.cu/realms/reduniv-institucional

Discovery:
https://identidad.reduniv.edu.cu/realms/reduniv-institucional/.well-known/openid-configuration

Authorization endpoint:
https://identidad.reduniv.edu.cu/realms/reduniv-institucional/protocol/openid-connect/auth

Token endpoint:
https://identidad.reduniv.edu.cu/realms/reduniv-institucional/protocol/openid-connect/token

Logout endpoint:
https://identidad.reduniv.edu.cu/realms/reduniv-institucional/protocol/openid-connect/logout

JWKS:
https://identidad.reduniv.edu.cu/realms/reduniv-institucional/protocol/openid-connect/certs
```

## Formas de integración

### Aplicación conectada directamente

Es la modalidad recomendada:

```text
Aplicación → OpenID Connect → Keycloak RedUniv
```

Cada aplicación tendrá clientes separados para desarrollo, pruebas y producción.

### Aplicación que ya utiliza otro Keycloak

El Keycloak de la aplicación puede configurar RedUniv como proveedor de identidad:

```text
Aplicación → Keycloak del sistema → Identity Brokering → Keycloak RedUniv
```

El Keycloak intermedio mostrará el acceso a RedUniv como una opción de autenticación.

## Configuración por aplicación

Cada sistema deberá solicitar:

- Client ID independiente por ambiente.
- Tipo de aplicación: backend, SPA, móvil o API.
- URL principal.
- Callback exacto.
- URL posterior al cierre de sesión.
- Web Origin exacto.
- Roles iniciales.
- Audiencia esperada para los tokens.
- Responsable técnico y funcional.

Para una aplicación web tradicional con backend se utilizará:

- OpenID Connect.
- Authorization Code Flow.
- Cliente confidencial.
- PKCE con `S256`.
- Intercambio del código exclusivamente desde el backend.
- Sesión local administrada por la aplicación.
- Implicit Flow deshabilitado.
- Direct Access Grants deshabilitado.

## Validaciones obligatorias

La aplicación debe:

- Descubrir la configuración desde el endpoint `/.well-known/openid-configuration`.
- Generar y validar `state`, `nonce` y `code_verifier` por cada intento.
- Validar la firma con las claves publicadas en JWKS.
- Validar `iss`, `aud`, `exp`, `iat` y `nonce` según el tipo de token.
- Identificar permanentemente al usuario mediante la pareja `issuer + sub`.
- Tratar correo y nombre de usuario como atributos modificables, no como claves de identidad.
- Autorizar mediante roles, no solamente comprobar que existe una sesión.
- Regenerar el identificador de sesión después del login.
- Eliminar tokens y sesión local cuando falle la renovación.
- Implementar logout local y logout central.
- Excluir secretos, tokens, contraseñas y códigos de los registros y trazas.

## Roles y autorización

Keycloak administrará los roles generales de acceso a cada cliente, por ejemplo:

```text
ROLE_USER
ROLE_ADMIN
```

Los permisos funcionales detallados pueden permanecer inicialmente en cada sistema.

Una persona tendrá una sola identidad, pero podrá tener autorizaciones diferentes:

```text
Persona institucional
├── Sistema A: ROLE_USER
├── Sistema B: ROLE_ADMIN
└── Sistema C: sin acceso
```

Los cambios de rol se reflejarán al emitir tokens nuevos. Para retirar privilegios inmediatamente se deberá revocar la sesión correspondiente y obligar a una nueva autenticación.

## Requisitos de seguridad

- No solicitar la contraseña institucional dentro de la aplicación.
- Realizar la autenticación mediante una redirección completa; no usar iframes.
- Utilizar HTTPS en ambientes compartidos y producción.
- Registrar callbacks y orígenes exactos; no usar comodines en producción.
- Mantener secretos exclusivamente en un gestor de secretos o archivo local excluido de Git.
- No compartir secretos por correo, documentación, chat o repositorios.
- No registrar tokens, códigos de autorización, OTP o códigos de recuperación.
- No consultar LDAP directamente desde las aplicaciones.
- No usar Password Grant, Direct Access Grants ni Implicit Flow para sistemas nuevos.

## TOTP y recuperación

El segundo factor es administrado íntegramente por Keycloak:

- Cada usuario configura su propia aplicación TOTP.
- Cada usuario recibe sus propios códigos de recuperación.
- Cada código de recuperación es de un solo uso.
- Los códigos sustituyen al OTP, pero no a la contraseña.
- Los administradores no deben conocer ni guardar copias de los códigos de los usuarios.

## SSO y cierre de sesión

El SSO permite acceder a varias aplicaciones mientras la sesión central siga vigente.

El cierre de sesión debe contemplar:

1. Eliminar la sesión local de la aplicación.
2. Eliminar access token, refresh token e ID token almacenados.
3. Invocar el endpoint de logout de Keycloak.
4. Enviar `id_token_hint` cuando corresponda.
5. Usar una URL post-logout previamente registrada.

Un access token JWT ya emitido puede seguir siendo válido hasta su expiración. La aplicación debe detectar la revocación cuando falle la renovación del token y cerrar su sesión local.

## Identidad visual

La integración debe utilizar una presentación consistente:

- Texto recomendado: **Entrar con RedUniv**.
- Logo oficial de RedUniv.
- Colores y dimensiones homogéneos.
- Contraste y accesibilidad adecuados.
- Identificación clara de la aplicación a la que regresará el usuario.

El formulario de credenciales siempre se mostrará en el dominio institucional:

```text
https://identidad.reduniv.edu.cu
```

## Pruebas de aceptación

Antes de habilitar un sistema en producción se validará:

1. Redirección desde **Entrar con RedUniv**.
2. Login mediante LDAP.
3. Enrolamiento y validación TOTP.
4. Códigos de recuperación.
5. Claims de identidad requeridos.
6. Audiencia, issuer y firma de tokens.
7. Roles con acceso permitido y denegado.
8. Renovación y expiración de tokens.
9. Revocación de una sesión.
10. Logout local y central.
11. Conservación de permisos e historial al vincular cuentas existentes.
12. Ausencia de secretos y tokens en logs.

## Proceso de incorporación

1. El equipo del sistema entrega URLs, ambientes y roles.
2. Identidad crea clientes separados por ambiente.
3. El secreto se entrega mediante un canal seguro.
4. El sistema implementa OIDC y conserva temporalmente un acceso local controlado.
5. Se realizan las pruebas de aceptación.
6. Se aprueba la integración.
7. Se deshabilita el login local.
8. Se documenta la operación, recuperación y baja de usuarios.

## Resultado esperado

Todos los sistemas institucionales ofrecerán una experiencia común de acceso:

```text
Una persona
→ una identidad institucional
→ una contraseña en LDAP
→ un segundo factor en Keycloak
→ múltiples aplicaciones mediante SSO
```

