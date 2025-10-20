// Importa el SDK de Supabase como módulo
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

// Configuración de Supabase
const SUPABASE_URL = 'https://etlfxwjsklyywuopwnxw.supabase.co'; // Reemplaza con tu Project URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0bGZ4d2pza2x5eXd1b3B3bnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODE3MjMsImV4cCI6MjA3NjA1NzcyM30.k8zu-CYOZK3T6Xj6qTVjlL1nS-vjhC-uWAd2JkJNlUM'; // Reemplaza con tu Anon Key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let allArticles = []; // Cache para los artículos

document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('search-input');
    const resultsTableBody = document.getElementById('results-table');
    const tableHead = document.querySelector('thead tr');
    const imageDisplay = document.getElementById('image-display');
    const itemCode = document.getElementById('item-code');
    const itemInfo = document.getElementById('item-info');
    const loadingState = document.getElementById('loading-state');
    const addNewBtn = document.getElementById('add-new-btn');
    const modalImage = document.getElementById('modal-image');
    const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
    
    // 1. Cargar artículos desde Supabase con paginación para obtener todos
    async function loadArticles() {
        let offset = 0;
        const limit = 1000; // Batch size
        allArticles = [];

        while (true) {
            const { data, error } = await supabase
                .from('articulos')
                .select('*')
                .range(offset, offset + limit - 1);

            if (error) {
                console.error('Error cargando batch de artículos:', error);
                loadingState.textContent = 'Error al cargar los datos';
                return;
            }

            allArticles.push(...data);
            console.log(`Batch cargado: ${data.length} artículos (total hasta ahora: ${allArticles.length})`);

            if (data.length < limit) {
                break; // No hay más datos
            }

            offset += limit;
        }

        console.log(`Total artículos cargados: ${allArticles.length}`);

        if (allArticles.length > 0) {
            const headers = Object.keys(allArticles[0]).filter(key => key !== 'imagen');
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header.toUpperCase();
                tableHead.appendChild(th);
            });
        } else {
            loadingState.textContent = 'No se cargaron artículos. Verifica Supabase.';
        }
    }

    // 2. Función para mostrar los resultados en la tabla
    const displayResults = (articles) => {
        resultsTableBody.innerHTML = ''; // Limpiar resultados anteriores
        
        if (articles.length === 0) {
            loadingState.textContent = 'No se encontraron resultados.';
            loadingState.style.display = '';
            return;
        }

        loadingState.style.display = 'none';

        articles.forEach(article => {
            const row = document.createElement('tr');
            
            // Llenar la fila con los datos del artículo (excluyendo 'imagen')
            Object.entries(article).forEach(([key, value]) => {
                if (key !== 'imagen') {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                }
            });

            // Guardar datos en el elemento de la fila
            row.dataset.article = JSON.stringify(article);
            resultsTableBody.appendChild(row);
        });
    };

    // Función de debounce para optimizar la búsqueda
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // 3. Evento al escribir en el campo de búsqueda (búsqueda parcial con términos separados)
    const handleSearch = debounce((query) => {
        if (query === '') {
            resultsTableBody.innerHTML = '';
            loadingState.textContent = 'Escribe algo para buscar...';
            loadingState.style.display = '';
            // Resetear panel de imagen
            const fallbackUrl = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/sin_foto.jpg`;
            console.log('Reseteando a fallback:', fallbackUrl);
            imageDisplay.src = fallbackUrl;
            itemCode.textContent = 'Selecciona un artículo';
            itemInfo.textContent = '';
            return;
        }

        // Dividir el query en términos separados por espacios
        const terms = query.split(' ').filter(term => term.length > 0);

        // Filtrar artículos donde cada término aparezca en al menos una columna
        const filteredArticles = allArticles.filter(article => {
            return terms.every(term =>
                Object.values(article).some(value =>
                    String(value).toLowerCase().includes(term)
                )
            );
        });

        displayResults(filteredArticles);
    }, 300);

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        handleSearch(query);
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
        const imageName = articleData.imagen || 'sin_foto.jpg'; // Nombre desde la DB o fallback
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/${imageName}`;
        console.log('Intentando cargar imagen:', imageUrl);
        console.log('Nombre de imagen en DB:', imageName);
        imageDisplay.src = imageUrl;

        itemCode.textContent = `Código: ${articleData.codigo}`;
        itemInfo.textContent = articleData.descripcion;

        imageDisplay.onerror = (err) => {
            console.error('Error cargando imagen:', imageUrl, 'Detalles:', err);
            const fallbackUrl = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/sin_foto.jpg`;
            console.log('Cayendo a fallback:', fallbackUrl);
            imageDisplay.src = fallbackUrl;
        };
    });

    // 5. Evento para agrandar la imagen con doble click
    imageDisplay.addEventListener('dblclick', () => {
        if (imageDisplay.src) {
            modalImage.src = imageDisplay.src;
            imageModal.show();
        }
    });

    // 6. Evento para el botón "Agregar"
    addNewBtn.addEventListener('click', () => {
        alert('Función de agregar nuevo artículo. Implementa aquí tu lógica (por ejemplo, un modal para ingresar datos).');
    });

    // Cargar los artículos al iniciar
    await loadArticles();
});
