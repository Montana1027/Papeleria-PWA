
import {
    db,
    collection,
    doc,
    onSnapshot,
    runTransaction
} from "./firebase.js";

const productosGrid = document.getElementById("productosGrid");
const estadoProductos = document.getElementById("estadoProductos");
const buscarProducto = document.getElementById("buscarProducto");
const categoriaFiltro = document.getElementById("categoriaFiltro");
const carritoElemento = document.getElementById("carrito");
const subtotalElemento = document.getElementById("subtotal");
const totalElemento = document.getElementById("total");
const recibidoInput = document.getElementById("recibido");
const cambioElemento = document.getElementById("cambio");
const metodoPago = document.getElementById("metodoPago");
const registrarVenta = document.getElementById("registrarVenta");
const vaciarCarrito = document.getElementById("vaciarCarrito");
const mensajeVentas = document.getElementById("mensajeVentas");
const estadoVenta = document.getElementById("estadoVenta");

let productos = [];
let carrito = new Map();
let procesandoVenta = false;

const formatoDinero = cantidad =>
    new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN"
    }).format(cantidad);

function mostrarMensaje(texto, tipo = "error") {
    mensajeVentas.textContent = texto;
    mensajeVentas.className = `mensaje-ventas visible ${tipo}`;
}

function ocultarMensaje() {
    mensajeVentas.textContent = "";
    mensajeVentas.className = "mensaje-ventas";
}

function emojiCategoria(categoria = "") {
    const categoriaNormalizada = categoria.toLowerCase();

    if (categoriaNormalizada.includes("cuaderno")) return "📓";
    if (categoriaNormalizada.includes("escritura")) return "🖊️";
    if (categoriaNormalizada.includes("papel")) return "📄";
    if (categoriaNormalizada.includes("manualidad")) return "🖍️";
    if (categoriaNormalizada.includes("oficina")) return "📎";

    return "📦";
}

function obtenerTotales() {
    let subtotal = 0;

    carrito.forEach(item => {
        subtotal += item.precio * item.cantidad;
    });

    return {
        subtotal,
        total: subtotal
    };
}

function renderizarProductos() {
    const busqueda = buscarProducto.value.trim().toLowerCase();
    const categoria = categoriaFiltro.value;

    const filtrados = productos.filter(producto => {
        const coincideBusqueda =
            (producto.nombre || "").toLowerCase().includes(busqueda) ||
            (producto.codigo || "").toLowerCase().includes(busqueda);

        const coincideCategoria =
            !categoria || producto.categoria === categoria;

        return coincideBusqueda && coincideCategoria;
    });

    productosGrid.innerHTML = "";

    if (filtrados.length === 0) {
        estadoProductos.textContent =
            productos.length === 0
                ? "Todavía no hay productos registrados en el inventario."
                : "No se encontraron productos con esos filtros.";

        estadoProductos.style.display = "block";
        return;
    }

    estadoProductos.style.display = "none";

    filtrados.forEach(producto => {
        const agotado = producto.existencias <= 0;

        const tarjeta = document.createElement("article");
        tarjeta.className = "producto-card";

        const emoji = document.createElement("div");
        emoji.className = "producto-emoji";
        emoji.textContent = emojiCategoria(producto.categoria);

        const nombre = document.createElement("h3");
        nombre.textContent = producto.nombre || "Producto sin nombre";

        const descripcion = document.createElement("p");
        descripcion.textContent =
            `Código: ${producto.codigo || "Sin código"} · ` +
            `Disponible: ${producto.existencias}`;

        const precioFila = document.createElement("div");
        precioFila.className = "producto-precio";

        const precio = document.createElement("strong");
        precio.textContent = formatoDinero(producto.precio);

        const boton = document.createElement("button");
        boton.className = "btn btn-claro";
        boton.type = "button";
        boton.textContent = agotado ? "Agotado" : "＋ Agregar";
        boton.disabled = agotado || procesandoVenta;
        boton.addEventListener("click", () => agregarAlCarrito(producto.id));

        precioFila.append(precio, boton);
        tarjeta.append(emoji, nombre, descripcion, precioFila);
        productosGrid.appendChild(tarjeta);
    });
}

function agregarAlCarrito(id) {
    if (procesandoVenta) return;

    ocultarMensaje();

    const producto = productos.find(p => p.id === id);

    if (!producto || producto.existencias <= 0) {
        mostrarMensaje("Este producto no tiene existencias disponibles.");
        return;
    }

    const existente = carrito.get(id);
    const cantidadActual = existente ? existente.cantidad : 0;

    if (cantidadActual >= producto.existencias) {
        mostrarMensaje("No puedes agregar más unidades que las disponibles.");
        return;
    }

    carrito.set(id, {
        id: producto.id,
        nombre: producto.nombre,
        codigo: producto.codigo || "",
        categoria: producto.categoria || "",
        precio: producto.precio,
        cantidad: cantidadActual + 1
    });

    renderizarCarrito();
}

function cambiarCantidad(id, cambio) {
    if (procesandoVenta) return;

    ocultarMensaje();

    const item = carrito.get(id);
    const producto = productos.find(p => p.id === id);

    if (!item || !producto) return;

    const nuevaCantidad = item.cantidad + cambio;

    if (nuevaCantidad <= 0) {
        carrito.delete(id);
    } else if (nuevaCantidad > producto.existencias) {
        mostrarMensaje("La cantidad supera las existencias disponibles.");
        return;
    } else {
        item.cantidad = nuevaCantidad;
        carrito.set(id, item);
    }

    renderizarCarrito();
}

function renderizarCarrito() {
    carritoElemento.innerHTML = "";

    if (carrito.size === 0) {
        const vacio = document.createElement("div");
        vacio.className = "carrito-vacio";

        const emoji = document.createElement("div");
        emoji.className = "emoji";
        emoji.textContent = "🛍️";

        const titulo = document.createElement("strong");
        titulo.textContent = "Tu carrito está vacío";

        const descripcion = document.createElement("p");
        descripcion.className = "texto-gris";
        descripcion.textContent =
            "Selecciona productos para preparar una venta.";

        vacio.append(emoji, titulo, descripcion);
        carritoElemento.appendChild(vacio);
    } else {
        carrito.forEach(item => {
            const fila = document.createElement("div");
            fila.className = "carrito-item";

            const informacion = document.createElement("div");

            const nombre = document.createElement("strong");
            nombre.textContent = item.nombre;

            const detalle = document.createElement("p");
            detalle.textContent =
                `${item.cantidad} × ${formatoDinero(item.precio)}`;

            const controles = document.createElement("div");
            controles.className = "carrito-controles";

            const menos = document.createElement("button");
            menos.type = "button";
            menos.textContent = "−";
            menos.setAttribute("aria-label", `Quitar una unidad de ${item.nombre}`);
            menos.disabled = procesandoVenta;
            menos.addEventListener("click", () =>
                cambiarCantidad(item.id, -1)
            );

            const cantidad = document.createElement("span");
            cantidad.textContent = item.cantidad;

            const mas = document.createElement("button");
            mas.type = "button";
            mas.textContent = "+";
            mas.setAttribute("aria-label", `Agregar una unidad de ${item.nombre}`);
            mas.disabled = procesandoVenta;
            mas.addEventListener("click", () =>
                cambiarCantidad(item.id, 1)
            );

            controles.append(menos, cantidad, mas);
            informacion.append(nombre, detalle, controles);

            const importe = document.createElement("strong");
            importe.textContent =
                formatoDinero(item.precio * item.cantidad);

            fila.append(informacion, importe);
            carritoElemento.appendChild(fila);
        });
    }

    const { subtotal, total } = obtenerTotales();

    subtotalElemento.textContent = formatoDinero(subtotal);
    totalElemento.textContent = formatoDinero(total);

    actualizarCambio();

    registrarVenta.disabled = carrito.size === 0 || procesandoVenta;
    vaciarCarrito.disabled = carrito.size === 0 || procesandoVenta;

    estadoVenta.textContent =
        procesandoVenta ? "Procesando..." :
        carrito.size > 0 ? "Productos seleccionados" : "Borrador";

    renderizarProductos();
}

function actualizarCambio() {
    const { total } = obtenerTotales();
    const recibido = Number(recibidoInput.value) || 0;

    const cambio = metodoPago.value === "Efectivo"
        ? Math.max(0, recibido - total)
        : 0;

    cambioElemento.textContent = formatoDinero(cambio);

    recibidoInput.required = metodoPago.value === "Efectivo";
    recibidoInput.disabled = metodoPago.value !== "Efectivo";
    recibidoInput.placeholder =
        metodoPago.value === "Efectivo" ? "$0.00" : "No aplica";
}

buscarProducto.addEventListener("input", renderizarProductos);
categoriaFiltro.addEventListener("change", renderizarProductos);
recibidoInput.addEventListener("input", actualizarCambio);
metodoPago.addEventListener("change", actualizarCambio);

vaciarCarrito.addEventListener("click", () => {
    if (procesandoVenta) return;

    carrito.clear();
    recibidoInput.value = "";
    ocultarMensaje();
    renderizarCarrito();
});

registrarVenta.addEventListener("click", async () => {
    if (procesandoVenta || carrito.size === 0) return;

    ocultarMensaje();

    const items = Array.from(carrito.values()).map(item => ({ ...item }));
    const { subtotal, total } = obtenerTotales();
    const metodo = metodoPago.value;
    const recibido = Number(recibidoInput.value) || 0;

    if (metodo === "Efectivo" && recibido < total) {
        mostrarMensaje("La cantidad recibida no cubre el total de la venta.");
        recibidoInput.focus();
        return;
    }

    if (!Number.isFinite(total) || total <= 0) {
        mostrarMensaje("El total de la venta no es válido.");
        return;
    }

    procesandoVenta = true;
    renderizarCarrito();

    try {
        const ventaRef = doc(collection(db, "ventas"));

        await runTransaction(db, async transaction => {
            // Primero se consultan todos los productos.
            const referencias = items.map(item =>
                doc(db, "productos", item.id)
            );

            const documentos = await Promise.all(
                referencias.map(referencia => transaction.get(referencia))
            );

            const itemsVenta = [];

            for (let i = 0; i < documentos.length; i++) {
                const documento = documentos[i];
                const item = items[i];

                if (!documento.exists()) {
                    throw new Error(
                        `El producto "${item.nombre}" ya no existe.`
                    );
                }

                const productoActual = documento.data();
                const existencias = Number(productoActual.existencias);
                const cantidad = Number(item.cantidad);
                const precio = Number(productoActual.precio);

                if (
                    !Number.isFinite(existencias) ||
                    !Number.isFinite(cantidad) ||
                    cantidad <= 0 ||
                    existencias < cantidad
                ) {
                    throw new Error(
                        `Existencias insuficientes para "${productoActual.nombre || item.nombre}".`
                    );
                }

                if (!Number.isFinite(precio) || precio < 0) {
                    throw new Error(
                        `El precio de "${productoActual.nombre || item.nombre}" no es válido.`
                    );
                }

                itemsVenta.push({
                    productoId: documento.id,
                    codigo: productoActual.codigo || "",
                    nombre: productoActual.nombre || item.nombre,
                    categoria: productoActual.categoria || "",
                    precio,
                    cantidad,
                    importe: Math.round(precio * cantidad * 100) / 100
                });
            }

            const totalActual = itemsVenta.reduce(
                (suma, item) => suma + item.importe,
                0
            );

            // Después de leer todos los productos, se hacen las escrituras.
            for (let i = 0; i < documentos.length; i++) {
                const documento = documentos[i];
                const productoActual = documento.data();
                const cantidadVendida = items[i].cantidad;

                transaction.update(referencias[i], {
                    existencias:
                        Number(productoActual.existencias) - cantidadVendida
                });
            }

            transaction.set(ventaRef, {
                items: itemsVenta,
                subtotal: Math.round(totalActual * 100) / 100,
                descuento: 0,
                total: Math.round(totalActual * 100) / 100,
                metodoPago: metodo,
                recibido: metodo === "Efectivo" ? recibido : totalActual,
                cambio: metodo === "Efectivo"
                    ? Math.round((recibido - totalActual) * 100) / 100
                    : 0,
                fecha: new Date().toISOString(),
                estado: "Completada"
            });
        });

        carrito.clear();
        recibidoInput.value = "";
        mostrarMensaje("¡Venta registrada correctamente!", "exito");
    } catch (error) {
        console.error("Error al registrar la venta:", error);

        mostrarMensaje(
            error.message ||
            "No se pudo registrar la venta. Revisa tu conexión e inténtalo de nuevo."
        );
    } finally {
        procesandoVenta = false;
        renderizarCarrito();
    }
});

// Escuchar los productos reales de Firestore en tiempo real.
onSnapshot(
    collection(db, "productos"),
    snapshot => {
        productos = snapshot.docs.map(documento => {
            const datos = documento.data();

            return {
                id: documento.id,
                codigo: datos.codigo || "",
                nombre: datos.nombre || "Producto sin nombre",
                categoria: datos.categoria || "",
                precio: Number(datos.precio) || 0,
                existencias: Number(datos.existencias) || 0
            };
        });

        // Actualizar precios y existencias de los artículos del carrito.
        carrito.forEach((item, id) => {
            const actualizado = productos.find(p => p.id === id);

            if (actualizado) {
                item.nombre = actualizado.nombre;
                item.codigo = actualizado.codigo;
                item.categoria = actualizado.categoria;
                item.precio = actualizado.precio;

                if (item.cantidad > actualizado.existencias) {
                    item.cantidad = actualizado.existencias;
                }

                if (item.cantidad <= 0) {
                    carrito.delete(id);
                }
            } else {
                carrito.delete(id);
            }
        });

        renderizarCarrito();
    },
    error => {
        console.error("Error al cargar productos:", error);
        estadoProductos.textContent =
            "No se pudieron cargar los productos. Revisa tu conexión y los permisos de Firebase.";
        estadoProductos.style.display = "block";
    }
);

actualizarCambio();
renderizarCarrito();
