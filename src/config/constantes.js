const NOMBRE_APLICACION = "Sistema de Recibos y Pagos";
const VERSION_ESTRUCTURA = "3";
const TEXTO_PLANTILLA_GENERAL =
  "RECIBÍ DE {{Proveedor}}, LA CANTIDAD DE {{Importe}}\n" +
  "SON: ({{ImporteLetra}})\n" +
  "POR CONCEPTO DE: {{Concepto}}";

const NOMBRES_DIRECTORIOS = Object.freeze({
  RAIZ: "Sistema Recibos Pagos",
  CONFIGURACION: "config",
  LOGOTIPOS: "logos",
  DATOS: "datos",
  RECIBOS: "recibos",
  EVIDENCIAS: "evidencias",
  RESPALDOS: "respaldos",
});

const NOMBRES_ARCHIVOS = Object.freeze({
  CONFIGURACION: "configuracion.json",
  TIPOS_RECIBO: "tipos-recibo.json",
  CONTACTOS: "contactos.json",
  REPORTE: "Reporte General de Recibos",
});

const CLAVES_PROPIEDADES = Object.freeze({
  SISTEMA_INICIALIZADO: "SISTEMA_INICIALIZADO",
  VERSION_ESTRUCTURA: "VERSION_ESTRUCTURA",
  DIRECTORIO_RAIZ: "ID_DIRECTORIO_RAIZ",
  DIRECTORIO_CONFIGURACION: "ID_DIRECTORIO_CONFIGURACION",
  DIRECTORIO_LOGOTIPOS: "ID_DIRECTORIO_LOGOTIPOS",
  DIRECTORIO_DATOS: "ID_DIRECTORIO_DATOS",
  DIRECTORIO_RECIBOS: "ID_DIRECTORIO_RECIBOS",
  DIRECTORIO_EVIDENCIAS: "ID_DIRECTORIO_EVIDENCIAS",
  DIRECTORIO_RESPALDOS: "ID_DIRECTORIO_RESPALDOS",
  ARCHIVO_CONFIGURACION: "ID_ARCHIVO_CONFIGURACION",
  ARCHIVO_TIPOS_RECIBO: "ID_ARCHIVO_TIPOS_RECIBO",
  ARCHIVO_CONTACTOS: "ID_ARCHIVO_CONTACTOS",
  HOJA_REPORTE: "ID_HOJA_REPORTE",
});

const ESTADOS_RECIBO = Object.freeze({
  PENDIENTE_FIRMA: "PENDIENTE_FIRMA",
  FIRMADO: "FIRMADO",
  ENVIADO: "ENVIADO",
  ERROR_PDF: "ERROR_PDF",
  ERROR_ENVIO: "ERROR_ENVIO",
  ANULADO: "ANULADO",
});

const FORMATOS_PAPEL = Object.freeze({
  CARTA: "CARTA",
  A4: "A4",
});

const RUTAS_APLICACION = Object.freeze({
  inicio: {
    titulo: "Inicio",
    vista: "src/views/pages/inicio",
    script: "src/views/scripts/inicio",
  },
  recibos: {
    titulo: "Recibos",
    vista: "src/views/pages/recibos",
    script: "src/views/scripts/recibos",
  },
  "nuevo-recibo": {
    titulo: "Crear recibos",
    vista: "src/views/pages/nuevo_recibo",
    script: "src/views/scripts/nuevo_recibo",
  },
  firmas: {
    titulo: "Firmas",
    vista: "src/views/pages/firmas",
    script: "src/views/scripts/firmas",
  },
  configuracion: {
    titulo: "Configuración",
    vista: "src/views/pages/configuracion",
    script: "src/views/scripts/configuracion",
  },
});

const VARIABLES_PLANTILLA_PERMITIDAS = Object.freeze([
  "Folio",
  "FechaPago",
  "FechaCreacion",
  "Cliente",
  "Proveedor",
  "Importe",
  "ImporteLetra",
  "Concepto",
]);

const CABECERAS_REPORTE = Object.freeze([
  "Identificador",
  "Folio",
  "Tipo de recibo",
  "Empresa",
  "Proveedor",
  "Cliente",
  "Importe",
  "Concepto",
  "Fecha de pago",
  "Fecha de creación",
  "Fecha de firma",
  "Fecha de envío",
  "Estado",
  "Destinatarios",
  "Identificador PDF",
  "URL PDF",
]);
