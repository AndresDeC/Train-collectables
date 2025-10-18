// app/leads.js
// Lógica para capturar leads:
// 1. Leads Públicos (Landing Page) enviados vía FormSubmit.
// 2. Leads Protegidos (Catálogo) guardados en Firestore.

// -------------------------------------------------------------------------
// CONFIGURACIÓN PARA EL FORMULARIO PÚBLICO (LANDING PAGE)
// -------------------------------------------------------------------------

// Elementos del DOM para el formulario de la Landing Page
const publicInterestForm = document.getElementById('public-interest-form');
const publicNameInput = document.getElementById('public-name-input');
const publicEmailInput = document.getElementById('public-email-input');
const publicFormMessage = document.getElementById('public-form-message');

// Configuración de FormSubmit (servicio gratuito de envío de formularios por correo)
// 🚨 ¡REEMPLAZA ESTE CORREO CON TU EMAIL REAL! 🚨
const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/adc.030328@gmail.com"; 

/**
 * Muestra un mensaje en el formulario público.
 */
function displayPublicMessage(msg, isError = false) {
    publicFormMessage.textContent = msg;
    publicFormMessage.classList.remove('hidden', 'success-msg', 'error-msg');
    publicFormMessage.classList.add(isError ? 'error-msg' : 'success-msg');
    
    // Ocultar mensaje después de 5 segundos
    setTimeout(() => {
        publicFormMessage.classList.add('hidden');
    }, 5000);
}

/**
 * -----------------------------------------------------
 * LÓGICA DE LEAD PÚBLICO (LANDING PAGE - Vía FormSubmit)
 * -----------------------------------------------------
 * Esta función es llamada desde app/auth.js cuando no hay sesión.
 */
export function initPublicInterestForm() {
    if (!publicInterestForm) return;

    // 1. Configurar la acción del formulario para usar FormSubmit
    publicInterestForm.action = FORMSUBMIT_ENDPOINT;
    publicInterestForm.method = 'POST';

    // 2. Añadir campos ocultos requeridos por FormSubmit (para un correo limpio)
    // El campo _subject personaliza el asunto del correo que recibes
    if (!document.getElementById('formsubmit-subject')) {
        const subjectInput = document.createElement('input');
        subjectInput.type = 'hidden';
        subjectInput.name = '_subject';
        subjectInput.value = '🚂 Nuevo Lead Público Interesado en Colecciones';
        subjectInput.id = 'formsubmit-subject';
        publicInterestForm.appendChild(subjectInput);
    }

    // 3. Manejar el envío del formulario con JavaScript para mostrar el mensaje de éxito
    publicInterestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = publicInterestForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        displayPublicMessage("Enviando solicitud...", false);

        try {
            // Se usa Fetch para enviar el formulario en segundo plano (FormSubmit)
            const formData = new FormData(publicInterestForm);
            
            // Simula el envío directo al endpoint de FormSubmit
            const response = await fetch(FORMSUBMIT_ENDPOINT, {
                method: 'POST',
                body: formData,
                // FormSubmit requiere que no se envíe Content-Type para formularios multipart
            });
            
            if (!response.ok) {
                 // Si FormSubmit retorna un error
                throw new Error(`Error en el servicio de correo.`);
            }

            // Opcional: Guardar el Lead en Firestore como respaldo (mejor práctica)
            await db.collection("publicLeads").add({
                name: publicNameInput.value.trim(),
                email: publicEmailInput.value.trim(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                source: 'LandingPage'
            });

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
 * NOTA: Esta función es llamada desde app/auth.js cuando hay sesión.
 */
export function initInterestListeners(user) {
    // 1. Obtener el contenedor del catálogo para delegación de eventos
    const catalogContainer = document.getElementById('catalog-container');
    
    // Usamos delegación de eventos para capturar clics en todos los botones 'Estoy Interesado'
    catalogContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('buy-button')) {
            const button = e.target;
            const modelId = button.dataset.modelId;
            const modelName = button.dataset.modelName;

            button.disabled = true;
            button.textContent = 'Guardando...';

            try {
                // 1. Guardar la Solicitud directamente en Firestore
                await db.collection("userRequests").add({
                    userId: user.uid,
                    userName: user.displayName || user.email.split('@')[0],
                    userEmail: user.email,
                    modelId: modelId,
                    modelName: modelName,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                button.textContent = '¡Solicitado!';
                
                // Mensaje en la consola para el administrador: ¡IMPORTANTE!
                console.log(`Solicitud de ${user.email} guardada en 'userRequests' para ${modelName}`);

                // Revertir el estado del botón después de 3 segundos
                setTimeout(() => {
                    button.textContent = 'Estoy Interesado';
                    button.disabled = false;
                }, 3000); 
                
            } catch (error) {
                console.error("Error al guardar lead protegido en Firestore:", error);
                button.textContent = 'Error';
                button.disabled = false; 
            }
        }
    });
}