import { collection, getFirestore, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- REFERENCIAS GLOBALES ---
const catalogContainer = document.getElementById('catalog-container');
const productModal = document.getElementById('product-modal-backdrop');
const productModalContent = document.querySelector('#product-modal-backdrop .modal-content');
const closeModalButton = document.getElementById('close-product-modal');

// La instancia de Firestore (db) y Auth (auth) se obtienen de app/auth.js
let db;
let auth;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

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
    // 1. Crear el contenido HTML del modal
    productModalContent.innerHTML = `
        <h2 class="text-3xl font-bold text-gray-800 dark:text-white mb-4">${train.Modelo}</h2>
        <button id="close-modal-x" class="absolute top-3 right-3 text-4xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">&times;</button>
        
        <div class="md:flex md:space-x-8">
            <div class="md:w-1/2">
                <img src="${train.ImagenURL || 'https://placehold.co/500x300/4F46E5/FFFFFF?text=IMAGEN+NO+DISPONIBLE'}" 
                     alt="Imagen de ${train.Modelo}" 
                     class="w-full h-auto object-cover rounded-lg shadow-lg mb-4">
            </div>
            <div class="md:w-1/2 space-y-3 text-gray-700 dark:text-gray-300">
                <p><strong>N° de Modelo:</strong> ${train.Numero}</p>
                <p><strong>Tipo:</strong> ${train.Tipo || 'N/A'}</p>
                <p><strong>Escala:</strong> ${train.Escala || 'N/A'}</p>
                <p><strong>Estado:</strong> <span class="font-semibold text-green-600 dark:text-green-400">${train.Estado || 'Excelente'}</span></p>
                <p class="text-lg"><strong>Precio Estimado:</strong> <span class="text-indigo-600 dark:text-indigo-400 font-bold">$${train.Precio || 'N/A'}</span></p>
                <p class="mt-4 text-sm">${train.Descripcion || 'No hay descripción detallada disponible para este modelo.'}</p>
                
                <button 
                    class="btn-primary w-full mt-6 py-3 text-lg transition duration-300 ease-in-out transform hover:scale-105"
                    data-model-id="${train.id}"
                    data-model-name="${train.Numero}">
                    ¡Estoy Interesado! (Lead)
                </button>
            </div>
        </div>
    `;

    // 2. Mostrar el modal
    productModal.classList.remove('hidden');

    // 3. Asignar listener para cerrar el modal
    document.getElementById('close-modal-x').addEventListener('click', hideProductModal);
    
    // 4. Conectar con la lógica de leads (importante)
    if (window.attachLeadFormListeners) {
        window.attachLeadFormListeners();
    }
}
// Hacemos global la función de ocultar el modal para que js/leads.js pueda usarla
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
 * Lee la colección 'trains' de Firestore y pinta el catálogo.
 * Esta función usa onSnapshot para escuchar cambios en tiempo real.
 */
async function initializeTrainCatalog() {
    db = window.db || getFirestore(); // Usar la instancia global
    auth = window.auth;

    if (!db || !auth || !auth.currentUser) {
        console.error("[Firestore] La DB o la autenticación no están listas. Reintentando...");
        // Reintentar si la autenticación aún no se ha completado
        setTimeout(initializeTrainCatalog, 500);
        return;
    }

    try {
        const trainsCollectionRef = collection(db, `artifacts/${appId}/public/data/trains`);
        
        // Usar onSnapshot para obtener los datos en tiempo real
        onSnapshot(trainsCollectionRef, (snapshot) => {
            const trainsData = [];
            snapshot.forEach(doc => {
                // Obtenemos los datos, incluyendo el ID del documento
                trainsData.push({ id: doc.id, ...doc.data() }); 
            });

            console.log(`[Firestore] Catálogo actualizado: ${trainsData.length} trenes.`);
            
            // Agrupar y renderizar el catálogo
            const groupedTrains = groupTrainsByType(trainsData);
            renderCatalog(groupedTrains);

            // NOTA: El listener de Leads (attachLeadFormListeners) se llama
            // dentro de showProductModal cada vez que se abre un detalle de producto.

        }, (error) => {
            console.error("Error en onSnapshot del catálogo:", error);
            catalogContainer.innerHTML = '<p class="text-red-500">Error al cargar el catálogo. Por favor, revisa la consola y las reglas de seguridad de Firestore.</p>';
        });

    } catch (error) {
        console.error("Error al iniciar el listener del catálogo:", error);
        catalogContainer.innerHTML = '<p class="text-red-500">Error crítico al inicializar el catálogo.</p>';
    }
}

// Hacemos la función disponible globalmente para que app/auth.js pueda llamarla
window.initializeTrainCatalog = initializeTrainCatalog;

// -------------------------------------------------------------------
// EVENTOS ADICIONALES
// -------------------------------------------------------------------

// Listener para cerrar el modal al hacer clic en el fondo
window.addEventListener('load', () => {
    if (productModal) {
        productModal.addEventListener('click', (e) => {
            if (e.target.id === 'product-modal-backdrop') {
                window.hideProductModal();
            }
        });
    }
});