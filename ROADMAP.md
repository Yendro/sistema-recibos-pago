# Roadmap: Sistema de Recibos y Pagos

## Fase 0 — Entorno aislado

- [x] Crear la rama de reestructuración.
- [x] Retirar solicitudes y Google Forms del código.
- [x] Retirar Google Docs del modelo de generación.
- [x] Validar el flujo vertical directamente en la Web App.
- [x] Validar PDF, firma, fotografía y envío desde Apps Script.

## Fase 1 — Flujo funcional

- [x] Inicialización automática de directorios, propiedades y archivos.
- [x] Ubicación de dependencias dentro de la carpeta del proyecto Apps Script.
- [x] Configuración de tipos de recibo y contactos.
- [x] Alta y eliminación masiva de contactos con validación atómica.
- [x] Captura manual y pegado masivo mediante cuadrícula editable.
- [x] Orden de captura Cliente, Concepto, Importe y Fecha.
- [x] Bandeja de recibos pendientes.
- [x] Identificación de pendientes por concepto en lugar del folio técnico.
- [x] Firma integrada y captura comprimida de evidencia.
- [x] Generación directa de PDF en carta y A4.
- [x] Envío a contactos configurados.
- [x] Reporte derivado en Sheets.
- [x] Operación unificada para captura, firma, consulta y envío.
- [x] Ruta de inicio con bienvenida y guía de usuario.
- [x] Índice de recibos y caché de lecturas frecuentes.
- [x] Eliminación protegida de recibos no enviados.
- [x] Interfaz responsive con Material Symbols y Nautical Blues.

## Fase 2 — Robustecimiento

La fase 2 no agrega el flujo principal: reduce el costo de recuperación y mejora
la trazabilidad cuando un servicio de Google falla.

| Capacidad | Estado actual | Trabajo restante | Prioridad |
| --- | --- | --- | --- |
| Respaldos versionados de JSON | Parcial: existe `respaldos/` y el índice puede reconstruirse | Crear snapshots antes de escrituras críticas, retención y restauración guiada | Alta después del lanzamiento |
| Historial de eventos por recibo | Parcial: existen estado, fechas, destinatarios y último error | Registrar una secuencia inmutable de creación, firma, envío, error y eliminación | Media |
| Anulación y reenvío controlado | Parcial: se reintenta `ERROR_ENVIO`; los enviados son inmutables | Definir si el negocio necesita anular o reenviar un recibo ya enviado | Baja hasta tener requisito |
| Reconciliación del reporte | Parcial: sincronización inmediata y eliminación consistente | Crear una cola de pendientes y una función que reconstruya filas faltantes | Alta después del lanzamiento |
| Pruebas automatizadas del dominio | Parcial: existe verificación estática de contratos y sintaxis | Añadir pruebas unitarias de estados, importes, plantillas y paginación | Media |
| Medición de rendimiento | Parcial: índice, caché y navegación unificada ya mejoraron la respuesta | Registrar tiempos reales en PC y tableta con una muestra definida | Baja |

Robustecimiento que ya contiene el proyecto:

- Bloqueo de escrituras concurrentes con `LockService`.
- Estados explícitos para errores de PDF y correo.
- Validación del PDF antes de guardarlo.
- Reconstrucción del índice desde archivos mensuales.
- Invalidación de caché después de mutaciones.
- Protección absoluta de recibos enviados frente a eliminación.
- Restauración compensatoria al eliminar datos operativos.
- Archivos eliminados mediante la papelera de Drive.

## Fase 3 — Liberación

- [x] Validar el flujo de aceptación y el PDF en la Web App.
- [ ] Publicar los commits pendientes en el remoto.
- [ ] Integrar la rama de reestructuración en `main`.
- [ ] Confirmar o actualizar la URL del remoto renombrado.
- [ ] Convertir `[Sin publicar]` del changelog en la versión `2.0.0`.
- [ ] Crear o actualizar el despliegue productivo.
- [ ] Ejecutar la prueba de humo en producción.
- [ ] Conservar el sistema anterior disponible para reversión durante el corte.
- [ ] Archivar el sistema anterior como solo lectura después de estabilizar.
