# ADR-023: estructura científica, espacios y formatos

Estado: aceptada para el segundo bloque del programa.

## Contexto

La prueba del propietario mostró un formulario disperso y un modelo que confundía sesión, actividad científica y presentación. Las salas como texto admitían denominaciones diferentes para el mismo recurso. Se solicitó estudiar talleres, simposios y mesas redondas con referencias internacionales antes de ampliar el programa.

La [comparación internacional](../architecture/estudio-organizacion-cientifica-eventos.md) muestra diferencias entre comunidades y actividades que agrupan varias sesiones. La taxonomía de SEP es una propuesta operativa, no una clasificación internacional normativa.

## Decisión

Mantener el evento como ámbito de identidad, permisos, inscripciones y publicación. Incorporar actividades científicas con identificador, tipo, nombre, descripción y coordinadores dentro del agregado del programa. Una sesión puede vincularse a una actividad o ser independiente; cada sesión conserva su horario, tipo, espacios, participantes y presentaciones.

Gestionar espacios físicos y virtuales como entidades del evento con código único, ID estable, nombre, ubicación, capacidad opcional, disponibilidad y revisión. Las sesiones los referencian por ID. Una sesión híbrida reserva dos recursos. Archivar/cambiar el tipo de un espacio usado exige reasignar antes sus sesiones de borrador; renombrar uno usado actualiza el borrador y aumenta su revisión. La publicación permanece fija hasta volver a publicar.

Distinguir el tipo de contribución de su formato final de presentación y de la participación presencial/virtual del presentador. Una sesión de pósteres permite presentaciones simultáneas. Los conflictos entre sesiones se comprueban por recursos y personas; el número de póster es único dentro de su sesión.

Permitir talleres, paneles, debates, cursos, conferencias y otras sesiones sin artículos: para publicarlas se requiere descripción y participantes responsables. Las sesiones de ponencias y pósteres conservan el requisito de trabajos aceptados. Conferencista, panelista, debatiente y facilitador son funciones de participación, sin permisos administrativos implícitos. Los coordinadores de actividades tienen una vista personal de sus responsabilidades publicadas.

Reorganizar la interfaz en Sesiones, Actividades científicas y Salas y espacios. Crear una sesión sigue cuatro pasos con revisión explícita antes de guardar. Los espacios pueden gestionarse en un diálogo sin descartar el formulario. Se conservan los fondos uniformes y la protección de cambios sin guardar.

## Persistencia y compatibilidad

La migración 0057 añade program_spaces con RLS/FORCE y program_drafts.activities. Las referencias contenidas en JSON se validan transaccionalmente dentro del contexto del evento; no se presentan como claves foráneas SQL entre cada entrada JSON y el catálogo. El arranque comprueba 32 tablas de negocio.

La migración convierte los nombres existentes del borrador en espacios, agrupando únicamente coincidencias de nombre con diferencias de mayúsculas o espacios repetidos. Otros nombres no se fusionan por conjetura. Conserva sesiones, horarios, trabajos y presentadores. No cambia instantáneas publicadas. Una sesión híbrida antigua conserva su sala física y requiere seleccionar un canal virtual antes de guardar/publicar de nuevo. El borrador convertido aumenta su revisión.

## Consecuencias

No se crean subeventos con permisos independientes ni procesos de evaluación de propuestas de simposios. Se conserva el límite de un trabajo en una sola presentación. Los códigos iniciales permiten etiquetas bilingües y una alternativa genérica; personalizar catálogos por evento queda pendiente. La infraestructura de videoconferencia, las mesas simultáneas en una misma sala, los copresentadores, la asincronía, la inscripción por taller y la asistencia requieren desarrollos propios.
