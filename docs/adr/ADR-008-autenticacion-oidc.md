# ADR-008: autenticación institucional OIDC

Estado: implementado; activación y validación funcional pendientes.

El propietario indicó su Keycloak existente en `https://identidad.reduniv.edu.cu/`. Se implementa OIDC configurable, sin instalar ni administrar otro proveedor. Realm, cliente, secreto y origen registrado deben configurarse antes de activar el acceso institucional.

La web usa openid-client para Authorization Code con PKCE S256, state, nonce y comprobación de firma del ID token. La API usa jose para validar access tokens JWT RS256/ES256 destinados a su audience, con issuer y caducidad obligatorios y parte autorizada opcional. El modo de desarrollo es excluyente y permanece prohibido en producción.

La identidad se resuelve por el par exacto `(issuer, sub)`, bajo una transacción y bloqueo para evitar registros duplicados. La primera entrada puede crear Person/Identity, sin membresías ni roles. No se aceptan privilegios del token ni se vinculan automáticamente cuentas por correo. Personas e identidades desactivadas no se reactivan por iniciar sesión. RLS y triggers limitan el aprovisionamiento al contexto de identidad comprobado por el servidor.

GET `/api/v1/me` permite consultar el perfil propio aunque todavía no exista membresía. En OIDC la aceptación de invitaciones exige coincidencia con el correo verificado del access token. Los nombres y correos no sustituyen al subject estable del proveedor.

Las sesiones web y transacciones de login se almacenan cifradas en archivos privados del servidor; el navegador conserva solo identificadores opacos. Las transacciones caducan a los diez minutos y se consumen una vez. Las sesiones caducan al vencer el access token, hasta un máximo de ocho horas. El cierre de sesión elimina el archivo local. Este primer incremento no incluye refresh tokens ni cierre global de SSO; se documentan para continuación, sin anunciar equivalencia con una integración productiva ya validada.

Se proporciona un generador de configuración de cliente para revisión y un comando local para aprovisionar el primer administrador. Ninguno modifica el proveedor institucional automáticamente. Los detalles están en la [guía de identidad institucional](../development/identidad-institucional.md).
