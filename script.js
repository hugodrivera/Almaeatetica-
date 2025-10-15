// --- CONFIGURACIÓN DE SUPABASE ---
// ¡¡¡REEMPLAZA ESTOS VALORES CON LOS TUYOS!!!
const SUPABASE_URL = "https://etlfxwjsklyywuopwnxw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0bGZ4d2pza2x5eXd1b3B3bnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODE3MjMsImV4cCI6MjA3NjA1NzcyM30.k8zu-CYOZK3T6Xj6qTVjlL1nS-vjhC-uWAd2JkJNlUM";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// ------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del HTML
    const searchInput = document.getElementById('search-input');
    const resultsTableBody = document.querySelector('#results-table');
    const tableHead = document.querySelector('thead tr');
    const imageDisplay = document.getElementById('image-display');
    const itemCode = document.getElementById('item-code');
    const itemInfo = document.getElementById('item-info');
    const loadingState = document.getElementById('loading-state');
    
    // Referencias a los elementos de la ventana modal
    const saveArticleBtn = document.getElementById('save-article-btn');
    const addArticleForm = document.getElementById('add-article-form');
    // Asegúrate de que el index.html tenga el script de Bootstrap JS para que esto funcione
    const addArticleModal = new bootstrap.Modal(document.getElementById('addArticleModal'));

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
            let supabaseQuery = supabaseClient.from('articulos').select();
            
            // CORREGIDO: Usamos los nombres de columna de tu tabla
            if (query) {
                const searchQuery = `%${query}%`;
                supabaseQuery = supabaseQuery.or(
                    `CODIGO.ilike.${searchQuery},` +
                    `DESCRIPCION.ilike.${searchQuery},` +
                    `APLICACION.ilike.${searchQuery},` +
                    `MARCA.ilike.${searchQuery},` +
                    `PRODUCTO.ilike.${searchQuery}`
                );
            }
            
            // CORREGIDO: Ordenamos por la columna 'id' que siempre existe
            supabaseQuery = supabaseQuery.limit(100).order('id', { ascending: false });

            const { data: articles, error } = await supabaseQuery;
            if (error) throw error;
            displayResults(articles);
        } catch (error) {
            console.error('Error al buscar en Supabase:', error);
            loadingState.textContent = 'Error al conectar. Revisa la política RLS.';
        }
    };

    const saveNewArticle = async () => {
        // CORREGIDO: Recolecta datos del formulario y los asigna a las columnas correctas
        const newArticle = {
            CODIGO: document.getElementById('form-codigo').value,
            DESCRIPCION: document.getElementById('form-descripcion').value,
            APLICACION: document.getElementById('form-aplicacion').value,
            // Asumimos que no tienes stock y precio en el form, si los tienes, descomenta
            // stock: document.getElementById('form-stock').value,
            // precio: document.getElementById('form-precio').value,
            imagen: document.getElementById('form-imagen').value
            // Agrega aquí las demás columnas si tienes campos en el formulario para ellas
        };

        if (!newArticle.CODIGO || !newArticle.DESCRIPCION) {
            alert('El código y la descripción son obligatorios.');
            return;
        }

        const { data, error } = await supabaseClient
            .from('articulos')
            .insert([newArticle]);

        if (error) {
            console.error('Error al guardar:', error);
            alert('No se pudo guardar el artículo. Revisa la consola.');
        } else {
            alert('¡Artículo guardado con éxito!');
            addArticleForm.reset();
            addArticleModal.hide();
            performSearch('');
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
        
        // CORREGIDO: Usamos los nombres correctos para mostrar los detalles
        const imageName = articleData.imagen || 'sin_foto.png';
        imageDisplay.src = `imagenes/${imageName}`;
        itemCode.textContent = `Código: ${articleData.CODIGO || 'N/A'}`;
        itemInfo.textContent = articleData.DESCRIPCION || '';
        imageDisplay.onerror = () => { imageDisplay.src = 'imagenes/sin_foto.png'; };
    });
    
    saveArticleBtn.addEventListener('click', saveNewArticle);
    
    performSearch('');
});
