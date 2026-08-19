# Arquitectura y almacenamiento

## Principios

- La Web App es la única interfaz operativa.
- Los JSON de Drive son la fuente de verdad.
- Google Sheets es una salida de reportería y no se consulta para operar.
- Google Docs y Google Forms no participan en el flujo.
- Las mutaciones críticas se serializan con `LockService`.
- Los recibos enviados son inmutables desde la interfaz.

## Componentes

| Capa | Responsabilidad |
| --- | --- |
| `src/app` | Entrada web, rutas y casos de uso de inicialización |
| `src/config` | Constantes, rutas, estados y claves de propiedades |
| `src/repositories` | Persistencia de configuración y recibos en JSON |
| `src/services/google` | Drive, Sheets y correo |
| `src/services/recibos` | Conversión del recibo HTML a PDF |
| `src/shared` | Respuestas, fechas, normalización e importes en letra |
| `src/views` | Interfaz, plantilla PDF y correo HTML |

## Flujo de datos

```text
Captura en Web App
        │
        ▼
JSON mensual ─────► índice-recibos.json ─────► historial y resumen
        │
        ▼
Firma + fotografía
        │
        ▼
PDF en Drive ─────► Reporte General en Sheets
        │
        ▼
Correo con PDF ───► actualización de estado y destinatarios
```

La aplicación lee el índice para listar y buscar. Solo abre el JSON mensual
correspondiente cuando necesita modificar un recibo concreto.

## Estructura en Drive

```text
Sistema Recibos Pagos/
├── config/
│   ├── configuracion.json
│   ├── contactos.json
│   └── tipos-recibo.json
├── datos/
│   ├── indice-recibos.json
│   └── AAAA/
│       └── recibos-AAAA-MM.json
├── evidencias/
│   └── AAAA/MM/
├── logos/
├── recibos/
│   └── AAAA/MM/
└── respaldos/
```

Las propiedades del script conservan los identificadores. La estructura se
crea dentro de la carpeta que contiene el proyecto _standalone_ de Apps Script.

## Estados del recibo

```text
PENDIENTE_FIRMA ──► FIRMADO ──► ENVIADO
        │                │
        ▼                ▼
    ERROR_PDF       ERROR_ENVIO
        │                │
        └── reintento ───┘
```

Reglas principales:

- `PENDIENTE_FIRMA` y `ERROR_PDF` aparecen en la bandeja de firmas.
- `FIRMADO` y `ERROR_ENVIO` permiten enviar o reintentar el correo.
- `ENVIADO` no permite eliminación desde la interfaz ni desde el caso de uso.
- Cualquier recibo no enviado puede eliminarse; también se retira del reporte y
  sus archivos asociados se envían a la papelera.
- `ANULADO` existe como constante reservada, pero no tiene flujo operativo.

## Consistencia y recuperación actual

- Cada creación, firma, envío y eliminación usa un bloqueo global del script.
- El índice puede reconstruirse recorriendo los JSON mensuales.
- Las configuraciones y el resumen utilizan caché con invalidación después de
  cada mutación.
- Una eliminación fallida intenta restaurar archivo mensual, índice y reporte.
- Un PDF incompleto no se guarda como recibo válido.
- Errores de PDF y correo se conservan en el recibo para permitir reintentos.

## Reporte general

La primera columna contiene `identificadorRecibo` y permite actualizar o borrar
la fila exacta. La hoja se escribe después de firmar, enviar o eliminar, pero no
participa en búsquedas, configuración ni decisiones operativas.

La sincronización normal es inmediata y de mejor esfuerzo. Una cola automática
para reconciliar fallos pendientes pertenece a la fase 2.

## Construcción del folio

El folio utiliza el formato:

```text
PREFIJO-AAAAMMDDHHMMSS-SECUENCIA
```

La secuencia final no es un consecutivo global. Empieza en `01` cada vez que
cambia el segundo de creación y solo avanza a `02`, `03` o valores posteriores
cuando varios recibos del mismo prefijo se crean dentro del mismo segundo. La
marca de tiempo aporta la unicidad principal; el sufijo evita colisiones dentro
de un lote generado en ese instante.

## Seguridad

- La implementación se ejecuta como la cuenta propietaria.
- El manifiesto utiliza acceso `MYSELF`.
- Drive conserva permisos privados para JSON, fotografías, firmas y PDF.
- Google Sites debe restringirse a la misma cuenta.
- `.clasp.json` no se versiona para evitar mezclar entornos.
