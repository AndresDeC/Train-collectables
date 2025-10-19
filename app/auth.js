// app/auth.js

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
        if (link.getAttribute('data-view') === viewId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

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
            new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A';
        
        // Cargar Catálogo (asume que esta función existe en app/firestore.js)
        if (typeof loadCatalogAndListen === 'function') {
            loadCatalogAndListen(); 
        }

        // Inicializar listeners de Leads (asume que esta función existe en app/leads.js)
        if (typeof initInterestListeners === 'function') {
             initInterestListeners(user);
        }

        // Redirigir al catálogo después del login
        navigateTo('catalog-view');

    } else {
        // --- ESTADO DESLOGUEADO (Público) ---
        console.log('Usuario deslogueado. Mostrando Landing Page.');
        
        // Ocultar elementos protegidos
        userDisplay.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        showLoginBtn.classList.remove('hidden'); // Mostrar botón de Login
        navCatalog.classList.add('hidden');
        navProfile.classList.add('hidden');

        // Mostrar la Landing Page y asegurar la navegación
        navigateTo('landing-view');

        // Inicializar el formulario de interés público
        if (typeof initPublicInterestForm === 'function') {
            initPublicInterestForm();
        }
    }
}

/**
 * -----------------------------------------------------
 * EVENT LISTENERS GLOBALES
 * -----------------------------------------------------
 */

// 1. Guardián de Acceso (onAuthStateChanged) - Función principal de control de sesión
auth.onAuthStateChanged(handleUserState);

// 2. Manejo del formulario (Login/Registro)
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (password.length < 6) {
        displayAuthMessage("La contraseña debe tener al menos 6 caracteres.", true);
        return;
    }
    
    try {
        errorMessage.classList.add('hidden'); 

        if (isLoginMode) {
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            await auth.createUserWithEmailAndPassword(email, password);
            // Si el registro es exitoso, Firebase inicia sesión automáticamente y activa handleUserState
        }
    } catch (error) {
        console.error("Error de autenticación:", error.code, error.message);
        // Firebase Auth errores comunes: auth/email-already-in-use, auth/user-not-found, etc.
        displayAuthMessage(error.message, true);
    }
});

// 3. Botón de Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
});

// 4. Botón de cambio de modo (Login <-> Registro)
toggleModeBtn.addEventListener('click', toggleAuthMode);

// 5. Botón de Login con Google
googleLoginBtn.addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error("Error de Google Auth:", error);
        displayAuthMessage("Fallo la autenticación con Google. Intenta de nuevo.", true);
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