console.log("PROTEGER.JS SE ESTÁ EJECUTANDO");
import {
    auth,
    db,
    onAuthStateChanged,
    doc,
    getDoc,
    signOut
} from "./firebase.js";

onAuthStateChanged(auth, async (usuario) => {
    console.log("USUARIO DETECTADO:", usuario ? usuario.email : "SIN SESIÓN");
    if (!usuario) {
        window.location.replace("login.html");
        return;
    }

    try {
        const referencia = doc(db, "clientes", usuario.uid);
        const resultado = await getDoc(referencia);
        console.log("DOCUMENTO EXISTE:", resultado.exists());
console.log("DATOS DEL CLIENTE:", resultado.exists() ? resultado.data() : "No existe");

        if (!resultado.exists() || resultado.data().activo !== true) {
            await signOut(auth);
            window.location.replace("login.html");
        }
    } catch (error) {
        console.error("Error al verificar el acceso:", error);
        await signOut(auth);
        window.location.replace("login.html");
    }
});