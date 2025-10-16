// --- CONFIGURACIÓN DE SUPABASE ---
// PASO 1: Pega tu URL de Supabase entre las comillas
const SUPABASE_URL = "https://etlfxwjsklyywuopwnxw.supabase.co";

// PASO 2: Pega tu Key "anon public" de Supabase entre las comillas
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
    const syncImagesBtn = document.getElementById('sync-images-btn');

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
                    } else if (header === 'imagen' && article[header] && article[header].toLowerCase() !== 'none.jpg') {
                        cell.innerHTML = '<span class="text-warning">✗ (Sincronizar)</span>';
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
            if (query) {
                const formattedQuery = query.trim().split(' ').filter(term => term).map(term => term + ':*').join(' & ');
                supabaseQuery = supabaseQuery.textSearch('fts', formattedQuery);
            }
            const { data: articles, error } = await supabaseQuery.order('id', { ascending: false }).limit(50);
            if (error) throw error;
            displayResults(articles);
        } catch (error) {
            console.error('Error al buscar:', error);
            loadingState.textContent = 'Error al conectar.';
        }
    };

    const saveNewArticle = async () => { /* ... (sin cambios) ... */ };
    const openEditModal = (article) => { /* ... (sin cambios) ... */ };
    const updateArticle = async () => { /* ... (sin cambios) ... */ };
    const deleteArticle = async (article) => { /* ... (sin cambios) ... */ };
    const handleFileImport = (event) => { /* ... (sin cambios) ... */ };
    
    // ===== FUNCIÓN DE SINCRONIZACIÓN CORREGIDA Y FINAL =====
    const syncImages = async () => {
        const result = await Swal.fire({
            title: '¿Sincronizar Imágenes?', text: 'Se actualizarán las URLs de las imágenes. Esto puede tardar unos minutos.',
            icon: 'info', showCancelButton: true, confirmButtonText: 'Sí, ¡sincronizar!', cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;

        syncImagesBtn.disabled = true;
        syncImagesBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sincronizando...';
        
        try {
            const { data: filesInBucket, error: listError } = await supabaseClient.storage.from(BUCKET_NAME).list();
            if (listError) throw listError;
            
            const fileMap = new Map(filesInBucket.map(file => [file.name.toLowerCase(), file.name]));

            const { data: articlesToUpdate, error: selectError } = await supabaseClient
                .from('articulos').select('id, imagen').not('imagen', 'is', null).not('imagen', 'ilike', 'http%');

            if (selectError) throw selectError;

            const articlesToProcess = articlesToUpdate.filter(a => a.imagen && a.imagen.toLowerCase() !== 'none.jpg');

            if (articlesToProcess.length === 0) {
                Swal.fire('¡Todo listo!', 'No se encontraron artículos que necesiten sincronización.', 'info');
                return;
            }

            const updates = [];
            const notFound = [];
            let matchedCount = 0;
            console.log("Iniciando sincronización...");

            for (const article of articlesToProcess) {
                const imageNameInDb = article.imagen.trim().toLowerCase();
                
                if (fileMap.has(imageNameInDb)) {
                    const realFileName = fileMap.get(imageNameInDb);
                    const { data: publicUrlData } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(realFileName);
                    updates.push({ id: article.id, imagen: publicUrlData.publicUrl });
                    matchedCount++;
                } else {
                    notFound.push(article.imagen);
                }
            }
            
            if (updates.length > 0) {
                const { error: updateError } = await supabaseClient.from('articulos').upsert(updates);
                if (updateError) throw updateError;
            }

            let message = `¡Sincronización Completa! Se actualizaron ${matchedCount} URLs de imágenes.`;
            if (notFound.length > 0) {
                message += ` No se encontraron ${notFound.length} archivos. Revisa la consola (F12) para ver la lista.`;
                console.log("Archivos no encontrados en Supabase Storage:", notFound);
            }

            Swal.fire('Proceso Terminado', message, 'success');
            performSearch();

        } catch (error) {
            Swal.fire('Error', 'Ocurrió un error durante la sincronización.', 'error');
        } finally {
            syncImagesBtn.disabled = false;
            syncImagesBtn.innerHTML = '🔄 Sincronizar Imágenes';
        }
    };

    // --- Event Listeners ---
    resultsTableBody.addEventListener('click', (e) => {
        // ... (sin cambios) ...
    });
    
    imageDisplay.addEventListener('dblclick', () => {
        // ... (sin cambios) ...
    });

    let searchTimeout;
    searchInput.addEventListener('keyup', (e) => {
        // ... (sin cambios) ...
    });

    saveArticleBtn.addEventListener('click', saveNewArticle);
    updateArticleBtn.addEventListener('click', updateArticle);
    importBtn.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', handleFileImport);
    syncImagesBtn.addEventListener('click', syncImages);

    performSearch();
});
