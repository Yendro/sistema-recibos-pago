function normalizarTextoMayusculas_(valor) {
  return String(valor || "").trim().toLocaleUpperCase("es-MX");
}

function normalizarCorreoParaComparacion_(valor) {
  return String(valor || "").trim().toLocaleLowerCase("es-MX");
}

function validarCorreo_(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo || "").trim());
}

function limpiarNombreArchivo_(valor) {
  return String(valor || "archivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extraerIdentificadorDrive_(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";
  const coincidencia = texto.match(/[-\w]{20,}/);
  return coincidencia ? coincidencia[0] : "";
}

function obtenerFechaIso_(fecha) {
  return Utilities.formatDate(
    fecha instanceof Date ? fecha : new Date(fecha),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd'T'HH:mm:ssXXX",
  );
}

function obtenerClavePeriodo_(fecha) {
  return Utilities.formatDate(
    fecha instanceof Date ? fecha : new Date(fecha),
    Session.getScriptTimeZone(),
    "yyyy-MM",
  );
}

function formatearFechaParaRecibo_(valor) {
  const texto = String(valor || "");
  const fecha =
    valor instanceof Date
      ? valor
      : new Date(/^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T12:00:00` : texto);
  if (Number.isNaN(fecha.getTime())) return String(valor || "");
  return Utilities.formatDate(fecha, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function formatearImporte_(valor) {
  return Number(valor).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}
