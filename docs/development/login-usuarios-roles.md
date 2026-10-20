# Inicio de sesión, usuarios y roles

Estado: acceso personal y administración de roles implementados. El acceso local con RedUniv fue validado por el propietario; Google está configurado localmente y se comprobó el inicio hacia su pantalla de acceso. La [vinculación explícita de accesos](vinculacion-cuentas-y-roles.md) y la incorporación de cuentas registradas ya están implementadas. La demo utiliza cuentas de prueba explícitas; no sustituye la autenticación de producción.

## Entrar con una cuenta

El acceso real ofrece **RedUniv** y **Google** cuando están configurados. El proveedor autentica a la persona. Los permisos de SEP se consultan después en la plataforma y dependen de cada organización/evento; no se elige ser administrador o revisor al iniciar sesión.

La pantalla distingue **Iniciar sesión** y **Crear cuenta** (`mode=register`), con [registro local mediante correo y contraseña](cuentas-locales.md) y los proveedores configurados. Las contraseñas institucionales se introducen exclusivamente en RedUniv. El registro local exige confirmar correo y dispone de recuperación de contraseña; no concede roles. El acceso desde Crear cuenta mediante proveedor lleva a Mi perfil, conservando el contexto de evento; usarlo con una identidad existente no crea otra cuenta. Google se muestra con su icono oficial y un aviso cuando falta su configuración; el botón compacto de RedUniv usa un monograma R. Los recursos se sirven desde la aplicación, sin fuentes o imágenes remotas en la pantalla.

El nombre visible del producto es **Plataforma de Eventos Científicos**, también al cambiar el idioma de la interfaz. Se conserva la sigla provisional **SEP**.

La demo muestra nombres de cuentas independientes, leídos desde sus perfiles. Seleccionar una no crea roles. Las cuentas de revisión tampoco se convierten en revisoras de cualquier evento por entrar con ellas. En la instalación local los nombres pueden haber sido modificados durante pruebas; se muestran los actuales.

Sin destino específico, la entrada muestra **Inicio**, con las funciones disponibles según las responsabilidades actuales. Si se abrió un enlace a un evento/módulo, se conserva ese destino y el servidor valida sus permisos. La lengua elegida conserva el destino. Cerrar sesión sigue disponible en el menú de la cuenta.

## Inicio personal y funciones adicionales

Inicio es el mismo espacio personal para todas las cuentas: datos propios y participaciones. Las responsabilidades administrativas añaden funciones al lateral. Mi perfil y Cerrar sesión permanecen en el menú superior de cuenta en todas las páginas.

Inicio vuelve al contexto general de organización y limpia el evento seleccionado. Las entradas de organización permanecen al principio del lateral al gestionar un evento. El selector incluye Vista general y el enlace Todos los eventos permite volver al catálogo.

El administrador de organización puede gestionar los eventos de su organización, incluidos contenido, convocatoria, trabajos, revisión, programa, inscripciones, acreditación, certificados, publicaciones, comunicaciones, cobros y logística. No necesita una segunda asignación de organizador y no se generan roles artificiales. Los organizadores gestionan solamente sus eventos asignados. Los revisores conservan su invitación y sus evaluaciones asignadas; los acreditadores tienen la delegación operativa. Autorías, consentimiento, conflictos de interés, plazos y estados de publicación mantienen sus reglas propias.

La autorización se valida en cada solicitud con membresías y roles activos y vigentes. Otra organización, un rol vencido o una membresía inactiva no concede acceso. La API, el resumen de sesión y el menú usan la misma capacidad efectiva de gestión. La función SQL de autorías aplica también esta regla. Administrar no equivale a participar como organizador para obtener un certificado: esos certificados siguen requiriendo la asignación científica expresa.


## Administración

**Organización → Usuarios y roles** permite:

- Consultar miembros activos de la organización y sus asignaciones administrativas por evento.
- Asignar o retirar administración de organización a una persona ya vinculada; incorporar cuentas ya registradas mediante búsqueda por correo confirmado, motivo y confirmación, o utilizar la invitación existente.
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

El código histórico `participant` representa participación básica en un evento; no acredita inscripción confirmada o asistencia. Aceptar ser revisor no asigna por sí mismo todos los trabajos. Las delegaciones de acreditación no conceden acceso científico o financiero. El administrador de organización puede gestionar todos sus eventos sin otra asignación de organizador.

## Activación real y límites

Configurar clientes y credenciales de [RedUniv y Google](reduniv-y-google.md), dominios de retorno y entorno antes de reemplazar el acceso demo. Este incremento no registra clientes externos ni inventa credenciales. El primer administrador sigue siendo aprovisionado por la operación de la plataforma; no existe autorregistro como administrador.

Una identidad externa se reconoce por proveedor y sujeto, no por el nombre. No se fusionan automáticamente cuentas RedUniv/Google por coincidencia de correo. La [vinculación explícita y consolidación de cuentas](vinculacion-cuentas-y-roles.md) autentica ambos accesos, muestra la actividad y requiere elegir el perfil y confirmar la unión.

No se incluye un constructor libre de roles/permisos, roles delegados de caja/secretaría ni administración global de plataforma desde esta pantalla. La tabla de usuarios muestra los roles administrativos base; el estado detallado del comité y de los acreditadores continúa en los módulos especializados.

API: `GET /me/access`, `GET /organization/access`, `POST /organization/access/admins/:id`. La administración exige contexto de organización sin evento y rol de administrador vigente. [OpenAPI](../api/openapi.json).

Comprobaciones: `npm run test:identity`, suite base de API, compilación y recorrido de navegador del acceso y de la concesión/retirada. La validación con los proveedores reales depende de su activación.

## Eliminación de eventos

La migración 0087 permite eliminar borradores sin publicaciones, trabajos, inscripciones, evaluadores, certificados, cobros, reservas u otros registros de actividad. En Gestionar eventos, Eliminar abre una confirmación con el nombre exacto y un motivo. La acción requiere administración vigente de la organización, se valida nuevamente en PostgreSQL y queda en el historial administrativo y la auditoría.

La eliminación es lógica: conserva el evento y sus auditorías, lo oculta de las consultas ordinarias, desactiva sus dominios y membresías del evento. Los borradores internos se conservan como evidencia técnica. Un evento publicado o con actividad no se elimina. Los disparadores serializan nuevas evidencias con la operación y rechazan insertarlas en eventos eliminados. La columna de eliminación no se modifica directamente con el rol de ejecución.

## Directorio y organización

Usuarios y roles separa usuarios, catálogo de roles y auditoría. Las filas compactas despliegan la vigencia y los eventos; las delegaciones de revisión y acreditación permanecen en sus módulos.

La organización es la entidad responsable de uno o varios eventos. No equivale a una afiliación académica ni exige una organización nueva por evento. Su pantalla separa datos institucionales y dominios de los eventos.

La migración 0088 amplía la proyección administrativa, sin acceso directo del rol de ejecución a perfiles ajenos. `GET /people` devuelve nombre, correo de contacto confirmado, afiliaciones declaradas, cargo y ORCID conectado (indicando sandbox). `GET /people/:personId` devuelve además formación y actividad por evento de la organización actual: inscripciones, trabajos enviados propios o con autoría confirmada y estados de revisiones. Exige administrador vigente, contexto sin evento y pertenencia activa del destinatario a la misma organización. Excluye borradores personales, comentarios de evaluación, credenciales e historiales de vinculación.

El perfil aún no distingue afiliación principal: el directorio muestra las afiliaciones declaradas sin convertir arbitrariamente la primera en principal. Las tarjetas permiten buscar por nombre, correo e institución y abrir un resumen de actividad.
