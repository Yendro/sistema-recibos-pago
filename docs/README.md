# Documentación del proyecto

Este directorio reúne las guías operativas y técnicas del Sistema de Recibos y
Pagos. La instalación principal comienza en el [README de la raíz](../README.md).

## Lectura recomendada

| Documento | Propósito | Audiencia |
| --- | --- | --- |
| [Arquitectura](ARQUITECTURA.md) | Explica componentes, almacenamiento, estados y consistencia | Desarrollo y soporte |
| [Análisis de la fase 2](ANALISIS_FASE_2.md) | Distingue lo ya implementado del robustecimiento pendiente | Administración y desarrollo |
| [Despliegue a producción](DESPLIEGUE_PRODUCCION.md) | Lista preparación, prueba de humo, corte y reversión | Responsable de la publicación |
| [Implementación de pruebas](IMPLEMENTACION_PRUEBAS.md) | Prepara un proyecto aislado de Apps Script | Desarrollo y pruebas |
| [Paleta para Google Sites](PALETA_GOOGLE_SITES.md) | Documenta los colores para integrar el sitio contenedor | Diseño y administración |

## Documentos de versión

- [Roadmap](../ROADMAP.md): estado real por fase y prioridades posteriores al
  lanzamiento.
- [Changelog](../CHANGELOG.md): cambios incluidos en cada versión.

`[Sin publicar]` en el changelog significa que los cambios están terminados pero
todavía no forman parte de una versión desplegada. Al concluir el corte debe
convertirse en la versión y fecha correspondientes; no es una lista de tareas
pendientes.

## Orden para la liberación 2.0.0

1. Revisar el [análisis de la fase 2](ANALISIS_FASE_2.md).
2. Ejecutar la [guía de despliegue](DESPLIEGUE_PRODUCCION.md).
3. Completar la prueba de humo productiva.
4. Cerrar `[Sin publicar]` como `2.0.0` con la fecha real del despliegue.
5. Atender respaldos y reconciliación del reporte durante el robustecimiento.
