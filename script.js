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

    // ===== FUNCIÓN DE BÚSQUEDA SIMPLE, POTENTE Y CORREGIDA =====
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
            saveArticleBtn.disabled = false; saveArticleBtn.innerHTML = 'Guardar Artículo';
        } else {
            const { error } = await supabaseClient.from('articulos').insert([newArticle]);
            if (error) {
                Swal.fire('Error', 'No se pudo guardar el artículo.', 'error');
                saveArticleBtn.disabled = false; saveArticleBtn.innerHTML = 'Guardar Artículo';
            } else {
                Swal.fire('¡Éxito!', 'Artículo guardado correctamente.', 'success');
                addArticleForm.reset(); addArticleModal.hide(); performSearch();
                saveArticleBtn.disabled = false; saveArticleBtn.innerHTML = 'Guardar Artículo';
            }
        }
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
        const articleId = document.getElementById('edit-form-id').value;
        const imageFile = document.getElementById('edit-form-imagen').files[0];
        updateArticleBtn.disabled = true;
        updateArticleBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Actualizando...';
        const updatedArticle = {
            PRODUCTO: document.getElementById('edit-form-producto').value, MARCA: document.getElementById('edit-form-marca').value,
            CODIGO: document.getElementById('edit-form-codigo').value, DESCRIPCION: document.getElementById('edit-form-descripcion').value,
            APLICACION: document.getElementById('edit-form-aplicacion').value,
        };
        if (imageFile) {
            const imageUrl = await uploadImage(imageFile);
            if (imageUrl) { updatedArticle.imagen = imageUrl; }
        }
        const { error } = await supabaseClient.from('articulos').update(updatedArticle).eq('id', articleId);
        if (error) { Swal.fire('Error', 'No se pudo actualizar el artículo.', 'error');
        } else {
            Swal.fire('¡Éxito!', 'Artículo actualizado correctamente.', 'success');
            editArticleModal.hide(); performSearch();
        }
        updateArticleBtn.disabled = false; updateArticleBtn.innerHTML = 'Actualizar Cambios';
    };

    const deleteArticle = async (article) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?', text: `Vas a eliminar "${article.DESCRIPCION}".`, icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, ¡bórralo!', cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            const { error } = await supabaseClient.from('articulos').delete().eq('id', article.id);
            if (error) { Swal.fire('Error', 'No se pudo eliminar el artículo.', 'error');
            } else {
                Swal.fire('¡Eliminado!', 'El artículo ha sido eliminado.', 'success');
                imageViewerBar.classList.add('d-none'); performSearch();
            }
        }
    };
    
    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        importBtn.disabled = true;
        importBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Importando...';
        Papa.parse(file, {
            header: true, skipEmptyLines: true, delimiter: ";",
            complete: async (results) => {
                const articlesToInsert = results.data;
                if (articlesToInsert.length === 0 || !results.meta.fields.includes("CODIGO")) {
                    Swal.fire('Error de Formato', 'El archivo no es un CSV válido con punto y coma (;) o faltan columnas.', 'error');
                } else {
                    const { error } = await supabaseClient.from('articulos').insert(articlesToInsert);
                    if (error) { Swal.fire('Error de importación', `Error: ${error.message}.`, 'error');
                    } else {
                        Swal.fire('¡Importación completada!', `Se procesaron ${articlesToInsert.length} artículos.`, 'success');
                        performSearch();
                    }
                }
                csvFileInput.value = '';
                importBtn.disabled = false; importBtn.innerHTML = '📤 Importar CSV';
            }
        });
    };
    
    // --- Event Listeners ---
    resultsTableBody.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        const row = e.target.closest('tr');
        if (!row) return;
        const articleData = JSON.parse(row.dataset.article);
        if (target && target.classList.contains('btn-edit')) {
            openEditModal(articleData);
        } else if (target && target.classList.contains('btn-delete')) {
            deleteArticle(articleData);
        } else {
            document.querySelectorAll('#results-table tr').forEach(r => r.classList.remove('table-primary'));
            row.classList.add('table-primary');
            imageViewerBar.classList.remove('d-none');
            imageDisplay.src = articleData.imagen || DEFAULT_IMAGE_URL;
            itemCode.textContent = `Código: ${articleData.CODIGO || 'N/A'}`;
            itemInfo.textContent = articleData.DESCRIPCION || '';
            imageDisplay.onerror = () => { imageDisplay.src = DEFAULT_IMAGE_URL; };
        }
    });
    
    imageDisplay.addEventListener('dblclick', () => {
        if (imageDisplay.src && imageDisplay.src !== DEFAULT_IMAGE_URL) {
            modalImage.src = imageDisplay.src;
            imageModal.show();
        }
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

    performSearch();
});
