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
    const imageDisplay = document.getElementById('image-display');
    const itemCode = document.getElementById('item-code');
    const itemInfo = document.getElementById('item-info');
    const loadingState = document.getElementById('loading-state');
    const addArticleModal = new bootstrap.Modal(document.getElementById('addArticleModal'));
    const editArticleModal = new bootstrap.Modal(document.getElementById('editArticleModal'));
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
        if (error) {
            console.error('Error subiendo imagen:', error);
            return null;
        }
        const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        return data.publicUrl;
    };

    const displayResults = (articles) => {
        resultsTableBody.innerHTML = '';
        tableHead.innerHTML = '';
        if (articles.length > 0) {
            tableHeaders = Object.keys(articles[0]);
            tableHeaders.filter(h => h !== 'id').forEach(header => {
                const th = document.createElement('th');
                th.textContent = header.toUpperCase();
                tableHead.appendChild(th);
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
            tableHeaders.filter(h => h !== 'id').forEach(header => {
                const cell = document.createElement('td');
                if (header === 'imagen' && article[header]) {
                    cell.textContent = 'Imagen en la nube';
                } else {
                    cell.textContent = article[header] || '';
                }
                row.appendChild(cell);
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
                const searchQuery = `%${query}%`;
                // CORREGIDO: Usamos "APLICACION" sin acento
                supabaseQuery = supabaseQuery.or(`CODIGO.ilike.${searchQuery},DESCRIPCION.ilike.${searchQuery},APLICACION.ilike.${searchQuery},MARCA.ilike.${searchQuery},PRODUCTO.ilike.${searchQuery}`);
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
        saveArticleBtn.textContent = 'Guardando...';
        const imageUrl = await uploadImage(imageFile);
        const newArticle = {
            PRODUCTO: document.getElementById('form-producto').value,
            MARCA: document.getElementById('form-marca').value,
            CODIGO: document.getElementById('form-codigo').value,
            DESCRIPCION: document.getElementById('form-descripcion').value,
            // CORREGIDO: Usamos "APLICACION" sin acento
            APLICACION: document.getElementById('form-aplicacion').value,
            imagen: imageUrl,
        };
        if (!newArticle.CODIGO || !newArticle.DESCRIPCION) {
            alert('El CODIGO y la DESCRIPCION son obligatorios.');
        } else {
            const { error } = await supabaseClient.from('articulos').insert([newArticle]);
            if (error) {
                console.error('Error al guardar:', error);
                alert('No se pudo guardar el artículo.');
            } else {
                alert('¡Artículo guardado!');
                addArticleForm.reset();
                addArticleModal.hide();
                performSearch();
            }
        }
        saveArticleBtn.disabled = false;
        saveArticleBtn.textContent = 'Guardar Artículo';
    };

    const openEditModal = (article) => {
        document.getElementById('edit-form-id').value = article.id;
        document.getElementById('edit-form-producto').value = article.PRODUCTO || '';
        document.getElementById('edit-form-marca').value = article.MARCA || '';
        document.getElementById('edit-form-codigo').value = article.CODIGO || '';
        document.getElementById('edit-form-descripcion').value = article.DESCRIPCION || '';
        // CORREGIDO: Usamos "APLICACION" sin acento
        document.getElementById('edit-form-aplicacion').value = article.APLICACION || '';
        document.getElementById('edit-article-form').querySelector('#edit-form-imagen').value = '';
        editArticleModal.show();
    };

    const updateArticle = async () => {
        const articleId = document.getElementById('edit-form-id').value;
        const imageFile = document.getElementById('edit-form-imagen').files[0];
        updateArticleBtn.disabled = true;
        updateArticleBtn.textContent = 'Actualizando...';
        const updatedArticle = {
            PRODUCTO: document.getElementById('edit-form-producto').value,
            MARCA: document.getElementById('edit-form-marca').value,
            CODIGO: document.getElementById('edit-form-codigo').value,
            DESCRIPCION: document.getElementById('edit-form-descripcion').value,
            // CORREGIDO: Usamos "APLICACION" sin acento
            APLICACION: document.getElementById('edit-form-aplicacion').value,
        };
        if (imageFile) {
            const imageUrl = await uploadImage(imageFile);
            if (imageUrl) {
                updatedArticle.imagen = imageUrl;
            }
        }
        const { error } = await supabaseClient.from('articulos').update(updatedArticle).eq('id', articleId);
        if (error) {
            console.error('Error al actualizar:', error);
            alert('No se pudo actualizar el artículo.');
        } else {
            alert('¡Artículo actualizado!');
            editArticleModal.hide();
            performSearch();
        }
        updateArticleBtn.disabled = false;
        updateArticleBtn.textContent = 'Actualizar Cambios';
    };

    const deleteArticle = async (article) => {
        if (confirm(`¿Estás seguro de que quieres eliminar "${article.DESCRIPCION}"?`)) {
            const { error } = await supabaseClient.from('articulos').delete().eq('id', article.id);
            if (error) {
                console.error('Error al eliminar:', error);
                alert('No se pudo eliminar el artículo.');
            } else {
                alert('¡Artículo eliminado!');
                performSearch();
            }
        }
    };
    
    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        loadingState.textContent = 'Importando datos, por favor espera...';
        loadingState.style.display = 'block';
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const articlesToInsert = results.data;
                if (articlesToInsert.length === 0) {
                    return alert("El archivo CSV está vacío o no tiene el formato correcto.");
                }
                const { error } = await supabaseClient.from('articulos').insert(articlesToInsert);
                if (error) {
                    console.error('Error en la importación masiva:', error);
                    alert(`Error al importar: ${error.message}\n\nAsegúrate de que los nombres de las columnas en el CSV coincidan EXACTAMENTE con los de la base de datos.`);
                } else {
                    alert(`¡Importación completada! Se procesaron ${articlesToInsert.length} artículos.`);
                    performSearch();
                }
                csvFileInput.value = '';
            },
            error: (err) => {
                alert("Error al leer el archivo CSV.");
                console.error(err);
                csvFileInput.value = '';
            }
        });
    };

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
            document.querySelectorAll('#results-table tr').forEach(r => r.classList.remove('table-active'));
            row.classList.add('table-active');
            imageDisplay.src = articleData.imagen || DEFAULT_IMAGE_URL;
            itemCode.textContent = `Código: ${articleData.CODIGO || 'N/A'}`;
            itemInfo.textContent = articleData.DESCRIPCION || '';
            imageDisplay.onerror = () => { imageDisplay.src = DEFAULT_IMAGE_URL; };
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

    performSearch(); // Carga inicial
});
