function numeroALetras_(numero) {
  const valor = Number(numero);
  if (!Number.isFinite(valor) || valor < 0 || valor > 999999999999) {
    throw new Error("El importe está fuera del rango permitido.");
  }

  const entero = Math.floor(valor);
  const centavos = Math.round((valor - entero) * 100);
  const moneda = entero === 1 ? "PESO" : "PESOS";
  return `${ajustarNumeroMasculino_(convertirNumeroALetras_(entero))} ${moneda} ${String(centavos).padStart(2, "0")}/100 M.N.`;
}

function convertirNumeroALetras_(numero) {
  if (numero === 0) return "CERO";
  if (numero <= 29) return convertirUnidadODecenaEspecial_(numero);
  if (numero <= 99) return convertirDecenas_(numero);
  if (numero <= 999) return convertirCentenas_(numero);
  if (numero <= 999999) {
    const miles = Math.floor(numero / 1000);
    const resto = numero % 1000;
    const textoMiles =
      miles === 1
        ? "MIL"
        : `${ajustarNumeroMasculino_(convertirNumeroALetras_(miles))} MIL`;
    return resto ? `${textoMiles} ${convertirNumeroALetras_(resto)}` : textoMiles;
  }

  const millones = Math.floor(numero / 1000000);
  const resto = numero % 1000000;
  const textoMillones =
    millones === 1
      ? "UN MILLÓN"
      : `${ajustarNumeroMasculino_(convertirNumeroALetras_(millones))} MILLONES`;
  return resto
    ? `${textoMillones} ${convertirNumeroALetras_(resto)}`
    : textoMillones;
}

function convertirUnidadODecenaEspecial_(numero) {
  const valores = [
    "CERO",
    "UNO",
    "DOS",
    "TRES",
    "CUATRO",
    "CINCO",
    "SEIS",
    "SIETE",
    "OCHO",
    "NUEVE",
    "DIEZ",
    "ONCE",
    "DOCE",
    "TRECE",
    "CATORCE",
    "QUINCE",
    "DIECISÉIS",
    "DIECISIETE",
    "DIECIOCHO",
    "DIECINUEVE",
    "VEINTE",
    "VEINTIUNO",
    "VEINTIDÓS",
    "VEINTITRÉS",
    "VEINTICUATRO",
    "VEINTICINCO",
    "VEINTISÉIS",
    "VEINTISIETE",
    "VEINTIOCHO",
    "VEINTINUEVE",
  ];
  return valores[numero];
}

function convertirDecenas_(numero) {
  const nombres = [
    "",
    "",
    "VEINTE",
    "TREINTA",
    "CUARENTA",
    "CINCUENTA",
    "SESENTA",
    "SETENTA",
    "OCHENTA",
    "NOVENTA",
  ];
  const decena = Math.floor(numero / 10);
  const unidad = numero % 10;
  return unidad
    ? `${nombres[decena]} Y ${convertirUnidadODecenaEspecial_(unidad)}`
    : nombres[decena];
}

function convertirCentenas_(numero) {
  if (numero === 100) return "CIEN";
  const nombres = [
    "",
    "CIENTO",
    "DOSCIENTOS",
    "TRESCIENTOS",
    "CUATROCIENTOS",
    "QUINIENTOS",
    "SEISCIENTOS",
    "SETECIENTOS",
    "OCHOCIENTOS",
    "NOVECIENTOS",
  ];
  const centena = Math.floor(numero / 100);
  const resto = numero % 100;
  return resto
    ? `${nombres[centena]} ${convertirNumeroALetras_(resto)}`
    : nombres[centena];
}

function ajustarNumeroMasculino_(texto) {
  return texto
    .replace(/VEINTIUNO$/, "VEINTIÚN")
    .replace(/ Y UNO$/, " Y UN")
    .replace(/UNO$/, "UN");
}
