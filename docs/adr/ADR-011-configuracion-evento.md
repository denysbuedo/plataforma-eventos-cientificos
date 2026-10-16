# ADR-011: configuración estructurada y ciclo operativo del evento

Estado: implementado; validación funcional completa pendiente.

## Decisión

Se añade event_configurations, con clave compuesta organización/evento, FK al evento, RLS/FORCE y acceso por el runtime dentro de su contexto. Contiene fechas locales, modalidad, idiomas de trabajo, idioma principal, ciclo operativo y revisión. La zona horaria sigue siendo la propiedad única de events para evitar dos valores distintos.

La configuración se consulta con permiso de lectura del evento. Guardar o cambiar el ciclo exige organizador explícito; ser administrador institucional no sustituye esa asignación. El servidor bloquea la fila del evento, compara la revisión, valida y guarda con auditoría en una transacción. Las publicaciones CMS toman el mismo bloqueo. El runtime recibe únicamente el grant adicional de UPDATE(timezone) sobre events y SELECT/INSERT/UPDATE sobre la nueva tabla.

No se crea una configuración persistente al consultar: sin fila se devuelve revisión 0, fechas sin confirmar, modalidad presencial, idiomas es/en, principal es y estado planning. Son valores iniciales editables, no hechos inferidos del contenido editorial. Las fechas de las demos y CMS existentes no se convierten automáticamente en fechas operativas.

Las fechas son YYYY-MM-DD entre 1900 y 9999, sin hora. Deben estar ambas definidas o ambas vacías, y el cierre no puede preceder al inicio. La API valida el calendario real y la zona horaria. Modalidades: in_person, virtual, hybrid. Debe elegirse uno o ambos idiomas es/en sin duplicados, y el principal debe pertenecer a la selección. La configuración de idiomas de trabajo no deshabilita traducciones de la interfaz o del CMS.

## Ciclo de vida

El ciclo operativo es independiente de draft/published/archived, que continúa representando el estado editorial existente.

| Desde | Hacia |
|---|---|
| planning | scheduled, cancelled |
| scheduled | planning, ongoing, cancelled |
| ongoing | completed, cancelled |
| cancelled | planning |
| completed | Sin transición desde esta versión |

Programado, en curso y finalizado requieren fechas configuradas. No hay cambios automáticos por el reloj, y se pueden cargar datos de eventos históricos. Finalizado bloquea la edición de configuración; cancelar permite corregir datos y volver a planificación. Archivar sigue fuera de este incremento y los eventos ya archivados no se modifican.

Los cambios de ciclo no publican ni retiran el portal, abren inscripciones, habilitan envíos o conceden roles. El CMS sigue su flujo independiente. La confirmación de finalización informa que no existe reapertura en esta pantalla.

## Relación con el portal

Las fechas se editan en Datos del evento. Cuando están definidas, prevalecen sobre las fechas editoriales al cargar/guardar el borrador y al construir una publicación. Configurarlas no modifica instantáneas públicas anteriores: se debe volver a publicar. Los borradores y publicaciones anteriores conservan sus fechas editoriales mientras las fechas estructuradas estén sin confirmar. No se infieren fechas operativas de esos valores históricos.

La modalidad y los idiomas quedan disponibles en la API administrativa para los siguientes módulos. Este incremento no agrega acceso a reuniones virtuales, horarios por sesión ni formularios de inscripción.

## Límites y verificación pendiente

Se conserva la auditoría existente de acciones, actor, evento y petición; no se añade un historial de valores anteriores/posteriores. Las pruebas completas de transiciones, concurrencia, publicación y cruces de organización permanecen aplazadas por instrucción del propietario. La activación de RedUniv y Google continúa pendiente.
