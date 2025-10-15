// Variable global para almacenar todos los artículos del CSV
let allArticles = [];

// Función para parsear (convertir) texto CSV a un array de objetos
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    const articles = [];

    for (let i = 1; i < lines.length; i++) {
        const data = lines[i].split(',').map(d => d.trim());
        if (data.length === headers.length) {
            const article = {};
            for (let j = 0; j < headers.length; j++) {
                article[headers[j]] = data[j];
            }
            articles.push(article);
        }
    }
    return articles;
}

// Función principal que se ejecuta cuando la página se carga
document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('search-input');
    const resultsTableBody = document.querySelector('#results-table');
    const tableHead = document.querySelector('thead tr');
    const imageDisplay = document.getElementById('image-display');
    const itemCode = document.getElementById('item-code');
    const itemInfo = document.getElementById('item-info');
    const loadingState = document.getElementById('loading-state');
    
    // --- Carga de datos desde el CSV ---
    try {
        loadingState.textContent = 'Cargando artículos...';
        const response = await fetch('articulos.csv'); // Pide el archivo CSV
        if (!response.ok) {
            throw new Error('No se pudo encontrar el archivo articulos.csv');
        }
        const csvText = await response.text(); // Lo convierte a texto
        allArticles = parseCSV(csvText); // Lo parsea y guarda en la variable global
        
        if (allArticles.length === 0) {
            loadingState.textContent = 'El archivo CSV está vacío o tiene un formato incorrecto.';
            return;
        }
        
        // 1. Cargar encabezados de la tabla dinámicamente desde el CSV
        const headers = Object.keys(allArticles[0]);
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header.toUpperCase();
            tableHead.appendChild(th);
        });
        loadingState.textContent = 'Escribe algo para buscar...';

    } catch (error) {
        console.error('Error al cargar el CSV:', error);
        loadingState.textContent = 'Error al cargar los artículos. Revisa la consola.';
        return; // Detiene la ejecución si hay un error
    }
    // ------------------------------------

    // 2. Función para mostrar los resultados en la tabla
    const displayResults = (articles) => {
        resultsTableBody.innerHTML = ''; 
        
        if (articles.length === 0) {
            loadingState.textContent = 'No se encontraron resultados.';
            loadingState.style.display = 'block';
            return;
        }
        loadingState.style.display = 'none';

        articles.forEach(article => {
            const row = document.createElement('tr');
            Object.values(article).forEach(value => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.appendChild(cell);
            });
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

        const filteredArticles = allArticles.filter(article => {
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
        
        document.querySelectorAll('#results-table tr').forEach(r => r.classList.remove('table-active'));
        row.classList.add('table-active');

        const articleData = JSON.parse(row.dataset.article);
        
        // Asumimos que la columna de imagen se llama 'imagen' en tu CSV
        const imageName = articleData.imagen || 'sin_foto.png';
        imageDisplay.src = `imagenes/${imageName}`;
        
        // Asumimos que tienes columnas 'codigo' y 'descripcion'
        itemCode.textContent = `Código: ${articleData.codigo || 'N/A'}`;
        itemInfo.textContent = articleData.descripcion || '';

        imageDisplay.onerror = () => {
            imageDisplay.src = 'imagenes/sin_foto.png';
        };
    });
});
