# Despliegue a producción

## Objetivo

Integrar el código verificado en `main`, publicar una versión inmutable de la
Web App y validar el flujo productivo sin perder una opción inmediata de
reversión.

El repositorio es la fuente de verdad del código. La configuración operativa,
los recibos y las evidencias permanecen en Drive y no forman parte del proceso
de integración de Git.

## Estado del proceso

- La reestructuración se integra localmente mediante Git porque el repositorio
  tiene un único responsable.
- `[Sin publicar]` permanece en el changelog hasta cerrar formalmente la versión
  y crear su etiqueta.
- GitHub Actions actualiza el deployment productivo mediante cambios
  desplegables enviados a `main`; la ejecución manual permanece disponible. La
  prueba de humo productiva concluyó sin errores.
- La fase de robustecimiento de datos se atenderá después de estabilizar la
  automatización de despliegues.

## 1. Integración local con `main`

1. Actualiza las referencias remotas y comprueba que el árbol esté limpio:

   ```bash
   git fetch --prune origin
   git status
   npm ci
   npm run verificar
   ```

2. Publica la rama que se integrará:

   ```bash
   git push origin refactor/reestructuracion-completa
   ```

3. Actualiza `main` e integra mediante avance rápido:

   ```bash
   git switch main
   git pull --ff-only origin main
   git merge --ff-only refactor/reestructuracion-completa
   npm run verificar
   git push origin main
   ```

`--ff-only` conserva todos los commits convencionales sin crear un commit de
mezcla adicional. Si Git rechaza el avance rápido, se debe detener el proceso y
revisar la divergencia; no se debe forzar ni reescribir el historial.

La rama integrada puede conservarse temporalmente como referencia. Su
eliminación no es necesaria para continuar el desarrollo.

## 2. Preparar Apps Script

El método recomendado es ejecutar **Desplegar manualmente Google Apps Script**
desde GitHub Actions después de configurar el entorno `production` según la
[guía de despliegue continuo](DESPLIEGUE_CONTINUO.md). Los pasos siguientes son
el procedimiento local de respaldo.

1. Confirma que `.clasp.json` apunta al proyecto productivo correcto:

   ```bash
   npx clasp open-script
   npx clasp list-deployments
   ```

2. Ejecuta nuevamente las verificaciones locales:

   ```bash
   npm ci
   npm run verificar
   ```

3. Sincroniza el código:

   ```bash
   npx clasp push
   ```

`.clasp.json` y `.clasprc.json` son archivos locales con información sensible y
no deben añadirse al repositorio. La sincronización no ejecuta inicializadores
ni modifica por sí sola los JSON operativos existentes.

## 3. Inicialización o diagnóstico

Para una instalación productiva nueva, ejecuta desde el editor de Apps Script:

```text
inicializarSistemaPruebas()
diagnosticarSistema()
```

La función de inicialización conserva ese nombre por compatibilidad y es
idempotente. En una instalación existente, ejecuta primero
`diagnosticarSistema()` y reinicializa únicamente si falta una propiedad o la
versión de estructura no es `4`.

El diagnóstico esperado debe indicar:

```text
inicializado: true
versionEsperada: 5
directorioRaizEnContenedor: true
```

## 4. Actualizar la Web App

1. Abre **Implementar > Administrar implementaciones**.
2. Edita la implementación productiva existente.
3. Comprueba **Ejecutar como: yo**.
4. Comprueba **Quién tiene acceso: cualquier usuario con una cuenta de
   Google**. No selecciones acceso anónimo.
5. Selecciona **Nueva versión** y confirma.
6. Comprueba que la URL `/exec` se conserve.
7. Si se crea una implementación diferente, actualiza las inserciones de
   Google Sites:

   ```text
   Inicio         → URL/exec?ruta=inicio
   Operación      → URL/exec?ruta=operacion
   Configuración  → URL/exec?ruta=configuracion
   ```

El workflow reutiliza el identificador del deployment y conserva la URL
productiva. Una vez validada su ejecución manual se podrá habilitar el disparador
automático para cambios desplegables integrados en `main`.

Antes de probar dentro de Google Sites, abre la misma URL `/exec` en una ventana
privada e inicia sesión con una cuenta invitada. Si la URL directa funciona pero
el elemento insertado no, elimina la inserción anterior del Site y vuelve a
insertar la URL exacta del deployment versionado; no utilices `/dev`, el
identificador del proyecto ni el deployment `@HEAD`.

## 5. Prueba de humo productiva

Realiza la prueba con datos claramente identificados como control:

- Abrir Inicio, Operación y Configuración desde Google Sites.
- Confirmar que `/exec` sin parámetros muestre la guía de usuario.
- Confirmar tipos, contactos, logotipos y carpeta raíz.
- Crear dos contactos temporales en un lote y eliminarlos mediante selección
  múltiple.
- Crear un recibo de importe pequeño.
- Firmar y capturar fotografía desde la tableta.
- Abrir el PDF y comprobar logotipo, firma y fotografía.
- Enviar a un correo controlado.
- Confirmar destinatario, adjunto y estado `ENVIADO`.
- Confirmar la fila en el reporte general.
- Crear y eliminar un recibo no enviado; verificar que no quede en el reporte.
- Confirmar que el recibo enviado no muestre la acción **Eliminar**.

## 6. Cerrar la versión

Solo después de completar el despliegue y la prueba de humo, reemplaza
`[Sin publicar]` por `2.0.0` y la fecha real de publicación. Después crea el
commit y la etiqueta:

```bash
git add CHANGELOG.md ROADMAP.md
git commit -m "chore(release): publicar version 2.0.0"
git tag -a v2.0.0 -m "Sistema de Recibos y Pagos 2.0.0"
git push origin main
git push origin v2.0.0
```

## 7. Corte del sistema anterior

1. Evita capturas simultáneas en ambos sistemas.
2. Retira de Google Sites los accesos visibles al sistema anterior.
3. Conserva sus carpetas, hoja e implementación sin eliminarlas.
4. Mantén una referencia privada a la URL anterior durante la estabilización.
5. Al cierre del primer día compara cantidad, importes, tipos y destinatarios
   contra el reporte nuevo.
6. Después de un periodo estable, archiva el sistema anterior como solo lectura.

## 8. Reversión

Si una función crítica falla:

1. Detén nuevas capturas en la versión nueva.
2. Conserva intactos los recibos creados; no borres carpetas ni propiedades.
3. Restaura temporalmente el enlace anterior en Google Sites.
4. Registra los folios generados en cada sistema para evitar duplicar pagos.
5. Corrige el problema en una rama nueva y repite la prueba de humo.

Una reversión de interfaz no debe implicar eliminar datos de la versión nueva.
