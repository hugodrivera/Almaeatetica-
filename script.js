// --- CONFIGURACIÓN DE SUPABASE ---
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

    // Modales de Bootstrap
    const addArticleModal = new bootstrap.Modal(document.getElementById('addArticleModal'));
    const editArticleModal = new bootstrap.Modal(document.getElementById('editArticleModal'));

    // Formularios y botones
    const addArticleForm = document.getElementById('add-article-form');
    const saveArticleBtn = document.getElementById('save-article-btn');
    const updateArticleBtn = document.getElementById('update-article-btn');

    let tableHeaders = [];

    const displayResults = (articles) => {
        resultsTableBody.innerHTML = '';
        tableHead.innerHTML = ''; // Limpiar cabeceras para reconstruir

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

        if (articles.length === 0) {
            loadingState.textContent = 'No se encontraron resultados.';
            loadingState.style.display = 'block';
            return;
        }
        loadingState.style.display = 'none';

        articles.forEach(article => {
            const row = document.createElement('tr');
            row.dataset.article = JSON.stringify(article);

            tableHeaders.filter(h => h !== 'id').forEach(header => {
                const cell = document.createElement('td');
                cell.textContent = article[header] || '';
                row.appendChild(cell);
            });

            const actionsCell = document.createElement('td');
            actionsCell.innerHTML = `
                <button class="btn btn-sm btn-warning btn-edit" title="Editar">✏️</button>
                <button class="btn btn-sm btn-danger btn-delete" title="Eliminar">🗑️</button>
            `;
            row.appendChild(actionsCell);

            resultsTableBody.appendChild(row);
        });
    };
    
    const performSearch = async (query) => {
        loadingState.textContent = 'Buscando...';
        try {
            let supabaseQuery = supabaseClient.from('articulos').select();
            if (query) {
                const searchQuery = `%${query}%`;
                supabaseQuery = supabaseQuery.or(`CODIGO.ilike.${searchQuery},DESCRIPCION.ilike.${searchQuery},APLICACIÓN.ilike.${searchQuery},MARCA.ilike.${searchQuery},PRODUCTO.ilike.${searchQuery}`);
            }
            supabaseQuery = supabaseQuery.limit(100).order('id', { ascending: false });
            const { data: articles, error } = await supabaseQuery;
            if (error) throw error;
            displayResults(articles);
        } catch (error) {
            console.error('Error al buscar:', error);
            loadingState.textContent = 'Error al conectar.';
        }
    };

    const saveNewArticle = async () => {
        const newArticle = {
            PRODUCTO: document.getElementById('form-producto').value,
            MARCA: document.getElementById('form-marca').value,
            CODIGO: document.getElementById('form-codigo').value,
            DESCRIPCION: document.getElementById('form-descripcion').value,
            APLICACIÓN: document.getElementById('form-aplicacion').value,
            imagen: document.getElementById('form-imagen').value,
        };
        if (!newArticle.CODIGO || !newArticle.DESCRIPCION) {
            return alert('El CODIGO y la DESCRIPCION son obligatorios.');
        }
        const { error } = await supabaseClient.from('articulos').insert([newArticle]);
        if (error) {
            console.error('Error al guardar:', error);
            alert('No se pudo guardar el artículo.');
        } else {
            alert('¡Artículo guardado!');
            addArticleForm.reset();
            addArticleModal.hide();
            performSearch('');
        }
    };
    
    const openEditModal = (article) => {
        document.getElementById('edit-form-id').value = article.id;
        document.getElementById('edit-form-producto').value = article.PRODUCTO || '';
        document.getElementById('edit-form-marca').value = article.MARCA || '';
        document.getElementById('edit-form-codigo').value = article.CODIGO || '';
        document.getElementById('edit-form-descripcion').value = article.DESCRIPCION || '';
        document.getElementById('edit-form-aplicacion').value = article.APLICACIÓN || '';
        document.getElementById('edit-form-imagen').value = article.imagen || '';
        editArticleModal.show();
    };

    const updateArticle = async () => {
        const articleId = document.getElementById('edit-form-id').value;
        const updatedArticle = {
            PRODUCTO: document.getElementById('edit-form-producto').value,
            MARCA: document.getElementById('edit-form-marca').value,
            CODIGO: document.getElementById('edit-form-codigo').value,
            DESCRIPCION: document.getElementById('edit-form-descripcion').value,
            APLICACIÓN: document.getElementById('edit-form-aplicacion').value,
            imagen: document.getElementById('edit-form-imagen').value,
        };
        const { error } = await supabaseClient.from('articulos').update(updatedArticle).eq('id', articleId);
        if (error) {
            console.error('Error al actualizar:', error);
            alert('No se pudo actualizar el artículo.');
        } else {
            alert('¡Artículo actualizado!');
            editArticleModal.hide();
            performSearch('');
        }
    };

    // ===== NUEVA FUNCIÓN PARA BORRAR ARTÍCULO =====
    const deleteArticle = async (article) => {
        // Ventana de confirmación
        const isConfirmed = confirm(`¿Estás seguro de que quieres eliminar "${article.DESCRIPCION}"?`);

        if (isConfirmed) {
            const { error } = await supabaseClient
                .from('articulos')
                .delete()
                .eq('id', article.id); // Condición: borrar solo la fila con este ID

            if (error) {
                console.error('Error al eliminar:', error);
                alert('No se pudo eliminar el artículo.');
            } else {
                alert('¡Artículo eliminado!');
                performSearch(''); // Recargar la tabla
            }
        }
    };

    // --- Delegación de Eventos ---
    resultsTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;

        const articleData = JSON.parse(row.dataset.article);

        // Si se hizo clic en el botón de editar
        if (e.target.classList.contains('btn-edit')) {
            openEditModal(articleData);
            return;
        }

        // Si se hizo clic en el botón de borrar
        if (e.target.classList.contains('btn-delete')) {
            deleteArticle(articleData); // Llamar a la nueva función de borrado
            return;
        }

        // Lógica para seleccionar fila y mostrar imagen
        document.querySelectorAll('#results-table tr').forEach(r => r.classList.remove('table-active'));
        row.classList.add('table-active');
        imageDisplay.src = `imagenes/${articleData.imagen || 'sin_foto.png'}`;
        itemCode.textContent = `Código: ${articleData.CODIGO || 'N/A'}`;
        itemInfo.textContent = articleData.DESCRIPCION || '';
    });

    let searchTimeout;
    searchInput.addEventListener('keyup', (e) => {
        clearTimeout(searchTimeout);
        performSearch(e.target.value.trim());
    });
    
    saveArticleBtn.addEventListener('click', saveNewArticle);
    updateArticleBtn.addEventListener('click', updateArticle);
    
    performSearch('');
});
