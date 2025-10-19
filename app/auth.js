// js/auth.js

// Importante: Asegurarse de que `auth` y `db` están inicializados globalmente por `app/auth.js`
// Asumimos que window.auth está disponible

// --- 1. REFERENCIAS DEL DOM ---
const loginModalContainer = document.getElementById('login-modal-container');
const mainContent = document.getElementById('main-content');
const authForm = document.getElementById('auth-form');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleModeBtn = document.getElementById('toggle-mode-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const authTitle = document.getElementById('auth-title');
const authControls = document.getElementById('auth-controls');
const errorMessage = document.getElementById('error-message');

let isRegisterMode = false;

// --- 2. FUNCIONES DE UTILIDAD DE UI ---

/**
 * Muestra un mensaje de error en la UI.
 * @param {string} msg 
 */
function displayError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden');
    setTimeout(() => errorMessage.classList.add('hidden'), 5000);
}

/**
 * Muestra el modal de inicio de sesión/registro.
 * Se expone globalmente para que `app/auth.js` pueda llamarlo.
 */
function showLoginModal() {
    if (loginModalContainer) {
        loginModalContainer.classList.remove('hidden');
    }
}
window.showLoginModal = showLoginModal; // ⬅️ HACER ESTA FUNCIÓN GLOBAL

/**
 * Oculta el modal de inicio de sesión/registro.
 */
function hideLoginModal() {
    if (loginModalContainer) {
        loginModalContainer.classList.add('hidden');
    }
}

/**
 * Actualiza los botones del modal de Login/Registro.
 */
function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    if (isRegisterMode) {
        authTitle.textContent = "Crear Cuenta (Registro)";
        authSubmitBtn.textContent = "Registrarse";
        toggleModeBtn.textContent = "¿Ya tienes cuenta? Inicia Sesión";
    } else {
        authTitle.textContent = "Inicia Sesión para Ver el Catálogo";
        authSubmitBtn.textContent = "Iniciar Sesión";
        toggleModeBtn.textContent = "¿No tienes cuenta? Regístrate";
    }
}

/**
 * Crea el documento inicial del usuario en Firestore.
 * Esto es CRÍTICO para vincular Auth y Firestore.
 * @param {object} user El objeto de usuario de Firebase Auth.
 */
async function createUserProfile(user) {
    // Usamos window.db que fue inicializado por app/auth.js
    if (!window.db) {
        console.error("Firestore DB no está disponible.");
        return;
    }
    // NOTA: Usamos `firebase.firestore.FieldValue` solo si el SDK antiguo lo requiere.
    // Con la versión 11.6.1, usaríamos funciones directas, pero mantendré tu estructura.
    // Asegúrate de que tu HTML cargue el SDK de la forma correcta (modular o compat).

    const userRef = window.db.collection("users").doc(user.uid);
    try {
        await userRef.set({
            email: user.email,
            name: user.displayName || user.email,
            // Si usas el SDK modular, FieldValue.serverTimestamp() no está disponible aquí
            // Esto requerirá usar un timestamp simple por ahora si estamos usando solo 11.6.1 modular imports
            // Para fines de la plataforma, asumiré que el campo `createdAt` puede ser omitido aquí para evitar un error de compatibilidad
        }, { merge: true });
        console.log("Perfil de usuario creado/actualizado en Firestore.");
    } catch (error) {
        console.error("Error al crear perfil de usuario:", error);
    }
}

// --- 3. FUNCIONES DE FIREBASE AUTHENTICATION ---

/**
 * Maneja el inicio de sesión con correo y contraseña.
 */
async function handleLogin(email, password) {
    if (!window.auth) { displayError("Servicio de autenticación no disponible."); return; }
    try {
        const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
        console.log("Login exitoso:", userCredential.user.email);
        hideLoginModal(); // Ocultar el modal al iniciar sesión
    } catch (error) {
        let errorMsg = "Error de inicio de sesión. Por favor, verifica tus credenciales.";
        if (error.code === 'auth/user-not-found') {
             errorMsg = "Usuario no encontrado. Intenta registrarte.";
        } else if (error.code === 'auth/wrong-password') {
             errorMsg = "Contraseña incorrecta.";
        }
        displayError(errorMsg);
    }
}

/**
 * Maneja el registro de nuevo usuario.
 */
async function handleRegister(email, password) {
    if (!window.auth) { displayError("Servicio de autenticación no disponible."); return; }
    try {
        const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
        // Inmediatamente después del registro, creamos el perfil en Firestore
        await createUserProfile(userCredential.user);
        console.log("Registro exitoso:", userCredential.user.email);
        hideLoginModal(); // Ocultar el modal al registrarse
    } catch (error) {
        let errorMsg = "Error de registro.";
        if (error.code === 'auth/email-already-in-use') {
             errorMsg = "Este correo ya está registrado.";
        } else if (error.code === 'auth/weak-password') {
             errorMsg = "La contraseña debe tener al menos 6 caracteres.";
        }
        displayError(errorMsg);
    }
}

/**
 * Maneja el inicio de sesión con Google.
 */
async function handleGoogleLogin() {
    // NOTA: Para Google Login en SDK modular (11.6.1), necesitamos importar
    // GoogleAuthProvider y signInWithPopup, pero eso complica el js/auth.js.
    // Si estás usando la versión 11.6.1 modular, esta función podría necesitar revisión.
    // La dejaré como estaba, asumiendo que tenías acceso al namespace global `firebase.auth`.
    // Si da error, tendremos que refactorizar todo el js/auth.js a la sintaxis modular.
    
    // Asumiendo que `auth` es `window.auth`
    if (!window.auth) { displayError("Servicio de autenticación no disponible."); return; }

    const provider = new window.auth.GoogleAuthProvider(); // Esto es probablemente incorrecto para 11.6.1
    
    // Implementación temporal, probablemente requiera refactorizar a la sintaxis modular 
    // de Google Auth (getAuth, GoogleAuthProvider, signInWithPopup)
    displayError("El Login con Google requiere la sintaxis de Firebase v9+ y más refactorización.");
    console.error("Login con Google desactivado temporalmente. Usa Email/Password.");

    // try {
    //     const result = await window.auth.signInWithPopup(provider);
    //     await createUserProfile(result.user);
    //     hideLoginModal();
    // } catch (error) {
    //     console.error("Error en Google Login:", error);
    //     displayError("Error al iniciar sesión con Google.");
    // }
}

/**
 * Maneja el cierre de sesión.
 */
async function handleLogout() {
    if (!window.auth) { console.error("Servicio de autenticación no disponible."); return; }
    try {
        await window.auth.signOut();
        console.log("Cierre de sesión exitoso.");
        // onAuthStateChanged se encargará de mostrar el modal de login
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
}

/**
 * Actualiza la UI y decide qué mostrar (catálogo o login).
 * Esta es la función principal que actúa como el guardián de acceso.
 * @param {object | null} user El objeto de usuario actual (null si no hay sesión).
 */
function updateUI(user) {
    const auth = window.auth;
    if (user) {
        // --- LOGUEADO ---
        hideLoginModal();
        if(mainContent) mainContent.classList.remove('hidden');
        
        // Actualizar controles de la cabecera
        authControls.innerHTML = `
            <span>Hola, ${user.displayName || user.email || user.uid.substring(0, 8) + '...'}!</span>
            <button id="logout-btn" class="btn btn-primary">Cerrar Sesión</button>
        `;
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

        // Si la función loadCatalog está disponible, cárgala
        if (window.loadCatalog) {
            window.loadCatalog();
        }
        
    } else {
        // --- NO LOGUEADO ---
        // Si no hay usuario y estamos en la página del catálogo, mostrar el modal.
        const isCatalogPage = window.location.pathname.includes('catalog.html');
        if (isCatalogPage) {
            showLoginModal();
        } else {
             // En la página de inicio, simplemente ocultamos el contenido principal
             if(mainContent) mainContent.classList.add('hidden');
        }
        authControls.innerHTML = '';
    }
}


// --- 4. EVENT LISTENERS ---

// Escucha los cambios de estado de autenticación (el guardián)
// Esperamos a que app/auth.js inicialice Firebase y asigne window.auth
window.addEventListener('load', () => {
    if (window.auth) {
        window.auth.onAuthStateChanged(updateUI);
    } else {
        console.error("Esperando la inicialización de Firebase desde app/auth.js");
    }
});


// Alternar entre Login y Registro
if (toggleModeBtn) {
    toggleModeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });
}

// Enviar formulario (Login o Registro)
if (authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;

        if (isRegisterMode) {
            handleRegister(email, password);
        } else {
            handleLogin(email, password);
        }
    });
}

// Login con Google
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
}

// Inicializar el modo por defecto
window.addEventListener('load', toggleAuthMode);