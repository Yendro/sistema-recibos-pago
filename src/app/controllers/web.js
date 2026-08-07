/**
 * Punto de entrada obligatorio de la aplicación web.
 * Resuelve únicamente rutas conocidas para impedir inclusiones arbitrarias.
 *
 * @param {GoogleAppsScript.Events.DoGet} evento Parámetros enviados a la web app.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} Página correspondiente a la ruta.
 */
function doGet(evento) {
  const rutaSolicitada = String(evento?.parameter?.ruta || "operacion").trim();
  const nombreRuta = RUTAS_APLICACION[rutaSolicitada]
    ? rutaSolicitada
    : RUTAS_ANTERIORES[rutaSolicitada] || "operacion";
  const ruta = RUTAS_APLICACION[nombreRuta];
  const plantilla = HtmlService.createTemplateFromFile(
    "src/views/layouts/aplicacion",
  );
  plantilla.nombreAplicacion = NOMBRE_APLICACION;
  plantilla.nombreRuta = nombreRuta;
  plantilla.seccionInicial = ({
    firmas: "firmas",
    recibos: "historial",
    "nuevo-recibo": "nuevo",
  })[rutaSolicitada] || "nuevo";
  plantilla.tituloRuta = ruta.titulo;
  plantilla.archivoVista = ruta.vista;
  plantilla.archivoScript = ruta.script;

  return plantilla
    .evaluate()
    .setTitle(`${ruta.titulo} | ${NOMBRE_APLICACION}`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag(
      "viewport",
      "width=device-width, initial-scale=1, viewport-fit=cover",
    );
}

/**
 * Incluye un archivo HTML perteneciente al proyecto.
 * La ruta siempre proviene del mapa cerrado RUTAS_APLICACION.
 *
 * @param {string} rutaArchivo Ruta interna del archivo.
 * @returns {string} Contenido del archivo.
 */
function incluir_(rutaArchivo) {
  return HtmlService.createHtmlOutputFromFile(rutaArchivo).getContent();
}

function obtenerDatosOperacion() {
  try {
    if (!sistemaEstaInicializado_()) {
      return crearRespuestaExitosa_({ inicializado: false });
    }
    const configuracion = obtenerConfiguracionCompleta_();
    const recibosIndice = leerIndiceRecibos_().recibos;
    const pendientes = filtrarYPaginarRecibos_(recibosIndice, {
      estados: [ESTADOS_RECIBO.PENDIENTE_FIRMA, ESTADOS_RECIBO.ERROR_PDF],
      pagina: 1,
      tamanoPagina: 100,
    });
    const historial = filtrarYPaginarRecibos_(recibosIndice, {
      pagina: 1,
      tamanoPagina: 25,
    });
    return crearRespuestaExitosa_({
      inicializado: true,
      resumen: obtenerResumenRecibos_(recibosIndice),
      tiposRecibo: configuracion.tiposRecibo
        .filter((tipo) => tipo.activo)
        .map((tipo) => ({
          identificadorTipoRecibo: tipo.identificadorTipoRecibo,
          nombreTipoRecibo: tipo.nombreTipoRecibo,
          nombreProveedor: tipo.nombreProveedor,
        })),
      contactos: configuracion.contactos
        .filter((contacto) => contacto.activo)
        .map((contacto) => ({
          identificadorContacto: contacto.identificadorContacto,
          nombre: contacto.nombre,
          correoOriginal: contacto.correoOriginal,
        })),
      pendientes,
      historial,
    });
  } catch (error) {
    return crearRespuestaError_(error);
  }
}
