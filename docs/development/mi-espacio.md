# Mi espacio: navegación y presentación del participante

Mi espacio utiliza una estructura compartida para **Mis trabajos**, **Autorías** y **Mi perfil**. La referencia visual es el perfil: tarjetas claras, tipografía legible, jerarquía de títulos, afiliaciones agrupadas, estados discretos y acciones alineadas. Los cambios científicos siguen en los componentes específicos de trabajos; esta estructura no cambia permisos ni estados del envío.

## Organización

| Ubicación | Contenido | Alcance |
|---|---|---|
| Menú lateral, primero | Mis trabajos | Trabajos propios y gestión compartida del evento |
| Menú lateral, segundo | Autorías | Reconocimiento, solicitudes y actividad del evento |
| Menú lateral, tercero | Mis revisiones | Asignaciones científicas y valoración de respuestas |
| Menú lateral, cuarto | Mi participación | Presentaciones y moderaciones del programa publicado |
| Menú lateral | Mis certificados | Documentos reales emitidos, descarga privada, estado e historial |
| Menú de cuenta, arriba a la derecha | Mi perfil | Identidad y datos académicos reutilizables entre eventos |
| Menú de cuenta, arriba a la derecha | Cerrar sesión | Disponible desde las tres pantallas |
| Acceso secundario al pie del lateral | Portal público | Portal del contexto conservado; en móvil se ofrece dentro del menú superior |
| Logotipo SEP | Inicio de Mi espacio | Mis trabajos del contexto actual; Mi perfil si no se ha seleccionado evento |

El nombre y las iniciales de la cuenta aparecen siempre en la misma posición de la cabecera, a la derecha; en pantallas estrechas el nombre puede abreviarse visualmente, pero se muestra completo al desplegar la cuenta. La selección de idioma conserva la pantalla y el evento. No se duplica Mi perfil como tarea del evento en el lateral. Las tareas pendientes de Autorías siguen contando aunque se hayan visto; las respuestas leídas dejan de contar. El contador se sincroniza también mientras se permanece en Autorías.

Esta separación adapta la orientación de [navegación de servicios del GOV.UK Design System](https://design-system.service.gov.uk/patterns/navigate-a-service/): identidad/herramientas generales separadas de la navegación del servicio y logotipo hacia el inicio correspondiente. Se aplica el criterio de estructura, sin adoptar su marca ni sus componentes visuales.

## Edición y salida

`participant-shell.tsx` centraliza cabecera, navegación, cuenta, idioma, portal y cierre de sesión. Los editores registran sus protecciones de navegación. Salir a otra sección, al portal, cambiar de idioma o cerrar sesión ofrece guardar/descartar/seguir editando cuando hay cambios. El logout no se ejecuta antes de resolver esa decisión. Se conserva la advertencia nativa para cerrar la pestaña o recargar. La navegación propia de Mis trabajos mantiene el cierre del panel de detalle y el control de cambios en contenido/PDF.

El menú de cuenta admite navegación por teclado, cierre con Escape y cierre al pulsar fuera. Los enlaces activos indican la página actual y los destinos mantienen el contexto. Los componentes del administrador del evento pertenecen a otra zona funcional; no se convierten en el espacio del participante.

## Certificados: ubicación y alcance futuro

**Mis certificados** está integrado en el menú lateral, con emisión real desde el módulo del organizador. Muestra solo los documentos de la persona en el evento. Esta ubicación sirve también para asistentes que no presentan trabajos.

Cada certificado futuro debe identificar la persona, el evento, el concepto de participación (asistencia, ponencia, organización, revisión u otros configurados), el estado de emisión y las acciones reales disponibles: descargar y verificar. Una autoría reconocida no debe producir un certificado automáticamente. La elegibilidad depende de las reglas del evento y de las evidencias correspondientes, como asistencia o presentación; la definición y emisión pertenecen al [módulo de certificados](certificados.md).

La configuración de plantillas y reglas, emisión y revocación será del organizador; la consulta/descarga propia estará en Mi espacio. El perfil conserva los datos personales comunes y no se transforma en un archivo de certificados por evento.

## Verificación

Compilación y análisis estático. Revisión dirigida en navegador a 1440, 390 y 320 píxeles: misma identidad, orden y enlaces en las tres secciones; cuenta y portal accesibles; Escape; idiomas ES/EN; salida protegida del perfil y del trabajo; logout antes/después de resolver cambios y cierre de sesión desde las tres pantallas. Se usaron copias de trabajos interceptadas solo en el navegador para simular edición, sin guardar perfiles ni trabajos reales. La batería funcional completa continúa aplazada.

**Mis revisiones** se incorpora después de Autorías como área propia del revisor por evento, con las mismas opciones de cuenta, idioma, cierre de sesión y protección de cambios sin guardar. No implica pertenecer al comité: una persona sin invitaciones ve su bandeja vacía.

## Novedades de los trabajos

Mis trabajos incorpora un contador lateral de trabajos con dictámenes o comentarios de revisión pendientes de leer. Un aviso destacado permite abrir directamente el bloque de dictamen y revisiones; consultar ese bloque registra la lectura para la persona actual. Cambiar a Autorías o Mi perfil y regresar no vuelve a marcarlo como pendiente. Un dictamen posterior genera una novedad nueva. Las notificaciones de Autorías y Mis revisiones conservan sus flujos independientes.

## Criterio visual acordado

No añadir fondos sombreados ni sombras para destacar avisos, novedades o secciones de la interfaz. Usar tipografía, espaciado, bordes y separadores, manteniendo el fondo uniforme. Este criterio se aplica también a los próximos cambios de diseño.

En Mis trabajos el fondo es uniforme en consulta y edición: tarjetas, fila seleccionada, metadatos, avisos e historial no llevan rellenos sombreados ni sombras. La selección se identifica con un borde simple y el texto En consulta / En edición. Se retiraron también las sombras CSS que quedaban en el menú de cuenta y los selectores visuales compartidos.

El aviso «Tienes novedades en un trabajo» se presenta como texto y separadores, sin contorno de tarjeta, esquinas redondeadas ni franja lateral destacada. No usar esos recursos como sustitutos de los sombreados retirados.

Mi participación se alimenta del [programa científico publicado](programa-cientifico.md). No muestra borradores y no atribuye asistencia ni certificados por estar programado.

Mi inscripción se incorpora como área del participante, con la misma cabecera y cuenta. Muestra la solicitud y su historial, separada de la agenda de Mi participación. Véase [Inscripciones](inscripciones.md).

Mi acreditación incorpora la credencial por evento y la consulta del historial de asistencia propio. Mantiene la cabecera y navegación compartidas. Los certificados están en su sección propia, separados de la credencial de acceso.
