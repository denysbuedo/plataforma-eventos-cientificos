# ADR-009: Google directo e independiente de RedUniv

Estado: implementado y pendiente de activación/validación funcional.

Por instrucción explícita del propietario, SEP ofrece dos conexiones independientes: RedUniv mediante su Keycloak y Google directamente mediante OAuth/OIDC. Se retira la propuesta de Google como broker del realm institucional. Cursos-enlinea se consulta como referencia y no se modifica.

Google utiliza Authorization Code con PKCE S256, state, nonce y validación del ID token mediante openid-client. El callback propio es `/api/auth/google/callback`; consulta UserInfo y exige correo verificado y sub consistente. Su transacción tiene cookie separada para impedir mezclar callbacks con RedUniv.

Después del login, SEP descarta los tokens OAuth Google y crea una sesión propia cifrada de hasta ocho horas. El gateway emite credenciales internas de hasta cinco minutos, firmadas con una clave distinta de la de cifrado, con issuer/audience propios y client ID comprobado en API. Son un mecanismo interno de SEP, no ID tokens reutilizados como access tokens de API. La primera entrada puede crear Person/Identity usando `https://accounts.google.com + sub`, sin conceder permisos. La API sigue resolviendo roles en base de datos.

Este diseño mantiene al servidor web como frontera de confianza para la identidad Google, similar a la sesión propia del proyecto de referencia. El secreto de firma se comparte únicamente entre gateway y API y no se envía al navegador. La sesión se revoca eliminando su archivo; una credencial interna ya emitida puede seguir vigente hasta cinco minutos. La desactivación de la persona/identidad se comprueba en cada petición.

Las sesiones Google no se renuevan contra Google ni mantienen acceso a APIs Google después del login. Su cierre es local, sin cerrar la cuenta global Google. RedUniv mantiene su renovación y logout central. No se mezclan cuentas por correo ni se trasladan roles de un proveedor a otro. El enlace explícito de identidades queda pendiente.

La configuración y los mensajes para Identidad/Google Cloud están en la [guía de los dos accesos](../development/reduniv-y-google.md). No se ejecutan nuevas pruebas funcionales por indicación del propietario; la compilación no acredita login real contra los proveedores.
