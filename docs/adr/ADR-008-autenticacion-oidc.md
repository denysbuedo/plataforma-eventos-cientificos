# ADR-008: autenticación institucional OIDC

Estado: implementado; activación y validación funcional pendientes.

El propietario indicó su Keycloak existente en `https://identidad.reduniv.edu.cu/` y facilitó la guía Entrar con RedUniv. Se confirma el realm `reduniv-institucional` y se implementa OIDC directo, sin instalar ni administrar otro proveedor. Cliente por ambiente, secreto, roles generales y orígenes registrados deben configurarse antes de activar el acceso institucional.

La web usa openid-client para Authorization Code con PKCE S256, state, nonce y comprobación de firma del ID token. La API usa jose para validar access tokens JWT RS256/ES256 destinados a su audience, con issuer y caducidad obligatorios y parte autorizada opcional. El modo de desarrollo es excluyente y permanece prohibido en producción.

La identidad se resuelve por el par exacto `(issuer, sub)`, bajo una transacción y bloqueo para evitar registros duplicados. Se exige un rol general de acceso dentro del cliente configurado. La primera entrada autorizada puede crear Person/Identity, sin membresías ni roles funcionales. ROLE_ADMIN del proveedor no concede automáticamente administración de organización o evento. No se vinculan automáticamente cuentas por correo. Personas e identidades desactivadas no se reactivan por iniciar sesión. RLS y triggers limitan el aprovisionamiento al contexto de identidad comprobado por el servidor.

GET `/api/v1/me` permite consultar el perfil propio aunque todavía no exista membresía. En OIDC la aceptación de invitaciones exige coincidencia con el correo verificado del access token. Los nombres y correos no sustituyen al subject estable del proveedor.

Las sesiones web y transacciones de login se almacenan cifradas en archivos privados del servidor; el navegador conserva solo identificadores opacos. Las transacciones caducan a los diez minutos y se consumen una vez. Las sesiones tienen un máximo absoluto de ocho horas, renovación serializada de access/refresh token e invalidación al fallar la renovación. El cierre de sesión elimina los tokens locales y redirige al logout central con ID token hint y retorno exacto. Los marcadores de revocación impiden restaurar sesiones cerradas durante una renovación concurrente. Esto implementa el flujo solicitado; su validación institucional todavía está pendiente.

Se proporciona un generador de configuración de cliente para revisión y un comando local para aprovisionar el primer administrador. Ninguno modifica el proveedor institucional automáticamente. Los detalles están en la [guía de identidad institucional](../development/identidad-institucional.md).
