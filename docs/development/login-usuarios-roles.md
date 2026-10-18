# Inicio de sesión, usuarios y roles

Estado: acceso personal y administración de roles implementados. Los proveedores institucional/Google conservan su activación pendiente. La demo utiliza cuentas de prueba explícitas; no sustituye la autenticación de producción.

## Entrar con una cuenta

El acceso real ofrece **RedUniv** y **Google** cuando están configurados. El proveedor autentica a la persona. Los permisos de SEP se consultan después en la plataforma y dependen de cada organización/evento; no se elige ser administrador o revisor al iniciar sesión.

La demo muestra nombres de cuentas independientes, leídos desde sus perfiles. Seleccionar una no crea roles. Las cuentas de revisión tampoco se convierten en revisoras de cualquier evento por entrar con ellas. En la instalación local los nombres pueden haber sido modificados durante pruebas; se muestran los actuales.

Sin destino específico, la entrada muestra **Mis accesos**. Si se abrió un enlace a un evento/módulo, se conserva ese destino y el servidor valida sus permisos. La lengua elegida conserva el destino. Cerrar sesión sigue disponible en el menú de la cuenta.

## Mis accesos

La cuenta consulta sus eventos de la organización actual y sus asignaciones vigentes, con enlaces a gestión, trabajos, revisiones y acreditación. La consulta incluye relaciones científicas e inscripciones propias aunque no exista una membresía artificial de gestión. No devuelve títulos privados de trabajos ni información de otras personas. El ámbito de otra organización se consulta desde su propio dominio; los enlaces A/B solo existen para la demo.

El administrador dispone además de accesos a eventos, personas/invitaciones y usuarios/roles de su organización. Tener ese rol no concede automáticamente gestión científica de todos sus eventos.

## Administración

**Organización → Usuarios y roles** permite:

- Consultar miembros activos de la organización y sus asignaciones administrativas por evento.
- Asignar o retirar administración de organización a una persona ya vinculada; incorporar nuevas personas mediante la invitación existente.
- Consultar el historial de cambios con actor, persona, motivo y fecha.
- Abrir la gestión de organizadores de cada evento.

Cada cambio exige motivo y versión actual; una pantalla antigua no sobrescribe una asignación cambiada por otra persona. No se permite retirarse la propia administración. Debe conservarse otro administrador activo al retirar una asignación. Las retiradas afectan las siguientes solicitudes, sin necesidad de esperar a que la persona cierre sesión.

Los cambios se serializan por organización, se auditan y conservan evidencia inmutable. La base de datos comprueba también la autoridad real del administrador. No se concede edición libre de roles desde el navegador ni desde atributos enviados por el cliente.

## Dónde se concede cada responsabilidad

| Responsabilidad | Quién la concede | Lugar |
|---|---|---|
| Administrador de organización | Otro administrador de esa organización | Usuarios y roles |
| Organizador de evento | Administrador de organización | Evento → Equipo / organizadores |
| Revisor | Organizador; la persona debe aceptar la invitación | Comité de revisión; cada evaluación requiere asignación |
| Acreditador | Organizador del evento | Acreditación → Equipo |
| Autor | Se deriva del trabajo y de su autoría | Mis trabajos / Autorías |
| Gestor compartido de un trabajo | Responsable del envío, mediante invitación aceptada | Trabajo → Gestión compartida |
| Inscrito / asistente | Solicitud y decisión de inscripción / acreditación | Mi inscripción / acreditación |

El código histórico `participant` representa participación básica en un evento; no acredita inscripción confirmada o asistencia. Aceptar ser revisor no asigna por sí mismo todos los trabajos. Las delegaciones de acreditación no conceden acceso científico o financiero. El administrador de organización debe asignarse explícitamente como organizador si necesita operar un evento.

## Activación real y límites

Configurar clientes y credenciales de [RedUniv y Google](reduniv-y-google.md), dominios de retorno y entorno antes de reemplazar el acceso demo. Este incremento no registra clientes externos ni inventa credenciales. El primer administrador sigue siendo aprovisionado por la operación de la plataforma; no existe autorregistro como administrador.

Una identidad externa se reconoce por proveedor y sujeto, no por el nombre. No se fusionan automáticamente cuentas RedUniv/Google por coincidencia de correo. La vinculación explícita entre proveedores requiere su propio flujo seguro y queda pendiente.

No se incluye un constructor libre de roles/permisos, roles delegados de caja/secretaría ni administración global de plataforma desde esta pantalla. La tabla de usuarios muestra los roles administrativos base; el estado detallado del comité y de los acreditadores continúa en los módulos especializados.

API: `GET /me/access`, `GET /organization/access`, `POST /organization/access/admins/:id`. La administración exige contexto de organización sin evento y rol de administrador vigente. [OpenAPI](../api/openapi.json).

Comprobaciones: `npm run test:identity`, suite base de API, compilación y recorrido de navegador del acceso y de la concesión/retirada. La validación con los proveedores reales depende de su activación.
