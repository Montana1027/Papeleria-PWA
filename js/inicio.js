
import { db, collection, onSnapshot } from "./firebase.js";

const $ = id => document.getElementById(id);

const dinero = cantidad =>
    Number(cantidad || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
    });

let productos = [];
let ventas = [];

const STOCK_MINIMO = 5;

function convertirFecha(valor) {
    if (!valor) return null;

    const fecha = typeof valor.toDate === "function"
        ? valor.toDate()
        : new Date(valor);

    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function esHoy(fecha) {
    const hoy = new Date();

    return fecha &&
        fecha.getFullYear() === hoy.getFullYear() &&
        fecha.getMonth() === hoy.getMonth() &&
        fecha.getDate() === hoy.getDate();
}

function fechaTexto(fecha) {
    if (!fecha) return "Fecha no disponible";

    return fecha.toLocaleString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function crearCelda(texto) {
    const td = document.createElement("td");
    td.textContent = texto;
    return td;
}

function crearMensaje(tbody, columnas, mensaje) {
    tbody.innerHTML = "";
    const fila = document.createElement("tr");
    const celda = crearCelda(mensaje);
    celda.colSpan = columnas;
    fila.appendChild(celda);
    tbody.appendChild(fila);
}

function actualizarResumen() {
    $("totalProductos").textContent = productos.length;

    const bajos = productos.filter(producto =>
        producto.existencias <= STOCK_MINIMO
    );

    $("productosBajos").textContent = bajos.length;

    const ventasDelDia = ventas.filter(venta =>
        esHoy(convertirFecha(venta.fecha))
    );

    const ingresos = ventasDelDia.reduce(
        (suma, venta) => suma + (Number(venta.total) || 0),
        0
    );

    $("ventasHoy").textContent = dinero(ingresos);
    $("operacionesHoy").textContent = ventasDelDia.length;

    renderizarVentas();
    renderizarProductosBajos(bajos);
}

function renderizarVentas() {
    const tbody = $("listaVentasRecientes");

    const recientes = [...ventas]
        .sort((a, b) => {
            const fechaA = convertirFecha(a.fecha)?.getTime() || 0;
            const fechaB = convertirFecha(b.fecha)?.getTime() || 0;
            return fechaB - fechaA;
        })
        .slice(0, 5);

    if (recientes.length === 0) {
        crearMensaje(tbody, 5, "Todavía no hay ventas registradas.");
        return;
    }

    tbody.innerHTML = "";

    recientes.forEach(venta => {
        const fila = document.createElement("tr");
        const folio = `V-${String(venta.id).slice(0, 8).toUpperCase()}`;

        const nombres = Array.isArray(venta.items)
            ? venta.items.map(item => {
                const nombre = item.nombre || "Producto";
                const cantidad = Number(item.cantidad) || 0;
                return cantidad > 1 ? `${nombre} x${cantidad}` : nombre;
            }).join(", ")
            : "Sin detalle";

        fila.appendChild(crearCelda(folio));
        fila.appendChild(crearCelda(fechaTexto(convertirFecha(venta.fecha))));
        fila.appendChild(crearCelda(nombres || "Sin productos"));
        fila.appendChild(crearCelda(dinero(venta.total)));

        const celdaEstado = document.createElement("td");
        const etiqueta = document.createElement("span");

        etiqueta.className = "estado estado-ok";
        etiqueta.textContent = venta.estado || "Completada";

        celdaEstado.appendChild(etiqueta);
        fila.appendChild(celdaEstado);

        tbody.appendChild(fila);
    });
}

function renderizarProductosBajos(bajos) {
    const tbody = $("listaProductosBajos");

    const lista = [...bajos]
        .sort((a, b) => a.existencias - b.existencias)
        .slice(0, 5);

    if (lista.length === 0) {
        crearMensaje(tbody, 4, "No hay productos que necesiten reabastecimiento.");
        return;
    }

    tbody.innerHTML = "";

    lista.forEach(producto => {
        const fila = document.createElement("tr");

        fila.appendChild(crearCelda(producto.nombre));
        fila.appendChild(crearCelda(producto.categoria));
        fila.appendChild(crearCelda(`${producto.existencias} piezas`));

        const celdaEstado = document.createElement("td");
        const etiqueta = document.createElement("span");

        if (producto.existencias === 0) {
            etiqueta.className = "estado estado-agotado";
            etiqueta.textContent = "Agotado";
        } else {
            etiqueta.className = "estado estado-bajo";
            etiqueta.textContent = "Stock bajo";
        }

        celdaEstado.appendChild(etiqueta);
        fila.appendChild(celdaEstado);

        tbody.appendChild(fila);
    });
}

onSnapshot(
    collection(db, "productos"),
    snapshot => {
        productos = snapshot.docs.map(documento => {
            const datos = documento.data();

            return {
                id: documento.id,
                nombre: datos.nombre || "Producto sin nombre",
                categoria: datos.categoria || "Sin categoría",
                existencias: Math.max(0, Number(datos.existencias) || 0)
            };
        });

        actualizarResumen();
    },
    error => {
        console.error("Error al cargar productos:", error);
        $("totalProductos").textContent = "—";
        $("productosBajos").textContent = "—";
        crearMensaje(
            $("listaProductosBajos"),
            4,
            "No se pudo cargar el inventario. Revisa Firebase."
        );
    }
);

onSnapshot(
    collection(db, "ventas"),
    snapshot => {
        ventas = snapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        actualizarResumen();
    },
    error => {
        console.error("Error al cargar ventas:", error);
        $("ventasHoy").textContent = "—";
        $("operacionesHoy").textContent = "—";
        crearMensaje(
            $("listaVentasRecientes"),
            5,
            "No se pudieron cargar las ventas. Revisa Firebase."
        );
    }
);
