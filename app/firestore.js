// app/firestore.js
// Lógica para cargar el catálogo de trenes desde Firestore y renderizarlo.

// Obtenemos la referencia al contenedor principal del catálogo
const catalogContainer = document.getElementById('catalog-container');

/**
 * Función para renderizar una sola tarjeta de tren.
 * @param {object} model - Objeto del modelo de tren con sus propiedades.
 * @returns {string} - HTML de la tarjeta.
 */
function renderTrainCard(model) {
    // Usamos un placeholder de imagen si no hay URL definida
    const imageUrl = model.imageUrl || 'https://placehold.co/400x250/334155/E2E8F0?text=Tren+No+Image';
    
    // Determinar el estado del stock
    const stockStatus = model.stock > 0 ? 
        `<span class="stock-available">En Stock (${model.stock})</span>` : 
        `<span class="stock-unavailable">Agotado</span>`;

    // Renderizamos la tarjeta. El botón 'buy-button' tiene los data-* que usará leads.js
    return `
        <div class="product-card">
            <div class="product-image" style="background-image: url('${imageUrl}')"></div>
            <div class="product-info">
                <h3 class="product-title">${model.name}</h3>
                <p class="product-description">${model.description}</p>
                <div class="product-footer">
                    <div class="product-price-status">
                        <span class="product-price">$${model.price.toLocaleString('es-CL')}</span>
                        ${stockStatus}
                    </div>
                    <button 
                        class="btn btn-secondary buy-button" 
                        data-model-id="${model.id}" 
                        data-model-name="${model.name}"
                        ${model.stock === 0 ? 'disabled' : ''}
                    >
                        Estoy Interesado
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Escucha en tiempo real los cambios en la colección 'trainCatalog'
 * y renderiza la lista completa.
 * * NOTA: Esta función es llamada desde app/auth.js después de un inicio de sesión exitoso.
 * DEBES crear una colección llamada 'trainCatalog' en tu Firestore
 * con documentos que tengan: name, description, price, stock, imageUrl.
 */
function loadCatalogAndListen() {
    console.log('Iniciando escucha en tiempo real del catálogo de trenes...');
    
    // Usamos onSnapshot para mantener la vista actualizada en tiempo real
    db.collection('trainCatalog').onSnapshot(snapshot => {
        let html = '';
        if (snapshot.empty) {
            html = '<p class="empty-message">No hay modelos de trenes disponibles en este momento.</p>';
        } else {
            // Recorrer todos los documentos y crear el HTML
            snapshot.docs.forEach(doc => {
                const model = doc.data();
                model.id = doc.id; // Agregamos el ID del documento
                html += renderTrainCard(model);
            });
        }
        
        // Inyectar el HTML generado en el contenedor
        catalogContainer.innerHTML = html;

        console.log(`Catálogo actualizado. Se cargaron ${snapshot.size} modelos.`);
        
    }, error => {
        console.error("Error al escuchar el catálogo de trenes:", error);
        catalogContainer.innerHTML = '<p class="error-message">Error al cargar el catálogo. Intenta recargar la página.</p>';
    });
}