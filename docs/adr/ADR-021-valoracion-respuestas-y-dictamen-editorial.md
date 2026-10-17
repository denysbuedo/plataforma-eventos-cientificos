# ADR-021 · Valoración de respuestas y autoridad editorial

Estado: aceptado e implementado.

## Contexto

Tras una corrección, el organizador recibía la respuesta del autor; los revisores solo podían consultarla si aceptaban otra asignación completa. Se necesita su valoración de la respuesta sin convertirla en una revisión nueva ni en un voto vinculante sobre el trabajo.

## Decisión

Separar respuesta del autor, valoración de esa respuesta, evaluación completa y dictamen. Notificar internamente a los revisores cuyos comentarios fueron publicados; cada uno consulta su observación y contestación, sin respuestas individuales ajenas ni archivos de la nueva versión. La valoración favorable o desfavorable exige explicación y confirmación y queda fija por persona y versión.

El organizador conserva la última palabra. Para aceptar con desacuerdos, pendientes o revisión insuficiente debe justificar una excepción editorial. La aceptación registra su fundamento: revisión favorable suficiente, desacuerdo explícito o revisión insuficiente. La explicación privada del revisor no se publica al autor; sí la excepción editorial y su fundamento agregado. Las valoraciones no cambian automáticamente el estado del trabajo.

Las valoraciones completas pueden resolver las correcciones sin una nueva ronda, respetando el mínimo de la ronda de origen. Una nueva revisión de contenido/PDF requiere otra asignación explícita. Si se piden más aclaraciones sobre las mismas observaciones, la siguiente respuesta vuelve a los revisores originales y conserva las anteriores.

## Seguridad y consecuencias

Se materializan tareas con una copia mínima, sin documentos ni datos confidenciales de otros revisores. RLS/FORCE, privilegios limitados, funciones con contexto validado e inmutabilidad en PostgreSQL protegen destinatario, versión y valoración. Conflictos, revocación, cambios de versión y cierre del expediente se revalidan. Las respuestas históricas solo se enlazan cuando su publicación puede corresponderse inequívocamente con una ronda.

El aviso forma parte del contador de tareas por resolver, no de mensajes sin leer; abrirlo no equivale a valorarlo. Correos, apelaciones y debate entre revisores siguen fuera de este incremento.

Ver [flujo, API, límites y verificaciones](../development/revision-cientifica.md#avisos-y-valoración-de-las-respuestas-por-revisores-anteriores).
