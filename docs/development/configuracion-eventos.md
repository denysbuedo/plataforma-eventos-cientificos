# Configuración del evento

En la administración abrir un evento y entrar en **Datos del evento**. El bloque de nombres existente conserva su guardado; el nuevo bloque permite definir fechas, zona horaria, modalidad, idiomas de trabajo y principal. Se necesitan permisos de organizador del evento. El administrador institucional puede asignarse desde Equipo antes de editar.

Guardar ambos extremos del intervalo, o dejarlos vacíos durante planificación. Para marcarlo como programado se necesitan fechas guardadas. La zona horaria usa un identificador reconocido, por ejemplo America/Havana. Los idiomas seleccionados son los de trabajo del encuentro; SEP conserva su interfaz bilingüe.

El bloque de ciclo de vida ofrece solo las transiciones permitidas. Guardar la configuración antes de cambiar el estado. La cancelación puede revertirse a planificación. La finalización deja la configuración en consulta y no ofrece reapertura en esta versión. El estado operativo no retira ni publica el portal.

Las fechas se muestran en el CMS como consulta y enlazan a Datos del evento. Después de configurarlas, volver a publicar para actualizar el portal público. Mientras no haya fechas estructuradas, los sitios anteriores mantienen las fechas editoriales que tenían; estas no se importan como confirmación operativa. La modalidad y los idiomas se administran aquí para su uso por los siguientes módulos.

En Datos del evento también está disponible **Publicar cambios**, con una indicación explícita de que guardar no modifica el portal. Primero guardar la configuración y después publicar. **Ver sitio** abre la última publicación, no una vista previa del borrador. La publicación incluye el borrador editorial guardado del evento, además de las fechas configuradas.

## API y migraciones

| Método | Ruta bajo /api/v1/events/:eventId | Permiso |
|---|---|---|
| GET | /configuration | Lectura contextual del evento |
| PUT | /configuration | Organizador explícito |
| POST | /lifecycle | Organizador explícito |

PUT requiere timezone, startDate, endDate, modality, languages, defaultLanguage y revision. Para fechas pendientes enviar null en ambas. POST requiere lifecycle y revision. Ambos devuelven EventConfiguration; revisión obsoleta devuelve REVISION_CONFLICT y programación sin fechas devuelve EVENT_DATES_REQUIRED.

Aplicar migraciones 0015 y 0016 antes de arrancar la API nueva: añaden la tabla y sus restricciones, FORCE RLS y privilegios limitados. El arranque comprueba la nueva tabla junto con las anteriores. No se recrean eventos, dominios o cuentas.

No se ha ejecutado la batería funcional completa por solicitud del propietario. Pendiente cubrir permisos negativos, cruce entre organizaciones, fechas inválidas, idioma principal no seleccionado, revisiones concurrentes, transiciones rechazadas, estado finalizado, rollback de auditoría y fechas efectivas en publicaciones. Compilación y comprobaciones dirigidas no cierran ese pendiente.

En la demo se aplicaron ambas migraciones, pasó la compilación completa y el análisis estático, se comprobó escritura/lectura con sep_runtime en una transacción revertida y respondieron correctamente la API de configuración y la pantalla autenticada en español e inglés. No se validaron por navegador las acciones interactivas ni el ciclo completo.
