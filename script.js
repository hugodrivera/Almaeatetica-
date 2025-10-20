// --- DATOS DE EJEMPLO ---
// En el futuro, estos datos vendrán de nuestro backend.
const MOCK_ARTICLES = [
    { "codigo": "HUS-101", "descripcion": "Filtro de Aire TE300", "aplicacion": "Husqvarna TE300 2022", "stock": 15, "precio": 25.50, "imagen": "filtro_aire.jpg" },
    { "codigo": "BOY-202", "descripcion": "Tapa de Embrague Boyesen", "aplicacion": "KTM/Husqvarna 250/300", "stock": 5, "precio": 180.00, "imagen": "tapa_boyesen.jpg" },
    { "codigo": "NGK-BR7ES", "descripcion": "Bujía NGK BR7ES", "aplicacion": "Motos 2T Varios Modelos", "stock": 50, "precio": 8.75, "imagen": "bujia_ngk.png" },
    { "codigo": "REN-991", "descripcion": "Manubrio Renthal Twinwall", "aplicacion": "Universal Enduro/MX", "stock": 10, "precio": 150.00, "imagen": "sin_foto.png" },
    { "codigo": "MOT-5100", "descripcion": "Aceite Motul 5100 10W40", "aplicacion": "Motos 4T", "stock": 30, "precio": 15.00, "imagen": "aceite_motul.jpg" }
];
// -------------------------

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const resultsTableBody = document.querySelector('#results-table');
    const tableHead = document.querySelector('thead tr');
    const imageDisplay = document.getElementById('image-display');
    const itemCode = document.getElementById('item-code');
    const itemInfo = document.getElementById('item-info');
    const loadingState = document.getElementById('loading-state');
    
    // 1. Cargar encabezados de la tabla dinámicamente
    if (MOCK_ARTICLES.length > 0) {
        const headers = Object.keys(MOCK_ARTICLES[0]);
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header.toUpperCase();
            tableHead.appendChild(th);
        });
    }

    // 2. Función para mostrar los resultados en la tabla
    const displayResults = (articles) => {
        resultsTableBody.innerHTML = ''; // Limpiar resultados anteriores
        
        if (articles.length === 0) {
            loadingState.textContent = 'No se encontraron resultados.';
            return;
        }
        loadingState.style.display = 'none';

        articles.forEach(article => {
            const row = document.createElement('tr');
            
            // Llenar la fila con los datos del artículo
            Object.values(article).forEach(value => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.appendChild(cell);
            });

            // Guardar datos en el elemento de la fila para usarlos al hacer clic
            row.dataset.article = JSON.stringify(article);

            resultsTableBody.appendChild(row);
        });
    };

    // 3. Evento al escribir en el campo de búsqueda
    searchInput.addEventListener('keyup', (e) => {
        const query = e.target.value.toLowerCase().trim();

        if (query === '') {
            resultsTableBody.innerHTML = '';
            loadingState.style.display = 'block';
            loadingState.textContent = 'Escribe algo para buscar...';
            return;
        }

        // Simulación de búsqueda (filtra los datos de ejemplo)
        const filteredArticles = MOCK_ARTICLES.filter(article => {
            return Object.values(article).some(value =>
                String(value).toLowerCase().includes(query)
            );
        });

        displayResults(filteredArticles);
    });

    // 4. Evento al hacer clic en una fila de la tabla
    resultsTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        
        // Remover clase 'table-active' de otras filas
        document.querySelectorAll('#results-table tr').forEach(r => r.classList.remove('table-active'));
        // Añadir clase a la fila seleccionada
        row.classList.add('table-active');

        const articleData = JSON.parse(row.dataset.article);
        
        // Actualizar el panel de la imagen
        // Asumimos que tienes una carpeta "imagenes" junto a tus archivos html.
        imageDisplay.src = `imagenes/${articleData.imagen || 'sin_foto.png'}`;
        itemCode.textContent = `Código: ${articleData.codigo}`;
        itemInfo.textContent = articleData.descripcion;

        imageDisplay.onerror = () => {
            // Si la imagen no se encuentra, muestra la de por defecto.
            imageDisplay.src = 'imagenes/sin_foto.png';
        };
    });

});
