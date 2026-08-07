# Sistema de Recibos y Pagos

Aplicación web de Google Apps Script para crear, firmar, documentar y enviar
recibos sin utilizar Google Docs como motor de plantillas.

## Alcance actual

- Configuración de tipos de recibo y contactos desde la aplicación.
- Logotipo, proveedor, prefijo, color y formato de papel por tipo.
- Creación manual o masiva mediante una cuadrícula editable.
- Firma directamente sobre la representación visual del recibo.
- Captura obligatoria de identificación o evidencia presencial.
- Generación directa de PDF y almacenamiento en Drive.
- Envío del PDF a contactos previamente configurados.
- Reporte general en Sheets como salida, no como fuente operativa.
- Operación unificada sin recargar la aplicación entre captura, firma e historial.
- Índice operativo para evitar recorridos completos de los archivos mensuales.
- Tema claro de alto contraste con Material Symbols.

El módulo de solicitudes y la integración con Google Forms fueron retirados del
alcance.

## Rutas

La misma implementación atiende las siguientes rutas:

```text
?ruta=operacion
?ruta=configuracion
```

Las rutas anteriores redirigen temporalmente a `operacion` para facilitar la
migración de Google Sites.

Consulta [la guía de implementación de pruebas](docs/IMPLEMENTACION_PRUEBAS.md)
antes de ejecutar `clasp push`.

## Verificación local

```bash
npm run verificar
```

Esta comprobación valida la sintaxis del servidor y del navegador, la API
pública, el manifiesto, la inserción segura de imágenes en el PDF y la ausencia
de referencias a Google Docs, Forms, acceso anónimo y la raíz de Mi unidad.

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
