# Roadmap: reestructuración del Sistema de Recibos y Pagos

## Fase 0 — Entorno aislado

- [x] Crear la rama `refactor/reestructuracion-completa`.
- [x] Retirar solicitudes y Google Forms del código.
- [x] Retirar Google Docs del modelo de generación.
- [ ] Crear y vincular un proyecto Apps Script exclusivo para pruebas.
- [ ] Ejecutar la prueba vertical en el despliegue web.

## Fase 1 — Flujo funcional

- [x] Inicialización automática de directorios y archivos.
- [x] Ubicación de dependencias dentro de la carpeta del proyecto Apps Script.
- [x] Configuración de tipos de recibo y contactos.
- [x] Creación masiva mediante datos tabulados.
- [x] Captura manual y masiva mediante cuadrícula editable.
- [x] Bandeja de recibos pendientes.
- [x] Firma integrada en la representación del recibo.
- [x] Captura y compresión de evidencia.
- [x] Generación directa de PDF.
- [x] Envío a contactos configurados.
- [x] Reporte derivado en Sheets.
- [x] Ruta operativa unificada para captura, firma, consulta y envío.
- [x] Índice de recibos y caché de configuración y resumen.
- [x] Tema claro de alto contraste e iconos Material Symbols.
- [ ] Validar visualmente el PDF generado por Apps Script.

## Fase 2 — Robustecimiento

- [ ] Añadir respaldos versionados y recuperación de JSON.
- [ ] Añadir historial de eventos por recibo.
- [ ] Añadir anulación y reenvío controlado.
- [ ] Añadir sincronización pendiente del reporte.
- [ ] Añadir pruebas automatizadas del dominio.
- [ ] Medir tiempos reales del despliegue en PC y tableta.

## Fase 3 — Liberación

- [ ] Completar pruebas de aceptación.
- [ ] Preparar el corte desde el sistema anterior.
- [ ] Renombrar repositorio y remoto a `sistema-recibos-pagos`.
- [ ] Crear despliegue productivo nuevo.
- [ ] Archivar el sistema anterior como solo lectura.
