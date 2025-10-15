// --- CONFIGURACIÓN DE SUPABASE ---
// ¡¡¡REEMPLAZA ESTOS VALORES CON LOS TUYOS!!!
const SUPABASE_URL = "https://etlfxwjsklyywuopwnxw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0bGZ4d2pza2x5eXd1b3B3bnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODE3MjMsImV4cCI6MjA3NjA1NzcyM30.k8zu-CYOZK3T6Xj6qTVjlL1nS-vjhC-uWAd2JkJNlUM";

// LÍNEA CORREGIDA: Usamos 'supabase' (de la librería) para crear nuestro cliente, que llamaremos 'supabaseClient'.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// ------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const resultsTableBody = document.querySelector('#results-table');
    const tableHead = document.querySelector('thead tr');
    const imageDisplay = document.getElementById('image-display');
    const itemCode = document.getElementById('item-code');
    const itemInfo = document.getElementById('item-info');
    const loadingState = document.getElementById('loading-state');
    
    let tableHeaders = [];

    const displayResults = (articles) => {
        resultsTableBody.innerHTML = '';
        
        if (articles.length > 0 && tableHeaders.length === 0) {
            tableHead.innerHTML = '';
            tableHeaders = Object.keys(articles[0]);
            tableHeaders.filter(h => h !== 'id').forEach(header => {
                const th = document.createElement('th');
                th.textContent = header.toUpperCase();
                tableHead.appendChild(th);
            });
        }

        if (articles.length === 0) {
            loadingState.textContent = 'No se encontraron resultados.';
            loadingState.style.display = 'block';
            return;
        }
        loadingState.style.display = 'none';

        articles.forEach(article => {
            const row = document.createElement('tr');
            tableHeaders.filter(h => h !== 'id').forEach(header => {
                const cell = document.createElement('td');
                cell.textContent = article[header] || '';
                row.appendChild(cell);
            });
            row.dataset.article = JSON.stringify(article);
            resultsTableBody.appendChild(row);
        });
    };

    const performSearch = async (query) => {
        loadingState.textContent = 'Buscando...';
        loadingState.style.display = 'block';
        resultsTableBody.innerHTML = '';

        try {
            // CORREGIDO: Usamos 'supabaseClient' para hacer la consulta
            let supabaseQuery = supabaseClient.from('articulos').select();
            
            if (query) {
                const searchQuery = `%${query}%`;
                supabaseQuery = supabaseQuery.or(
                    `codigo.ilike.${searchQuery},` +
                    `descripcion.ilike.${searchQuery},` +
                    `aplicacion.ilike.${searchQuery}`
                );
            }
            
            supabaseQuery = supabaseQuery.limit(100).order('codigo', { ascending: true });

            const { data: articles, error } = await supabaseQuery;

            if (error) throw error;
            
            displayResults(articles);

        } catch (error) {
            console.error('Error al buscar en Supabase:', error);
            loadingState.textContent = 'Error al conectar con la base de datos. Revisa la política RLS.';
        }
    };

    let searchTimeout;
    searchInput.addEventListener('keyup', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    });

    resultsTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        
        document.querySelectorAll('#results-table tr').forEach(r => r.classList.remove('table-active'));
        row.classList.add('table-active');

        const articleData = JSON.parse(row.dataset.article);
        
        const imageName = articleData.imagen || 'sin_foto.png';
        imageDisplay.src = `imagenes/${imageName}`;
        itemCode.textContent = `Código: ${articleData.codigo || 'N/A'}`;
        itemInfo.textContent = articleData.descripcion || '';

        imageDisplay.onerror = () => {
            imageDisplay.src = 'imagenes/sin_foto.png';
        };
    });
    
    performSearch('');
});
