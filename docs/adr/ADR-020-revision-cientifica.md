# ADR-020 · Evaluación científica por versión y ronda

Estado: aceptado e implementado.

## Contexto

El dictamen del organizador y el seguimiento del autor estaban implementados, pero no existía evaluación por revisores. Dar al revisor permisos de organizador revelaría expedientes ajenos y borradores; evaluar el contenido editable perdería la referencia de qué se juzgó.

## Decisión

Separar invitación al comité, asignación, ronda, evaluación y dictamen. Requerir dos aceptaciones independientes y declarar conflictos. Fijar la versión oficial y los criterios al abrir la ronda; permitir borradores privados y congelar evaluaciones enviadas. Implementar primero simple ciego, con proyecciones sin contactos de autores y sin atribuir a los autores nombres de revisores o notas privadas.

La asignación no concede lectura directa de author_works o work_versions. RLS/FORCE y funciones limitadas comprueban conflictos, versión, evento, ronda, plazo y revocación en cada operación. Los archivos solo se sirven desde la versión asignada. Las escrituras se serializan sobre el trabajo y usan revisiones para evitar decisiones concurrentes sobre un expediente obsoleto.

El organizador sin conflicto emite el dictamen. Cuando hay rondas, las decisiones científicas exigen el mínimo de evaluaciones válidas de la versión actual o una excepción editorial explícita, auditada y visible al autor. Se publican únicamente los comentarios dirigidos a autores al cerrar la ronda mediante dictamen. No se transforma una recomendación en aceptación automática ni se calcula un promedio que sustituya la decisión.

## Consecuencias

Las nuevas versiones pueden requerir nuevas rondas y no modifican informes anteriores. Cambios de autoría y declaraciones de conflicto pueden invalidar elegibilidad. Una declaración tardía conserva el informe y requiere intervención editorial si ya hubo dictamen. No se afirma doble ciego sin un flujo real de manuscritos anonimizados. Correo, debate, réplicas y asignación automática siguen como ampliaciones independientes.

Ver [implementación, API y recorrido](../development/revision-cientifica.md).

La respuesta del autor y su valoración por los revisores originales se amplían en [ADR-021](ADR-021-valoracion-respuestas-y-dictamen-editorial.md), conservando la decisión final del organizador.
