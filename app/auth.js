import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Importante: Variables globales del entorno
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const authButton = document.getElementById('auth-button');
const authStatus = document.getElementById('auth-status');
const catalogLink = document.getElementById('catalog-link'); // El link al catálogo exclusivo

// Habilitar logs de depuración para Firestore
setLogLevel('Debug');

// Inicializar Firebase
let app;
let auth;
let db;
let currentUserId = null;

/**
 * Inicializa Firebase App, Auth y Firestore.
 */
function initializeFirebase() {
    try {
        if (Object.keys(firebaseConfig).length === 0) {
            console.error("Firebase Config no está disponible.");
            return;
        }

        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // Hacemos las instancias disponibles globalmente para firestore.js
        window.db = db;
        window.auth = auth;

        // Establecer el listener de cambio de estado de autenticación
        onAuthStateChanged(auth, handleAuthStateChange);
        
        // Intentar iniciar sesión con el token personalizado o de forma anónima
        authenticateUser();

    } catch (error) {
        console.error("Error al inicializar Firebase:", error);
    }
}

/**
 * Maneja la autenticación inicial usando el token o anónimamente.
 */
async function authenticateUser() {
    try {
        if (initialAuthToken) {
            // Intentar iniciar sesión con el token personalizado proporcionado
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("Usuario autenticado con token personalizado.");
        } else {
            // Si no hay token, usar autenticación anónima
            await signInAnonymously(auth);
            console.log("Usuario autenticado anónimamente.");
        }
    } catch (error) {
        // En caso de error, siempre intentamos de forma anónima si falló el token
        if (initialAuthToken) {
             console.warn("Fallo al iniciar sesión con token, intentando anónimamente:", error);
             await signInAnonymously(auth);
        } else {
            console.error("Error grave de autenticación:", error);
        }
    }
}


/**
 * Maneja los cambios de estado de autenticación (login/logout).
 * @param {import("firebase/auth").User | null} user - El objeto de usuario de Firebase.
 */
function handleAuthStateChange(user) {
    if (user) {
        // Usuario autenticado (logueado o anónimo)
        currentUserId = user.uid;
        console.log("Usuario autenticado:", currentUserId);

        // 1. Actualizar la interfaz de usuario (Botones y Bienvenida)
        updateUI(true);
        
        // 2. Intentar inicializar el catálogo
        // Esta función está definida en app/firestore.js, la llamamos aquí SÓLO cuando la DB está lista.
        if (window.initializeTrainCatalog) {
            window.initializeTrainCatalog();
        } else {
            // Esto solo ocurre si firestore.js no se ha cargado todavía, lo cual es inusual.
            console.log("Esperando que 'app/firestore.js' se cargue para inicializar el catálogo.");
        }

    } else {
        // Usuario desconectado
        currentUserId = null;
        updateUI(false);
        console.log("Usuario desconectado.");
    }
}

/**
 * Actualiza los elementos del DOM basados en el estado de autenticación.
 * @param {boolean} isAuthenticated - Verdadero si hay un usuario logueado.
 */
function updateUI(isAuthenticated) {
    if (isAuthenticated) {
        if (authStatus) authStatus.textContent = `Hola, ${currentUserId.substring(0, 8)}...`;
        if (authButton) {
            authButton.textContent = 'Cerrar Sesión';
            authButton.onclick = handleLogout; // Asignar el listener de logout
            authButton.classList.add('bg-red-600', 'hover:bg-red-700');
            authButton.classList.remove('bg-orange-600', 'hover:bg-orange-700');
        }
        // Mostrar el link al catálogo si está oculto (si aplica)
        if (catalogLink) catalogLink.classList.remove('hidden');

    } else {
        // Si el usuario no está autenticado, volvemos al estado inicial.
        if (authStatus) authStatus.textContent = 'Entrar / Registrarse';
        if (authButton) {
            authButton.textContent = 'Entrar / Registrarse';
            authButton.onclick = handleLoginRegister; // Asignar el listener de login/register
            authButton.classList.remove('bg-red-600', 'hover:bg-red-700');
            authButton.classList.add('bg-orange-600', 'hover:bg-orange-700');
        }
        // Ocultar el link al catálogo si se desconecta
        if (catalogLink) catalogLink.classList.add('hidden');
    }
}


/**
 * Manejador de eventos para el botón 'Cerrar Sesión'.
 */
async function handleLogout() {
    if (!auth) {
        console.error("El servicio de Auth no está inicializado.");
        return;
    }
    try {
        await signOut(auth);
        // La función handleAuthStateChange se encargará de actualizar la UI
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
}

/**
 * Manejador de eventos para el botón 'Entrar / Registrarse'
 * (Actualmente solo llama a la función de autenticación inicial,
 * pero se expandiría para un modal de login/registro real).
 */
function handleLoginRegister() {
     // En una aplicación real, esto abriría un modal para email/password.
     // Por ahora, recargamos la autenticación inicial.
     console.log("Botón de Entrar/Registrarse presionado. Recargando la página para reautenticar...");
     window.location.reload(); 
}


// -------------------------------------------------------------------
// INICIO DE LA APLICACIÓN
// -------------------------------------------------------------------

// Esperamos a que la página esté completamente cargada
window.addEventListener('load', initializeFirebase);