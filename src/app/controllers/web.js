/**
 * Punto de entrada obligatorio de la aplicación web.
 * Resuelve únicamente rutas conocidas para impedir inclusiones arbitrarias.
 *
 * @param {GoogleAppsScript.Events.DoGet} evento Parámetros enviados a la web app.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} Página correspondiente a la ruta.
 */
function doGet(evento) {
  const nombreRuta = String(evento?.parameter?.ruta || "inicio").trim();
  const ruta = RUTAS_APLICACION[nombreRuta] || RUTAS_APLICACION.inicio;
  const plantilla = HtmlService.createTemplateFromFile(
    "src/views/layouts/aplicacion",
  );
  plantilla.nombreAplicacion = NOMBRE_APLICACION;
  plantilla.nombreRuta = RUTAS_APLICACION[nombreRuta] ? nombreRuta : "inicio";
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

function obtenerResumenInicio() {
  try {
    if (!sistemaEstaInicializado_()) {
      return crearRespuestaExitosa_({ inicializado: false });
    }
    const pendientes = listarRecibos({
      estado: ESTADOS_RECIBO.PENDIENTE_FIRMA,
      pagina: 1,
      tamanoPagina: 1,
    });
    const firmados = listarRecibos({
      estado: ESTADOS_RECIBO.FIRMADO,
      pagina: 1,
      tamanoPagina: 1,
    });
    const enviados = listarRecibos({
      estado: ESTADOS_RECIBO.ENVIADO,
      pagina: 1,
      tamanoPagina: 1,
    });
    return crearRespuestaExitosa_({
      inicializado: true,
      pendientesFirma: pendientes.datos.total,
      pendientesEnvio: firmados.datos.total,
      enviados: enviados.datos.total,
    });
  } catch (error) {
    return crearRespuestaError_(error);
  }
}
