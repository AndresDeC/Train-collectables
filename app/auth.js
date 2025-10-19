import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    setPersistence,
    signInAnonymously,
    signInWithCustomToken,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- REFERENCIAS GLOBALES (DOM) ---
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutButton = document.getElementById('logout-button');
const welcomeMessage = document.getElementById('welcome-message');

// Vistas
const landingPage = document.getElementById('landing-page');
const exclusiveCatalogPage = document.getElementById('exclusive-catalog-page');
const profilePage = document.getElementById('profile-page');
const authContainer = document.getElementById('auth-container'); 

let auth;
let db;

// -------------------------------------------------------------------
// 1. GESTIÓN DE VISTAS Y ESTADO DE LA UI
// -------------------------------------------------------------------

/**
 * Muestra una vista y oculta las demás.
 * @param {HTMLElement} pageToShow - La página a mostrar.
 */
function showPage(pageToShow) {
    [landingPage, exclusiveCatalogPage, profilePage, authContainer]
        .forEach(page => page && page.classList.add('hidden'));
        
    if (pageToShow) {
        pageToShow.classList.remove('hidden');
    }
}

/**
 * Actualiza la interfaz de usuario según el estado de la autenticación.
 * @param {object} user - El objeto de usuario de Firebase, o null.
 */
function updateUI(user) {
    const headerLinks = document.getElementById('header-links');
    
    if (user) {
        console.log(`[Auth] Usuario autenticado: ${user.uid}`);
        
        // 1. Bienvenida y Botones
        welcomeMessage.textContent = `Hola, ${user.email ? user.email.split('@')[0] : user.uid}`;
        logoutButton.classList.remove('hidden');
        headerLinks.classList.remove('hidden'); // Mostrar enlaces de navegación

        // 2. Mostrar la página inicial del catálogo
        showPage(exclusiveCatalogPage); 
        
        // 3. Inicializar el catálogo y perfil (funciones de firestore.js)
        if (window.initializeTrainCatalog) {
             window.initializeTrainCatalog();
        }
        
    } else {
        console.log("[Auth] Usuario deslogueado. Mostrando Landing Page.");
        
        // 1. Bienvenida y Botones
        welcomeMessage.textContent = 'Iniciar Sesión';
        logoutButton.classList.add('hidden');
        headerLinks.classList.add('hidden'); // Ocultar enlaces de navegación

        // 2. Mostrar la página de aterrizaje o el contenedor de autenticación (Login/Registro)
        showPage(landingPage); 
    }
}


/**
 * Maneja el cambio de pestañas de navegación para mostrar la página correcta.
 */
function handleNavigationClick(event) {
    if (!auth || !auth.currentUser) return;

    const target = event.target.closest('a');
    if (!target) return;
    
    // Remover clase 'active' de todos los links
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('border-b-4', 'border-red-600'));
    // Agregar clase 'active' al link clickeado
    target.classList.add('border-b-4', 'border-red-600');

    const view = target.dataset.view;
    
    if (view === 'catalog') {
        showPage(exclusiveCatalogPage);
        // Llama a inicializar catálogo por si acaso la data no cargó
        if (window.initializeTrainCatalog) window.initializeTrainCatalog();
    } else if (view === 'profile') {
        showPage(profilePage);
        // Llama a cargar perfil
        if (window.loadProfilePage) window.loadProfilePage(auth.currentUser);
    } else if (view === 'auth') {
        showPage(authContainer); 
    }
}

// -------------------------------------------------------------------
// 2. LÓGICA DE AUTENTICACIÓN
// -------------------------------------------------------------------

/**
 * Intenta iniciar sesión con correo y contraseña.
 */
async function loginWithEmailAndPassword(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const feedback = document.getElementById('login-feedback');
    feedback.textContent = 'Iniciando sesión...';
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Éxito: onAuthStateChanged manejará el updateUI
        feedback.textContent = '';
        showPage(exclusiveCatalogPage); // Muestra inmediatamente el catálogo
    } catch (error) {
        console.error("Error de login:", error.code);
        let msg = "Error al iniciar sesión.";
        if (error.code === 'auth/invalid-credential') {
            msg = "Credenciales incorrectas o usuario no encontrado.";
        } else if (error.code === 'auth/wrong-password') {
            msg = "Contraseña incorrecta.";
        }
        feedback.textContent = `Error: ${msg}`;
    }
}

/**
 * Intenta registrar un nuevo usuario con correo y contraseña.
 */
async function registerWithEmailAndPassword(e) {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const feedback = document.getElementById('register-feedback');
    feedback.textContent = 'Registrando...';
    
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        // Éxito: onAuthStateChanged manejará el updateUI
        feedback.textContent = '';
        showPage(exclusiveCatalogPage); // Muestra inmediatamente el catálogo
    } catch (error) {
        console.error("Error de registro:", error.code);
        let msg = "Error al registrar el usuario.";
        if (error.code === 'auth/email-already-in-use') {
            msg = "El correo electrónico ya está en uso.";
        } else if (error.code === 'auth/weak-password') {
            msg = "La contraseña debe tener al menos 6 caracteres.";
        }
        feedback.textContent = `Error: ${msg}`;
    }
}

/**
 * Cierra la sesión del usuario actual.
 */
async function logoutUser() {
    try {
        await signOut(auth);
        // Éxito: onAuthStateChanged manejará el updateUI
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
}

// -------------------------------------------------------------------
// 3. INICIALIZACIÓN PRINCIPAL
// -------------------------------------------------------------------

/**
 * Función principal para inicializar Firebase.
 */
window.initializeFirebase = async () => {
    // 1. Configuración de Firebase
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
    if (!firebaseConfig) {
        console.error("FATAL ERROR: __firebase_config no está definido.");
        return;
    }
    
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Hacemos las referencias globales accesibles
        window.db = db;
        window.auth = auth;
        
        // 2. Configurar persistencia (opcional pero recomendado)
        await setPersistence(auth, browserLocalPersistence);

        // 3. Autenticación Inicial (Usar token de seguridad o Anonimato)
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth); 
        }

        // 4. Iniciar el Oyente de Estado de Sesión
        onAuthStateChanged(auth, (user) => {
            updateUI(user);
        });
        
    } catch (error) {
        console.error("Error al inicializar Firebase:", error);
        // Mensaje de error visible en la UI si falla la inicialización
        document.body.innerHTML = `
            <div class="p-8 text-center text-red-500">
                <h1>Error Crítico de Inicialización</h1>
                <p>No se pudo conectar a Firebase. Por favor, revisa la configuración del proyecto.</p>
                <p class="text-sm text-gray-400">Detalle: ${error.message}</p>
            </div>
        `;
    }
};

// -------------------------------------------------------------------
// 4. ASIGNACIÓN DE EVENTOS
// -------------------------------------------------------------------

window.addEventListener('load', () => {
    // 1. Inicializa Firebase al cargar la página
    window.initializeFirebase(); 

    // 2. Botones y Formularios de Auth
    if (loginForm) loginForm.addEventListener('submit', loginWithEmailAndPassword);
    if (registerForm) registerForm.addEventListener('submit', registerWithEmailAndPassword);
    if (logoutButton) logoutButton.addEventListener('click', logoutUser);

    // 3. Navegación
    const headerNav = document.getElementById('header-nav');
    if (headerNav) {
        headerNav.addEventListener('click', handleNavigationClick);
    }
    
    // 4. Cambiar entre login y registro en la vista de autenticación
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    const loginCard = document.getElementById('login-card');
    const registerCard = document.getElementById('register-card');

    if (switchToRegister && loginCard && registerCard) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginCard.classList.add('hidden');
            registerCard.classList.remove('hidden');
        });
    }

    if (switchToLogin && loginCard && registerCard) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerCard.classList.add('hidden');
            loginCard.classList.remove('hidden');
        });
    }
});