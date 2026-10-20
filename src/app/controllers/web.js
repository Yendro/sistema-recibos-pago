/**
 * Punto de entrada obligatorio de la aplicación web.
 * Resuelve únicamente rutas conocidas para impedir inclusiones arbitrarias.
 *
 * @param {GoogleAppsScript.Events.DoGet} evento Parámetros enviados a la web app.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} Página correspondiente a la ruta.
 */
function doGet(evento) {
  const rutaSolicitada = String(evento?.parameter?.ruta || "inicio").trim();
  const nombreRuta = RUTAS_APLICACION[rutaSolicitada]
    ? rutaSolicitada
    : RUTAS_ANTERIORES[rutaSolicitada] || "inicio";
  const ruta = RUTAS_APLICACION[nombreRuta];
  const plantilla = HtmlService.createTemplateFromFile(
    "src/views/layouts/aplicacion",
  );
  plantilla.nombreAplicacion = NOMBRE_APLICACION;
  plantilla.nombreRuta = nombreRuta;
  plantilla.seccionInicial = nombreRuta === "operacion"
    ? ({
      firmas: "firmas",
      recibos: "historial",
      "nuevo-recibo": "nuevo",
    })[rutaSolicitada] || "nuevo"
    : "";
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
    return crearRespuestaExitosa_({
      inicializado: true,
      tiposRecibo: obtenerTiposReciboActivosParaOperacion_(),
    });
  } catch (error) {
    return crearRespuestaError_(error);
  }
}

function obtenerEstadoRecibosOperacion() {
  try {
    if (!sistemaEstaInicializado_()) {
      return crearRespuestaExitosa_({ inicializado: false });
    }
    return crearRespuestaExitosa_({
      inicializado: true,
      ...obtenerEstadoRecibosOperacion_(),
    });
  } catch (error) {
    return crearRespuestaError_(error);
  }
}

function obtenerContactosOperacion() {
  try {
    if (!sistemaEstaInicializado_()) {
      return crearRespuestaExitosa_({ inicializado: false, contactos: [] });
    }
    return crearRespuestaExitosa_({
      inicializado: true,
      contactos: obtenerContactosActivosParaOperacion_(),
    });
  } catch (error) {
    return crearRespuestaError_(error);
  }
}
