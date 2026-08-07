function obtenerClavePropiedadArchivoPeriodo_(clavePeriodo) {
  return `ID_ARCHIVO_RECIBOS_${clavePeriodo.replace("-", "_")}`;
}

function obtenerOCrearArchivoRecibosPeriodo_(clavePeriodo) {
  const propiedades = obtenerPropiedadesSistema_();
  const clavePropiedad = obtenerClavePropiedadArchivoPeriodo_(clavePeriodo);
  const identificadorRegistrado = propiedades.getProperty(clavePropiedad);

  if (identificadorRegistrado) {
    try {
      return DriveApp.getFileById(identificadorRegistrado);
    } catch (error) {
      console.warn(`Se reparará el archivo del periodo ${clavePeriodo}.`);
    }
  }

  const [anio] = clavePeriodo.split("-");
  const directorioDatos = obtenerDirectorioPorPropiedad_(
    CLAVES_PROPIEDADES.DIRECTORIO_DATOS,
  );
  const directorioAnio = obtenerOCrearSubdirectorio_(directorioDatos, anio);
  const nombreArchivo = `recibos-${clavePeriodo}.json`;
  const coincidencias = directorioAnio.getFilesByName(nombreArchivo);
  const archivo = coincidencias.hasNext()
    ? coincidencias.next()
    : directorioAnio.createFile(
        nombreArchivo,
        JSON.stringify({ version: 1, periodo: clavePeriodo, recibos: [] }, null, 2),
        MimeType.PLAIN_TEXT,
      );
  propiedades.setProperty(clavePropiedad, archivo.getId());
  return archivo;
}

function obtenerDocumentosRecibosExistentes_() {
  const propiedades = obtenerPropiedadesSistema_().getProperties();
  return Object.keys(propiedades)
    .filter((clave) => clave.startsWith("ID_ARCHIVO_RECIBOS_"))
    .map((clave) => ({
      clavePropiedad: clave,
      identificadorArchivo: propiedades[clave],
    }));
}

function validarDatosNuevoRecibo_(datosRecibo) {
  const cliente = normalizarTextoMayusculas_(datosRecibo.cliente);
  const concepto = normalizarTextoMayusculas_(datosRecibo.concepto);
  const importe = Number(datosRecibo.importe);
  const fechaPago = String(datosRecibo.fechaPago || "").trim();

  if (!cliente) throw new Error("El cliente es obligatorio.");
  if (!Number.isFinite(importe) || importe <= 0) {
    throw new Error("El importe debe ser mayor que cero.");
  }
  if (!concepto) throw new Error("El concepto es obligatorio.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)) {
    throw new Error("La fecha de pago debe usar el formato AAAA-MM-DD.");
  }
  const fechaValidada = new Date(`${fechaPago}T12:00:00`);
  if (
    Number.isNaN(fechaValidada.getTime()) ||
    Utilities.formatDate(
      fechaValidada,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd",
    ) !== fechaPago
  ) {
    throw new Error("La fecha de pago no existe en el calendario.");
  }

  return { cliente, concepto, importe, fechaPago };
}

/**
 * Valida el lote completo y lo persiste en una sola escritura. Ningún recibo
 * se guarda cuando alguna fila es inválida.
 *
 * @param {Object} datosLote Tipo de recibo y filas interpretadas en la web.
 * @returns {Object} Resultado con los recibos creados.
 */
function crearRecibosMasivo(datosLote) {
  try {
    if (!sistemaEstaInicializado_()) {
      throw new Error("El sistema todavía no está inicializado.");
    }
    const filas = Array.isArray(datosLote?.recibos) ? datosLote.recibos : [];
    if (!filas.length) throw new Error("No se recibieron filas para guardar.");
    if (filas.length > 100) {
      throw new Error("Cada lote puede contener hasta 100 recibos.");
    }

    const tipoRecibo = obtenerTipoReciboPorIdentificador_(
      datosLote.identificadorTipoRecibo,
    );
    if (!tipoRecibo.activo) throw new Error("El tipo de recibo está inactivo.");

    const filasNormalizadas = filas.map((fila, indice) => {
      try {
        return validarDatosNuevoRecibo_(fila);
      } catch (error) {
        throw new Error(`Fila ${indice + 1}: ${error.message}`);
      }
    });

    const huellas = new Set();
    filasNormalizadas.forEach((fila, indice) => {
      const huella = [
        fila.cliente,
        fila.importe.toFixed(2),
        fila.concepto,
        fila.fechaPago,
      ].join("|");
      if (huellas.has(huella)) {
        throw new Error(`Fila ${indice + 1}: el recibo está duplicado en el lote.`);
      }
      huellas.add(huella);
    });

    const bloqueo = LockService.getScriptLock();
    bloqueo.waitLock(30000);
    try {
      const fechaCreacion = new Date();
      const clavePeriodo = obtenerClavePeriodo_(fechaCreacion);
      const archivo = obtenerOCrearArchivoRecibosPeriodo_(clavePeriodo);
      const documento = leerArchivoJsonPorIdentificador_(archivo.getId());
      const recibosExistentes = Array.isArray(documento.recibos)
        ? documento.recibos
        : [];
      const nuevosRecibos = filasNormalizadas.map((fila) => ({
        identificadorRecibo: Utilities.getUuid(),
        folio: generarFolioSeguro_(tipoRecibo.prefijoFolio, fechaCreacion),
        identificadorTipoRecibo: tipoRecibo.identificadorTipoRecibo,
        nombreTipoRecibo: tipoRecibo.nombreTipoRecibo,
        nombreEmpresa: tipoRecibo.nombreEmpresa,
        nombreProveedor: tipoRecibo.nombreProveedor,
        cliente: fila.cliente,
        importe: fila.importe,
        importeLetra: numeroALetras_(fila.importe),
        concepto: fila.concepto,
        fechaPago: fila.fechaPago,
        fechaCreacion: obtenerFechaIso_(fechaCreacion),
        fechaActualizacion: obtenerFechaIso_(fechaCreacion),
        clavePeriodo,
        estado: ESTADOS_RECIBO.PENDIENTE_FIRMA,
        identificadorFotografia: "",
        identificadorFirma: "",
        identificadorPdf: "",
        urlPdf: "",
        fechaFirma: "",
        fechaEnvio: "",
        destinatarios: [],
        ultimoError: "",
      }));

      documento.version = Number(documento.version || 0) + 1;
      documento.recibos = recibosExistentes.concat(nuevosRecibos);
      guardarArchivoJsonPorIdentificador_(archivo.getId(), documento);

      return crearRespuestaExitosa_(
        { recibos: nuevosRecibos, cantidad: nuevosRecibos.length },
        `${nuevosRecibos.length} recibo(s) creados y pendientes de firma.`,
      );
    } finally {
      bloqueo.releaseLock();
    }
  } catch (error) {
    return crearRespuestaError_(error);
  }
}

function generarFolioSeguro_(prefijoFolio, fechaCreacion) {
  const marcaTiempo = Utilities.formatDate(
    fechaCreacion,
    Session.getScriptTimeZone(),
    "yyyyMMddHHmmss",
  );
  const claveControl = `CONTROL_FOLIO_${prefijoFolio}`;
  const propiedades = obtenerPropiedadesSistema_();
  let control = { marcaTiempo: "", secuencia: 0 };
  const valorActual = propiedades.getProperty(claveControl);
  if (valorActual) {
    try {
      control = JSON.parse(valorActual);
    } catch (error) {
      console.warn(`Se reiniciará el control de folio ${prefijoFolio}.`);
    }
  }

  control.secuencia =
    control.marcaTiempo === marcaTiempo ? Number(control.secuencia || 0) + 1 : 1;
  control.marcaTiempo = marcaTiempo;
  propiedades.setProperty(claveControl, JSON.stringify(control));

  return `${prefijoFolio}-${marcaTiempo}-${String(control.secuencia).padStart(2, "0")}`;
}

/**
 * Consulta recibos sin utilizar la hoja de reporte como fuente de información.
 *
 * @param {Object} criterios Página, tamaño, estado y texto de búsqueda.
 * @returns {Object} Página de recibos ordenada por fecha descendente.
 */
function listarRecibos(criterios) {
  try {
    if (!sistemaEstaInicializado_()) return crearRespuestaExitosa_({ recibos: [] });
    const estadoSolicitado = String(criterios?.estado || "").trim();
    const pagina = Math.max(1, Number(criterios?.pagina || 1));
    const tamanoPagina = Math.min(
      100,
      Math.max(1, Number(criterios?.tamanoPagina || 25)),
    );
    const textoBusqueda = normalizarTextoMayusculas_(criterios?.busqueda || "");

    let recibos = [];
    obtenerDocumentosRecibosExistentes_().forEach((referencia) => {
      try {
        const documento = leerArchivoJsonPorIdentificador_(
          referencia.identificadorArchivo,
        );
        if (Array.isArray(documento.recibos)) recibos.push(...documento.recibos);
      } catch (error) {
        console.error(error);
      }
    });

    recibos = recibos
      .filter((recibo) => !estadoSolicitado || recibo.estado === estadoSolicitado)
      .filter((recibo) => {
        if (!textoBusqueda) return true;
        return [
          recibo.folio,
          recibo.cliente,
          recibo.concepto,
          recibo.nombreTipoRecibo,
        ].some((valor) =>
          normalizarTextoMayusculas_(valor).includes(textoBusqueda),
        );
      })
      .sort((primero, segundo) =>
        String(segundo.fechaCreacion).localeCompare(String(primero.fechaCreacion)),
      );

    const inicio = (pagina - 1) * tamanoPagina;
    return crearRespuestaExitosa_({
      recibos: recibos.slice(inicio, inicio + tamanoPagina),
      pagina,
      tamanoPagina,
      total: recibos.length,
      totalPaginas: Math.max(1, Math.ceil(recibos.length / tamanoPagina)),
    });
  } catch (error) {
    return crearRespuestaError_(error);
  }
}

function encontrarRecibo_(identificadorRecibo) {
  for (const referencia of obtenerDocumentosRecibosExistentes_()) {
    const documento = leerArchivoJsonPorIdentificador_(
      referencia.identificadorArchivo,
    );
    const posicion = (documento.recibos || []).findIndex(
      (recibo) => recibo.identificadorRecibo === identificadorRecibo,
    );
    if (posicion >= 0) {
      return {
        referencia,
        documento,
        posicion,
        recibo: documento.recibos[posicion],
      };
    }
  }
  throw new Error("No se encontró el recibo solicitado.");
}

function guardarReciboEncontrado_(resultadoBusqueda) {
  resultadoBusqueda.documento.version =
    Number(resultadoBusqueda.documento.version || 0) + 1;
  resultadoBusqueda.documento.recibos[resultadoBusqueda.posicion] =
    resultadoBusqueda.recibo;
  guardarArchivoJsonPorIdentificador_(
    resultadoBusqueda.referencia.identificadorArchivo,
    resultadoBusqueda.documento,
  );
}

function obtenerReciboParaFirma(identificadorRecibo) {
  try {
    const resultado = encontrarRecibo_(identificadorRecibo);
    const tipoRecibo = obtenerTipoReciboPorIdentificador_(
      resultado.recibo.identificadorTipoRecibo,
    );
    return crearRespuestaExitosa_({
      recibo: resultado.recibo,
      tipoRecibo: {
        ...tipoRecibo,
        logotipoUrlDatos: tipoRecibo.identificadorLogotipo
          ? obtenerArchivoComoUrlDatos_(tipoRecibo.identificadorLogotipo)
          : "",
      },
    });
  } catch (error) {
    return crearRespuestaError_(error);
  }
}
