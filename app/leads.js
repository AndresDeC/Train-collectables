import { addDoc, collection, getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// La instancia de Firestore (db) y Auth (auth) se obtienen de app/auth.js
let db;
let auth;

// Elementos del DOM para el formulario de la Landing Page
const publicInterestForm = document.getElementById('public-interest-form');
const publicNameInput = document.getElementById('public-name-input');
const publicEmailInput = document.getElementById('public-email-input');
const publicFormMessage = document.getElementById('public-form-message');

// Configuración de FormSubmit (servicio gratuito de envío de formularios por correo)
// 🚨 ¡VERIFICA ESTE CORREO! 🚨
const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/adc.030328@gmail.com"; 

/**
 * Muestra un mensaje en el formulario público.
 */
function displayPublicMessage(msg, isError = false) {
    if (!publicFormMessage) return;
    publicFormMessage.textContent = msg;
    publicFormMessage.classList.remove('hidden', 'text-green-600', 'text-red-600');
    publicFormMessage.classList.add(isError ? 'text-red-600' : 'text-green-600');
    
    // Ocultar mensaje después de 5 segundos
    setTimeout(() => {
        if (publicFormMessage) publicFormMessage.classList.add('hidden');
    }, 5000);
}

/**
 * -----------------------------------------------------
 * LÓGICA DE LEAD PÚBLICO (LANDING PAGE - Vía FormSubmit)
 * -----------------------------------------------------
 * Inicializa y maneja el envío del formulario público.
 */
function initPublicInterestForm() {
    if (!publicInterestForm) return;

    // 1. Configurar la acción del formulario para usar FormSubmit
    publicInterestForm.action = FORMSUBMIT_ENDPOINT;
    publicInterestForm.method = 'POST';

    // 2. Añadir campos ocultos requeridos por FormSubmit (para un correo limpio)
    if (!document.getElementById('formsubmit-subject')) {
        const subjectInput = document.createElement('input');
        subjectInput.type = 'hidden';
        subjectInput.name = '_subject';
        subjectInput.value = '🚂 Nuevo Lead Público Interesado en Colecciones';
        subjectInput.id = 'formsubmit-subject';
        publicInterestForm.appendChild(subjectInput);
    }

    // 3. Manejar el envío del formulario con JavaScript
    publicInterestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = publicInterestForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        displayPublicMessage("Enviando solicitud...", false);

        try {
            // Se usa Fetch para enviar el formulario en segundo plano (FormSubmit)
            const formData = new FormData(publicInterestForm);
            
            const response = await fetch(FORMSUBMIT_ENDPOINT, {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                throw new Error(`Error en el servicio de correo.`);
            }

            // --- Guardar el Lead en Firestore como respaldo (mejor práctica) ---
            db = window.db || getFirestore(); 
            if (db) {
                // Ruta para leads públicos: artifacts/{appId}/public/data/LeadsPublicos
                await addDoc(collection(db, `artifacts/${window.appId}/public/data/LeadsPublicos`), {
                    name: publicNameInput.value.trim(),
                    email: publicEmailInput.value.trim(),
                    message: formData.get('message'),
                    timestamp: new Date(),
                    source: 'LandingPage'
                });
            }


            displayPublicMessage(`¡Gracias! Hemos enviado tu solicitud a nuestro equipo.`, false);
            publicInterestForm.reset(); 

        } catch (error) {
            console.error("Error al enviar lead público:", error);
            displayPublicMessage("Ocurrió un error. Intenta de nuevo más tarde.", true);
        } finally {
            submitBtn.disabled = false;
        }
    });
}

/**
 * -----------------------------------------------------
 * LÓGICA DE LEAD PROTEGIDO (CATÁLOGO - Vía Firestore)
 * -----------------------------------------------------
 * Guarda las solicitudes de usuarios logueados directamente en Firestore.
 * Esta función es llamada desde app/firestore.js cuando se hace clic en "Estoy Interesado"
 * en el modal de un producto.
 * @param {string} modelId - ID del modelo de tren.
 * @param {string} modelName - Nombre del modelo de tren.
 */
window.saveProtectedLead = async (modelId, modelName) => {
    db = window.db || getFirestore();
    auth = window.auth;

    if (!db || !auth || !auth.currentUser) {
        // Esto no debería pasar si se llama correctamente desde showProductModal, 
        // pero es una salvaguarda.
        window.displayModalMessage("Error: Sesión no activa.", 'error'); 
        return;
    }

    const user = auth.currentUser;
    // La función displayModalMessage debe existir en app/firestore.js para mostrar el feedback.
    if (!window.displayModalMessage) {
        console.error("Función displayModalMessage no definida en app/firestore.js. No se puede mostrar feedback.");
        return;
    }


    try {
        const userId = user.uid;
        // RUTA PRIVADA: artifacts/{appId}/users/{userId}/Solicitudes
        const requestsCollectionRef = collection(db, `artifacts/${window.appId}/users/${userId}/Solicitudes`);

        await addDoc(requestsCollectionRef, {
            userId: userId,
            userName: user.displayName || user.email || 'Usuario Anónimo',
            userEmail: user.email || 'N/A',
            modelId: modelId,
            modelName: modelName,
            timestamp: new Date(),
            status: 'Pendiente'
        });

        window.displayModalMessage(`¡${modelName} solicitado! Revisa la sección "Mi Perfil".`, 'success');
        
    } catch (error) {
        console.error("Error al guardar lead protegido en Firestore:", error);
        window.displayModalMessage("Error al guardar la solicitud.", 'error');
    }
};

// -------------------------------------------------------------------
// INICIALIZACIÓN
// -------------------------------------------------------------------

// Hacemos que la función sea global para que app/firestore.js pueda llamarla
window.initPublicInterestForm = initPublicInterestForm;

// Inicializar el formulario público tan pronto como el DOM esté listo
window.addEventListener('load', () => {
    // Definimos window.appId aquí por si leads.js se carga antes que auth.js
    window.appId = typeof __app_id !== 'undefined' ? __app_id : window.YOUR_FIREBASE_PROJECT_ID || 'default-app-id';

    // Inicializamos el formulario de interés público
    initPublicInterestForm();
});