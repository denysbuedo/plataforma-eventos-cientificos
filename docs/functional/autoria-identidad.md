# Autoría y cuentas: propuesta de vinculación

Estado: perfil voluntario, búsqueda y selección de personas registradas implementados; reclamaciones y aprobaciones generales pendientes. La conexión autenticada con ORCID y la invitación/aceptación de [gestión compartida con correspondencia](../development/gestion-compartida-trabajos.md) están implementadas. Véanse [búsqueda de autores](../development/busqueda-autores.md) y [activación de ORCID](../development/orcid.md).

## Modelo

Separar persona, cuenta de acceso y declaración de autoría. Una persona puede tener varias identidades de acceso; un autor declarado puede no tener ninguna cuenta todavía. El nombre no es un identificador único. Incluso ORCID [desaconseja asociar identificadores mediante búsquedas solo por nombre](https://info.orcid.org/ufaqs/how-do-i-find-orcid-record-holders-at-my-institution/).

La declaración conserva nombre, afiliación y contacto correspondientes al trabajo. Una vinculación confirmada apunta a una persona sin reescribir los datos de versiones oficiales. Los cambios del perfil no deben modificar retroactivamente las publicaciones.

## Flujo y estado

1. Implementado: al añadir autor se ofrece primero búsqueda de personas que activaron visibilidad: nombre, afiliación y ORCID de producción, con límites y privacidad de contacto. Seleccionar conserva una referencia, no autoriza a editar su perfil ni confirma por sí solo que acepta la autoría. Una declaración manual existente puede vincularse expresamente sin crear otra fila.
2. Si no está registrada, permitir una declaración mínima con nombre, afiliación y contacto. No crear una cuenta de acceso ficticia. Exigir correo verificado al reclamar, no suponer que el correo escrito por otra persona está verificado.
3. Tras registrarse, ofrecer coincidencias basadas preferentemente en contacto verificado o identificador autenticado. El nombre y la afiliación sirven para encontrar candidatos, no para enlazar automáticamente. No revelar títulos, resúmenes, archivos ni contactos de trabajos privados durante esa búsqueda.
4. La persona solicita reconocer una declaración. El autor de correspondencia registrado confirma si ya aceptó esa responsabilidad; hasta entonces lo gestiona provisionalmente el remitente original. Si se trata de su propia declaración, debe intervenir otro responsable autorizado para evitar autoaprobación. Guardar estados pendiente, aprobada, rechazada y revocada con evidencia y auditoría. Esta política está acordada, pero aún falta implementar las solicitudes y aprobaciones.
5. Al aprobar, asociar la declaración a la persona canónica y mostrarla en su espacio de contribuciones. No otorgar propiedad o edición del trabajo automáticamente; esos permisos se gestionan por separado.

Contemplar homónimos, alias, cambio de correo, varias declaraciones de la misma persona, cuentas RedUniv/Google, reclamaciones contradictorias y una vía administrativa de resolución. Unificar personas requiere revisión explícita; nunca fusionar cuentas por nombre.

## Incremento ya implementado

El detalle comparte presentación con la bandeja y las versiones: metadatos en una cuadrícula, resumen legible, palabras clave en línea separadas por punto y coma, y tarjetas de autores con afiliación y correspondencia.

La edición explica su bloqueo según estado. Los borradores recién creados y guardados devuelven correctamente su disponibilidad de edición. Al editar un trabajo sin autores se precargan los datos disponibles de la cuenta; también existe Añadirme con mis datos. Se usan nombre, correo verificado de la sesión si existe e instituciones propias. País y datos ausentes deben completarse. La selección propia guarda personId y carga el ORCID conectado. La búsqueda y selección de otras personas que activaron visibilidad ya están disponibles; las reclamaciones sobre declaraciones anteriores siguen pendientes.
