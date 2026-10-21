# Validación manual desde un entorno limpio

Preparación solicitada el 21 de octubre de 2026: una organización de pruebas, la cuenta administradora conservada y un evento nuevo en borrador, **Programación con IA 2026**. No se precargaron otras personas, roles de evento, trabajos ni evidencias científicas. Se conservaron el perfil y los accesos de la cuenta administradora; las sesiones anteriores se invalidaron.

La guía independiente está en [validacion-roles.html](../../apps/admin-web/public/guias/validacion-roles.html). Se puede abrir como archivo o desde http://127.0.0.1:6789/guias/validacion-roles.html, imprimir y guardar el avance en el navegador. Incluye registro local sin SMTP real, asignación de organizador, autor, dos revisores independientes, participante, programa, asistencia y certificados, más un inventario de otros módulos.

El recorrido se hace por fases: primero el menú del administrador, después la cuenta organizadora y cada función científica y de participación. La guía no crea usuarios ni concede permisos.

## Punto pendiente detectado

El equipo de acreditación enumera solo personas con membresía activa en el evento. El registro local, la incorporación a una organización y una solicitud de inscripción no garantizan esa membresía en la implementación actual. El entorno anterior incluía membresías de demostración y podía ocultar esta limitación. La guía marca la asignación de un acreditador recién registrado como bloqueo a resolver al alcanzar esa fase, sin concederle organización como atajo.

## Entorno local

La administración conserva el contexto de organización org-a.sep.test. El portal público local utiliza el dominio interno del evento de prueba, programacion-ia.sep.test; no habrá sitio público hasta que el organizador lo publique. Son resoluciones locales del entorno, no registros DNS externos.

El respaldo completo y el recibo privado de limpieza están en .local/, excluidos de Git. No se añadió un botón público de reinicio. Los secretos de Google, RedUniv y ORCID, y la configuración pendiente de correo, no se publicaron ni alteraron.
