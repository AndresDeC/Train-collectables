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
    signInWithEmailAndPassword, // V9 Google Provider
    signInWithPopup // V9 Popup function
    ,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- REFERENCIAS GLOBALES (INSTANCIAS FIREBASE) ---
let auth;
let db;

// --- REFERENCIAS GLOBALES (DOM) ---
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
    if(emailInput) emailInput.value = '';
    if(passwordInput) passwordInput.value = '';
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

    // 3. Actualizar enlaces de navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        // Remueve la clase active de todos, luego la añade al correcto
        link.classList.remove('border-b-4', 'border-red-600');
        if (link.getAttribute('data-view') === viewId) {
            link.classList.add('border-b-4', 'border-red-600');
        } 
    });
}

// -----------------------------------------------------
// 2. MANEJADOR CENTRAL DE AUTENTICACIÓN
// -----------------------------------------------------

/**
 * Maneja el estado de la aplicación (logueado vs. deslogueado)
 * @param {firebase.User} user - El objeto de usuario de Firebase.
 */
function handleUserState(user) {
    if (user) {
        // --- ESTADO LOGUEADO ---
        console.log('Usuario autenticado:', user.uid);
        
        // Ocultar modal si estaba abierto y mostrar controles
        toggleLoginModal(false); 
        if (userDisplay) userDisplay.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (showLoginBtn) showLoginBtn.classList.add('hidden');
        if (navCatalog) navCatalog.classList.remove('hidden');
        if (navProfile) navProfile.classList.remove('hidden');

        // Mostrar nombre de usuario
        const displayName = user.displayName || (user.email ? user.email.split('@')[0] : `Usuario ${user.uid.substring(0, 8)}`);
        if (userDisplay) userDisplay.textContent = `Hola, ${displayName}`;

        // Llenar detalles del perfil
        if (profileEmail) profileEmail.textContent = user.email || 'N/A';
        if (profileDate) profileDate.textContent = user.metadata.creationTime ? 
            new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A';
        
        // Cargar Catálogo (asume que esta función existe en app/firestore.js)
        if (typeof window.loadCatalogAndListen === 'function') {
            window.loadCatalogAndListen(); 
        }

        // Inicializar listeners de Leads (asume que esta función existe en app/leads.js)
        if (typeof window.initInterestListeners === 'function') {
            window.initInterestListeners(user);
        }

        // Redirigir al catálogo después del login
        navigateTo('catalog-view');

    } else {
        // --- ESTADO DESLOGUEADO (Público) ---
        console.log('Usuario deslogueado. Mostrando Landing Page.');
        
        // Ocultar elementos protegidos
        if (userDisplay) userDisplay.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (showLoginBtn) showLoginBtn.classList.remove('hidden'); // Mostrar botón de Login
        if (navCatalog) navCatalog.classList.add('hidden');
        if (navProfile) navProfile.classList.add('hidden');

        // Mostrar la Landing Page y asegurar la navegación
        navigateTo('landing-view');

        // Inicializar el formulario de interés público
        if (typeof window.initPublicInterestForm === 'function') {
            window.initPublicInterestForm();
        }
    }
}


// -----------------------------------------------------
// 3. LÓGICA DE FIREBASE (V9)
// -----------------------------------------------------

/**
 * Función principal para inicializar Firebase y el Oyente de Autenticación.
 */
async function initializeFirebase() {
    // 1. Configuración de Firebase (Chequeo obligatorio del entorno)
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
        setLogLevel('debug');
        
        // 2. Configurar persistencia
        await setPersistence(auth, browserLocalPersistence);

        // 3. Iniciar el Oyente de Estado de Sesión (Guardián de Acceso)
        // Llama a handleUserState inmediatamente y en cada cambio de sesión
        onAuthStateChanged(auth, handleUserState);

        // 4. Autenticación Inicial (Usar token de seguridad o Anonimato)
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        // Autenticar solo si NO hay una sesión activa
        if (!auth.currentUser) {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth); 
            }
        }
        
    } catch (error) {
        console.error("Error al inicializar Firebase:", error);
        // Mensaje de error visible si Firebase falla
        document.body.innerHTML = `
            <div class="p-8 text-center text-red-500">
                <h1>Error Crítico de Inicialización</h1>
                <p>No se pudo conectar a Firebase. Por favor, revisa la configuración del proyecto.</p>
                <p class="text-sm text-gray-400">Detalle: ${error.message}</p>
            </div>
        `;
    }
}


// -----------------------------------------------------
// 4. ASIGNACIÓN DE EVENTOS (Se ejecuta después de initializeFirebase)
// -----------------------------------------------------

function attachEventListeners() {
    
    // 1. Manejo del formulario (Login/Registro) - USA V9 MODULAR
    if (authForm) authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!auth) return; // Si auth no está listo, sal

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
            displayAuthMessage(error.message, true);
        }
    });

    // 2. Botón de Logout - USA V9 MODULAR
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

    // 4. Botón de Login con Google - USA V9 MODULAR
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
            if (viewId && !e.target.classList.contains('hidden')) {
                navigateTo(viewId);
            }
        });
    });
}

// -----------------------------------------------------
// 5. INICIO DE LA APLICACIÓN
// -----------------------------------------------------

window.addEventListener('load', () => {
    // 1. Inicializa Firebase y Auth. Esto también configura el listener onAuthStateChanged.
    initializeFirebase().then(() => {
        // 2. Adjunta los listeners del DOM solo si Firebase se inicializó correctamente
        if (auth) {
            attachEventListeners();
        }
    });
});