# Autoría y cuentas: propuesta de vinculación

Estado: propuesta para el siguiente incremento. La búsqueda de personas, reclamaciones y aprobaciones todavía no están implementadas.

## Modelo

Separar persona, cuenta de acceso y declaración de autoría. Una persona puede tener varias identidades de acceso; un autor declarado puede no tener ninguna cuenta todavía. El nombre no es un identificador único. Incluso ORCID [desaconseja asociar identificadores mediante búsquedas solo por nombre](https://info.orcid.org/ufaqs/how-do-i-find-orcid-record-holders-at-my-institution/).

La declaración conserva nombre, afiliación y contacto correspondientes al trabajo. Una vinculación confirmada apunta a una persona sin reescribir los datos de versiones oficiales. Los cambios del perfil no deben modificar retroactivamente las publicaciones.

## Flujo propuesto

1. Al añadir autor, ofrecer primero búsqueda de personas registradas: nombre y afiliación, con límites y privacidad de contacto. Seleccionar una persona conserva una referencia, no autoriza a editar su perfil ni confirma por sí solo que acepta la autoría.
2. Si no está registrada, permitir una declaración mínima con nombre, afiliación y contacto. No crear una cuenta de acceso ficticia. Exigir correo verificado al reclamar, no suponer que el correo escrito por otra persona está verificado.
3. Tras registrarse, ofrecer coincidencias basadas preferentemente en contacto verificado o identificador autenticado. El nombre y la afiliación sirven para encontrar candidatos, no para enlazar automáticamente. No revelar títulos, resúmenes, archivos ni contactos de trabajos privados durante esa búsqueda.
4. La persona solicita reconocer una declaración. El autor de correspondencia confirma; si se trata de su propia declaración, debe intervenir otro responsable autorizado para evitar autoaprobación. Guardar estados pendiente, aprobada, rechazada y revocada con evidencia y auditoría.
5. Al aprobar, asociar la declaración a la persona canónica y mostrarla en su espacio de contribuciones. No otorgar propiedad o edición del trabajo automáticamente; esos permisos se gestionan por separado.

Contemplar homónimos, alias, cambio de correo, varias declaraciones de la misma persona, cuentas RedUniv/Google, reclamaciones contradictorias y una vía administrativa de resolución. Unificar personas requiere revisión explícita; nunca fusionar cuentas por nombre.

## Incremento ya implementado

El detalle comparte presentación con la bandeja y las versiones: metadatos en una cuadrícula, resumen legible, palabras clave en línea separadas por punto y coma, y tarjetas de autores con afiliación y correspondencia.

La edición explica su bloqueo según estado. Los borradores recién creados devuelven correctamente su disponibilidad de edición. Al editar un trabajo sin autores se precargan los datos disponibles de la cuenta; también existe Añadirme con mis datos. Se usan nombre, correo verificado de la sesión si existe e instituciones propias. País y datos ausentes deben completarse. Esto es precarga de una declaración, no vinculación persistente ni búsqueda de otros usuarios.
