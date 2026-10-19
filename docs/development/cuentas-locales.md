# Registro y acceso con correo y contraseña

El correo electrónico es el identificador del acceso local. Esta opción convive con RedUniv y Google; cada proveedor conserva su propia identidad. No se fusionan personas ni se conceden roles por coincidencia de correo. El registro local no modifica cuentas, contraseñas o segundo factor de RedUniv.

## Recorrido

1. Crear cuenta: nombre, correo, contraseña y confirmación. La contraseña admite entre 15 y 128 caracteres, incluidos espacios, sin reglas artificiales de mayúsculas o símbolos.
2. Confirmar el correo mediante un enlace válido durante 24 horas. Abrirlo no consume el enlace: hay que pulsar Confirmar mi correo.
3. Iniciar sesión con el correo y la contraseña. La cuenta sin verificar todavía no puede entrar. El registro no concede pertenencias o administración; el usuario completa después su perfil y puede aceptar invitaciones o participar en un evento.
4. Recuperar contraseña: solicitar un enlace por correo, elegir una nueva contraseña y volver a iniciar sesión. El enlace caduca a los 30 minutos. El cambio invalida las sesiones y los enlaces anteriores.

Los enlaces se usan una sola vez. El secreto viaja en el fragmento del enlace, que no se envía al servidor al navegar; la pantalla lo retira de la dirección al cargar. Las solicitudes de registro repetidas para una cuenta verificada no cambian su contraseña. Para registros pendientes, cada confirmación está vinculada a la contraseña elegida en esa solicitud; no activa silenciosamente la de otro intento. Si falta una confirmación, se puede repetir el registro con el mismo correo y los datos deseados. Recuperación y registro utilizan mensajes generales para no confirmar públicamente la existencia de una cuenta.

## Configuración y correo

Activar `SEP_LOCAL_LOGIN_ENABLED=1` en API y administrador web, con `AUTH_MODE=oidc`, `SEP_AUTH_MODE=oidc` y la demo deshabilitada. La API debe disponer de SMTP según [.env.example](../../.env.example); las opciones de identidad y sesión están en [.env.oidc.example](../../.env.oidc.example). La configuración se valida al arrancar.

El propietario todavía no dispone de una cuenta SMTP. Para desarrollar se habilitó un transporte de pruebas mediante `SEP_LOCAL_AUTH_MAIL_DIRECTORY`, una ruta absoluta privada dentro de `.local/identity-mail`. Solo se admite con API en development/test y origen de loopback; producción rechaza esa configuración. No se envían correos por Internet. En este modo, tras el registro o la recuperación aparece Ver correo de prueba. El mensaje se consulta mediante un identificador aleatorio de 32 bytes y no existe un listado público de correos. Esta simulación sirve exclusivamente para comprobar el flujo local, no acredita control real sobre un buzón externo.

Al configurar SMTP, vaciar `SEP_LOCAL_AUTH_MAIL_DIRECTORY` y habilitar las opciones SMTP privadas. Los mensajes de identidad reutilizan la configuración de transporte existente, con TLS para servidores remotos. El envío es síncrono: si falla, se informa del error y se puede repetir la solicitud. Esta entrega no incorpora una cola de reintentos para correos de identidad.

## Protección y almacenamiento

- Contraseñas con scrypt N=131072, r=8, p=1 y sal aleatoria de 16 bytes, siguiendo [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Nunca se almacenan ni registran en claro. Se limita a dos cálculos simultáneos para acotar memoria.
- Límites de intentos persistentes por operación/correo y por origen de red. La API ve la dirección del servidor web cuando este actúa como intermediario, por lo que ese límite de red se comparte; no se confía en cabeceras IP arbitrarias del navegador. El exceso devuelve 429.
- Sesiones opacas de ocho horas. La base guarda el hash del token, la versión de credenciales y la caducidad. El navegador recibe una cookie HttpOnly/SameSite, Secure bajo HTTPS; el token de API permanece en el almacén cifrado del servidor web. Cerrar sesión revoca también el token de API, sin cerrar RedUniv.
- Cuatro tablas nuevas con RLS forzado, sin acceso directo para `sep_runtime`. La función SECURITY DEFINER tiene propietario sin BYPASSRLS, búsqueda de esquema fija y operaciones acotadas. La comprobación de arranque verifica ahora 78 tablas con RLS forzado.
- Confirmar correo y recuperar contraseña invalidan los otros enlaces pendientes; la recuperación elimina todas las sesiones locales de la persona. Desactivar la cuenta o la persona bloquea la siguiente petición.
- La interfaz conserva los controles de origen en los POST, evita redirecciones externas y mantiene los recursos gráficos y fuentes servidos localmente.

Los registros caducados de sesiones, desafíos y límites permanecen en las tablas hasta su mantenimiento. La limpieza periódica y la vinculación explícita entre proveedores quedan pendientes.

## Validación

`npm run test:local-auth` comprueba registro, verificación, contraseñas protegidas, ausencia de roles automáticos, duplicados, recuperación, caducidad, revocación, límites de intentos y rechazo del correo de prueba en producción. También se comprobaron los permisos base y su administración y el recorrido completo desde el navegador. Migración: `0080_sleepy_stick.sql`; aplicar con la credencial migradora, nunca con la de ejecución.

El diseño compacto evita desplazamiento en las resoluciones habituales de escritorio y móvil; no se ocultan controles mediante un bloqueo del scroll del documento. Los proveedores se presentan lado a lado con botones redondeados de 42 px. Google conserva su estado pendiente de credenciales.
