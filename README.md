# Sistema de Recibos y Pagos

Aplicación web de Google Apps Script para crear, firmar, documentar y enviar
recibos sin utilizar Google Docs como motor de plantillas.

## Alcance actual

- Configuración de tipos de recibo y contactos desde la aplicación.
- Logotipo, proveedor, prefijo, color y formato de papel por tipo.
- Creación individual o masiva mediante pegado tabulado desde Excel o Sheets.
- Firma directamente sobre la representación visual del recibo.
- Captura obligatoria de identificación o evidencia presencial.
- Generación directa de PDF y almacenamiento en Drive.
- Envío del PDF a contactos previamente configurados.
- Reporte general en Sheets como salida, no como fuente operativa.
- Navegación por parámetros compatible con páginas de Google Sites.

El módulo de solicitudes y la integración con Google Forms fueron retirados del
alcance.

## Rutas

La misma implementación atiende las siguientes rutas:

```text
?ruta=inicio
?ruta=nuevo-recibo
?ruta=firmas
?ruta=recibos
?ruta=configuracion
```

Consulta [la guía de implementación de pruebas](docs/IMPLEMENTACION_PRUEBAS.md)
antes de ejecutar `clasp push`.

## Verificación local

```bash
npm run verificar
```

Esta comprobación valida la sintaxis del servidor y del navegador, el manifiesto
y la ausencia de referencias a Google Docs, Forms y acceso anónimo.

## Estructura

```text
src/
├── app/             Controladores web y casos de uso
├── config/          Constantes y propiedades de arranque
├── repositories/    Persistencia JSON de configuración y recibos
├── services/        Integraciones con Drive, Sheets, PDF y correo
├── shared/          Normalización, respuestas e importes
└── views/           Layout, páginas, scripts, estilos, PDF y correo
```

El código propio utiliza nombres completos en español. Se conservan en inglés
únicamente los nombres convencionales de carpetas y los puntos de entrada
exigidos por Apps Script, como `doGet`.
