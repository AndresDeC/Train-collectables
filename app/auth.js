import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    setPersistence,
    signInAnonymously,
    signInWithCustomToken,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- DECLARACIÓN DE VARIABLES GLOBALES DE FIREBASE ---
let auth;
let db;
let appId;
let userId; // El ID del usuario actual

// Referencias a elementos del DOM
const loginModalContainer = document.getElementById('login-modal-container');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authTitle = document.getElementById('auth-title');
const toggleModeBtn = document.getElementById('toggle-mode-btn');
const logoutBtn = document.getElementById('logout-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const errorMessage = document.getElementById('error-message');
const userDisplay = document.getElementById('user-display');
const profileEmail = document.getElementById('profile-email');
const profileDate = document.getElementById('profile-date');
const showLoginBtn = document.getElementById('show-login-btn');
const closeLoginModalBtn = document.getElementById('close-login-modal');

// Elementos de Navegación Dinámicos
const navCatalog = document.getElementById('nav-catalog');
const navProfile = document.getElementById('nav-profile');


// Variable de estado: true para Login, false para Registro
let isLoginMode = true;

/**
 * Muestra un mensaje de error o éxito en el modal de autenticación.
 */
function displayAuthMessage(msg, isError = true) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden', 'error-msg', 'success-msg');
    errorMessage.classList.add(isError ? 'error-msg' : 'success-msg');
}

/**
 * Maneja el cambio de modo entre Iniciar Sesión y Registrarse.
 */
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authTitle.textContent = 'Inicia Sesión para Acceder al Catálogo';
        authSubmitBtn.textContent = 'Iniciar Sesión';
        toggleModeBtn.textContent = '¿No tienes cuenta? Regístrate';
    } else {
        authTitle.textContent = 'Crea tu Cuenta de Coleccionista';
        authSubmitBtn.textContent = 'Registrarse';
        toggleModeBtn.textContent = '¿Ya tienes cuenta? Inicia Sesión';
    }
    // Limpia mensajes y campos al cambiar
    errorMessage.classList.add('hidden');
    emailInput.value = '';
    passwordInput.value = '';
}

/**
 * Muestra/Oculta el modal de Login.
 */
function toggleLoginModal(show = true) {
    if (show) {
        // Al abrir, siempre va al modo Login por defecto
        isLoginMode = true;
        toggleAuthMode(); 
        loginModalContainer.classList.remove('hidden');
    } else {
        loginModalContainer.classList.add('hidden');
    }
}

/**
 * Dibuja la vista correcta y actualiza la clase 'active' de navegación.
 * @param {string} viewId - El ID de la sección a mostrar (ej: 'catalog-view').
 */
function navigateTo(viewId) {
    // 1. Ocultar todas las vistas
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
        view.classList.remove('active');
    });

    // 2. Mostrar la vista solicitada
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
    }

    // 3. Actualizar enlaces de navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('border-b-4', 'border-red-600'); // Quitamos la clase de activo
        if (link.getAttribute('data-view') === viewId) {
            link.classList.add('border-b-4', 'border-red-600'); // Agregamos la clase de activo
        }
    });
}
window.navigateTo = navigateTo; // Hacemos global para uso en el HTML

/**
 * Maneja el estado de la aplicación (logueado vs. deslogueado)
 * @param {firebase.User} user - El objeto de usuario de Firebase.
 */
function handleUserState(user) {
    // Definir userId globalmente (sea real o anónimo)
    userId = user?.uid || crypto.randomUUID();
    window.userId = userId;
    window.appId = appId; // Aseguramos que appId también sea global

    if (user && user.isAnonymous === false) {
        // --- ESTADO LOGUEADO (Usuario Real) ---
        console.log('Usuario autenticado:', user.uid);
        
        // Ocultar modal si estaba abierto y mostrar controles
        toggleLoginModal(false); 
        userDisplay.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        showLoginBtn.classList.add('hidden');
        navCatalog.classList.remove('hidden');
        navProfile.classList.remove('hidden');

        // Mostrar nombre de usuario
        const displayName = user.displayName || user.email.split('@')[0];
        userDisplay.textContent = `Hola, ${displayName}`;

        // Llenar detalles del perfil
        profileEmail.textContent = user.email;
        profileDate.textContent = user.metadata.creationTime ? 
            new Date(user.metadata.creationTime).toLocaleDateString('es-ES') : 'N/A';
        
        // Cargar Catálogo (Ahora pasamos userId y appId)
        if (typeof window.loadCatalogAndListen === 'function') {
            console.log("[AUTH] ✅ Invocando carga de Catálogo para userId y appId.");
            // PASAMOS LOS PARÁMETROS CRÍTICOS
            window.loadCatalogAndListen(userId, appId); 
        }

        // Inicializar listeners de Leads (asume que esta función existe en app/leads.js)
        if (typeof window.initInterestListeners === 'function') {
             // PASAMOS LOS PARÁMETROS CRÍTICOS
             window.initInterestListeners(user, appId);
        }

        // Redirigir al catálogo después del login
        navigateTo('catalog-view');

    } else {
        // --- ESTADO DESLOGUEADO O ANÓNIMO (Público) ---
        console.log('Usuario deslogueado/anónimo. Mostrando Landing Page.');
        
        // Ocultar elementos protegidos
        userDisplay.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        showLoginBtn.classList.remove('hidden'); // Mostrar botón de Login
        navCatalog.classList.add('hidden');
        navProfile.classList.add('hidden');

        // Mostrar la Landing Page y asegurar la navegación
        navigateTo('landing-view');

        // Inicializar el formulario de interés público
        if (typeof window.initPublicInterestForm === 'function') {
            // PASAMOS LOS PARÁMETROS CRÍTICOS
            window.initPublicInterestForm(userId, appId);
        }
    }
}


/**
 * -----------------------------------------------------
 * EVENT LISTENERS GLOBALES (CON LAS FUNCIONES MODERNAS)
 * -----------------------------------------------------
 */

// 2. Manejo del formulario (Login/Registro)
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!auth) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (password.length < 6) {
        displayAuthMessage("La contraseña debe tener al menos 6 caracteres.", true);
        return;
    }
    
    try {
        errorMessage.classList.add('hidden'); 

        if (isLoginMode) {
            // SINTAXIS MODERNA: signInWithEmailAndPassword(auth, email, password)
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            // SINTAXIS MODERNA: createUserWithEmailAndPassword(auth, email, password)
            await createUserWithEmailAndPassword(auth, email, password);
            // Si el registro es exitoso, onAuthStateChanged se dispara
        }
        toggleLoginModal(false); 
    } catch (error) {
        console.error("Error de autenticación:", error.code, error.message);
        let userMessage = error.message;
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
             userMessage = 'Credenciales incorrectas (email o contraseña).';
        } else if (error.code === 'auth/email-already-in-use') {
             userMessage = 'Este email ya está registrado.';
        }
        displayAuthMessage(userMessage, true);
    }
});

// 3. Botón de Logout
logoutBtn.addEventListener('click', async () => {
    if (!auth) return;
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
});

// 4. Botón de cambio de modo (Login <-> Registro)
toggleModeBtn.addEventListener('click', toggleAuthMode);

// 5. Botón de Login con Google (CORREGIDO)
googleLoginBtn.addEventListener('click', async () => {
    if (!auth) return;
    // La variable GoogleAuthProvider DEBE ser importada y se inicializa con new
    const provider = new GoogleAuthProvider(); 
    try {
        // SINTAXIS MODERNA: signInWithPopup(auth, provider)
        await signInWithPopup(auth, provider); 
    } catch (error) {
        console.error("Error de Google Auth:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            displayAuthMessage("Fallo la autenticación con Google. Intenta de nuevo.", true);
        }
    }
});

// 6. Botones de Modal (Mostrar/Cerrar)
showLoginBtn.addEventListener('click', () => toggleLoginModal(true));
closeLoginModalBtn.addEventListener('click', () => toggleLoginModal(false));

// Clic fuera del modal para cerrarlo
loginModalContainer.addEventListener('click', (e) => {
    if (e.target === loginModalContainer) {
        toggleLoginModal(false);
    }
});


/**
 * -----------------------------------------------------
 * EVENT LISTENERS DE NAVEGACIÓN (SPA)
 * -----------------------------------------------------
 */
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const viewId = e.target.getAttribute('data-view');
        // Solo navega si la vista existe y la sección no está oculta (para elementos protegidos)
        if (viewId && !e.target.classList.contains('hidden')) {
            navigateTo(viewId);
        }
    });
});


/**
 * -----------------------------------------------------
 * INICIALIZACIÓN DE FIREBASE (AÑADIDO)
 * -----------------------------------------------------
 */
async function initializeFirebase() {
    if (typeof __firebase_config === 'undefined' || !__firebase_config) {
        console.error("FATAL ERROR: __firebase_config no está definido o es nulo.");
        return;
    }

    try {
        const firebaseConfig = JSON.parse(__firebase_config);
        appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // 1. Configurar persistencia
        await setPersistence(auth, browserLocalPersistence);

        // 2. Obtener token de seguridad
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        // 3. Iniciar el Oyente de Estado de Sesión (Guardián de Acceso)
        // ESTA ES LA ÚNICA FUNCIÓN QUE DEBE CORRER INMEDIATAMENTE
        onAuthStateChanged(auth, handleUserState);

        // 4. Autenticación Inicial (si no hay un usuario actual, iniciar con token o anónimamente)
        if (!auth.currentUser) {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth); 
            }
        }
        
    } catch (error) {
        console.error("Error al inicializar Firebase (configuración o auth):", error);
        displayAuthMessage("Error de conexión al servidor. Intenta recargar o contacta soporte.", true);
    }
}

// Inicializar al cargar la ventana
window.addEventListener('load', initializeFirebase);