
import { db, collection, onSnapshot } from "./firebase.js";

const $ = id => document.getElementById(id);

const dinero = cantidad =>
    Number(cantidad || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
    });

let ventas = [];
let fechaDesde;
let fechaHasta;

function fechaLocal(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

function convertirFecha(valor) {
    if (!valor) return null;

    const fecha = typeof valor.toDate === "function"
        ? valor.toDate()
        : new Date(valor);

    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function obtenerFechaVenta(venta) {
    return convertirFecha(venta.fecha);
}

function obtenerVentasFiltradas() {
    return ventas.filter(venta => {
        const fecha = obtenerFechaVenta(venta);
        if (!fecha || !fechaDesde || !fechaHasta) return false;

        const dia = fechaLocal(fecha);
        return dia >= fechaDesde && dia <= fechaHasta;
    });
}

function mostrarError(mensaje) {
    $("estadoReporte").textContent = mensaje;
}

function obtenerEstadisticas(ventasPeriodo) {
    const ingresos = ventasPeriodo.reduce(
        (suma, venta) => suma + (Number(venta.total) || 0),
        0
    );

    const categorias = {};
    const productos = {};

    ventasPeriodo.forEach(venta => {
        (Array.isArray(venta.items) ? venta.items : []).forEach(item => {
            const cantidad = Number(item.cantidad) || 0;
            const precio = Number(item.precio) || 0;
            const importe = Number(item.importe ?? precio * cantidad) || 0;

            const categoria = item.categoria || "Sin categoría";
            const nombre = item.nombre || "Producto sin nombre";

            if (!categorias[categoria]) {
                categorias[categoria] = { unidades: 0, ingresos: 0 };
            }

            categorias[categoria].unidades += cantidad;
            categorias[categoria].ingresos += importe;
            productos[nombre] = (productos[nombre] || 0) + cantidad;
        });
    });

    const productoDestacado = Object.entries(productos)
        .sort((a, b) => b[1] - a[1])[0];

    return {
        ingresos,
        operaciones: ventasPeriodo.length,
        ticketPromedio: ventasPeriodo.length
            ? ingresos / ventasPeriodo.length
            : 0,
        categorias,
        productoDestacado
    };
}

function generarReporte() {
    fechaDesde = $("desde").value;
    fechaHasta = $("hasta").value;

    if (!fechaDesde || !fechaHasta) {
        mostrarError("Selecciona ambas fechas.");
        return false;
    }

    if (fechaDesde > fechaHasta) {
        mostrarError("La fecha inicial no puede ser posterior a la final.");
        return false;
    }

    actualizarReporte();
    mostrarError(`Periodo: ${fechaDesde} al ${fechaHasta}`);
    return true;
}

function actualizarReporte() {
    const periodo = obtenerVentasFiltradas();
    const datos = obtenerEstadisticas(periodo);

    $("ventasTotales").textContent = dinero(datos.ingresos);
    $("operaciones").textContent = datos.operaciones;
    $("ticketPromedio").textContent = dinero(datos.ticketPromedio);

    $("productoDestacado").textContent =
        datos.productoDestacado ? datos.productoDestacado[0] : "—";

    $("unidadesDestacadas").textContent =
        datos.productoDestacado
            ? `${datos.productoDestacado[1]} unidades vendidas`
            : "Sin ventas en el periodo";

    renderizarGrafica(periodo);
    renderizarCategorias(datos.categorias);
}

function renderizarGrafica(ventasPeriodo) {
    const contenedor = $("graficaVentas");
    contenedor.innerHTML = "";

    const dias = [];
    const fechaFinal = new Date(`${fechaHasta}T12:00:00`);

    for (let i = 6; i >= 0; i--) {
        const fecha = new Date(fechaFinal);
        fecha.setDate(fecha.getDate() - i);

        dias.push({
            clave: fechaLocal(fecha),
            etiqueta: fecha.toLocaleDateString("es-MX", {
                weekday: "short"
            }),
            total: 0
        });
    }

    ventasPeriodo.forEach(venta => {
        const fecha = obtenerFechaVenta(venta);
        if (!fecha) return;

        const dia = dias.find(d => d.clave === fechaLocal(fecha));
        if (dia) dia.total += Number(venta.total) || 0;
    });

    const maximo = Math.max(...dias.map(d => d.total), 1);

    dias.forEach(dia => {
        const columna = document.createElement("div");
        columna.className = "barra-columna";

        const importe = document.createElement("strong");
        importe.textContent = dinero(dia.total);

        const barra = document.createElement("div");
        barra.className = "barra";
        barra.style.height =
            `${dia.total > 0 ? Math.max(4, dia.total / maximo * 100) : 0}%`;
        barra.title = `${dia.clave}: ${dinero(dia.total)}`;

        const etiqueta = document.createElement("span");
        etiqueta.textContent = dia.etiqueta;

        columna.append(importe, barra, etiqueta);
        contenedor.appendChild(columna);
    });
}

function renderizarCategorias(categorias) {
    const grafica = $("categoriasGrafica");
    const tabla = $("tablaCategorias");

    grafica.innerHTML = "";
    tabla.innerHTML = "";

    const lista = Object.entries(categorias)
        .sort((a, b) => b[1].ingresos - a[1].ingresos);

    const ingresosTotales = lista.reduce(
        (suma, [, datos]) => suma + datos.ingresos,
        0
    );

    if (!lista.length) {
        grafica.innerHTML =
            '<p class="mensaje-reporte">No hay ventas por categoría en este periodo.</p>';
        tabla.innerHTML =
            '<tr><td colspan="4" class="mensaje-reporte">Sin datos para mostrar.</td></tr>';
        return;
    }

    lista.forEach(([nombre, datos]) => {
        const porcentaje = ingresosTotales > 0
            ? datos.ingresos / ingresosTotales * 100
            : 0;

        const fila = document.createElement("div");
        fila.className = "categoria-fila";

        const info = document.createElement("div");
        info.className = "categoria-info";

        const nombreCategoria = document.createElement("span");
        nombreCategoria.textContent = nombre;

        const porcentajeTexto = document.createElement("strong");
        porcentajeTexto.textContent = `${porcentaje.toFixed(1)}%`;

        info.append(nombreCategoria, porcentajeTexto);

        const progreso = document.createElement("div");
        progreso.className = "progreso";

        const relleno = document.createElement("div");
        relleno.style.width = `${porcentaje}%`;

        progreso.appendChild(relleno);
        fila.append(info, progreso);
        grafica.appendChild(fila);

        const tr = document.createElement("tr");

        [
            nombre,
            String(datos.unidades),
            dinero(datos.ingresos),
            `${porcentaje.toFixed(1)}%`
        ].forEach(texto => {
            const td = document.createElement("td");
            td.textContent = texto;
            tr.appendChild(td);
        });

        tabla.appendChild(tr);
    });
}

// Crear y descargar PDF
function descargarPDF() {
    if (!generarReporte()) return;

    if (!window.jspdf || !window.jspdf.jsPDF) {
        mostrarError("No se pudo cargar la biblioteca PDF. Revisa tu conexión.");
        return;
    }

    const periodo = obtenerVentasFiltradas();
    const datos = obtenerEstadisticas(periodo);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    const margen = 15;
    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    const anchoTexto = ancho - margen * 2;
    let y = 20;

    function comprobarEspacio(altura = 8) {
        if (y + altura > alto - 15) {
            pdf.addPage();
            y = 20;
        }
    }

    function escribir(texto, opciones = {}) {
        const lineas = pdf.splitTextToSize(String(texto), anchoTexto);
        comprobarEspacio(lineas.length * 6 + 2);
        pdf.text(lineas, margen, y);
        y += lineas.length * 6 + 2;
    }

    function titulo(texto) {
        comprobarEspacio(12);
        y += 3;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        escribir(texto);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
    }

    // Encabezado
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("Reporte de ventas", margen, y);
    y += 10;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    escribir(`Periodo: ${fechaDesde} al ${fechaHasta}`);
    escribir(`Fecha de descarga: ${new Date().toLocaleString("es-MX")}`);

    titulo("Resumen general");
    escribir(`Ingresos totales: ${dinero(datos.ingresos)}`);
    escribir(`Ventas registradas: ${datos.operaciones}`);
    escribir(`Ticket promedio: ${dinero(datos.ticketPromedio)}`);

    titulo("Producto más vendido");
    escribir(
        datos.productoDestacado
            ? `${datos.productoDestacado[0]} — ${datos.productoDestacado[1]} unidades`
            : "No hay productos vendidos en este periodo."
    );

    titulo("Ventas por día");

    const ventasPorDia = {};

    periodo.forEach(venta => {
        const fecha = obtenerFechaVenta(venta);
        if (!fecha) return;

        const dia = fechaLocal(fecha);
        ventasPorDia[dia] =
            (ventasPorDia[dia] || 0) + (Number(venta.total) || 0);
    });

    const dias = Object.entries(ventasPorDia).sort(
        (a, b) => a[0].localeCompare(b[0])
    );

    if (!dias.length) {
        escribir("No hay ventas registradas en el periodo.");
    } else {
        dias.forEach(([dia, total]) => {
            escribir(`${dia}: ${dinero(total)}`);
        });
    }

    titulo("Estadísticas por categoría");

    const categorias = Object.entries(datos.categorias)
        .sort((a, b) => b[1].ingresos - a[1].ingresos);

    if (!categorias.length) {
        escribir("No hay datos por categoría.");
    } else {
        categorias.forEach(([nombre, info]) => {
            escribir(nombre);
            escribir(`  Unidades vendidas: ${info.unidades}`);
            escribir(`  Ingresos: ${dinero(info.ingresos)}`);
            escribir(
                `  Porcentaje de ingresos: ${
                    datos.ingresos > 0
                        ? (info.ingresos / datos.ingresos * 100).toFixed(1)
                        : "0.0"
                }%`
            );
        });
    }

    const nombreArchivo =
        `reporte-ventas-${fechaDesde}-${fechaHasta}.pdf`;

    pdf.save(nombreArchivo);
    mostrarError("Reporte PDF descargado correctamente.");
}

// Fechas iniciales: últimos siete días, incluyendo hoy.
const hoy = new Date();
const haceSeisDias = new Date(hoy);
haceSeisDias.setDate(hoy.getDate() - 6);

$("desde").value = fechaLocal(haceSeisDias);
$("hasta").value = fechaLocal(hoy);

fechaDesde = $("desde").value;
fechaHasta = $("hasta").value;

$("descargarReporte").addEventListener("click", descargarPDF);

onSnapshot(
    collection(db, "ventas"),
    snapshot => {
        ventas = snapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        actualizarReporte();
        mostrarError(
            `Se encontraron ${obtenerVentasFiltradas().length} ventas en el periodo seleccionado.`
        );
    },
    error => {
        console.error("Error al cargar reportes:", error);
        mostrarError(
            "No se pudieron cargar los reportes. Revisa la conexión y los permisos de Firebase."
        );
    }
);
