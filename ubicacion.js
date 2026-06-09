// Vision Stick - Ubicación real con Firebase
const FIREBASE_BASE_URL = "https://vision-stick-14318-default-rtdb.firebaseio.com";

// La página revisa Firebase cada 3 segundos
const INTERVALO_ACTUALIZACION = 3000;

// Si pasan más de 300 segundos sin actualización, se muestra como inactivo
const TIEMPO_INACTIVO = 300000;

let codigoActual = null;
let intervaloAutomatico = null;
let ultimaLatitud = null;
let ultimaLongitud = null;

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });
}

function mostrarMapa(latitud, longitud) {
  const mapa = document.getElementById("mapaGPS");
  const placeholder = document.getElementById("mapPlaceholder");

  if (!mapa) return;

  mapa.src = `https://www.openstreetmap.org/export/embed.html?bbox=${longitud - 0.005},${latitud - 0.005},${longitud + 0.005},${latitud + 0.005}&layer=mapnik&marker=${latitud},${longitud}`;

  if (placeholder) {
    placeholder.classList.add("loc-hidden");
  }
}

function limpiarMapa() {
  const mapa = document.getElementById("mapaGPS");
  const placeholder = document.getElementById("mapPlaceholder");

  if (mapa) {
    mapa.src = "";
  }

  if (placeholder) {
    placeholder.classList.remove("loc-hidden");
  }
}

// Esta función acepta 2 formatos:
// 1) timestamp numérico: 1780950725000
// 2) ultimaActualizacion como texto: "08/06/2026 20:32:05"
function obtenerFechaActualizacion(baston) {
  // Caso 1: si existe timestamp numérico
  if (baston.timestamp && Number(baston.timestamp) > 0) {
    let timestamp = Number(baston.timestamp);

    // Si viene en segundos, lo transforma a milisegundos
    if (timestamp < 1000000000000) {
      timestamp = timestamp * 1000;
    }

    const fechaTimestamp = new Date(timestamp);

    if (!isNaN(fechaTimestamp.getTime())) {
      return fechaTimestamp;
    }
  }

  // Caso 2: si viene como texto desde Firebase
  // Ejemplo: "08/06/2026 20:32:05"
  if (baston.ultimaActualizacion) {
    const partes = baston.ultimaActualizacion.trim().split(" ");

    if (partes.length >= 2) {
      const fechaPartes = partes[0].split("/");
      const horaPartes = partes[1].split(":");

      if (fechaPartes.length === 3 && horaPartes.length === 3) {
        const dia = Number(fechaPartes[0]);
        const mes = Number(fechaPartes[1]) - 1;
        const anio = Number(fechaPartes[2]);

        const hora = Number(horaPartes[0]);
        const minuto = Number(horaPartes[1]);
        const segundo = Number(horaPartes[2]);

        const fechaTexto = new Date(anio, mes, dia, hora, minuto, segundo);

        if (!isNaN(fechaTexto.getTime())) {
          return fechaTexto;
        }
      }
    }
  }

  return null;
}

function calcularTiempoTranscurrido(fecha) {
  if (!fecha) {
    return "sin tiempo registrado";
  }

  const ahora = new Date();
  const diferenciaMs = ahora - fecha;

  if (diferenciaMs < 0) {
    return "recién actualizado";
  }

  const segundos = Math.floor(diferenciaMs / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);

  if (segundos < 60) {
    return `hace ${segundos} segundo${segundos === 1 ? "" : "s"}`;
  }

  if (minutos < 60) {
    return `hace ${minutos} minuto${minutos === 1 ? "" : "s"}`;
  }

  if (horas < 24) {
    return `hace ${horas} hora${horas === 1 ? "" : "s"}`;
  }

  return `hace ${dias} día${dias === 1 ? "" : "s"}`;
}

function formatearFechaCompleta(fecha) {
  if (!fecha) {
    return "Sin fecha registrada";
  }

  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();

  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  const segundos = String(fecha.getSeconds()).padStart(2, "0");

  return `${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;
}

function obtenerEstadoReal(baston) {
  const fecha = obtenerFechaActualizacion(baston);

  if (!fecha) {
    return "Sin datos";
  }

  const diferenciaMs = new Date() - fecha;

  if (diferenciaMs > TIEMPO_INACTIVO) {
    return "Inactivo";
  }

  return "Activo";
}

async function cargarUbicacion(codigo, moverPantalla = false) {
  const resultado = document.getElementById("resultadoUbicacion");
  const estadoSistema = document.getElementById("estadoSistema");
  const ultimaActualizacion = document.getElementById("ultimaActualizacion");

  try {
    if (estadoSistema) {
      estadoSistema.textContent = "Consultando ubicación...";
    }

    const url = `${FIREBASE_BASE_URL}/bastones/${codigo}.json`;

    console.log("Buscando en Firebase:", url);

    const respuesta = await fetch(url);
    const baston = await respuesta.json();

    console.log("Respuesta Firebase:", baston);

    if (baston === null) {
      resultado.innerHTML = "No se encontró un bastón con ese código.";

      if (estadoSistema) estadoSistema.textContent = "Código no encontrado.";
      if (ultimaActualizacion) ultimaActualizacion.textContent = "Sin datos";

      limpiarMapa();
      detenerActualizacionAutomatica();
      return;
    }

    if (baston.latitud === undefined || baston.longitud === undefined) {
      resultado.innerHTML = "El bastón existe, pero todavía no tiene coordenadas registradas.";

      if (estadoSistema) estadoSistema.textContent = "Sin ubicación GPS disponible.";
      if (ultimaActualizacion) ultimaActualizacion.textContent = "Sin datos";

      limpiarMapa();
      return;
    }

    const latitud = Number(baston.latitud);
    const longitud = Number(baston.longitud);

    if (isNaN(latitud) || isNaN(longitud)) {
      resultado.innerHTML = "Las coordenadas registradas no son válidas.";

      if (estadoSistema) estadoSistema.textContent = "Error en coordenadas.";
      if (ultimaActualizacion) ultimaActualizacion.textContent = "Sin datos";

      limpiarMapa();
      return;
    }

    const fecha = obtenerFechaActualizacion(baston);
    const fechaCompleta = formatearFechaCompleta(fecha);
    const tiempoPasado = calcularTiempoTranscurrido(fecha);
    const estadoReal = obtenerEstadoReal(baston);

    resultado.innerHTML = `
      <strong>${baston.nombre || "Vision Stick"}</strong><br>
      Código: ${codigo}<br>
      Latitud: ${latitud.toFixed(6)}<br>
      Longitud: ${longitud.toFixed(6)}<br>
      Satélites: ${baston.satelites ?? "Sin dato"}<br>
      Estado: ${estadoReal}
    `;

    if (estadoSistema) {
      if (estadoReal === "Activo") {
        estadoSistema.textContent = "Ubicación activa y actualizándose.";
      } else if (estadoReal === "Inactivo") {
        estadoSistema.textContent = "El bastón no ha enviado datos recientemente.";
      } else {
        estadoSistema.textContent = "Sin datos recientes del bastón.";
      }
    }

    if (ultimaActualizacion) {
      if (fecha) {
        ultimaActualizacion.textContent = `${fechaCompleta} (${tiempoPasado})`;
      } else {
        ultimaActualizacion.textContent = "Sin fecha registrada";
      }
    }

    // El mapa se actualiza solo si las coordenadas cambian
    if (latitud !== ultimaLatitud || longitud !== ultimaLongitud) {
      mostrarMapa(latitud, longitud);
      ultimaLatitud = latitud;
      ultimaLongitud = longitud;
    }

    if (moverPantalla) {
      const dashboard = document.querySelector(".loc-dashboard");

      if (dashboard) {
        dashboard.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }

  } catch (error) {
    resultado.innerHTML = "Error al conectar con Firebase. Revisa la URL o las reglas de la base de datos.";

    if (estadoSistema) {
      estadoSistema.textContent = "Error de conexión.";
    }

    limpiarMapa();
    console.error("Error:", error);
  }
}

function iniciarActualizacionAutomatica() {
  detenerActualizacionAutomatica();

  intervaloAutomatico = setInterval(() => {
    if (codigoActual) {
      cargarUbicacion(codigoActual, false);
    }
  }, INTERVALO_ACTUALIZACION);
}

function detenerActualizacionAutomatica() {
  if (intervaloAutomatico) {
    clearInterval(intervaloAutomatico);
    intervaloAutomatico = null;
  }
}

async function buscarBaston() {
  const codigo = document.getElementById("codigoBaston").value.trim().toUpperCase();
  const resultado = document.getElementById("resultadoUbicacion");
  const estadoSistema = document.getElementById("estadoSistema");
  const ultimaActualizacion = document.getElementById("ultimaActualizacion");

  if (codigo === "") {
    resultado.innerHTML = "Debes ingresar un código de bastón.";

    if (estadoSistema) estadoSistema.textContent = "Esperando código válido...";
    if (ultimaActualizacion) ultimaActualizacion.textContent = "Sin datos";

    limpiarMapa();
    detenerActualizacionAutomatica();
    return;
  }

  const formatoValido = /^VS-\d{3}$/;

  if (!formatoValido.test(codigo)) {
    resultado.innerHTML = "Código inválido. Comprueba que el código es el correcto.";

    if (estadoSistema) estadoSistema.textContent = "Formato de código no válido.";
    if (ultimaActualizacion) ultimaActualizacion.textContent = "Sin datos";

    limpiarMapa();
    detenerActualizacionAutomatica();
    return;
  }

  codigoActual = codigo;
  ultimaLatitud = null;
  ultimaLongitud = null;

  await cargarUbicacion(codigoActual, true);
  iniciarActualizacionAutomatica();
}

const inputCodigo = document.getElementById("codigoBaston");

if (inputCodigo) {
  inputCodigo.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      buscarBaston();
    }
  });
}
