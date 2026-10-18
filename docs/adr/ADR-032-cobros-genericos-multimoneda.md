# ADR-032: catálogo de cobros por evento y conciliación explícita

Estado: aceptada. Fecha: 2026-10-18.

## Contexto

La institución requiere efectivo, varias pasarelas que pueden cambiar por edición y cobros en CUP, USD y EUR. Se identifican Transfermóvil y Enzona para CUP. No se han aportado contratos técnicos ni credenciales de proveedores.

## Decisión

Separar catálogo público de medios, tarifas, cobros congelados, declaraciones de participantes y decisiones verificadas de organizadores. El catálogo admite nombres libres, monedas, instrucciones, enlace HTTPS y campos públicos de comercio; no almacena secretos. Las monedas no se convierten ni se suman entre sí. Los importes usan dos decimales y aritmética entera de unidades menores.

Un cobro conserva tarifa e importe originales, impide duplicados activos por persona/tarifa y admite idempotencia por solicitud. El participante puede comunicar pagos externos, pero solo un organizador puede confirmar una transacción o un recibo de efectivo. Se impide reutilizar referencias confirmadas por medio/evento, incluso tras reembolsos. Exención, anulación y reembolso total realizado son decisiones motivadas y auditadas. El sistema no mueve dinero mediante estas decisiones.

Historiales de configuración/cobros inmutables, control de revisiones, bloqueo del evento y RLS forzada. La confirmación no concede inscripción, asistencia, aceptación ni certificados. Las notificaciones se escriben en la misma transacción.

## Consecuencias

La configuración genérica funciona sin recompilar cuando cambian nombres, instrucciones o enlaces. Las API de órdenes, notificaciones firmadas, consulta y reembolsos requieren adaptadores específicos de proveedor. La configuración de catálogo no se anuncia como integración automática de Transfermóvil/Enzona. Se difieren pagos parciales, caja/arqueo, fiscalidad y rol dedicado de cajero. La demo usa exclusivamente datos sintéticos.
