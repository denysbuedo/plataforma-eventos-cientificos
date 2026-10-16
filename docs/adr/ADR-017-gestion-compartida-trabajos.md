# ADR-017: gestión compartida con el autor de correspondencia

Fecha: 2026-10-16. Estado: implementado; validación funcional completa pendiente.

## Decisión

La propiedad del trabajo permanece en quien lo creó. Ser autor de correspondencia no concede edición por sí solo. El propietario invita a la declaración vigente de correspondencia; la cuenta destinataria acepta explícitamente con correo verificado en acceso real. Se guarda una concesión acotada al trabajo, sin crear membresías de organización ni roles de organizador.

El permiso aceptado habilita lectura, corrección de contenido, PDF y reenvío dentro de estados/plazos existentes. Autoría, invitaciones, retiro y eliminación siguen reservados al propietario. La aceptación reconoce esa declaración de correspondencia y la cuenta; no modifica instantáneas oficiales previas. Las versiones nuevas conservan el actor real y la autoría vigente.

Los tokens son aleatorios, se guardan como hash, caducan a los siete días y se muestran una sola vez para compartir manualmente. La invitación no crea acceso anticipado. La revocación y cambios de correspondencia retiran acceso; no se conservan permisos por haber subido un archivo. El propietario puede revocar incluso si el evento ya no admite edición.

## Aislamiento

`work_collaborations` guarda ámbito, propietario y destinatario. Una FK compuesta garantiza que el propietario de la concesión sea el del trabajo. RLS no consulta trabajos desde la concesión; los trabajos consultan concesiones aceptadas, evitando políticas recursivas. Archivos, versiones e historial dependen de la visibilidad del trabajo. El contexto del token se reinicia en cada transacción. La cuenta activa se comprueba al acceder.

Las decisiones de organizador rechazan al propietario y a coautores vinculados en contenido actual o versión oficial, incluidos colaboradores. La delegación no permite saltarse revisión optimista, requisitos científicos ni congelación de versiones.

## Consecuencias

Migraciones 0032–0033, contratos canManage, rutas de invitación/aceptación/revocación y actor identificable en historial. Los registros anteriores conservan un nombre vacío y usan la etiqueta de rol como alternativa. El envío sigue disponible para propietario y colaborador; quien hace el envío inicial debe cumplir la exigencia ORCID si el evento la activa.

Los mecanismos de búsqueda y reclamaciones se implementarán por separado. El remitente gestionará provisionalmente el reconocimiento hasta que la correspondencia registrada acepte esa responsabilidad; esta política está acordada pero el flujo de reclamaciones aún no existe. No se envían mensajes externos ni se activan servicios de correo en este incremento.
