
import {
    auth,
    db,
    signInWithEmailAndPassword,
    signOut,
    doc,
    getDoc
} from "./firebase.js";

const formulario = document.getElementById("formLogin");
const mensaje = document.getElementById("mensaje");

formulario.addEventListener("submit", async (e) => {
    e.preventDefault();

    const correo = document.getElementById("correo").value.trim();
    const contrasena = document.getElementById("contrasena").value;

    mensaje.textContent = "Verificando acceso...";

    try {
        const credenciales = await signInWithEmailAndPassword(
            auth,
            correo,
            contrasena
        );

        const usuario = credenciales.user;
        const referencia = doc(db, "clientes", usuario.uid);
        const resultado = await getDoc(referencia);

        if (!resultado.exists() || resultado.data().activo !== true) {
            await signOut(auth);
            mensaje.textContent = "Tu acceso está pendiente de activación.";
            return;
        }

        window.location.href = "index.html";

    } catch (error) {
        console.error("Error de inicio de sesión:", error);
        mensaje.textContent =
            "No se pudo iniciar sesión. Revisa los datos y la configuración.";
    }
});
