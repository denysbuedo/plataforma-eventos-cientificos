# ADR-013: espacio del autor y borradores privados

Estado: implementado; pruebas funcionales completas pendientes.

## Acceso y propiedad

Se inicia el módulo submissions con borradores privados. Cualquier cuenta autenticada y activa puede entrar a Mis trabajos desde el portal de un evento publicado, sin pertenencia institucional o rol de organizador. No se crea membresía ni inscripción al usar este espacio. El propietario procede de la identidad autenticada, nunca del cuerpo de la solicitud. En esta entrega es el creador del borrador; no constituye todavía una lista formal de autores.

La tabla author_works usa FK compuesta al evento, FK al propietario, revisión e índice por organización/evento/persona. RLS/FORCE exige simultáneamente organización, evento y propietario, sin excepción para el administrador institucional. El runtime no puede actualizar propietario, ámbito, convocatoria conservada o fecha de creación, ni borrar filas. La API limita todas las consultas al propietario además de RLS.

El espacio del autor tiene una capacidad independiente. No amplía los permisos de administración, lectura de borradores CMS o edición de convocatorias. La cuenta y el evento se comprueban en servidor en cada operación. Los borradores existentes permanecen legibles por su propietario aunque se cierre el plazo o se retire la convocatoria, mientras conserve acceso al host registrado y la cuenta siga activa.

## Reglas y edición

Crear requiere evento publicado, convocatoria publicada, evento no cancelado/finalizado/archivado y plazo de cierre aún vigente. Se permite preparar borradores antes de la apertura anunciada; el envío formal no existe todavía. Tras el día de cierre en la zona horaria de la convocatoria, la edición queda bloqueada. Retirar la convocatoria también congela la edición. Publicar una convocatoria nueva con plazo vigente puede volver a habilitar el espacio, manteniendo intactas las reglas de borradores anteriores.

Cada borrador copia íntegramente la instantánea publicada de convocatoria que utilizó. Área y tipo se validan contra esa copia al editar; los cambios posteriores no sustituyen silenciosamente las reglas. La API usa el plazo de la convocatoria vigente para habilitar edición. Antes del envío formal habrá que reconciliar explícitamente las reglas conservadas con la convocatoria aplicable.

Se guarda título, idioma, resumen y palabras clave. El idioma debe estar entre los idiomas de trabajo actuales del evento; si cambian, un borrador conserva el idioma anterior al consultarse, pero para volver a guardarlo se deberá elegir uno admitido. Los mínimos de resumen y palabras clave son informativos durante preparación: se pueden guardar datos incompletos. Los máximos del tipo se comprueban en servidor; el conteo de palabras usa separación por espacios en blanco. Se validan también longitudes, palabras clave sin duplicados y revisión vigente.

Las escrituras bloquean la fila del evento, coordinándose con publicaciones y cambios operativos, y guardan auditoría en la misma transacción. La revisión impide sobrescrituras obsoletas. Se permiten hasta 50 borradores por persona/evento. La lista devuelve resúmenes acotados; cada detalle se consulta aparte para no multiplicar cuerpos e instantáneas en la respuesta.

## Interfaz y límites

Mis trabajos está disponible desde el portal y desde el menú administrativo cuando hay un evento seleccionado. Se añade un perfil ficticio Autor a la demo. El acceso demo preserva el destino del espacio del autor después del login, sin cambiar los destinos anteriores de otros perfiles.

No hay envío al comité, inscripción, coautores, afiliaciones, archivos, borrado, revisión ni publicación de trabajos. El organizador no dispone de una lista de borradores ajenos. La configuración de identidad real sigue aplazada. Las comprobaciones dirigidas no sustituyen las pruebas completas de autorización, concurrencia y workflow pendientes.
