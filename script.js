// LÍNEA DE DIAGNÓSTICO: Esto se ejecutará ANTES que cualquier otra cosa.
if (typeof supabase === 'undefined') {
    alert("ERROR CRÍTICO: La librería de Supabase no se cargó. Revisa el archivo index.html.");
}

// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = "https://etlfxwjsklyywuopwnxw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0bGZ4d2pza2x5eXd1b3B3bnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0ODE3MjMsImV4cCI6MjA3NjA1NzcyM30.k8zu-CYOZK3T6Xj6qTVjlL1nS-vjhC-uWAd2JkJNlUM";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET_NAME = 'imagenes-productos';
// ------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos
    const searchInput = document.getElementById('search-input');
    const resultsTableBody = document.querySelector('#results-table');
    const tableHead = document.querySelector('thead tr');
    const imageViewerBar = document.getElementById('image-viewer-bar');
    const imageDisplay = document.getElementById('image-display');
    const itemCode = document.getElementById('item-code');
    const itemInfo = document.getElementById('item-info');
    const loadingState = document.getElementById('loading-state');
    const addArticleModal = new bootstrap.Modal(document.getElementById('addArticleModal'));
    const editArticleModal = new bootstrap.Modal(document.getElementById('editArticleModal'));
    const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
    const modalImage = document.getElementById('modal-image');
    const addArticleForm = document.getElementById('add-article-form');
    const saveArticleBtn = document.getElementById('save-article-btn');
    const updateArticleBtn = document.getElementById('update-article-btn');
    const importBtn = document.getElementById('import-btn');
    const csvFileInput = document.getElementById('csv-file-input');
    
    let tableHeaders = [];
    
    // PASO 3: Pega la URL de tu imagen "sin_foto.png" que subiste a Supabase
    const DEFAULT_IMAGE_URL = 'https://etlfxwjsklyywuopwnxw.supabase.co/storage/v1/object/public/imagenes-productos/sin_foto.jpg';

    const uploadImage = async (file) => {
        if (!file) return null;
        const fileName = `${Date.now()}-${file.name}`;
        const { error } = await supabaseClient.storage.from(BUCKET_NAME).upload(fileName, file);
        if (error) { console.error('Error subiendo imagen:', error); return null; }
        const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        return data.publicUrl;
    };

    const displayResults = (articles) => {
        resultsTableBody.innerHTML = '';
        tableHead.innerHTML = '';
        if (articles.length > 0) {
            tableHeaders = Object.keys(articles[0]).filter(h => h !== 'fts');
            tableHeaders.forEach(header => {
                if (header !== 'id') {
                    const th = document.createElement('th');
                    th.textContent = header.toUpperCase();
                    tableHead.appendChild(th);
                }
            });
            const thActions = document.createElement('th');
            thActions.textContent = 'ACCIONES';
            tableHead.appendChild(thActions);
        }
        loadingState.style.display = articles.length === 0 ? 'block' : 'none';
        loadingState.textContent = 'No se encontraron resultados.';
        articles.forEach(article => {
            const row = document.createElement('tr');
            row.dataset.article = JSON.stringify(article);
            tableHeaders.forEach(header => {
                if (header !== 'id') {
                    const cell = document.createElement('td');
                    if (header === 'imagen' && article[header] && article[header].startsWith('http')) {
                        cell.innerHTML = '✓';
                    } else {
                        cell.innerHTML = '<span class="text-danger">✗</span>';
                    }
                    if(header !== 'imagen') {
                        cell.textContent = article[header] || '';
                    }
                    row.appendChild(cell);
                }
            });
            const actionsCell = document.createElement('td');
            actionsCell.innerHTML = `<button class="btn btn-sm btn-warning btn-edit" title="Editar">✏️</button> <button class="btn btn-sm btn-danger btn-delete" title="Eliminar">🗑️</button>`;
            row.appendChild(actionsCell);
            resultsTableBody.appendChild(row);
        });
    };

    const performSearch = async (query = '') => {
        loadingState.textContent = 'Buscando...';
        loadingState.style.display = 'block';
        try {
            let supabaseQuery = supabaseClient.from('articulos').select();
            
            const trimmedQuery = query.trim();
            if (trimmedQuery) {
                const searchTerms = trimmedQuery.split(' ').filter(term => term !== '');
                if (searchTerms.length > 0) {
                    const filters = searchTerms.map(term => {
                        const ilikeQuery = `%${term}%`;
                        return `or(PRODUCTO.ilike.${ilikeQuery},MARCA.ilike.${ilikeQuery},CODIGO.ilike.${ilikeQuery},DESCRIPCION.ilike.${ilikeQuery},EQUIVALENCIAS.ilike.${ilikeQuery},APLICACION.ilike.${ilikeQuery},INFO.ilike.${ilikeQuery})`;
                    });
                    supabaseQuery = supabaseQuery.and(filters.join(','));
                }
            }
            const { data: articles, error } = await supabaseQuery.order('id', { ascending: false }).limit(50);
            if (error) throw error;
            displayResults(articles);
        } catch (error) {
            console.error('Error al buscar:', error);
            loadingState.textContent = 'Error al conectar con la base de datos.';
        }
    };

    const saveNewArticle = async () => { /* ... (código sin cambios) ... */ };
    const openEditModal = (article) => { /* ... (código sin cambios) ... */ };
    const updateArticle = async () => { /* ... (código sin cambios) ... */ };
    const deleteArticle = async (article) => { /* ... (código sin cambios) ... */ };
    const handleFileImport = (event) => { /* ... (código sin cambios) ... */ };
    
    // --- Event Listeners ---
    // ... (código sin cambios) ...
});
