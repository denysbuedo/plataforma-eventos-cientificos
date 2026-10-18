# ADR-028: ediciones científicas autorizadas e inmutables

Estado: aceptado e implementado.

## Contexto

El sistema conserva versiones científicas privadas, revisiones y archivos. La aceptación no implica derechos para publicarlos. Los libros de resúmenes y memorias necesitan selección editorial, permisos explícitos, metadatos públicos y conservación independiente de los expedientes de trabajo.

## Decisión

Separar borrador editorial, selección por versión, autorización, revisión editorial y edición publicada. Usar dos tipos de edición: resúmenes y memorias con texto completo. La autorización corresponde al responsable del envío y distingue resumen de PDF final, con licencia y declaración de derechos/coautores. Los organizadores gestionan la edición, pero no conceden autorizaciones de autores por delegación implícita.

Cada revisión editorial registra la revisión de la autorización que examinó. Una huella une datos de edición, selección, fuentes y permisos. Publicar exige revalidarla y coordinar cambios con bloqueos. La operación es transaccional e idempotente por identificador de solicitud.

La edición guarda una proyección pública explícita, su PDF y copias propias de los archivos autorizados. No se hace público el almacén privado de manuscritos. Se omiten correos, identificadores de cuentas, evaluaciones, respuestas y notas internas. Los perfiles posteriores no reescriben la autoría histórica. Las notas editoriales internas permanecen bajo acceso del organizador.

Los registros y archivos publicados son inmutables. La única transición posterior es retirada motivada, conservando la copia de preservación y una ficha pública de estado, pero bloqueando descargas y exportaciones. Una corrección o nueva publicación genera otra edición y otro identificador. Se usan identificadores locales, sin simular DOI o ISBN.

## Consecuencias

El portal puede ofrecer libros, fichas, índices y metadatos sin filtrar expedientes privados. Se conserva el historial de selección, derechos, publicación y retirada, con notificaciones transaccionales. La generación PDF usa un worker acotado y la infraestructura de PDF/antivirus existente. Los permisos por organización y evento siguen en API y RLS. El volumen inicial se limita a 50 contribuciones, 50 MB y 1000 páginas por libro; escalarlo requiere generación asíncrona y almacenamiento operativo adicional.

Ver [recorrido, límites y validación](../development/publicaciones-cientificas.md).
