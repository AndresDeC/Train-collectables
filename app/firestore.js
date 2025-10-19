// Referencias del DOM y creación de elementos necesarios
const catalogContainer = document.getElementById('catalog-container');
const catalogLoading = document.getElementById('catalog-loading');

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
 * Formatea un número a moneda chilena (ej: 185990 -> $185.990)
 * @param {number} price - El precio del producto.
 * @returns {string} - El precio formateado.
 */
function formatCurrency(price) {
    return '$' + (price || 0).toLocaleString('es-CL');
}

// -------------------------------------------------------------------
// LÓGICA DE FILTROS
// -------------------------------------------------------------------

/**
 * Renderiza los botones de filtro basándose en las categorías únicas.
 * @param {Array<Object>} trains - Lista completa de trenes.
 */
function renderFilters(trains) {
    const categories = new Set(['all']); // Inicializa con 'all'
    trains.forEach(train => {
        // Asumiendo que ahora tus documentos tienen un campo 'category'
        if (train.category) {
            categories.add(train.category);
        }
    });

    filtersContainer.innerHTML = ''; // Limpiar filtros anteriores

    categories.forEach(category => {
        const button = document.createElement('button');
        const displayCategory = category.charAt(0).toUpperCase() + category.slice(1);
        
        button.textContent = category === 'all' ? 'Ver Todo' : displayCategory;
        button.className = `btn btn-secondary text-sm px-4 py-2 transition duration-150 ease-in-out font-medium ${category === activeCategory ? 'bg-orange-600 border-orange-600' : 'bg-gray-600 border-gray-600 hover:bg-gray-700'}`;
        button.dataset.category = category;

        button.addEventListener('click', () => {
            activeCategory = category;
            filterAndRenderCatalog();
            // Refrescar el estilo del botón activo
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
        activeCategory === 'all' || train.category === activeCategory
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
    const placeholderUrl = `https://placehold.co/400x250/334155/E2E8F0?text=${encodeURIComponent(model.name)}`;
    // Usamos 'imageUrl' si existe, si no, el placeholder
    const imageUrl = model.imageUrl || placeholderUrl; 
    
    // Determinar el estado del stock
    const stockStatusClass = model.stock > 0 ? 'text-green-400' : 'text-red-400';
    const stockStatusText = model.stock > 0 ? `En Stock (${model.stock})` : 'Agotado';

    // La tarjeta entera es clicable para abrir el modal
    return `
        <div class="train-card cursor-pointer transform hover:scale-[1.02] transition-transform duration-200 ease-in-out" data-id="${model.id}">
            <div class="product-image" style="background-image: url('${imageUrl}')"></div>
            <div class="product-info">
                <p class="text-sm font-semibold uppercase text-orange-400">${model.category || 'Varios'}</p>
                <h3 class="product-title">${model.name}</h3>
                <p class="product-description">${model.description.substring(0, 70)}...</p>
                <div class="product-footer pt-2">
                    <div class="product-price-status">
                        <span class="product-price text-2xl font-bold">${formatCurrency(model.price)}</span>
                        <span class="text-sm font-medium ${stockStatusClass}">${stockStatusText}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza las tarjetas de trenes filtradas.
 * @param {Array<Object>} trains - Lista de trenes a mostrar.
 */
function renderCatalog(trains) {
    catalogContainer.innerHTML = '';
    if (trains.length === 0) {
        catalogContainer.innerHTML = '<p class="text-lg text-gray-500">No hay modelos de trenes que coincidan con esta categoría.</p>';
        return;
    }

    trains.forEach(train => {
        catalogContainer.insertAdjacentHTML('beforeend', renderTrainCard(train));
    });

    // Agregar evento de click a las nuevas tarjetas para abrir el modal
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
    const formattedPrice = formatCurrency(train.price || 0);
    const placeholderUrl = `https://placehold.co/600x400/ff5722/000?text=${encodeURIComponent(train.name)}`;
    const imageUrl = train.imageUrl || placeholderUrl;
    const stockStatusText = train.stock > 0 ? `¡${train.stock} unidades en stock!` : 'Agotado';
    const stockStatusClass = train.stock > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 cursor-not-allowed';

    // Contenido del modal
    modalBackdrop.innerHTML = `
        <div class="modal-content auth-card p-6 w-11/12 md:w-2/3 lg:w-1/2">
            <!-- Botón de cierre -->
            <button id="close-product-modal" class="absolute top-3 right-3 text-3xl text-gray-400 hover:text-white">&times;</button>
            
            <div class="md:flex gap-6 items-start">
                <!-- Imagen del producto (lado izquierdo) -->
                <div class="md:w-1/2 mb-4 md:mb-0 flex-shrink-0">
                    <img src="${imageUrl}" alt="Modelo ${train.name}" class="rounded-lg shadow-xl w-full h-auto" onerror="this.onerror=null;this.src='${placeholderUrl}'">
                </div>

                <!-- Detalles del producto (lado derecho) -->
                <div class="md:w-1/2 flex-grow">
                    <p class="text-sm font-semibold uppercase text-orange-400">${train.category || 'Varios'}</p>
                    <h2 class="text-3xl font-bold mb-3 text-white">${train.name}</h2>
                    
                    <div class="text-4xl font-extrabold my-4 text-green-400">${formattedPrice}</div>
                    
                    <p class="mb-4 text-gray-300">
                        ${train.description || 'No hay una descripción detallada para este modelo. Contacta con nosotros para más información.'}
                    </p>

                    <ul class="space-y-2 mb-6 border-l-4 border-orange-500 pl-3 text-sm">
                        <li class="text-gray-400"><strong>Escala:</strong> ${train.scale || 'N/A'}</li>
                        <li class="text-gray-400"><strong>Categoría:</strong> ${train.category || 'N/A'}</li>
                        <li class="text-gray-400"><strong>Material:</strong> ${train.material || 'Metal y Plástico'}</li>
                    </ul>

                    <!-- Botón de Interés (usará la lógica de leads.js) -->
                    <button 
                        class="btn btn-primary w-full text-lg mt-4 ${stockStatusClass}" 
                        data-model-id="${train.id}" 
                        data-model-name="${train.name}"
                        ${train.stock === 0 ? 'disabled' : ''}
                    >
                        ${train.stock > 0 ? '¡Estoy Interesado!' : 'Agotado (Notificarme)'}
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
 * Escucha en tiempo real los cambios en la colección 'trainCatalog'
 * y maneja la lógica de filtrado y renderizado.
 */
function loadTrainsCatalog() {
    if (!catalogContainer) return;
    if (catalogLoading) catalogLoading.classList.remove('hidden');
    catalogContainer.innerHTML = ''; 
    filtersContainer.innerHTML = '';

    console.log('Iniciando escucha en tiempo real del catálogo de trenes...');
    
    // Usamos onSnapshot para mantener la vista actualizada en tiempo real
    db.collection('trainCatalog').onSnapshot(snapshot => {
        if (catalogLoading) catalogLoading.classList.add('hidden');

        if (snapshot.empty) {
            catalogContainer.innerHTML = '<p class="empty-message text-lg text-gray-500">No hay modelos de trenes disponibles en este momento.</p>';
            return;
        }

        allTrains = []; // Reiniciar la lista global
        
        snapshot.docs.forEach(doc => {
            const trainData = doc.data();
            // Aseguramos que los documentos tienen un ID y un campo category (para el filtro)
            allTrains.push({ id: doc.id, ...trainData }); 
        });

        // 1. Renderizar los botones de filtro
        renderFilters(allTrains);
        
        // 2. Renderizar el catálogo inicial (filtrado por la categoría activa)
        filterAndRenderCatalog();

        console.log(`Catálogo actualizado. Se cargaron ${snapshot.size} modelos.`);
        
    }, error => {
        console.error("Error al escuchar el catálogo de trenes:", error);
        if (catalogLoading) catalogLoading.classList.add('hidden');
        catalogContainer.innerHTML = '<p class="error-message">Error al cargar el catálogo. Intenta recargar la página.</p>';
    });
}

// Exportamos la función para que app/auth.js la pueda llamar.
window.loadTrainsCatalog = loadTrainsCatalog;