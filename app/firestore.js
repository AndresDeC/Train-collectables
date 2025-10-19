import { collection, getFirestore, onSnapshot, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Referencias del DOM y creación de elementos necesarios
const catalogContainer = document.getElementById('catalog-container');
const catalogLoading = document.getElementById('catalog-loading'); 

// Importante: Obtenemos el ID de la aplicación y la instancia de la base de datos
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
// Aseguramos que la instancia de la DB global esté disponible
const db = window.db || getFirestore(); 

// 1. CREACIÓN DINÁMICA DEL CONTENEDOR DE FILTROS
const filtersContainer = document.createElement('div');
filtersContainer.id = 'filters-container';
filtersContainer.className = 'flex flex-wrap gap-2 mb-6 pt-4'; 
if (catalogContainer) {
    catalogContainer.parentNode.insertBefore(filtersContainer, catalogContainer);
}

// 2. CREACIÓN DINÁMICA DEL MODAL DE DETALLE DE PRODUCTO
const modalBackdrop = document.createElement('div');
modalBackdrop.id = 'product-modal-backdrop';
modalBackdrop.className = 'modal-backdrop hidden';
document.body.appendChild(modalBackdrop);

let allTrains = []; // Almacena todos los trenes para el filtrado local
let activeCategory = 'all'; // Categoría activa por defecto

// -------------------------------------------------------------------
// FUNCIONES DE SOPORTE Y FORMATO
// -------------------------------------------------------------------

/**
 * Formatea un número a moneda (asumiendo dólares por defecto si el precio es bajo)
 * @param {number} price - El precio del producto.
 * @returns {string} - El precio formateado.
 */
function formatCurrency(price) {
    // Usaremos un formato simple de USD.
    return 'USD ' + (price || 0).toLocaleString('en-US'); 
}

// -------------------------------------------------------------------
// LÓGICA DE FILTROS
// -------------------------------------------------------------------

/**
 * Renderiza los botones de filtro basándose en las categorías únicas ('Tipo').
 * @param {Array<Object>} trains - Lista completa de trenes.
 */
function renderFilters(trains) {
    const categories = new Set(['all']); 
    trains.forEach(train => {
        // USANDO EL CAMPO 'Tipo' DE TU BASE DE DATOS
        if (train.Tipo) {
            categories.add(train.Tipo);
        }
    });

    filtersContainer.innerHTML = ''; 

    categories.forEach(category => {
        const button = document.createElement('button');
        const displayCategory = category.charAt(0).toUpperCase() + category.slice(1);
        
        button.textContent = category === 'all' ? 'Ver Todo' : displayCategory;
        button.className = `btn btn-secondary text-sm px-4 py-2 transition duration-150 ease-in-out font-medium ${category === activeCategory ? 'bg-orange-600 border-orange-600' : 'bg-gray-600 border-gray-600 hover:bg-gray-700'}`;
        button.dataset.category = category;

        button.addEventListener('click', () => {
            activeCategory = category;
            filterAndRenderCatalog();
            // Re-renderizar filtros para actualizar el estado activo (color)
            renderFilters(allTrains); 
        });

        filtersContainer.appendChild(button);
    });
}

/**
 * Filtra la lista global de trenes y llama a renderCatalog.
 */
function filterAndRenderCatalog() {
    const filteredTrains = allTrains.filter(train => 
        // USANDO EL CAMPO 'Tipo'
        activeCategory === 'all' || train.Tipo === activeCategory
    );
    renderCatalog(filteredTrains);
}

// -------------------------------------------------------------------
// RENDERIZADO DEL CATÁLOGO
// -------------------------------------------------------------------

/**
 * Renderiza una sola tarjeta de tren.
 * @param {object} model - Objeto del modelo de tren con sus propiedades.
 * @returns {string} - HTML de la tarjeta.
 */
function renderTrainCard(model) {
    // Mapeo de campos de tu DB
    const name = model.Número || 'N/A';
    const description = model.Marca ? `Marca: ${model.Marca}. País: ${model.País}` : 'Modelo de colección.';
    const price = model.Precio || 0;
    const stock = model.Sets || 0; 
    const category = model.Tipo || 'Varios';

    const placeholderUrl = `https://placehold.co/400x250/334155/E2E8F0?text=${encodeURIComponent('N° ' + name)}`;
    const imageUrl = model.imageUrl || placeholderUrl; 
    
    // Determinar el estado del stock
    const stockStatusClass = stock > 0 ? 'text-green-400' : 'text-red-400';
    const stockStatusText = stock > 0 ? `En Stock (${stock})` : 'Agotado';

    return `
        <div class="train-card cursor-pointer transform hover:scale-[1.02] transition-transform duration-200 ease-in-out" data-id="${model.id}">
            <div class="product-image" style="background-image: url('${imageUrl}')"></div>
            <div class="product-info">
                <p class="text-sm font-semibold uppercase text-orange-400">${category}</p>
                <h3 class="product-title">Nº: ${name}</h3>
                <p class="product-description">${description.substring(0, 70)}...</p>
                <div class="product-footer pt-2">
                    <div class="product-price-status">
                        <span class="product-price text-2xl font-bold">${formatCurrency(price)}</span>
                        <span class="text-sm font-medium ${stockStatusClass}">${stockStatusText}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza las tarjetas de trenes agrupadas por Tipo (categoría).
 * @param {Array<Object>} trains - Lista de trenes a mostrar.
 */
function renderCatalog(trains) {
    catalogContainer.innerHTML = '';
    
    if (trains.length === 0) {
        catalogContainer.innerHTML = '<p class="text-lg text-gray-500">No hay modelos de trenes que coincidan con esta categoría.</p>';
        return;
    }

    // 1. Agrupar trenes por Tipo
    const groupedTrains = trains.reduce((acc, train) => {
        const type = train.Tipo || 'Otros Modelos';
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(train);
        return acc;
    }, {});

    let htmlContent = '';

    // 2. Iterar sobre los grupos y crear una sección para cada uno
    Object.keys(groupedTrains).forEach(type => {
        const typeTrains = groupedTrains[type];
        
        // Título de la sección
        htmlContent += `<h2 class="text-3xl font-bold text-white mt-10 mb-5 section-title">${type.toUpperCase()}</h2>`;

        // Contenedor de las tarjetas para este grupo
        htmlContent += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">`;
        
        // Renderizar las tarjetas dentro del grupo
        typeTrains.forEach(train => {
            htmlContent += renderTrainCard(train);
        });

        htmlContent += `</div>`; // Cierre del grid
    });

    // 3. Inyectar todo el contenido HTML
    catalogContainer.innerHTML = htmlContent;


    // 4. Agregar evento de click a las nuevas tarjetas para abrir el modal
    document.querySelectorAll('.train-card').forEach(card => {
        card.addEventListener('click', () => {
            const trainId = card.dataset.id;
            const selectedTrain = allTrains.find(t => t.id === trainId);
            if (selectedTrain) {
                showProductModal(selectedTrain);
            }
        });
    });
}


// -------------------------------------------------------------------
// LÓGICA DEL MODAL (POP-UP)
// -------------------------------------------------------------------

/**
 * Muestra el pop-up con los detalles del producto.
 * @param {Object} train - El objeto de datos del tren.
 */
function showProductModal(train) {
    // Mapeo de campos de tu DB para el modal
    const name = train.Número || 'N/A';
    const price = train.Precio || 0;
    const stock = train.Sets || 0;
    const category = train.Tipo || 'Varios';
    const scale = train.Escala || 'N/A';
    const coupling = train.Coupling || 'N/A';
    const longitud = train.Longitud || 'N/A';
    const marca = train.Marca || 'N/A';
    const pais = train.País || 'N/A';
    const linea = train.Línea || 'N/A';
    const luzPropia = train['Luz Propia'] === true || train['Luz Propia'] === 'true' ? 'Sí' : 'No';


    const formattedPrice = formatCurrency(price);
    const placeholderUrl = `https://placehold.co/600x400/ff5722/000?text=${encodeURIComponent('N° ' + name)}`;
    const imageUrl = train.imageUrl || placeholderUrl;
    const stockStatusText = stock > 0 ? `¡${stock} unidades en stock!` : 'Agotado';

    modalBackdrop.innerHTML = `
        <div class="modal-content auth-card p-6 w-11/12 md:w-2/3 lg:w-1/2">
            <!-- Botón de cierre -->
            <button id="close-product-modal" class="absolute top-3 right-3 text-3xl text-gray-400 hover:text-white">&times;</button>
            
            <div class="md:flex gap-6 items-start">
                <!-- Imagen del producto (lado izquierdo) -->
                <div class="md:w-1/2 mb-4 md:mb-0 flex-shrink-0">
                    <img src="${imageUrl}" alt="Modelo ${name}" class="rounded-lg shadow-xl w-full h-auto" onerror="this.onerror=null;this.src='${placeholderUrl}'">
                </div>

                <!-- Detalles del producto (lado derecho) -->
                <div class="md:w-1/2 flex-grow">
                    <p class="text-sm font-semibold uppercase text-orange-400">${category} (${marca})</p>
                    <h2 class="text-3xl font-bold mb-3 text-white">Modelo N°: ${name}</h2>
                    
                    <div class="text-4xl font-extrabold my-4 text-green-400">${formattedPrice}</div>
                    
                    <ul class="space-y-2 mb-6 border-l-4 border-orange-500 pl-3 text-sm">
                        <li class="text-gray-400"><strong>Escala:</strong> ${scale}</li>
                        <li class="text-gray-400"><strong>País/Línea:</strong> ${pais} (${linea})</li>
                        <li class="text-gray-400"><strong>Acoplamiento (Coupling):</strong> ${coupling}</li>
                        <li class="text-gray-400"><strong>Longitud:</strong> ${longitud} mm</li>
                        <li class="text-gray-400"><strong>Luz Propia:</strong> ${luzPropia}</li>
                    </ul>
                    
                    <p class="mb-4 text-gray-300">
                        Modelo de coleccionista de la marca ${marca} (País: ${pais}). Ideal para añadir a su línea ${linea}.
                    </p>


                    <!-- Botón de Interés (usará la lógica de leads.js) -->
                    <button 
                        class="btn btn-primary w-full text-lg mt-4 ${stock > 0 ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 cursor-not-allowed'}" 
                        data-model-id="${train.id}" 
                        data-model-name="${name}"
                        ${stock === 0 ? 'disabled' : ''}
                    >
                        ${stock > 0 ? '¡Estoy Interesado!' : 'Agotado (Notificarme)'}
                    </button>
                    <p class="text-center text-sm mt-2 font-semibold text-gray-400">${stockStatusText}</p>
                </div>
            </div>
        </div>
    `;

    // Muestra el modal
    modalBackdrop.classList.remove('hidden');

    // Agrega el evento para cerrar el modal
    document.getElementById('close-product-modal').addEventListener('click', hideProductModal);
    
    // Cierra al hacer clic fuera del contenido del modal
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target.id === 'product-modal-backdrop') {
            hideProductModal();
        }
    });
    
    // Ejecutar lógica de leads.js si existe
    if (window.attachLeadFormListeners) {
        window.attachLeadFormListeners();
    }
}

/**
 * Oculta el pop-up.
 */
function hideProductModal() {
    modalBackdrop.classList.add('hidden');
}

// -------------------------------------------------------------------
// FUNCIÓN PRINCIPAL DE CARGA (Llamada desde auth.js)
// -------------------------------------------------------------------

/**
 * Escucha en tiempo real los cambios en la colección 'Trenes'
 * y maneja la lógica de filtrado y renderizado.
 */
function initializeTrainCatalog() { 
    if (!catalogContainer || !db) {
        console.error("Catálogo no iniciado: Contenedor o DB no disponibles.");
        return;
    }
    
    if (catalogLoading) catalogLoading.classList.remove('hidden');
    catalogContainer.innerHTML = ''; 
    filtersContainer.innerHTML = '';

    console.log('Iniciando escucha en tiempo real del catálogo de trenes...');
    
    // 🚨 RUTA CORREGIDA con sintaxis modular:
    // Asegura que apunta a /artifacts/{appId}/public/data/Trenes
    const collectionRef = collection(db, `artifacts/${appId}/public/data/Trenes`);
    const q = query(collectionRef); // Puedes añadir aquí ordenación si fuera necesario

    // Usamos onSnapshot para mantener la vista actualizada en tiempo real
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (catalogLoading) catalogLoading.classList.add('hidden');

        if (snapshot.empty) {
            const collectionPath = `artifacts/${appId}/public/data/Trenes`;
            catalogContainer.innerHTML = `<p class="empty-message text-lg text-gray-500">No hay modelos de trenes disponibles en este momento. Verifica que los datos estén en la ruta: <code class="text-orange-400">${collectionPath}</code></p>`;
            console.warn(`Colección 'Trenes' vacía en la ruta: ${collectionPath}`);
            return;
        }

        allTrains = []; // Reiniciar la lista global
        
        snapshot.docs.forEach(doc => {
            const trainData = doc.data();
            allTrains.push({ id: doc.id, ...trainData }); 
        });

        // 1. Renderizar los botones de filtro (usando el campo 'Tipo')
        renderFilters(allTrains);
        
        // 2. Renderizar el catálogo inicial (agrupado por Tipo o filtrado)
        filterAndRenderCatalog();

        console.log(`Catálogo actualizado. Se cargaron ${snapshot.size} modelos.`);
        
    }, error => {
        console.error("Error al escuchar el catálogo de trenes (Verifica las Reglas de Seguridad y la Conexión):", error);
        if (catalogLoading) catalogLoading.classList.add('hidden');
        catalogContainer.innerHTML = '<p class="error-message">Error al cargar el catálogo. Por favor, verifica que las reglas de seguridad de Firestore permitan la lectura pública de la colección "Trenes".</p>';
    });
    
    // (Opcional) Retornar la función de desuscripción para limpieza si la usáramos en React/Angular
    // return unsubscribe; 
}

// Exportamos la función para que app/auth.js la pueda llamar.
window.initializeTrainCatalog = initializeTrainCatalog;