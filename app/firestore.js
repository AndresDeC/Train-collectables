import { collection, onSnapshot, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- REFERENCIAS GLOBALES ---
const catalogContainer = document.getElementById('catalog-container');
const requestsListContainer = document.getElementById('requests-list'); // NUEVO
const productModal = document.getElementById('product-modal-backdrop');
const productModalContent = document.querySelector('#product-modal-backdrop .modal-content');
const closeModalButton = document.getElementById('close-product-modal');
const modalFeedbackContainer = document.getElementById('modal-feedback-message'); 

// La instancia de Firestore (db) y Auth (auth) se obtienen de app/auth.js
let db;
let auth;

// ** ID DEL PROYECTO DE FIREBASE OBTENIDO DEL USUARIO **
const YOUR_FIREBASE_PROJECT_ID = 'extension-84b64'; 

// La variable 'appId' obtiene el ID del entorno (si existe) o usa el ID que pegaste
const appId = typeof __app_id !== 'undefined' ? __app_id : YOUR_FIREBASE_PROJECT_ID;
window.appId = appId; // Hacemos appId global para que otros scripts (leads) puedan usarlo


/**
 * Muestra un mensaje temporal dentro del modal.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - Tipo de mensaje ('success' o 'error').
 */
window.displayModalMessage = (message, type = 'success') => {
    if (!modalFeedbackContainer) return;
    modalFeedbackContainer.innerHTML = message;
    modalFeedbackContainer.classList.remove('hidden', 'bg-green-600', 'bg-red-600', 'bg-gray-500'); // Limpiar clases
    modalFeedbackContainer.classList.add(type === 'success' ? 'bg-green-600' : (type === 'error' ? 'bg-red-600' : 'bg-gray-500'));
    
    setTimeout(() => {
        modalFeedbackContainer.classList.add('hidden');
    }, 4000);
};


/**
 * Agrupa los trenes por su campo 'Tipo'.
 * @param {Array<object>} trains - Lista de objetos de trenes.
 * @returns {object} Un objeto donde la clave es el Tipo y el valor es un array de trenes.
 */
function groupTrainsByType(trains) {
    return trains.reduce((acc, train) => {
        const type = train.Tipo || 'Sin Categoría';
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(train);
        return acc;
    }, {});
}

/**
 * Muestra el modal de detalle de un producto.
 * @param {object} train - Datos del tren a mostrar.
 */
function showProductModal(train) {
    // Limpiar mensajes anteriores
    if (modalFeedbackContainer) modalFeedbackContainer.classList.add('hidden');

    // 1. Crear el contenido HTML del modal (¡Añadimos el contenedor de mensajes!)
    productModalContent.innerHTML = `
        <h2 class="text-3xl font-bold text-gray-800 dark:text-white mb-4">${train.Modelo}</h2>
        <button id="close-modal-x" class="absolute top-3 right-3 text-4xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">&times;</button>
        
        <div id="modal-feedback-message" class="hidden p-3 mb-4 rounded-lg text-white text-center font-semibold"></div>

        <div class="md:flex md:space-x-8">
            <div class="md:w-1/2">
                <img src="${train.ImagenURL || 'https://placehold.co/500x300/4F46E5/FFFFFF?text=IMAGEN+NO+DISPONIBLE'}" 
                     onerror="this.onerror=null;this.src='https://placehold.co/500x300/4F46E5/FFFFFF?text=IMAGEN+NO+DISPONIBLE';"
                     alt="Imagen de ${train.Modelo}" 
                     class="w-full h-auto object-cover rounded-lg shadow-lg mb-4">
            </div>
            <div class="md:w-1/2 space-y-3 text-gray-700 dark:text-gray-300">
                <!-- Información Técnica y de Fabricación -->
                <p><strong>Marca:</strong> ${train.Marca || 'N/A'}</p>
                <p><strong>Número de Modelo:</strong> ${train.Numero || 'N/A'}</p>
                <p><strong>Tipo de Producto:</strong> ${train.Tipo || 'N/A'}</p>
                <p><strong>Línea:</strong> ${train.Línea || 'N/A'}</p>
                <p><strong>País de Origen:</strong> ${train.País || 'N/A'}</p>
                
                <!-- Especificaciones Físicas y Técnicas -->
                <p><strong>Escala:</strong> ${train.Escala || 'N/A'}</p>
                <p><strong>Longitud (mm):</strong> ${train.Longitud || 'N/A'}</p>
                <p><strong>Luz Propia:</strong> ${train['Luz Propia'] || 'No especificado'}</p>
                <p><strong>Suministro Eléctrico:</strong> ${train['Suministro eléctrico'] || 'N/A'}</p>
                
                <!-- Estado y Precio -->
                <p class="mt-4"><strong>Estado:</strong> <span class="font-semibold text-green-600 dark:text-green-400">${train.Estado || 'Excelente'}</span></p>
                <p class="text-lg"><strong>Precio Estimado:</strong> <span class="text-indigo-600 dark:text-indigo-400 font-bold">$${train.Precio || 'N/A'}</span></p>
                
                <!-- Descripción -->
                <p class="mt-4 text-sm">${train.Descripcion || 'No hay descripción detallada disponible para este modelo.'}</p>
                
                <button 
                    id="interest-button"
                    class="btn-primary w-full mt-6 py-3 text-lg transition duration-300 ease-in-out transform hover:scale-105">
                    ¡Estoy Interesado! (Guardar Solicitud)
                </button>
            </div>
        </div>
    `;

    // 2. Mostrar el modal
    productModal.classList.remove('hidden');

    // 3. Asignar listener para cerrar el modal
    document.getElementById('close-modal-x').addEventListener('click', hideProductModal);
    
    // 4. Conectar con la lógica de leads
    const interestButton = document.getElementById('interest-button');
    interestButton.addEventListener('click', async () => {
        interestButton.disabled = true;
        interestButton.textContent = 'Guardando Solicitud...';
        
        // Llama a la función global en leads.js
        await window.saveProtectedLead(train.id, train.Modelo);
        
        // Revertir el estado del botón (la función saveProtectedLead maneja el feedback del usuario)
        setTimeout(() => {
            interestButton.textContent = '¡Estoy Interesado!';
            interestButton.disabled = false;
        }, 500); 
    });
}
// Hacemos global la función de ocultar el modal
window.hideProductModal = () => productModal.classList.add('hidden');

/**
 * Crea el HTML para una tarjeta de tren.
 * @param {object} train - Objeto de datos del tren.
 * @returns {string} HTML de la tarjeta.
 */
function renderTrainCard(train) {
    const imageUrl = train.ImagenURL || 'https://placehold.co/300x200/4F46E5/FFFFFF?text=SIN+IMAGEN';
    return `
        <div data-id="${train.id}" class="bg-white dark:bg-gray-800 p-4 shadow-xl rounded-xl transition duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-2xl cursor-pointer border border-gray-200 dark:border-gray-700 train-card">
            <img src="${imageUrl}" 
                 onerror="this.onerror=null;this.src='https://placehold.co/300x200/4F46E5/FFFFFF?text=SIN+IMAGEN';"
                 alt="Imagen de ${train.Numero}" 
                 class="w-full h-40 object-cover rounded-lg mb-4 border border-gray-100 dark:border-gray-600">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white truncate">${train.Modelo}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">N°: ${train.Numero}</p>
            <p class="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-2">$${train.Precio || 'N/A'}</p>
            <span class="inline-block mt-2 px-3 py-1 text-xs font-medium text-white bg-green-500 dark:bg-green-600 rounded-full">${train.Estado || 'Disponible'}</span>
        </div>
    `;
}

/**
 * Crea el HTML para un elemento de solicitud en la página de perfil.
 * @param {object} request - Objeto de datos de la solicitud.
 * @returns {string} HTML del elemento de solicitud.
 */
function renderRequestItem(request) {
    const date = request.timestamp ? new Date(request.timestamp.seconds * 1000).toLocaleDateString() : 'N/A';
    const statusClass = request.status === 'Pendiente' ? 'bg-yellow-500' : 'bg-green-500';
    return `
        <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow flex justify-between items-center">
            <div>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">${request.modelName}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Solicitado el: ${date}</p>
            </div>
            <span class="px-3 py-1 text-xs font-medium text-white ${statusClass} rounded-full">${request.status}</span>
        </div>
    `;
}


/**
 * Renderiza todas las secciones del catálogo.
 * @param {object} groupedTrains - Trenes agrupados por tipo.
 */
function renderCatalog(groupedTrains) {
    catalogContainer.innerHTML = ''; // Limpiar contenido anterior
    
    // 1. Iterar sobre los grupos
    for (const type in groupedTrains) {
        if (groupedTrains.hasOwnProperty(type)) {
            const section = document.createElement('section');
            section.className = 'mb-10';
            
            // Título de la sección
            section.innerHTML = `
                <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b-2 border-indigo-400 pb-2">${type}</h2>
                <div class="grid-layout" id="group-${type.replace(/\s/g, '-')}-cards">
                    <!-- Cards van aquí -->
                </div>
            `;
            catalogContainer.appendChild(section);

            // 2. Renderizar tarjetas dentro de la sección
            const cardsContainer = document.getElementById(`group-${type.replace(/\s/g, '-')}-cards`);
            
            groupedTrains[type].forEach(train => {
                const cardHtml = renderTrainCard(train);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = cardHtml;
                const cardElement = tempDiv.firstChild;
                
                // 3. Asignar el listener de clic a la tarjeta para abrir el modal
                cardElement.addEventListener('click', () => {
                    showProductModal(train);
                });
                
                cardsContainer.appendChild(cardElement);
            });
        }
    }
}


/**
 * Lee la colección 'Trenes' de Firestore y pinta el catálogo.
 * Esta función usa onSnapshot para escuchar cambios en tiempo real.
 * Debe ser llamada SÓLO después de que la autenticación está lista (desde app/auth.js).
 */
window.initializeTrainCatalog = async () => {
    // 1. Obtener las instancias de Firebase (establecidas en app/auth.js)
    db = window.db; 
    auth = window.auth;

    // 2. Si no están listas o el usuario no está autenticado, no hacer nada.
    if (!window.isAuthReady || !db || !auth || !auth.currentUser) {
        // En este punto, auth.js ya habrá llamado a updateUI para mostrar la landing page.
        return;
    }

    try {
        // COLECCIÓN PÚBLICA: artifacts/{appId}/public/data/Trenes
        const trainsCollectionRef = collection(db, `artifacts/$extension-84b64/public/data/Trenes`);
        
        // Usar onSnapshot para obtener los datos en tiempo real
        onSnapshot(trainsCollectionRef, (snapshot) => {
            const trainsData = [];
            snapshot.forEach(doc => {
                // Obtenemos los datos, incluyendo el ID del documento
                trainsData.push({ id: doc.id, ...doc.data() }); 
            });

            console.log(`[Firestore] Catálogo actualizado: ${trainsData.length} trenes.`);
            
            // Si hay datos, renderizar. Si no hay, mostrar mensaje.
            if (trainsData.length > 0) {
                const groupedTrains = groupTrainsByType(trainsData);
                renderCatalog(groupedTrains);
            } else {
                catalogContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Aún no hay trenes en el catálogo. ¡Es hora de agregar!</p>';
            }

        }, (error) => {
            console.error("Error en onSnapshot del catálogo (PERMISOS/RUTA):", error);
            // Esto se ejecuta si hay un problema de red, permisos o ruta.
            catalogContainer.innerHTML = `<p class="text-red-500">Error al cargar el catálogo: ${error.message}. Verifica el Project ID y las reglas de seguridad.</p>`;
        });

    } catch (error) {
        console.error("Error al iniciar el listener del catálogo:", error);
        catalogContainer.innerHTML = '<p class="text-red-500">Error crítico al inicializar el catálogo.</p>';
    }
}


/**
 * Carga las solicitudes guardadas por el usuario en la página de perfil.
 * @param {object} user - El objeto de usuario de Firebase.
 */
window.loadProfilePage = (user) => {
    db = window.db; 
    
    if (!db || !user || !requestsListContainer) {
        return;
    }

    // COLECCIÓN PRIVADA: artifacts/{appId}/users/{userId}/Solicitudes
    const requestsCollectionPath = `artifacts/$extension-84b64/users/${user.uid}/Solicitudes`;
    const requestsCollectionRef = collection(db, requestsCollectionPath);
    
    // Consultar solo las solicitudes del usuario actual
    const q = query(requestsCollectionRef); // Eliminamos orderBy para evitar problemas de índices

    // Usar onSnapshot para obtener los datos en tiempo real
    onSnapshot(q, (snapshot) => {
        const requests = [];
        snapshot.forEach(doc => {
            requests.push({ id: doc.id, ...doc.data() });
        });

        console.log(`[Firestore] Solicitudes del usuario cargadas: ${requests.length}.`);

        requestsListContainer.innerHTML = ''; // Limpiar
        
        if (requests.length === 0) {
            requestsListContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Aún no has solicitado interés en ningún modelo.</p>';
        } else {
             // Ordenar en el cliente (navegador) por fecha descendente
            requests.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            
            requests.forEach(request => {
                requestsListContainer.innerHTML += renderRequestItem(request);
            });
        }

    }, (error) => {
        console.error("Error al cargar solicitudes de perfil:", error);
        requestsListContainer.innerHTML = `<p class="text-red-500">Error al cargar solicitudes: ${error.message}.</p>`;
    });
};


// -------------------------------------------------------------------
// EVENTOS ADICIONALES
// -------------------------------------------------------------------

// Listener para cerrar el modal al hacer clic en el fondo
window.addEventListener('load', () => {
    if (productModal) {
        productModal.addEventListener('click', (e) => {
            // Cierra el modal solo si se hace clic directamente en el fondo
            if (e.target.id === 'product-modal-backdrop') {
                window.hideProductModal();
            }
        });
    }
});