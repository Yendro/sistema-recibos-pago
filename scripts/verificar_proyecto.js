const sistemaArchivos = require("node:fs");
const rutas = require("node:path");
const maquinaVirtual = require("node:vm");

const directorioProyecto = rutas.resolve(__dirname, "..");
const errores = [];

function recorrerArchivos(directorio, filtro) {
  const resultados = [];
  for (const entrada of sistemaArchivos.readdirSync(directorio, {
    withFileTypes: true,
  })) {
    const rutaCompleta = rutas.join(directorio, entrada.name);
    if (entrada.isDirectory()) resultados.push(...recorrerArchivos(rutaCompleta, filtro));
    else if (filtro(rutaCompleta)) resultados.push(rutaCompleta);
  }
  return resultados;
}

function validarJavaScript(contenido, rutaArchivo) {
  try {
    new Function(contenido);
  } catch (error) {
    errores.push(`${rutas.relative(directorioProyecto, rutaArchivo)}: ${error.message}`);
  }
}

const archivosServidor = recorrerArchivos(
  rutas.join(directorioProyecto, "src"),
  (rutaArchivo) => rutaArchivo.endsWith(".js"),
);
archivosServidor.forEach((rutaArchivo) =>
  validarJavaScript(sistemaArchivos.readFileSync(rutaArchivo, "utf8"), rutaArchivo),
);

const directorioHerramientasPruebas = rutas.join(
  directorioProyecto,
  "tests",
  "apps_script",
);
const archivosHerramientasPruebas = recorrerArchivos(
  directorioHerramientasPruebas,
  (rutaArchivo) => rutaArchivo.endsWith(".js"),
);
archivosHerramientasPruebas.forEach((rutaArchivo) =>
  validarJavaScript(sistemaArchivos.readFileSync(rutaArchivo, "utf8"), rutaArchivo),
);

const funcionesPublicasPermitidas = new Set([
  "doGet",
  "inicializarSistemaPruebas",
  "diagnosticarSistema",
  "obtenerDatosOperacion",
  "obtenerEstadoRecibosOperacion",
  "obtenerContactosOperacion",
  "obtenerConfiguracionParaWeb",
  "guardarTipoRecibo",
  "eliminarTipoRecibo",
  "guardarContacto",
  "guardarContactosMasivos",
  "eliminarContacto",
  "eliminarContactosMasivos",
  "crearRecibosMasivo",
  "sincronizarIndexacionPendienteRecibos",
  "listarRecibos",
  "eliminarReciboNoEnviado",
  "obtenerReciboParaFirma",
  "firmarYGenerarPdf",
  "enviarReciboPorCorreo",
  "obtenerUrlReporteGeneral",
]);

archivosServidor.forEach((rutaArchivo) => {
  const contenido = sistemaArchivos.readFileSync(rutaArchivo, "utf8");
  const patronFuncion = /^function\s+([A-Za-zÁÉÍÓÚáéíóúÑñ0-9_]+)\s*\(/gm;
  for (const coincidencia of contenido.matchAll(patronFuncion)) {
    const nombreFuncion = coincidencia[1];
    if (
      !nombreFuncion.endsWith("_") &&
      !funcionesPublicasPermitidas.has(nombreFuncion)
    ) {
      errores.push(
        `${rutas.relative(directorioProyecto, rutaArchivo)}: la función pública ${nombreFuncion} no está permitida.`,
      );
    }
  }
});

const directorioScriptsVista = rutas.join(
  directorioProyecto,
  "src",
  "views",
  "scripts",
);
const archivosScriptsVista = recorrerArchivos(
  directorioScriptsVista,
  (rutaArchivo) => rutaArchivo.endsWith(".html"),
);
archivosScriptsVista.forEach((rutaArchivo) => {
  const contenido = sistemaArchivos.readFileSync(rutaArchivo, "utf8");
  const coincidencia = contenido.match(/^\s*<script>([\s\S]*)<\/script>\s*$/);
  if (!coincidencia) {
    errores.push(`${rutas.relative(directorioProyecto, rutaArchivo)}: debe contener una sola etiqueta script.`);
    return;
  }
  validarJavaScript(coincidencia[1], rutaArchivo);
});

const rutaLayout = rutas.join(
  directorioProyecto,
  "src",
  "views",
  "layouts",
  "aplicacion.html",
);
const contenidoLayout = sistemaArchivos.readFileSync(rutaLayout, "utf8");
const vistasVerificables = [
  { nombreVista: "inicio", nombreScript: null },
  { nombreVista: "operacion", nombreScript: "operacion" },
  { nombreVista: "configuracion", nombreScript: "configuracion" },
];
vistasVerificables.forEach(({ nombreVista, nombreScript }) => {
  const rutaPagina = rutas.join(
    directorioProyecto,
    "src",
    "views",
    "pages",
    `${nombreVista}.html`,
  );
  const contenidoPagina = sistemaArchivos.readFileSync(rutaPagina, "utf8");
  if (!nombreScript) return;

  const rutaScript = rutas.join(
    directorioProyecto,
    "src",
    "views",
    "scripts",
    `${nombreScript}.html`,
  );
  const contenidoScript = sistemaArchivos.readFileSync(rutaScript, "utf8");
  const identificadores = new Set(
    Array.from(
      `${contenidoLayout}\n${contenidoPagina}`.matchAll(/\bid="([^"]+)"/g),
      (coincidencia) => coincidencia[1],
    ),
  );
  const referencias = Array.from(
    contenidoScript.matchAll(/getElementById\(["']([^"']+)["']\)/g),
    (coincidencia) => coincidencia[1],
  );
  referencias.forEach((identificador) => {
    if (!identificadores.has(identificador)) {
      errores.push(
        `src/views/scripts/${nombreVista}.html: no existe el elemento #${identificador}.`,
      );
    }
  });
});

const contenidoConstantes = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, "src", "config", "constantes.js"),
  "utf8",
);
const contenidoControladorWeb = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, "src", "app", "controllers", "web.js"),
  "utf8",
);
const contenidoPaginaInicio = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, "src", "views", "pages", "inicio.html"),
  "utf8",
);
if (
  !contenidoConstantes.includes("inicio: {") ||
  !contenidoConstantes.includes('vista: "src/views/pages/inicio"') ||
  !contenidoConstantes.includes("script: null")
) {
  errores.push("src/config/constantes.js: la ruta Inicio debe permanecer registrada como vista estática.");
}
if (
  !contenidoControladorWeb.includes('parameter?.ruta || "inicio"') ||
  !contenidoControladorWeb.includes('RUTAS_ANTERIORES[rutaSolicitada] || "inicio"')
) {
  errores.push("src/app/controllers/web.js: Inicio debe ser la ruta predeterminada y de respaldo.");
}
if (
  !contenidoLayout.includes("if (archivoScript)") ||
  !contenidoPaginaInicio.includes("Bienvenido al Sistema de Recibos y Pagos") ||
  contenidoPaginaInicio.includes('href="?ruta=')
) {
  errores.push("src/views: Inicio debe funcionar sin script ni navegación interna.");
}

const referenciasProhibidas = [
  "DocumentApp",
  "FormApp",
  "ANYONE_ANONYMOUS",
  "NOMBRE_HOJA_SOLICITUDES",
  "DriveApp.getRootFolder",
  "border-radius: 999",
];
const archivosAplicacion = recorrerArchivos(
  rutas.join(directorioProyecto, "src"),
  () => true,
);
archivosAplicacion.forEach((rutaArchivo) => {
  const contenido = sistemaArchivos.readFileSync(rutaArchivo, "utf8");
  referenciasProhibidas.forEach((referencia) => {
    if (contenido.includes(referencia)) {
      errores.push(`${rutas.relative(directorioProyecto, rutaArchivo)}: conserva la referencia prohibida ${referencia}.`);
    }
  });
});

const manifiesto = JSON.parse(
  sistemaArchivos.readFileSync(rutas.join(directorioProyecto, "appsscript.json"), "utf8"),
);
if (manifiesto.webapp?.access !== "ANYONE") {
  errores.push(
    "appsscript.json: la aplicación web debe permitir acceso a usuarios con sesión de Google mediante ANYONE.",
  );
}
if (manifiesto.webapp?.executeAs !== "USER_DEPLOYING") {
  errores.push("appsscript.json: la aplicación web debe ejecutarse como USER_DEPLOYING.");
}

const paquete = JSON.parse(
  sistemaArchivos.readFileSync(rutas.join(directorioProyecto, "package.json"), "utf8"),
);
if (paquete.devDependencies?.["@google/clasp"] !== "3.4.1") {
  errores.push("package.json: clasp debe conservar una versión exacta y reproducible.");
}

const ignoradosProduccion = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, ".claspignore"),
  "utf8",
);
const ignoradosPruebas = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, ".claspignore.pruebas"),
  "utf8",
);
const scriptDesplieguePruebas = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, "scripts", "desplegar_pruebas.ps1"),
  "utf8",
);
const importadorPruebas = sistemaArchivos.readFileSync(
  rutas.join(
    directorioProyecto,
    "tests",
    "apps_script",
    "importador_datos_produccion.js",
  ),
  "utf8",
);
if (
  !ignoradosProduccion.includes("tests/**") ||
  !ignoradosPruebas.includes("!tests/apps_script/**") ||
  !scriptDesplieguePruebas.includes('".claspignore.pruebas"')
) {
  errores.push(
    "despliegue de pruebas: el importador debe excluirse de producción e incluirse únicamente en pruebas.",
  );
}
if (
  !scriptDesplieguePruebas.includes('$manifiestoPruebas.webapp.access = "MYSELF"') ||
  !scriptDesplieguePruebas.includes("[System.IO.File]::WriteAllBytes(")
) {
  errores.push(
    "despliegue de pruebas: debe restringir el manifiesto a MYSELF y restaurar su contenido original.",
  );
}
const contratosImportadorPruebas = [
  'CLAVE_ENTORNO: "ENTORNO_EJECUCION"',
  'VALOR_ENTORNO: "PRUEBAS"',
  'VALOR_CONFIRMACION: "COPIAR_PRODUCCION_A_PRUEBAS"',
  "contexto.propiedades.deleteProperty(",
  "estado: ESTADOS_RECIBO.ENVIADO",
  'identificadorFotografia: ""',
  'identificadorFirma: ""',
  'identificadorPdf: ""',
  'destinatarios: []',
  "reconstruirIndiceRecibos_()",
  "restaurarPropiedadesImportador_(",
];
if (
  contratosImportadorPruebas.some(
    (contrato) => !importadorPruebas.includes(contrato),
  ) ||
  importadorPruebas.includes("obtenerContactos_()")
) {
  errores.push(
    "tests/apps_script/importador_datos_produccion.js: faltan controles de aislamiento, saneamiento o recuperación.",
  );
}

const flujoDespliegue = sistemaArchivos.readFileSync(
  rutas.join(
    directorioProyecto,
    ".github",
    "workflows",
    "desplegar-apps-script.yml",
  ),
  "utf8",
);
const contratosDespliegue = [
  "workflow_dispatch:",
  "environment: production",
  "secrets.CLASPRC_JSON",
  "secrets.CLASP_JSON",
  "vars.APPS_SCRIPT_DEPLOYMENT_ID",
  "npx clasp list-deployments --json",
  "npx clasp push --force",
  "npx clasp update-deployment",
  "if: always()",
];
if (contratosDespliegue.some((contrato) => !flujoDespliegue.includes(contrato))) {
  errores.push(".github/workflows/desplegar-apps-script.yml: faltan contratos del despliegue manual seguro.");
}

const plantillaPdf = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, "src", "views", "pdf", "recibo.html"),
  "utf8",
);
if ((plantillaPdf.match(/src="<\?!=/g) || []).length < 3) {
  errores.push("src/views/pdf/recibo.html: las imágenes deben evitar el escape contextual.");
}

const generadorPdf = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, "src", "services", "recibos", "generador_pdf.js"),
  "utf8",
);
if (!generadorPdf.includes("salidaHtml") || !generadorPdf.includes(".getAs(MimeType.PDF)")) {
  errores.push("src/services/recibos/generador_pdf.js: el PDF debe convertirse desde HtmlOutput.");
}

const repositorioRecibos = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, "src", "repositories", "recibos_drive.js"),
  "utf8",
);
const almacenamientoDrive = sistemaArchivos.readFileSync(
  rutas.join(
    directorioProyecto,
    "src",
    "services",
    "google",
    "almacenamiento_drive.js",
  ),
  "utf8",
);
if (
  !repositorioRecibos.includes("recibo.estado === ESTADOS_RECIBO.ENVIADO") ||
  !repositorioRecibos.includes("eliminarReciboDeReporte_(identificadorRecibo)")
) {
  errores.push("src/repositories/recibos_drive.js: la eliminación debe proteger enviados y limpiar el reporte.");
}
if (
  !repositorioRecibos.includes("function actualizarIndiceRecibosCargado_(") ||
  !repositorioRecibos.includes("const indice = resultado.indice;") ||
  !repositorioRecibos.includes("resultadoBusqueda.indice,")
) {
  errores.push(
    "src/repositories/recibos_drive.js: las mutaciones deben reutilizar el índice cargado durante la búsqueda.",
  );
}
if (
  !contenidoControladorWeb.includes("function obtenerEstadoRecibosOperacion()") ||
  !contenidoControladorWeb.includes("function obtenerContactosOperacion()") ||
  !repositorioRecibos.includes("function obtenerEstadoRecibosOperacion_()") ||
  !repositorioRecibos.includes("function convertirReciboParaListado_(") ||
  !repositorioRecibos.includes("actualizarMemoriaTemporalRecibos_(recibos);")
) {
  errores.push(
    "operación: el arranque, el estado de recibos y los contactos deben cargarse de forma independiente y compacta.",
  );
}
if (
  !repositorioRecibos.includes("documento.formato = 2;") ||
  !repositorioRecibos.includes("{ compacto: true },") ||
  !almacenamientoDrive.includes("opciones?.compacto ? undefined : 2")
) {
  errores.push(
    "persistencia: el índice y los documentos operativos deben conservar su serialización compacta.",
  );
}
if (
  !repositorioRecibos.includes("function obtenerReciboParaVistaFirma_(") ||
  !repositorioRecibos.includes("CLAVES_MEMORIA_TEMPORAL.MAPA_ARCHIVOS_RECIBOS") ||
  !repositorioRecibos.includes("guardarRecibosFirmaEnMemoria_(nuevosRecibos);") ||
  !repositorioRecibos.includes('evento: "RENDIMIENTO_APERTURA_FIRMA"') ||
  !almacenamientoDrive.includes("IMAGEN_URL_DATOS_V5_") ||
  !almacenamientoDrive.includes("memoriaTemporal.put(claveMemoriaTemporal, urlDatos, 21600)")
) {
  errores.push(
    "apertura de firma: el recibo, su archivo mensual, el tipo y el logotipo deben utilizar cachés descartables y métricas internas.",
  );
}
const inicioCreacionRecibos = repositorioRecibos.indexOf(
  "function crearRecibosMasivo(",
);
const finCreacionRecibos = repositorioRecibos.indexOf(
  "function generarFolioSeguro_(",
);
const creacionRecibos = repositorioRecibos.slice(
  inicioCreacionRecibos,
  finCreacionRecibos,
);
if (
  inicioCreacionRecibos < 0 ||
  finCreacionRecibos <= inicioCreacionRecibos ||
  !creacionRecibos.includes("registrarIndexacionPendienteRecibos_(") ||
  !creacionRecibos.includes("guardarArchivoJson_(archivo, documento") ||
  !creacionRecibos.includes('evento: "RENDIMIENTO_CREACION_RECIBOS"') ||
  creacionRecibos.includes("actualizarIndiceRecibosConRecuperacion_(") ||
  !repositorioRecibos.includes("function sincronizarIndexacionPendienteRecibos()") ||
  !repositorioRecibos.includes('evento: "RENDIMIENTO_INDEXACION_RECIBOS"')
) {
  errores.push(
    "creación: el archivo mensual debe confirmarse antes de indexar en segundo plano mediante una cola recuperable.",
  );
}
try {
  const valoresMemoriaTemporalSimulada = new Map();
  const valoresPropiedadesSimuladas = {};
  let lecturasArchivoMensualSimuladas = 0;
  let reciboMensualSimulado = null;
  const memoriaTemporalSimulada = {
    get: (clave) => valoresMemoriaTemporalSimulada.get(clave) || null,
    put: (clave, valor) => valoresMemoriaTemporalSimulada.set(clave, valor),
    putAll: (valores) =>
      Object.entries(valores).forEach(([clave, valor]) =>
        valoresMemoriaTemporalSimulada.set(clave, valor),
      ),
    remove: (clave) => valoresMemoriaTemporalSimulada.delete(clave),
    removeAll: (claves) =>
      claves.forEach((clave) => valoresMemoriaTemporalSimulada.delete(clave)),
  };
  const contextoPruebaRecibos = {
    ESTADOS_RECIBO: {
      PENDIENTE_FIRMA: "PENDIENTE_FIRMA",
      FIRMADO: "FIRMADO",
      ENVIADO: "ENVIADO",
      ERROR_PDF: "ERROR_PDF",
      ERROR_ENVIO: "ERROR_ENVIO",
    },
    CLAVES_MEMORIA_TEMPORAL: {
      RESUMEN_RECIBOS: "RESUMEN_RECIBOS_V5",
      ESTADO_RECIBOS_OPERACION: "ESTADO_RECIBOS_OPERACION_V5",
      MAPA_ARCHIVOS_RECIBOS: "MAPA_ARCHIVOS_RECIBOS_V5",
    },
    CLAVES_PROPIEDADES: {
      COLA_INDEXACION_RECIBOS: "COLA_INDEXACION_RECIBOS",
    },
    CacheService: {
      getScriptCache: () => memoriaTemporalSimulada,
    },
    Utilities: {
      newBlob: (contenido) => ({
        getBytes: () => Buffer.from(String(contenido)),
      }),
      formatDate: () => "20261020123456",
    },
    Session: {
      getScriptTimeZone: () => "America/Mexico_City",
    },
    leerArchivoJsonPorIdentificador_: () => {
      lecturasArchivoMensualSimuladas += 1;
      return { recibos: [reciboMensualSimulado] };
    },
    obtenerPropiedadesSistema_: () => ({
      getProperties: () => ({ ...valoresPropiedadesSimuladas }),
      getProperty: (clave) => valoresPropiedadesSimuladas[clave] || null,
      setProperty: (clave, valor) => {
        valoresPropiedadesSimuladas[clave] = valor;
      },
      setProperties: (valores) =>
        Object.assign(valoresPropiedadesSimuladas, valores),
    }),
    normalizarTextoMayusculas_: (valor) => String(valor || "").toUpperCase(),
    console: {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: () => {},
    },
  };
  maquinaVirtual.createContext(contextoPruebaRecibos);
  maquinaVirtual.runInContext(repositorioRecibos, contextoPruebaRecibos);
  const recibosSimulados = Array.from({ length: 298 }, (_, indice) => ({
    identificadorRecibo: `identificador-${indice}`,
    folio: `REC-${indice}`,
    cliente: `CLIENTE ${indice}`,
    concepto: `CONCEPTO ${indice}`,
    importe: indice + 1,
    nombreTipoRecibo: indice % 2 ? "GLR" : "PV",
    estado: indice < 10 ? "PENDIENTE_FIRMA" : "ENVIADO",
    urlPdf: indice < 10 ? "" : `https://drive.google.com/${indice}`,
    fechaCreacion: new Date(2026, 8, (indice % 28) + 1).toISOString(),
    identificadorArchivoDatos: "identificador-productivo",
  }));
  const estadoSimulado = contextoPruebaRecibos.construirEstadoRecibosOperacion_(
    recibosSimulados,
  );
  const reciboCompleto = {
    ...recibosSimulados[0],
    identificadorTipoRecibo: "tipo-interno",
    nombreEmpresa: "EMPRESA",
    nombreProveedor: "PROVEEDOR",
    importeLetra: "UN PESO",
    fechaPago: "2026-09-01",
    fechaActualizacion: "2026-09-01T00:00:00.000Z",
    identificadorFirma: "firma-privada",
    identificadorFotografia: "fotografia-privada",
    identificadorPdf: "pdf-privado",
    destinatarios: ["correo@example.com"],
  };
  reciboMensualSimulado = reciboCompleto;
  const reciboIndice = contextoPruebaRecibos.convertirReciboEnIndice_(
    reciboCompleto,
    "archivo-mensual",
  );
  const mapaArchivos = contextoPruebaRecibos.construirMapaArchivosRecibos_(
    recibosSimulados,
  );
  contextoPruebaRecibos.registrarIndexacionPendienteRecibos_(
    [reciboCompleto],
    "archivo-mensual",
  );
  const indexacionesPendientes =
    contextoPruebaRecibos.obtenerIndexacionesPendientes_();
  const foliosSimulados = contextoPruebaRecibos.generarFoliosSeguros_(
    "REC",
    new Date(),
    4,
  );
  contextoPruebaRecibos.guardarMapaArchivosRecibosEnMemoria_(recibosSimulados);
  contextoPruebaRecibos.guardarRecibosFirmaEnMemoria_(reciboCompleto);
  const lecturaDesdeReciboEnMemoria =
    contextoPruebaRecibos.obtenerReciboParaVistaFirma_(
      reciboCompleto.identificadorRecibo,
    );
  contextoPruebaRecibos.invalidarReciboFirmaEnMemoria_(
    reciboCompleto.identificadorRecibo,
  );
  const lecturaDesdeMapa = contextoPruebaRecibos.obtenerReciboParaVistaFirma_(
    reciboCompleto.identificadorRecibo,
  );
  let recibosIndexadosSimulados = [];
  contextoPruebaRecibos.LockService = {
    getScriptLock: () => {
      let bloqueoActivo = false;
      return {
        waitLock: () => {
          bloqueoActivo = true;
        },
        hasLock: () => bloqueoActivo,
        releaseLock: () => {
          bloqueoActivo = false;
        },
      };
    },
  };
  contextoPruebaRecibos.leerIndiceRecibos_ = () => ({
    documento: { version: 1, recibos: [] },
    recibos: [],
  });
  contextoPruebaRecibos.actualizarIndiceRecibosCargado_ = (
    indice,
    recibos,
  ) => {
    recibosIndexadosSimulados = recibos;
  };
  const resultadoIndexacion =
    contextoPruebaRecibos.sincronizarIndexacionPendienteRecibos_();
  const colaDespuesDeIndexar =
    contextoPruebaRecibos.obtenerIndexacionesPendientes_();
  contextoPruebaRecibos.registrarIndexacionPendienteRecibos_(
    [reciboCompleto],
    "archivo-mensual",
  );
  contextoPruebaRecibos.actualizarIndiceRecibosCargado_ = () => {
    throw new Error("Fallo simulado del índice.");
  };
  let falloIndexacionDetectado = false;
  try {
    contextoPruebaRecibos.sincronizarIndexacionPendienteRecibos_();
  } catch (error) {
    falloIndexacionDetectado = true;
  }
  const colaDespuesDeFallo =
    contextoPruebaRecibos.obtenerIndexacionesPendientes_();
  const camposIndiceEsperados = [
    "cliente",
    "concepto",
    "estado",
    "fechaCreacion",
    "folio",
    "identificadorArchivoDatos",
    "identificadorRecibo",
    "importe",
    "nombreTipoRecibo",
    "urlPdf",
  ];
  const bytesEstadoSimulado = Buffer.byteLength(JSON.stringify(estadoSimulado));
  if (
    estadoSimulado.resumen.enviados !== 288 ||
    estadoSimulado.pendientes.total !== 10 ||
    estadoSimulado.historial.recibos.length !== 25 ||
    bytesEstadoSimulado >= 95 * 1024 ||
    Object.prototype.hasOwnProperty.call(
      estadoSimulado.historial.recibos[0],
      "identificadorArchivoDatos",
    ) ||
    JSON.stringify(Object.keys(reciboIndice).sort()) !==
      JSON.stringify(camposIndiceEsperados) ||
    reciboIndice.identificadorArchivoDatos !== "archivo-mensual" ||
    Object.keys(mapaArchivos).length !== 298 ||
    mapaArchivos["identificador-297"] !== "identificador-productivo" ||
    lecturaDesdeReciboEnMemoria.origen !== "MEMORIA_RECIBO" ||
    lecturaDesdeMapa.origen !== "MAPA_ARCHIVO" ||
    lecturasArchivoMensualSimuladas !== 3 ||
    indexacionesPendientes.length !== 1 ||
    indexacionesPendientes[0].identificadorRecibo !==
      reciboCompleto.identificadorRecibo ||
    indexacionesPendientes[0].identificadorArchivo !== "archivo-mensual" ||
    foliosSimulados.length !== 4 ||
    !foliosSimulados[0].endsWith("-01") ||
    !foliosSimulados[3].endsWith("-04") ||
    resultadoIndexacion.cantidadIndexada !== 1 ||
    recibosIndexadosSimulados.length !== 1 ||
    colaDespuesDeIndexar.length !== 0 ||
    !falloIndexacionDetectado ||
    colaDespuesDeFallo.length !== 1
  ) {
    errores.push(
      "src/repositories/recibos_drive.js: la proyección operativa simulada no respeta tamaño, conteos o privacidad.",
    );
  }
} catch (error) {
  errores.push(
    `src/repositories/recibos_drive.js: no fue posible validar la proyección operativa: ${error.message}`,
  );
}
const inicioArranqueOperacion = contenidoControladorWeb.indexOf(
  "function obtenerDatosOperacion()",
);
const finArranqueOperacion = contenidoControladorWeb.indexOf(
  "function obtenerEstadoRecibosOperacion()",
);
const arranqueOperacion = contenidoControladorWeb.slice(
  inicioArranqueOperacion,
  finArranqueOperacion,
);
if (
  inicioArranqueOperacion < 0 ||
  finArranqueOperacion <= inicioArranqueOperacion ||
  arranqueOperacion.includes("leerIndiceRecibos_") ||
  arranqueOperacion.includes("obtenerConfiguracionCompleta_") ||
  arranqueOperacion.includes("contactos:")
) {
  errores.push(
    "src/app/controllers/web.js: el arranque operativo no debe leer el índice, la configuración completa ni los contactos.",
  );
}

const interfazOperacion = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, "src", "views", "scripts", "operacion.html"),
  "utf8",
);
if (!interfazOperacion.includes('recibo.estado !== "ENVIADO"')) {
  errores.push("src/views/scripts/operacion.html: un recibo enviado no debe mostrar la acción de eliminar.");
}

const paginaOperacion = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, "src", "views", "pages", "operacion.html"),
  "utf8",
);
const posicionesCaptura = [
  "<th>Cliente</th>",
  "<th>Concepto</th>",
  "<th>Importe</th>",
  "<th>Fecha de pago</th>",
].map((encabezado) => paginaOperacion.indexOf(encabezado));
if (
  posicionesCaptura.some((posicion) => posicion < 0) ||
  posicionesCaptura.some(
    (posicion, indice) => indice > 0 && posicion <= posicionesCaptura[indice - 1],
  ) ||
  !paginaOperacion.includes("Columnas: Cliente, Concepto, Importe y Fecha.")
) {
  errores.push("src/views/pages/operacion.html: la captura debe conservar el orden Cliente, Concepto, Importe y Fecha.");
}
if (
  !interfazOperacion.includes("concepto: columnas[1].trim()") ||
  !interfazOperacion.includes("importe: interpretarImportePegado(columnas[2])") ||
  !interfazOperacion.includes('crearElementoTexto("strong", recibo.concepto')
) {
  errores.push("src/views/scripts/operacion.html: el pegado y los pendientes deben priorizar el concepto.");
}
const inicioCreacionInterfaz = interfazOperacion.indexOf(
  "async function crearRecibosCapturados()",
);
const finCreacionInterfaz = interfazOperacion.indexOf(
  "function renderizarResumen()",
);
const creacionInterfaz = interfazOperacion.slice(
  inicioCreacionInterfaz,
  finCreacionInterfaz,
);
if (
  inicioCreacionInterfaz < 0 ||
  finCreacionInterfaz <= inicioCreacionInterfaz ||
  creacionInterfaz.includes("await cargarEstadoRecibosOperacion()") ||
  !creacionInterfaz.includes("sincronizarIndiceRecibosEnSegundoPlano();") ||
  !creacionInterfaz.includes("await abrirReciboFirma(")
) {
  errores.push(
    "src/views/scripts/operacion.html: la creación no debe esperar el historial y un recibo individual debe abrirse directamente para firma.",
  );
}

const repositorioConfiguracion = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, "src", "repositories", "configuracion_drive.js"),
  "utf8",
);
const inicioBusquedaTipoRecibo = repositorioConfiguracion.indexOf(
  "function obtenerTipoReciboPorIdentificador_(",
);
const finBusquedaTipoRecibo = repositorioConfiguracion.indexOf(
  "function obtenerTiposReciboActivosParaOperacion_(",
);
const busquedaTipoRecibo = repositorioConfiguracion.slice(
  inicioBusquedaTipoRecibo,
  finBusquedaTipoRecibo,
);
if (
  !repositorioConfiguracion.includes("TIPOS_RECIBO_COMPLETOS") ||
  inicioBusquedaTipoRecibo < 0 ||
  finBusquedaTipoRecibo <= inicioBusquedaTipoRecibo ||
  !busquedaTipoRecibo.includes("obtenerTiposRecibo_()") ||
  busquedaTipoRecibo.includes("obtenerConfiguracionCompleta_()")
) {
  errores.push(
    "src/repositories/configuracion_drive.js: la firma debe consultar solamente los tipos completos, sin cargar contactos ni configuración general.",
  );
}
const paginaConfiguracion = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, "src", "views", "pages", "configuracion.html"),
  "utf8",
);
const interfazConfiguracion = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, "src", "views", "scripts", "configuracion.html"),
  "utf8",
);
if (
  !repositorioConfiguracion.includes("function guardarContactosMasivos(") ||
  !repositorioConfiguracion.includes("contactos.concat(contactosNuevos)") ||
  !repositorioConfiguracion.includes("function eliminarContactosMasivos(") ||
  !repositorioConfiguracion.includes("conjuntoEliminacion.has(contacto.identificadorContacto)")
) {
  errores.push("src/repositories/configuracion_drive.js: los contactos masivos deben guardarse y eliminarse en operaciones únicas.");
}
if (
  !paginaConfiguracion.includes('id="dialogoContactosMasivos"') ||
  !paginaConfiguracion.includes('id="botonEliminarContactosSeleccionados"') ||
  !/ejecutarServidor\(\s*"guardarContactosMasivos"/.test(interfazConfiguracion) ||
  !interfazConfiguracion.includes('"eliminarContactosMasivos"') ||
  !interfazConfiguracion.includes("window.confirm(`¿Guardar ${filas.length} contacto(s)?`)") ||
  !interfazConfiguracion.includes("mostrarEstadoContactosMasivos(errorOperacion.message, true)") ||
  !interfazConfiguracion.includes("contactosConfigurados = contactosConfigurados.concat(") ||
  !interfazConfiguracion.includes("await cargarConfiguracion()")
) {
  errores.push("src/views/configuracion: los contactos masivos deben confirmar, informar, actualizar y reconciliar la lista.");
}

if (errores.length) {
  console.error("La verificación encontró problemas:\n" + errores.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Verificación correcta: ${archivosServidor.length} archivos de servidor, ` +
      `${archivosScriptsVista.length} scripts de interfaz y ` +
      `${archivosHerramientasPruebas.length} herramienta(s) de pruebas.`,
  );
}
