# Documentación del proyecto

Este directorio reúne las guías operativas y técnicas del Sistema de Recibos y
Pagos. La instalación principal comienza en el [README de la raíz](../README.md).

## Lectura recomendada

| Documento | Propósito | Audiencia |
| --- | --- | --- |
| [Arquitectura](ARQUITECTURA.md) | Explica componentes, almacenamiento, estados y consistencia | Desarrollo y soporte |
| [Despliegue a producción](DESPLIEGUE_PRODUCCION.md) | Lista preparación, prueba de humo, corte y reversión | Responsable de la publicación |
| [Despliegue continuo](DESPLIEGUE_CONTINUO.md) | Configura credenciales y describe la publicación automática o manual desde GitHub Actions | Desarrollo y administración |
| [Implementación de pruebas](IMPLEMENTACION_PRUEBAS.md) | Prepara un proyecto aislado de Apps Script | Desarrollo y pruebas |
| [Paleta para Google Sites](PALETA_GOOGLE_SITES.md) | Documenta los colores para integrar el sitio contenedor | Diseño y administración |
| [Análisis de la fase 2](ANALISIS_FASE_2.md) | Distingue lo implementado del robustecimiento aplazado | Administración y desarrollo |

## Estado de las guías

- La instalación, inicialización y operación descritas corresponden a la
  arquitectura sin Google Docs ni una hoja de configuración operativa.
- GitHub Actions publica automáticamente los cambios desplegables de `main` y
  conserva una ejecución manual para recuperación o control operativo.
- La fase de robustecimiento permanece documentada, pero no forma parte del
  cierre de la rama de reestructuración.

## Documentos de versión

- [Roadmap](../ROADMAP.md): estado real por fase y prioridades posteriores al
  lanzamiento.
- [Changelog](../CHANGELOG.md): cambios incluidos en cada versión.

`[Sin publicar]` en el changelog significa que los cambios están terminados pero
todavía no forman parte de una versión desplegada. Al concluir el corte debe
convertirse en la versión y fecha correspondientes; no es una lista de tareas
pendientes.

## Orden para la liberación 2.0.0

1. Integrar y verificar la rama de reestructuración en `main`.
2. Preparar y validar el despliegue continuo en una rama independiente. Hecho.
3. Ejecutar la [guía de despliegue](DESPLIEGUE_PRODUCCION.md).
4. Completar la prueba de humo productiva. Hecho.
5. Cerrar `[Sin publicar]` como `2.0.0` con la fecha real del despliegue.
6. Atender respaldos y reconciliación del reporte durante el robustecimiento.
