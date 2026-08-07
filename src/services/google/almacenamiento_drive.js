/**
 * Obtiene la carpeta de Drive que contiene el proyecto independiente de Apps
 * Script. Nunca utiliza silenciosamente la raíz de Mi unidad como alternativa.
 *
 * @returns {GoogleAppsScript.Drive.Folder} Carpeta contenedora del proyecto.
 */
function obtenerDirectorioContenedorProyecto_() {
  const propiedades = obtenerPropiedadesSistema_();
  const identificadorRegistrado = propiedades.getProperty(
    CLAVES_PROPIEDADES.DIRECTORIO_CONTENEDOR,
  );
  if (identificadorRegistrado) {
    try {
      return DriveApp.getFolderById(identificadorRegistrado);
    } catch (error) {
      console.warn(`Se resolverá nuevamente el directorio contenedor: ${error.message}`);
    }
  }

  try {
    const archivoProyecto = DriveApp.getFileById(ScriptApp.getScriptId());
    const directoriosPadre = archivoProyecto.getParents();
    if (!directoriosPadre.hasNext()) {
      throw new Error("El proyecto no tiene una carpeta padre disponible.");
    }
    const directorioContenedor = directoriosPadre.next();
    propiedades.setProperty(
      CLAVES_PROPIEDADES.DIRECTORIO_CONTENEDOR,
      directorioContenedor.getId(),
    );
    return directorioContenedor;
  } catch (error) {
    throw new Error(
      "No se pudo identificar la carpeta que contiene el proyecto de Apps Script. " +
        "Confirma que sea un proyecto independiente creado dentro de una carpeta de Drive. " +
        `Detalle: ${error.message}`,
    );
  }
}

function asegurarDirectorioDentroDe_(directorio, directorioPadreEsperado) {
  const identificadorEsperado = directorioPadreEsperado.getId();
  const directoriosPadre = directorio.getParents();
  while (directoriosPadre.hasNext()) {
    if (directoriosPadre.next().getId() === identificadorEsperado) {
      return directorio;
    }
  }
  directorio.moveTo(directorioPadreEsperado);
  return directorio;
}

function obtenerDirectorioPorPropiedad_(clavePropiedad) {
  const identificador = obtenerPropiedadObligatoria_(clavePropiedad);
  try {
    return DriveApp.getFolderById(identificador);
  } catch (error) {
    throw new Error(`El directorio registrado en ${clavePropiedad} no está disponible.`);
  }
}

function obtenerOCrearDirectorio_(
  directorioPadre,
  nombreDirectorio,
  clavePropiedad,
) {
  const propiedades = obtenerPropiedadesSistema_();
  const identificadorRegistrado = propiedades.getProperty(clavePropiedad);

  if (identificadorRegistrado) {
    try {
      return DriveApp.getFolderById(identificadorRegistrado);
    } catch (error) {
      console.warn(`Se reparará el directorio ${nombreDirectorio}: ${error.message}`);
    }
  }

  const coincidencias = directorioPadre.getFoldersByName(nombreDirectorio);
  const directorio = coincidencias.hasNext()
    ? coincidencias.next()
    : directorioPadre.createFolder(nombreDirectorio);

  propiedades.setProperty(clavePropiedad, directorio.getId());
  return directorio;
}

function obtenerOCrearArchivoJson_(
  directorio,
  nombreArchivo,
  clavePropiedad,
  contenidoInicial,
) {
  const propiedades = obtenerPropiedadesSistema_();
  const identificadorRegistrado = propiedades.getProperty(clavePropiedad);

  if (identificadorRegistrado) {
    try {
      return DriveApp.getFileById(identificadorRegistrado);
    } catch (error) {
      console.warn(`Se reparará el archivo ${nombreArchivo}: ${error.message}`);
    }
  }

  const coincidencias = directorio.getFilesByName(nombreArchivo);
  const archivo = coincidencias.hasNext()
    ? coincidencias.next()
    : directorio.createFile(
        nombreArchivo,
        JSON.stringify(contenidoInicial, null, 2),
        MimeType.PLAIN_TEXT,
      );

  propiedades.setProperty(clavePropiedad, archivo.getId());
  return archivo;
}

function leerArchivoJsonPorPropiedad_(clavePropiedad) {
  const identificadorArchivo = obtenerPropiedadObligatoria_(clavePropiedad);
  return leerArchivoJsonPorIdentificador_(identificadorArchivo);
}

function leerArchivoJsonPorIdentificador_(identificadorArchivo) {
  const contenido = DriveApp.getFileById(identificadorArchivo)
    .getBlob()
    .getDataAsString("UTF-8");
  try {
    return JSON.parse(contenido);
  } catch (error) {
    throw new Error(`El archivo JSON ${identificadorArchivo} está dañado.`);
  }
}

function guardarArchivoJsonPorPropiedad_(clavePropiedad, contenido) {
  const identificadorArchivo = obtenerPropiedadObligatoria_(clavePropiedad);
  guardarArchivoJsonPorIdentificador_(identificadorArchivo, contenido);
}

function guardarArchivoJsonPorIdentificador_(identificadorArchivo, contenido) {
  DriveApp.getFileById(identificadorArchivo).setContent(
    JSON.stringify(contenido, null, 2),
  );
}

function crearArchivoDesdeBase64_(
  directorio,
  contenidoBase64,
  nombreArchivo,
  tiposPermitidos,
) {
  const coincidencia = String(contenidoBase64 || "").match(
    /^data:([^;]+);base64,(.+)$/,
  );
  if (!coincidencia) throw new Error("El archivo recibido no es válido.");

  const tipoContenido = coincidencia[1];
  if (!tiposPermitidos.includes(tipoContenido)) {
    throw new Error(`El formato ${tipoContenido} no está permitido.`);
  }

  const bytes = Utilities.base64Decode(coincidencia[2]);
  if (bytes.length > 4 * 1024 * 1024) {
    throw new Error("El archivo no puede superar 4 MB después de comprimirse.");
  }

  const extensiones = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
  };
  const nombreFinal = /\.[A-Za-z0-9]+$/.test(nombreArchivo)
    ? nombreArchivo
    : `${nombreArchivo}${extensiones[tipoContenido] || ""}`;
  const archivo = directorio.createFile(
    Utilities.newBlob(bytes, tipoContenido, nombreFinal),
  );
  return archivo;
}

function obtenerArchivoComoUrlDatos_(identificadorArchivo) {
  if (!identificadorArchivo) return "";
  const blob = DriveApp.getFileById(identificadorArchivo).getBlob();
  const bytes = blob.getBytes();
  const tipoContenido = detectarTipoContenidoImagen_(blob.getContentType(), bytes);
  if (!tipoContenido) {
    throw new Error("El archivo de imagen almacenado no es PNG ni JPEG.");
  }
  return `data:${tipoContenido};base64,${Utilities.base64Encode(bytes)}`;
}

/**
 * Normaliza el tipo MIME mediante la firma binaria. Drive puede devolver
 * application/octet-stream para imágenes válidas subidas con anterioridad.
 *
 * @param {string} tipoRegistrado Tipo MIME informado por Drive.
 * @param {number[]} bytes Contenido binario del archivo.
 * @returns {string} Tipo de imagen reconocido o una cadena vacía.
 */
function detectarTipoContenidoImagen_(tipoRegistrado, bytes) {
  const valores = (bytes || []).slice(0, 8).map((valor) =>
    valor < 0 ? valor + 256 : valor,
  );
  if (
    valores[0] === 0x89 &&
    valores[1] === 0x50 &&
    valores[2] === 0x4e &&
    valores[3] === 0x47
  ) {
    return "image/png";
  }
  if (valores[0] === 0xff && valores[1] === 0xd8 && valores[2] === 0xff) {
    return "image/jpeg";
  }
  return ["image/png", "image/jpeg"].includes(tipoRegistrado)
    ? tipoRegistrado
    : "";
}

function obtenerOCrearSubdirectorio_(directorioPadre, nombreDirectorio) {
  const coincidencias = directorioPadre.getFoldersByName(nombreDirectorio);
  return coincidencias.hasNext()
    ? coincidencias.next()
    : directorioPadre.createFolder(nombreDirectorio);
}
