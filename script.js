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
    
    // 1. Cargar artículos desde Supabase y generar encabezados
    async function loadArticles() {
        const { data, error } = await supabase.from('articulos').select('*');
        if (error) {
            console.error('Error cargando artículos:', error);
            loadingState.textContent = 'Error al cargar los datos';
            return;
        }
        allArticles = data;
        if (allArticles.length > 0) {
            const headers = Object.keys(allArticles[0]).filter(key => key !== 'imagen');
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header.toUpperCase();
                tableHead.appendChild(th);
            });
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

    // 3. Evento al escribir en el campo de búsqueda
    const handleSearch = debounce((query) => {
        if (query === '') {
            resultsTableBody.innerHTML = '';
            loadingState.textContent = 'Escribe algo para buscar...';
            loadingState.style.display = '';
            // Resetear panel de imagen
            imageDisplay.src = `${SUPABASE_URL}/storage/v1/object/public/imagenes/sin_foto.png`;
            itemCode.textContent = 'Selecciona un artículo';
            itemInfo.textContent = '';
            return;
        }

        // Filtrar artículos localmente
        const filteredArticles = allArticles.filter(article => {
            return Object.values(article).some(value =>
                String(value).toLowerCase().includes(query)
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
        imageDisplay.src = `${SUPABASE_URL}/storage/v1/object/public/imagenes/${articleData.imagen || 'sin_foto.png'}`;
        itemCode.textContent = `Código: ${articleData.codigo}`;
        itemInfo.textContent = articleData.descripcion;

        imageDisplay.onerror = () => {
            imageDisplay.src = `${SUPABASE_URL}/storage/v1/object/public/imagenes/sin_foto.png`;
        };
    });

    // 5. Evento para el botón "Agregar"
    addNewBtn.addEventListener('click', () => {
        alert('Función de agregar nuevo artículo. Implementa aquí tu lógica (por ejemplo, un modal para ingresar datos).');
    });

    // Cargar los artículos al iniciar
    await loadArticles();
});
