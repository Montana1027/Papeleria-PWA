
import {
    db,
    collection,
    onSnapshot
} from "./firebase.js";

const listaVentas = document.getElementById("listaVentas");
const buscarVenta = document.getElementById("buscarVenta");
const filtrarFecha = document.getElementById("filtrarFecha");
const filtrarMetodo = document.getElementById("filtrarMetodo");
const totalMostradas = document.getElementById("totalMostradas");

const ventasRegistradas = document.getElementById("ventasRegistradas");
const ingresosAcumulados = document.getElementById("ingresosAcumulados");
const ticketPromedio = document.getElementById("ticketPromedio");
const ultimaVenta = document.getElementById("ultimaVenta");

let ventas = [];

const dinero = cantidad =>
    new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN"
    }).format(cantidad);

function obtenerFecha(fecha) {
    if (!fecha) return null;

    if (typeof fecha === "string") {
        const resultado = new Date(fecha);
        return Number.isNaN(resultado.getTime()) ? null : resultado;
    }

    if (typeof fecha.toDate === "function") {
        return fecha.toDate();
    }

    if (typeof fecha.seconds === "number") {
        return new Date(fecha.seconds * 1000);
    }

    return null;
}

function fechaLocal(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function mostrarFecha(fecha) {
    return fecha
        ? fecha.toLocaleDateString("es-MX")
        : "Sin fecha";
}

function mostrarHora(fecha) {
    return fecha
        ? fecha.toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        })
        : "—";
}

function crearCelda(texto, clase = "") {
    const celda = document.createElement("td");
    celda.textContent = texto;

    if (clase) celda.className = clase;

    return celda;
}

function obtenerNombreProductos(venta) {
    if (!Array.isArray(venta.items) || venta.items.length === 0) {
        return "Sin detalle de productos";
    }

    return venta.items.map(item =>
        `${Number(item.cantidad) || 0} × ${item.nombre || "Producto"}`
    ).join(", ");
}

function actualizarResumen() {
    const completadas = ventas.filter(venta =>
        (venta.estado || "Completada") === "Completada"
    );

    const ingresos = completadas.reduce(
        (suma, venta) => suma + (Number(venta.total) || 0),
        0
    );

    const promedio = completadas.length
        ? ingresos / completadas.length
        : 0;

    ventasRegistradas.textContent = completadas.length;
    ingresosAcumulados.textContent = dinero(ingresos);
    ticketPromedio.textContent = dinero(promedio);

    const masReciente = [...completadas]
        .filter(venta => venta.fechaObjeto)
        .sort((a, b) => b.fechaObjeto - a.fechaObjeto)[0];

    ultimaVenta.textContent = masReciente
        ? mostrarHora(masReciente.fechaObjeto)
        : "—";
}

function renderizarVentas() {
    const busqueda = buscarVenta.value.trim().toLowerCase();
    const fechaSeleccionada = filtrarFecha.value;
    const metodoSeleccionado = filtrarMetodo.value;

    const filtradas = ventas.filter(venta => {
        const folio = venta.folio.toLowerCase();
        const productos = obtenerNombreProductos(venta).toLowerCase();

        const coincideBusqueda =
            folio.includes(busqueda) || productos.includes(busqueda);

        const coincideFecha = !fechaSeleccionada ||
            (venta.fechaObjeto &&
                fechaLocal(venta.fechaObjeto) === fechaSeleccionada);

        const coincideMetodo = !metodoSeleccionado ||
            venta.metodoPago === metodoSeleccionado;

        return coincideBusqueda && coincideFecha && coincideMetodo;
    });

    listaVentas.innerHTML = "";

    if (filtradas.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 7;
        celda.className = "historial-mensaje";
        celda.textContent = ventas.length === 0
            ? "Todavía no hay ventas registradas."
            : "No hay ventas que coincidan con los filtros.";

        fila.appendChild(celda);
        listaVentas.appendChild(fila);
    } else {
        filtradas.forEach(venta => {
            const fila = document.createElement("tr");

            fila.appendChild(crearCelda(venta.folio));
            fila.appendChild(crearCelda(mostrarFecha(venta.fechaObjeto)));
            fila.appendChild(crearCelda(mostrarHora(venta.fechaObjeto)));

            const productos = crearCelda(
                obtenerNombreProductos(venta),
                "productos-detalle"
            );
            fila.appendChild(productos);

            fila.appendChild(crearCelda(venta.metodoPago || "No especificado"));

            fila.appendChild(crearCelda(
                dinero(Number(venta.total) || 0),
                "historial-total"
            ));

            const celdaEstado = document.createElement("td");
            const etiqueta = document.createElement("span");
            const estado = venta.estado || "Completada";

            etiqueta.className = estado === "Completada"
                ? "estado estado-ok"
                : "estado estado-bajo";

            etiqueta.textContent = estado;
            celdaEstado.appendChild(etiqueta);
            fila.appendChild(celdaEstado);

            listaVentas.appendChild(fila);
        });
    }

    totalMostradas.textContent =
        `Mostrando ${filtradas.length} de ${ventas.length} ventas.`;
}

buscarVenta.addEventListener("input", renderizarVentas);
filtrarFecha.addEventListener("change", renderizarVentas);
filtrarMetodo.addEventListener("change", renderizarVentas);

onSnapshot(
    collection(db, "ventas"),
    snapshot => {
        ventas = snapshot.docs.map(documento => {
            const datos = documento.data();
            const fechaObjeto = obtenerFecha(datos.fecha);

            return {
                ...datos,
                id: documento.id,
                folio: `V-${documento.id.slice(0, 8).toUpperCase()}`,
                fechaObjeto
            };
        });

        ventas.sort((a, b) => {
            const fechaA = a.fechaObjeto?.getTime() || 0;
            const fechaB = b.fechaObjeto?.getTime() || 0;
            return fechaB - fechaA;
        });

        actualizarResumen();
        renderizarVentas();
    },
    error => {
        console.error("Error al cargar historial:", error);

        listaVentas.innerHTML = "";

        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 7;
        celda.className = "historial-mensaje";
        celda.textContent =
            "No se pudo cargar el historial. Revisa tu conexión y los permisos de Firebase.";

        fila.appendChild(celda);
        listaVentas.appendChild(fila);

        totalMostradas.textContent = "Error al consultar las ventas.";
    }
);
