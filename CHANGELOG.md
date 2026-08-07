# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/).

## [Sin publicar]

### Añadido

- Arquitectura independiente de Google Docs y de la hoja de configuración.
- Rutas para inicio, recibos, creación masiva, firmas y configuración.
- Persistencia operativa mensual en archivos JSON de Drive.
- Inicializador idempotente de directorios, archivos y reporte.
- Configuración de tipos de recibo, logotipos y contactos desde la web app.
- Pegado tabulado de múltiples recibos desde Excel o Google Sheets.
- Firma sobre el recibo, captura de evidencia y generación directa de PDF.
- Envío del PDF a contactos validados.
- Verificación estática local e instructivo de implementación aislada.
- Cuadrícula editable para captura manual y pegado desde hojas de cálculo.
- Índice operativo de recibos y caché de lecturas frecuentes.
- Material Symbols y paleta clara de alto contraste basada en `#379FFF`.
- Diagnóstico de imágenes antes y después de convertir el recibo a PDF.

### Modificado

- Las dependencias se crean dentro de la carpeta que contiene el proyecto de
  Apps Script; las instalaciones existentes se mueven sin cambiar sus IDs.
- Captura, pendientes de firma, historial y correo comparten la ruta
  `?ruta=operacion`.
- Las cargas de lectura ya no bloquean toda la pantalla y los procesos rápidos
  no muestran indicadores intermitentes.
- Los componentes utilizan radios sutiles en lugar de formas semicirculares.
- Las imágenes internas del PDF evitan el escape contextual de HTML Service.

### Eliminado

- Integración con Google Forms y módulo de solicitudes.
- Generación y vista previa mediante Google Docs.
- Edición de recibos y configuración directamente desde Sheets.

## [1.1.1] - 2026-06-02

### 🐛 Correcciones (Fixed)

- **Remitente Dinámico y Alias:** Se reemplazó el motor de `MailApp` por `GmailApp` en el envío de recibos. Esto permite enmascarar el correo personal del desarrollador utilizando un Alias corporativo autorizado y un Nombre de Remitente personalizado.
- **Configuración de Correo en UI:** Se agregaron los campos "Correo que se verá al enviar el recibo" y "Nombre que se verá al enviar el recibo" a la hoja oculta `Config`, aplicando valores de respaldo (_fallbacks_) en el código para prevenir errores de ejecución si las celdas se dejan vacías.
- **Corrección de Scope en UI:** Se solucionó el error `Cannot read properties of null (reading 'getRange')` enviando correctamente la variable `currentNombreHoja` desde el frontend al modal de selección de correos.

## [1.1.0] - 2026-06-01

### 🚀 Añadido (Added)

- **Motor de Configuración Dinámica:** Nueva hoja oculta `Config` generada automáticamente para administrar plantillas, correos, carpetas raíz de Drive y prefijos de folio sin exponer datos sensibles en el código.
- **Soporte Multi-Hoja:** Generación automática de pestañas operativas (ej. `RecibosGLR`, `RecibosPlayaviva`) basadas en la configuración activa, con paneles inmovilizados, columnas de diferentes colores (bicolor) y celdas protegidas.
- **Filtros en Interfaz (Web App):** Nuevo contenedor de pestañas (_Pill Buttons_) en el frontend para alternar visualmente entre los diferentes tipos de recibos u orígenes de hoja.
- **Limpieza Automatizada:** Columna `ELIMINAR` con validación de datos (Smart Chip). Un trigger `onEdit` detecta la confirmación, envía el Google Doc asociado a la papelera de Drive y elimina la fila limpiamente.
- **Auto-Mayúsculas:** Conversión automática a texto en MAYÚSCULAS para las columnas de llenado manual (Cliente, Concepto, etc.) en tiempo real mediante el trigger `onEdit`.
- **Badges de Trazabilidad:** Las tarjetas de la Web App ahora muestran una etiqueta visual indicando el número exacto de fila del registro en Sheets (`Fila X`).
- **Validación de Fechas:** Integración nativa de calendario con doble clic en la columna `FechaPago`.

### 🔄 Modificado (Changed)

- **Arquitectura de Drive:** La ruta de guardado principal (`CARPETA_RAIZ`) ahora es completamente dinámica y se lee desde la hoja de `Config`, permitiendo redireccionar los archivos sin tocar el código.
- **Precisión de Folios:** La generación del folio abandonó los números aleatorios. Ahora utiliza el índice exacto de la fila y el prefijo dinámico (Ej. `GLR-20260601120000-F02`).
- **Guardado Incremental:** `generadorRecibos.js` ahora usa `SpreadsheetApp.flush()` para registrar y mostrar la URL del documento inmediatamente después de crear cada recibo individual, evitando pérdidas de datos en ejecuciones masivas.
- **Mejora Fotográfica:** La resolución del canvas de identificación se incrementó de 350px a 500px. La interfaz ahora detecta la columna `EstatusFoto` y bloquea el botón mostrando "Capturada" si ya existe evidencia.
- **Retraso de Limpieza de Plantilla:** La etiqueta `{{IdentificacionCliente}}` ya no se borra prematuramente al firmar, permitiendo flujos asíncronos. Su limpieza se trasladó a `correo.js` para efectuarse instantes antes de la conversión a PDF.
- **Rediseño UI de Correos:** El modal de destinatarios se convirtió en un grid responsivo de dos columnas (`col-md-6`) para manejar listas extensas cómodamente, consumiendo el directorio directamente de la hoja `Config`.

### 🗑️ Eliminado (Removed)

- **Privacidad de Código:** Se eliminaron todas las variables _hardcodeadas_ (quemadas) de IDs de plantillas, correos de destinatarios y responsables técnicos de los archivos `.js`.
- Eliminación de la constante obsoleta `CARPETA_RECIBOS` en la lógica de Google Drive.
