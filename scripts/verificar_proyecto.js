const sistemaArchivos = require("node:fs");
const rutas = require("node:path");

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

const funcionesPublicasPermitidas = new Set([
  "doGet",
  "inicializarSistemaPruebas",
  "diagnosticarSistema",
  "obtenerDatosOperacion",
  "obtenerConfiguracionParaWeb",
  "guardarTipoRecibo",
  "eliminarTipoRecibo",
  "guardarContacto",
  "eliminarContacto",
  "crearRecibosMasivo",
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
const vistasVerificables = ["operacion", "configuracion"];
vistasVerificables.forEach((nombreVista) => {
  const rutaPagina = rutas.join(
    directorioProyecto,
    "src",
    "views",
    "pages",
    `${nombreVista}.html`,
  );
  const rutaScript = rutas.join(
    directorioProyecto,
    "src",
    "views",
    "scripts",
    `${nombreVista}.html`,
  );
  const contenidoPagina = sistemaArchivos.readFileSync(rutaPagina, "utf8");
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
if (manifiesto.webapp?.access !== "MYSELF") {
  errores.push("appsscript.json: la aplicación web debe conservar acceso MYSELF.");
}
if (manifiesto.webapp?.executeAs !== "USER_DEPLOYING") {
  errores.push("appsscript.json: la aplicación web debe ejecutarse como USER_DEPLOYING.");
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
if (
  !repositorioRecibos.includes("recibo.estado === ESTADOS_RECIBO.ENVIADO") ||
  !repositorioRecibos.includes("eliminarReciboDeReporte_(identificadorRecibo)")
) {
  errores.push("src/repositories/recibos_drive.js: la eliminación debe proteger enviados y limpiar el reporte.");
}

const interfazOperacion = sistemaArchivos.readFileSync(
  rutas.join(directorioProyecto, "src", "views", "scripts", "operacion.html"),
  "utf8",
);
if (!interfazOperacion.includes('recibo.estado !== "ENVIADO"')) {
  errores.push("src/views/scripts/operacion.html: un recibo enviado no debe mostrar la acción de eliminar.");
}

if (errores.length) {
  console.error("La verificación encontró problemas:\n" + errores.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Verificación correcta: ${archivosServidor.length} archivos de servidor y ${archivosScriptsVista.length} scripts de interfaz.`,
  );
}
