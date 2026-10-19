# Análisis de la fase 2

## Objetivo

La fase 2 aumenta la capacidad de diagnóstico y recuperación. No es necesaria
para crear, firmar, enviar o consultar recibos: ese flujo ya está implementado y
validado en la Web App.

Su desarrollo queda aplazado hasta integrar la reestructuración en `main` y
validar el despliegue continuo con GitHub Actions. Esta decisión evita mezclar
cambios de persistencia con la preparación de la entrega automática.

Para el volumen actual —aproximadamente diez recibos diarios y pocos operadores—
ningún punto restante debe bloquear el lanzamiento. Las prioridades cambian si
crece el volumen, se agregan cuentas o existe una obligación formal de auditoría.

## 1. Respaldos versionados y recuperación de JSON

### Lo que ya existe

- Directorio `respaldos/` creado por el inicializador.
- Separación mensual de recibos para limitar el alcance de una corrupción.
- Versiones internas incrementales dentro de los documentos JSON.
- Reconstrucción de `indice-recibos.json` desde los archivos mensuales.
- Propiedades con identificadores estables de archivos y directorios.

### Lo que falta

- Copiar el JSON anterior a `respaldos/` antes de una escritura crítica.
- Definir retención, por ejemplo 30 copias diarias o 90 días.
- Una función de diagnóstico que liste respaldos disponibles.
- Una recuperación guiada que valide el archivo antes de reemplazarlo.

### Recomendación

Es la mejora más valiosa después del lanzamiento. Empezar por configuración,
contactos, tipos e índice; después incorporar los archivos mensuales.

## 2. Historial de eventos por recibo

### Lo que ya existe

- Fechas de creación, actualización, firma y envío.
- Estado actual, destinatarios y último error.
- Registro técnico en las ejecuciones de Apps Script.

### Lo que falta

Un arreglo inmutable de eventos, por ejemplo:

```json
{
  "tipoEvento": "RECIBO_ENVIADO",
  "fecha": "2026-08-10T14:30:00.000Z",
  "detalle": "Enviado a 2 destinatarios"
}
```

### Recomendación

Prioridad media. Es útil para auditoría y soporte, pero el reporte actual cubre
las preguntas operativas principales.

## 3. Anulación y reenvío controlado

### Lo que ya existe

- Reintento de envío cuando el estado es `ERROR_ENVIO`.
- Eliminación de recibos no enviados.
- Protección en servidor e interfaz para no eliminar `ENVIADO`.
- Constante `ANULADO` reservada.

### Lo que falta

- Decidir si un recibo enviado puede anularse sin desaparecer.
- Definir si un reenvío crea un evento o una nueva versión del PDF.
- Registrar motivo, fecha y destinatarios de una anulación o reenvío.

### Recomendación

No implementar hasta que exista una regla de negocio. Permitir estas acciones sin
una política puede generar más inconsistencias que las que resuelve.

## 4. Sincronización pendiente del reporte

### Lo que ya existe

- Escritura inmediata después de firma y envío.
- Búsqueda por identificador estable para actualizar filas.
- Eliminación estricta de la fila cuando se elimina un recibo.
- El reporte no es fuente operativa, por lo que una falla no detiene la caja.

### Lo que falta

- Marcar internamente una sincronización fallida.
- Cola de recibos pendientes por sincronizar.
- Función `reconciliarReporteGeneral()` que agregue, actualice o retire filas.
- Resumen del resultado para revisión administrativa.

### Recomendación

Es la segunda mejora prioritaria después del lanzamiento. Reduce el riesgo de que
un corte omita un recibo por una falla temporal de Sheets.

## 5. Pruebas automatizadas del dominio

### Lo que ya existe

`npm run verificar` valida:

- Sintaxis de servidor y navegador.
- Funciones públicas autorizadas.
- Referencias entre scripts y elementos HTML.
- Manifiesto y acceso restringido.
- Ausencia de Google Docs, Forms y raíz de Mi unidad.
- Contratos de imágenes PDF y eliminación de recibos.

### Lo que falta

- Pruebas unitarias para importes en letra y normalización.
- Matriz de transiciones de estado.
- Pruebas de paginación, filtros y variables de plantilla.
- Dobles de prueba para Drive, Sheets, Mail y LockService.

### Recomendación

Prioridad media. Añadirlas antes de cambios grandes posteriores, no como requisito
para el corte actual.

## 6. Medición de rendimiento

### Lo que ya existe

- Una sola carga inicial para la ruta operativa.
- Navegación interna sin recargar el iframe.
- Índice único para listados y búsquedas.
- Caché de configuración y resumen.
- Indicadores locales que evitan bloquear la pantalla en lecturas.

### Lo que falta

- Registrar duración de carga inicial, búsqueda, firma, PDF y correo.
- Comparar PC, tableta y red real de caja.
- Definir umbrales de aceptación.

### Recomendación

Prioridad baja mientras la percepción de fluidez sea satisfactoria. Medir durante
la primera semana productiva ofrece datos más útiles que una prueba artificial.

## Decisión de liberación

La fase 2 puede continuar después de `2.0.0`. Antes de retomarla se requiere:

1. Integrar y publicar el código actual.
2. Preparar y validar el despliegue continuo en una rama independiente.
3. Realizar una prueba de humo en la implementación productiva.
4. Conservar el sistema anterior como opción de reversión.
5. Revisar reporte y archivos al cierre del primer día.

Orden recomendado posterior al lanzamiento:

1. Respaldos versionados.
2. Reconciliación del reporte.
3. Pruebas de dominio.
4. Historial de eventos.
5. Métricas de rendimiento.
6. Anulación o reenvío solo si el negocio lo solicita.
