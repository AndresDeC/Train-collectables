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


// --- REFERENCIAS GLOBALES (INSTANCIAS FIREBASE) ---
// Se inicializarán dentro de initializeFirebase
let auth;
let db;
let appId;

// --- REFERENCIAS GLOBALES (DOM) ---
// Usamos comprobaciones dentro de las funciones, pero definimos las referencias aquí.
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

// -----------------------------------------------------
// 1. FUNCIONES DE UTILERÍA Y NAVEGACIÓN
// -----------------------------------------------------

/**
 * Muestra un mensaje de error o éxito en el modal de autenticación.
 */
function displayAuthMessage(msg, isError = true) {
    if (!errorMessage) return;
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden');
    errorMessage.classList.add(isError ? 'error-msg' : 'success-msg');
}

/**
 * Maneja el cambio de modo entre Iniciar Sesión y Registrarse.
 */
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    if (authTitle && authSubmitBtn && toggleModeBtn && emailInput && passwordInput && errorMessage) {
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
}

/**
 * Muestra/Oculta el modal de Login.
 */
function toggleLoginModal(show = true) {
    if (!loginModalContainer) return;
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

    // 3. Actualizar enlaces de navegación (usando clases de Tailwind para el subrayado)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('border-b-4', 'border-red-600');
        if (link.getAttribute('data-view') === viewId) {
            link.classList.add('border-b-4', 'border-red-600');
        } 
    });
}

/**
 * Maneja el estado de la aplicación (logueado vs. deslogueado)
 * @param {firebase.User} user - El objeto de usuario de Firebase.
 */
function handleUserState(user) {
    // Si no tenemos auth, salimos
    if (!auth) return;

    if (user && user.isAnonymous === false) {
        // --- ESTADO LOGUEADO (Usuario Real) ---
        console.log('Usuario autenticado:', user.uid);
        
        // Mostrar elementos protegidos
        if (userDisplay) userDisplay.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (showLoginBtn) showLoginBtn.classList.add('hidden');
        if (navCatalog) navCatalog.classList.remove('hidden');
        if (navProfile) navProfile.classList.remove('hidden');

        // Ocultar modal si estaba abierto
        toggleLoginModal(false); 

        // Mostrar nombre de usuario
        const displayName = user.displayName || (user.email ? user.email.split('@')[0] : `Usuario ${user.uid.substring(0, 8)}`);
        if (userDisplay) userDisplay.textContent = `Hola, ${displayName}`;

        // Llenar detalles del perfil
        if (profileEmail) profileEmail.textContent = user.email || 'N/A';
        if (profileDate) profileDate.textContent = user.metadata.creationTime ? 
            new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A';
        
        // Cargar Catálogo (comprobando la existencia de la función en window)
        if (typeof window.loadCatalogAndListen === 'function') {
            window.loadCatalogAndListen(user.uid, appId); 
        }

        // Inicializar listeners de Leads (comprobando la existencia de la función en window)
        if (typeof window.initInterestListeners === 'function') {
            window.initInterestListeners(user, appId);
        }

        // Redirigir al catálogo después del login si no estamos ya en una vista protegida
        const activeView = document.querySelector('.view.active')?.id;
        if (activeView === 'landing-view' || !activeView) {
             navigateTo('catalog-view');
        }

    } else {
        // --- ESTADO DESLOGUEADO O ANÓNIMO (Público) ---
        console.log('Usuario deslogueado/Anónimo. Mostrando Landing Page.');
        
        // Ocultar elementos protegidos
        if (userDisplay) userDisplay.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (showLoginBtn) showLoginBtn.classList.remove('hidden'); // Mostrar botón de Login
        if (navCatalog) navCatalog.classList.add('hidden');
        if (navProfile) navProfile.classList.add('hidden');

        // Mostrar la Landing Page
        navigateTo('landing-view');

        // Inicializar el formulario de interés público
        if (typeof window.initPublicInterestForm === 'function') {
            const guestId = user?.uid || 'guest';
            window.initPublicInterestForm(guestId, appId);
        }
    }
}


// -----------------------------------------------------
// 2. INICIALIZACIÓN DE FIREBASE Y EVENT LISTENERS
// -----------------------------------------------------

/**
 * Configura Firebase, autentica la sesión inicial y establece el oyente global.
 */
async function initializeFirebase() {
    // 1. VERIFICACIÓN CRÍTICA DE VARIABLES GLOBALES
    if (typeof __firebase_config === 'undefined' || !__firebase_config) {
        console.error("FATAL ERROR: __firebase_config no está definido o es nulo.");
        displayAuthMessage("Error de configuración: La aplicación no puede conectarse al servidor.", true);
        return false;
    }

    try {
        const firebaseConfig = JSON.parse(__firebase_config);
        appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Hacemos las referencias globales accesibles
        window.db = db;
        window.auth = auth;
        window.appId = appId;
        
        // 2. Configurar persistencia
        await setPersistence(auth, browserLocalPersistence);

        // 3. Obtener token de seguridad
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        // 4. Iniciar el Oyente de Estado de Sesión (Guardián de Acceso)
        // Esto debe ir ANTES de cualquier intento de login para que maneje la respuesta
        onAuthStateChanged(auth, handleUserState);

        // 5. Autenticación Inicial (Usar token de seguridad o Anonimato)
        // Si no hay sesión activa, intenta autenticar con el token o de forma anónima
        if (!auth.currentUser) {
            if (initialAuthToken) {
                console.log("Intentando signInWithCustomToken...");
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                console.log("Intentando signInAnonymously...");
                // Esto crea una sesión anónima si no hay token. handleUserState la gestionará.
                await signInAnonymously(auth); 
            }
        }
        
        return true;
        
    } catch (error) {
        console.error("Error al inicializar Firebase (configuración o auth):", error);
        displayAuthMessage("Error de conexión al servidor. Intenta recargar o contacta soporte.", true);
        return false;
    }
}


/**
 * -----------------------------------------------------
 * ASIGNACIÓN DE EVENTOS
 * -----------------------------------------------------
 */
function attachEventListeners() {
    
    // 1. Manejo del formulario (Login/Registro)
    if (authForm) authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!auth) { displayAuthMessage("Sistema de autenticación no disponible.", true); return; }

        if (password.length < 6) {
            displayAuthMessage("La contraseña debe tener al menos 6 caracteres.", true);
            return;
        }
        
        try {
            errorMessage.classList.add('hidden'); 

            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            console.error("Error de autenticación:", error.code, error.message);
            let userMessage = error.message;
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                userMessage = isLoginMode ? 'Credenciales incorrectas.' : 'Usuario no encontrado.';
            }
            if (error.code === 'auth/email-already-in-use') userMessage = 'Este email ya está registrado. Inicia sesión.';

            displayAuthMessage(userMessage, true);
        }
    });

    // 2. Botón de Logout
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
        if (!auth) return;
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    });

    // 3. Botón de cambio de modo (Login <-> Registro)
    if (toggleModeBtn) toggleModeBtn.addEventListener('click', toggleAuthMode);

    // 4. Botón de Login con Google
    if (googleLoginBtn) googleLoginBtn.addEventListener('click', async () => {
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error de Google Auth:", error);
            displayAuthMessage("Fallo la autenticación con Google. Intenta de nuevo.", true);
        }
    });

    // 5. Botones de Modal (Mostrar/Cerrar)
    if (showLoginBtn) showLoginBtn.addEventListener('click', () => toggleLoginModal(true));
    if (closeLoginModalBtn) closeLoginModalBtn.addEventListener('click', () => toggleLoginModal(false));

    // Clic fuera del modal para cerrarlo
    if (loginModalContainer) loginModalContainer.addEventListener('click', (e) => {
        if (e.target === loginModalContainer) {
            toggleLoginModal(false);
        }
    });

    // 6. EVENT LISTENERS DE NAVEGACIÓN (SPA)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = e.target.getAttribute('data-view');
            // Solo navega si la vista existe y la sección no está oculta (para elementos protegidos)
            if (viewId && link && !link.classList.contains('hidden')) {
                navigateTo(viewId);
            }
        });
    });
}


// -----------------------------------------------------
// 3. INICIO DE LA APLICACIÓN
// -----------------------------------------------------

window.addEventListener('load', async () => {
    // 1. Inicializa Firebase.
    const isReady = await initializeFirebase();
    
    // 2. Adjunta los listeners del DOM solo si Firebase se inicializó correctamente
    if (isReady) {
        attachEventListeners();
    }
});

// Hacemos que las funciones de navegación sean globales para que el HTML pueda usarlas directamente (ej. onclick)
window.toggleLoginModal = toggleLoginModal;
window.navigateTo = navigateTo;