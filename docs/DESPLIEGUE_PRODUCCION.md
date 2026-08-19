# Despliegue a producción

## Objetivo del corte

Publicar la versión `2.0.0`, validar el flujo productivo y retirar el sistema
anterior sin perder una opción inmediata de reversión.

La fecha prevista de corte es el lunes 10 de agosto de 2026.

## Pendientes detectados antes de integrar

- La rama activa es `refactor/reestructuracion-completa`, no `main`.
- Existen commits locales pendientes de publicar en el remoto.
- `[Sin publicar]` debe permanecer así hasta que la versión productiva exista.
- Cualquier archivo modificado o nuevo debe revisarse y confirmarse antes de la
  integración, incluido material gráfico o documentación local.

## 1. Preparación de Git

1. Confirma la URL definitiva:

   ```bash
   git remote -v
   ```

2. Si GitHub cambió la dirección, actualiza únicamente con la URL real:

   ```bash
   git remote set-url origin URL_NUEVA_DEL_REPOSITORIO
   ```

3. Revisa el árbol de trabajo y la verificación:

   ```bash
   git status
   npm ci
   npm run verificar
   ```

4. Publica la rama de reestructuración:

   ```bash
   git push origin refactor/reestructuracion-completa
   ```

5. Integra mediante Pull Request hacia `main`. Conserva los commits lógicos y
   revisa que el cambio no incluya `.clasp.json`, archivos temporales o salidas
   de prueba.

6. Una vez integrada:

   ```bash
   git switch main
   git pull --ff-only origin main
   npm run verificar
   ```

## 2. Cerrar la versión

Solo cuando la implementación productiva esté lista, reemplaza:

```text
## [Sin publicar]
```

por:

```text
## [2.0.0] - 2026-08-10
```

Después crea el commit y la etiqueta:

```bash
git add CHANGELOG.md
git commit -m "chore(release): publicar version 2.0.0"
git tag -a v2.0.0 -m "Sistema de Recibos y Pagos 2.0.0"
git push origin main
git push origin v2.0.0
```

## 3. Preparar Apps Script

1. Verifica el proyecto productivo antes de subir:

   ```bash
   clasp open
   ```

2. Confirma visualmente que el proyecto abierto es el correcto. `.clasp.json`
   está ignorado por Git y cada equipo debe conservar su vínculo local.

3. Sube el código:

   ```bash
   clasp push
   ```

4. Si es un proyecto productivo nuevo, ejecuta desde el editor:

   ```text
   inicializarSistemaPruebas()
   diagnosticarSistema()
   ```

5. Si se reutiliza el proyecto ya validado, ejecuta primero
   `diagnosticarSistema()` y reinicializa únicamente si falta una propiedad o la
   versión de estructura no es `4`.

## 4. Actualizar la Web App

1. Abre **Implementar > Administrar implementaciones**.
2. Edita la implementación productiva.
3. Selecciona **Nueva versión** y confirma.
4. Conserva la URL `/exec` si se actualiza una implementación existente.
5. Si se crea una implementación distinta, actualiza las tres inserciones en
   Google Sites:

   ```text
   Inicio         → URL/exec?ruta=inicio
   Operación      → URL/exec?ruta=operacion
   Configuración  → URL/exec?ruta=configuracion
   ```

## 5. Prueba de humo productiva

Realiza la prueba con datos claramente identificados como control:

- Abrir Inicio, Operación y Configuración desde Google Sites.
- Confirmar que `/exec` sin parámetros muestre la guía de usuario.
- Confirmar tipos, contactos, logotipos y carpeta raíz.
- Crear dos contactos temporales en un lote y eliminarlos mediante selección
  múltiple.
- Crear un recibo de importe pequeño.
- Firmar y capturar fotografía desde la tableta.
- Abrir el PDF y comprobar las tres imágenes.
- Enviar a un correo controlado.
- Confirmar destinatario, adjunto y estado `ENVIADO`.
- Confirmar la fila en el reporte general.
- Crear y eliminar un recibo no enviado; verificar que no quede en el reporte.
- Confirmar que el recibo enviado no muestre Eliminar.

## 6. Corte del sistema anterior

1. Ejecuta el corte antes de iniciar la operación del lunes.
2. Evita capturas simultáneas en ambos sistemas.
3. Retira del Google Site los accesos visibles al sistema anterior.
4. Conserva sus carpetas, hoja e implementación sin eliminarlas.
5. Mantén una referencia privada a la URL anterior durante el periodo de
   estabilización.
6. Al cierre del día compara cantidad, importes, tipos y destinatarios contra el
   reporte nuevo.
7. Después de un periodo estable, archiva el sistema anterior como solo lectura.

## 7. Reversión

Si una función crítica falla:

1. Detén nuevas capturas en la versión nueva.
2. Conserva intactos los recibos ya creados; no borres carpetas ni propiedades.
3. Restaura temporalmente el enlace anterior en Google Sites.
4. Registra los folios generados en cada sistema para evitar duplicar pagos.
5. Corrige el problema en una rama nueva y repite la prueba de humo.

Una reversión de interfaz no debe implicar eliminar datos de la nueva versión.
