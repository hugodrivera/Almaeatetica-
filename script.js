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
                    if (header === 'imagen' && article[header]) {
                        cell.innerHTML = '✓';
                    } else if (header === 'imagen' && !article[header]) {
                        cell.innerHTML = '<span class="text-danger">✗</span>';
                    } else {
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

    const saveNewArticle = async () => {
        const imageFile = document.getElementById('form-imagen').files[0];
        saveArticleBtn.disabled = true;
        saveArticleBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';
        const imageUrl = await uploadImage(imageFile);
        const newArticle = {
            PRODUCTO: document.getElementById('form-producto').value, MARCA: document.getElementById('form-marca').value,
            CODIGO: document.getElementById('form-codigo').value, DESCRIPCION: document.getElementById('form-descripcion').value,
            APLICACION: document.getElementById('form-aplicacion').value, imagen: imageUrl,
        };
        if (!newArticle.CODIGO || !newArticle.DESCRIPCION) {
            Swal.fire('Campos incompletos', 'El CODIGO y la DESCRIPCION son obligatorios.', 'warning');
        } else {
            const { error } = await supabaseClient.from('articulos').insert([newArticle]);
            if (error) {
                Swal.fire('Error', 'No se pudo guardar el artículo.', 'error');
            } else {
                Swal.fire('¡Éxito!', 'Artículo guardado correctamente.', 'success');
                addArticleForm.reset(); addArticleModal.hide(); performSearch();
            }
        }
        saveArticleBtn.disabled = false; saveArticleBtn.innerHTML = 'Guardar Artículo';
    };

    const openEditModal = (article) => {
        document.getElementById('edit-form-id').value = article.id;
        document.getElementById('edit-form-producto').value = article.PRODUCTO || '';
        document.getElementById('edit-form-marca').value = article.MARCA || '';
        document.getElementById('edit-form-codigo').value = article.CODIGO || '';
        document.getElementById('edit-form-descripcion').value = article.DESCRIPCION || '';
        document.getElementById('edit-form-aplicacion').value = article.APLICACION || '';
        document.getElementById('edit-article-form').querySelector('#edit-form-imagen').value = '';
        editArticleModal.show();
    };

    const updateArticle = async () => {
        // ... (código sin cambios)
    };

    const deleteArticle = async (article) => {
        // ... (código sin cambios)
    };
    
    const handleFileImport = (event) => {
        // ... (código sin cambios)
    };

    // ===== FUNCIÓN DE SINCRONIZACIÓN CORREGIDA =====
    const syncImages = async () => {
        const result = await Swal.fire({
            title: '¿Sincronizar Imágenes?',
            text: 'Se actualizarán las URLs de las imágenes basado en los nombres de archivo de tu base de datos.',
            icon: 'info', showCancelButton: true, confirmButtonText: 'Sí, ¡sincronizar!', cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;

        syncImagesBtn.disabled = true;
        syncImagesBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sincronizando...';
        
        try {
            // 1. Obtener todos los archivos del bucket de una vez
            const { data: filesInBucket, error: listError } = await supabaseClient.storage.from(BUCKET_NAME).list();
            if (listError) throw listError;

            // 2. Obtener artículos que tienen un nombre de imagen pero NO es una URL
            const { data: articlesToUpdate, error: selectError } = await supabaseClient
                .from('articulos')
                .select('id, imagen')
                .not('imagen', 'is', null)       // Que tengan algo en la columna imagen
                .not('imagen', 'ilike', 'http%'); // Pero que no sea una URL

            if (selectError) throw selectError;

            if (articlesToUpdate.length === 0) {
                Swal.fire('¡Todo listo!', 'No se encontraron artículos que necesiten sincronización.', 'info');
                return;
            }

            const updates = [];
            let matchedCount = 0;
            console.log("Iniciando sincronización...");

            for (const article of articlesToUpdate) {
                if (!article.imagen) continue;

                // El nombre del archivo está directamente en la columna 'imagen'
                const expectedFileName = article.imagen.trim();
                
                // Busca el archivo que coincida en el bucket (ignorando mayúsculas/minúsculas)
                const matchedFile = filesInBucket.find(file => 
                    file.name.toLowerCase() === expectedFileName.toLowerCase()
                );
                
                if (matchedFile) {
                    // Si lo encuentra, genera la URL pública y la añade a la lista de actualizaciones
                    const { data: publicUrlData } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(matchedFile.name);
                    updates.push({ id: article.id, imagen: publicUrlData.publicUrl });
                    matchedCount++;
                } else {
                    console.log(`No se encontró el archivo de imagen: '${expectedFileName}' para el artículo con ID: ${article.id}`);
                }
            }
            
            if (updates.length > 0) {
                // Envía todas las actualizaciones a Supabase de una sola vez
                const { error: updateError } = await supabaseClient.from('articulos').upsert(updates);
                if (updateError) throw updateError;
            }

            Swal.fire('¡Sincronización Completa!', `Se actualizaron las URLs de ${matchedCount} imágenes. Revisa la consola (F12) para detalles.`, 'success');
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
        // ... (código sin cambios)
    });
    
    imageDisplay.addEventListener('dblclick', () => {
        // ... (código sin cambios)
    });

    let searchTimeout;
    searchInput.addEventListener('keyup', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(e.target.value.trim().toLowerCase());
        }, 300);
    });

    saveArticleBtn.addEventListener('click', saveNewArticle);
    updateArticleBtn.addEventListener('click', updateArticle);
    importBtn.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', handleFileImport);
    syncImagesBtn.addEventListener('click', syncImages);

    performSearch();
});
