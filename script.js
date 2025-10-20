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
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    const editForm = document.getElementById('editForm');
    const deleteBtn = document.getElementById('delete-btn');

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
            headers.push('Acciones'); // Nueva columna para botones
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
            
            // Llenar la fila con los datos del artículo (excluyendo 'imagen' en la tabla)
            Object.entries(article).forEach(([key, value]) => {
                if (key !== 'imagen') {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                }
            });

            // Columna de acciones
            const actionCell = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-warning btn-sm me-2';
            editBtn.textContent = 'Editar';
            editBtn.addEventListener('click', () => openEditModal(article));
            const deleteBtnRow = document.createElement('button');
            deleteBtnRow.className = 'btn btn-danger btn-sm';
            deleteBtnRow.textContent = 'Eliminar';
            deleteBtnRow.addEventListener('click', () => deleteArticle(article.id));
            actionCell.appendChild(editBtn);
            actionCell.appendChild(deleteBtnRow);
            row.appendChild(actionCell);

            // Guardar datos en el elemento de la fila
            row.dataset.article = JSON.stringify(article);
            resultsTableBody.appendChild(row);
        });
    };

    // 3. Función de debounce para optimizar la búsqueda
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // 4. Evento al escribir en el campo de búsqueda
    const handleSearch = debounce((query) => {
        if (query === '') {
            resultsTableBody.innerHTML = '';
            loadingState.textContent = 'Escribe algo para buscar...';
            loadingState.style.display = '';
            const fallbackUrl = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/sin_foto.jpg`;
            console.log('Reseteando a fallback:', fallbackUrl);
            imageDisplay.src = fallbackUrl;
            itemCode.textContent = 'Selecciona un artículo';
            itemInfo.textContent = '';
            return;
        }

        const terms = query.split(' ').filter(term => term.length > 0);
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

    // 5. Evento al hacer clic en una fila
    resultsTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row || e.target.tagName === 'BUTTON') return; // Ignorar clics en botones
        
        document.querySelectorAll('#results-table tr').forEach(r => r.classList.remove('table-active'));
        row.classList.add('table-active');

        const articleData = JSON.parse(row.dataset.article);
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/${articleData.imagen || 'sin_foto.jpg'}`;
        console.log('Intentando cargar imagen:', imageUrl);
        imageDisplay.src = imageUrl;

        itemCode.textContent = `Código: ${articleData.codigo}`;
        itemInfo.textContent = articleData.descripcion;

        imageDisplay.onerror = (err) => {
            console.error('Error cargando imagen:', imageUrl, 'Detalles:', err);
            imageDisplay.src = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/sin_foto.jpg`;
        };
    });

    // 6. Abrir modal de edición
    function openEditModal(article) {
        document.getElementById('edit-id').value = article.id;
        document.getElementById('edit-code').value = article.codigo;
        document.getElementById('edit-description').value = article.descripcion;
        editModal.show();
    }

    // 7. Guardar cambios (editar o subir imagen)
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('edit-id').value;
        const codigo = document.getElementById('edit-code').value;
        const descripcion = document.getElementById('edit-description').value;
        const imageFile = document.getElementById('edit-image').files[0];

        let imageName = allArticles.find(a => a.id === parseInt(id)).imagen;

        if (imageFile) {
            // Sanitizar nombre para evitar caracteres problemáticos
            const fileExt = imageFile.name.split('.').pop().toLowerCase();
            imageName = `${codigo.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`; // Reemplaza caracteres especiales
            if (imageFile.size > 5 * 1024 * 1024) { // Límite de 5MB
                alert('La imagen excede el límite de 5MB. Por favor, usa una más pequeña.');
                return;
            }
            const { error: uploadError } = await supabase.storage
                .from('imagenes-productos')
                .upload(imageName, imageFile, {
                    contentType: imageFile.type,
                    upsert: true // Sobrescribe si existe
                });
            if (uploadError) {
                console.error('Error subiendo imagen:', uploadError.message);
                alert(`Error al subir la imagen: ${uploadError.message}. Verifica permisos o tamaño.`);
                return;
            }
        }

        const { error: updateError } = await supabase
            .from('articulos')
            .update({ codigo, descripcion, imagen: imageName })
            .eq('id', id);

        if (updateError) {
            console.error('Error actualizando artículo:', updateError);
            alert('Error al actualizar el artículo.');
        } else {
            alert('Artículo actualizado exitosamente.');
            editModal.hide();
            loadArticles(); // Recargar datos
        }
    });

    // 8. Eliminar artículo
    deleteBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de eliminar este artículo?')) {
            const id = document.getElementById('edit-id').value;
            const { error } = await supabase
                .from('articulos')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error eliminando artículo:', error);
                alert('Error al eliminar el artículo.');
            } else {
                alert('Artículo eliminado exitosamente.');
                editModal.hide();
                loadArticles(); // Recargar datos
            }
        }
    });

    // 9. Evento para agrandar la imagen
    imageDisplay.addEventListener('dblclick', () => {
        if (imageDisplay.src) {
            modalImage.src = imageDisplay.src;
            imageModal.show();
        }
    });

    // 10. Evento para agregar nuevo artículo (placeholder)
    addNewBtn.addEventListener('click', () => {
        alert('Función de agregar nuevo artículo. Implementa aquí tu lógica (por ejemplo, un modal similar).');
    });

    // Cargar los artículos al iniciar
    await loadArticles();
});document.addEventListener('DOMContentLoaded', async () => {
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
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    const editForm = document.getElementById('editForm');
    const deleteBtn = document.getElementById('delete-btn');

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
            headers.push('Acciones'); // Nueva columna para botones
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
            
            // Llenar la fila con los datos del artículo (excluyendo 'imagen' en la tabla)
            Object.entries(article).forEach(([key, value]) => {
                if (key !== 'imagen') {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                }
            });

            // Columna de acciones
            const actionCell = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-warning btn-sm me-2';
            editBtn.textContent = 'Editar';
            editBtn.addEventListener('click', () => openEditModal(article));
            const deleteBtnRow = document.createElement('button');
            deleteBtnRow.className = 'btn btn-danger btn-sm';
            deleteBtnRow.textContent = 'Eliminar';
            deleteBtnRow.addEventListener('click', () => deleteArticle(article.id));
            actionCell.appendChild(editBtn);
            actionCell.appendChild(deleteBtnRow);
            row.appendChild(actionCell);

            // Guardar datos en el elemento de la fila
            row.dataset.article = JSON.stringify(article);
            resultsTableBody.appendChild(row);
        });
    };

    // 3. Función de debounce para optimizar la búsqueda
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // 4. Evento al escribir en el campo de búsqueda
    const handleSearch = debounce((query) => {
        if (query === '') {
            resultsTableBody.innerHTML = '';
            loadingState.textContent = 'Escribe algo para buscar...';
            loadingState.style.display = '';
            const fallbackUrl = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/sin_foto.jpg`;
            console.log('Reseteando a fallback:', fallbackUrl);
            imageDisplay.src = fallbackUrl;
            itemCode.textContent = 'Selecciona un artículo';
            itemInfo.textContent = '';
            return;
        }

        const terms = query.split(' ').filter(term => term.length > 0);
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

    // 5. Evento al hacer clic en una fila
    resultsTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row || e.target.tagName === 'BUTTON') return; // Ignorar clics en botones
        
        document.querySelectorAll('#results-table tr').forEach(r => r.classList.remove('table-active'));
        row.classList.add('table-active');

        const articleData = JSON.parse(row.dataset.article);
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/${articleData.imagen || 'sin_foto.jpg'}`;
        console.log('Intentando cargar imagen:', imageUrl);
        imageDisplay.src = imageUrl;

        itemCode.textContent = `Código: ${articleData.codigo}`;
        itemInfo.textContent = articleData.descripcion;

        imageDisplay.onerror = (err) => {
            console.error('Error cargando imagen:', imageUrl, 'Detalles:', err);
            imageDisplay.src = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/sin_foto.jpg`;
        };
    });

    // 6. Abrir modal de edición
    function openEditModal(article) {
        document.getElementById('edit-id').value = article.id;
        document.getElementById('edit-code').value = article.codigo;
        document.getElementById('edit-description').value = article.descripcion;
        editModal.show();
    }

    // 7. Guardar cambios (editar o subir imagen)
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('edit-id').value;
        const codigo = document.getElementById('edit-code').value;
        const descripcion = document.getElementById('edit-description').value;
        const imageFile = document.getElementById('edit-image').files[0];

        let imageName = allArticles.find(a => a.id === parseInt(id)).imagen;

        if (imageFile) {
            // Sanitizar nombre para evitar caracteres problemáticos
            const fileExt = imageFile.name.split('.').pop().toLowerCase();
            imageName = `${codigo.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`; // Reemplaza caracteres especiales
            if (imageFile.size > 5 * 1024 * 1024) { // Límite de 5MB
                alert('La imagen excede el límite de 5MB. Por favor, usa una más pequeña.');
                return;
            }
            const { error: uploadError } = await supabase.storage
                .from('imagenes-productos')
                .upload(imageName, imageFile, {
                    contentType: imageFile.type,
                    upsert: true // Sobrescribe si existe
                });
            if (uploadError) {
                console.error('Error subiendo imagen:', uploadError.message);
                alert(`Error al subir la imagen: ${uploadError.message}. Verifica permisos o tamaño.`);
                return;
            }
        }

        const { error: updateError } = await supabase
            .from('articulos')
            .update({ codigo, descripcion, imagen: imageName })
            .eq('id', id);

        if (updateError) {
            console.error('Error actualizando artículo:', updateError);
            alert('Error al actualizar el artículo.');
        } else {
            alert('Artículo actualizado exitosamente.');
            editModal.hide();
            loadArticles(); // Recargar datos
        }
    });

    // 8. Eliminar artículo
    deleteBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de eliminar este artículo?')) {
            const id = document.getElementById('edit-id').value;
            const { error } = await supabase
                .from('articulos')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error eliminando artículo:', error);
                alert('Error al eliminar el artículo.');
            } else {
                alert('Artículo eliminado exitosamente.');
                editModal.hide();
                loadArticles(); // Recargar datos
            }
        }
    });

    // 9. Evento para agrandar la imagen
    imageDisplay.addEventListener('dblclick', () => {
        if (imageDisplay.src) {
            modalImage.src = imageDisplay.src;
            imageModal.show();
        }
    });

    // 10. Evento para agregar nuevo artículo (placeholder)
    addNewBtn.addEventListener('click', () => {
        alert('Función de agregar nuevo artículo. Implementa aquí tu lógica (por ejemplo, un modal similar).');
    });

    // Cargar los artículos al iniciar
    await loadArticles();
});document.addEventListener('DOMContentLoaded', async () => {
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
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    const editForm = document.getElementById('editForm');
    const deleteBtn = document.getElementById('delete-btn');

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
            headers.push('Acciones'); // Nueva columna para botones
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
            
            // Llenar la fila con los datos del artículo (excluyendo 'imagen' en la tabla)
            Object.entries(article).forEach(([key, value]) => {
                if (key !== 'imagen') {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                }
            });

            // Columna de acciones
            const actionCell = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-warning btn-sm me-2';
            editBtn.textContent = 'Editar';
            editBtn.addEventListener('click', () => openEditModal(article));
            const deleteBtnRow = document.createElement('button');
            deleteBtnRow.className = 'btn btn-danger btn-sm';
            deleteBtnRow.textContent = 'Eliminar';
            deleteBtnRow.addEventListener('click', () => deleteArticle(article.id));
            actionCell.appendChild(editBtn);
            actionCell.appendChild(deleteBtnRow);
            row.appendChild(actionCell);

            // Guardar datos en el elemento de la fila
            row.dataset.article = JSON.stringify(article);
            resultsTableBody.appendChild(row);
        });
    };

    // 3. Función de debounce para optimizar la búsqueda
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // 4. Evento al escribir en el campo de búsqueda
    const handleSearch = debounce((query) => {
        if (query === '') {
            resultsTableBody.innerHTML = '';
            loadingState.textContent = 'Escribe algo para buscar...';
            loadingState.style.display = '';
            const fallbackUrl = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/sin_foto.jpg`;
            console.log('Reseteando a fallback:', fallbackUrl);
            imageDisplay.src = fallbackUrl;
            itemCode.textContent = 'Selecciona un artículo';
            itemInfo.textContent = '';
            return;
        }

        const terms = query.split(' ').filter(term => term.length > 0);
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

    // 5. Evento al hacer clic en una fila
    resultsTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row || e.target.tagName === 'BUTTON') return; // Ignorar clics en botones
        
        document.querySelectorAll('#results-table tr').forEach(r => r.classList.remove('table-active'));
        row.classList.add('table-active');

        const articleData = JSON.parse(row.dataset.article);
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/${articleData.imagen || 'sin_foto.jpg'}`;
        console.log('Intentando cargar imagen:', imageUrl);
        imageDisplay.src = imageUrl;

        itemCode.textContent = `Código: ${articleData.codigo}`;
        itemInfo.textContent = articleData.descripcion;

        imageDisplay.onerror = (err) => {
            console.error('Error cargando imagen:', imageUrl, 'Detalles:', err);
            imageDisplay.src = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/sin_foto.jpg`;
        };
    });

    // 6. Abrir modal de edición
    function openEditModal(article) {
        document.getElementById('edit-id').value = article.id;
        document.getElementById('edit-code').value = article.codigo;
        document.getElementById('edit-description').value = article.descripcion;
        editModal.show();
    }

    // 7. Guardar cambios (editar o subir imagen)
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('edit-id').value;
        const codigo = document.getElementById('edit-code').value;
        const descripcion = document.getElementById('edit-description').value;
        const imageFile = document.getElementById('edit-image').files[0];

        let imageName = allArticles.find(a => a.id === parseInt(id)).imagen;

        if (imageFile) {
            // Sanitizar nombre para evitar caracteres problemáticos
            const fileExt = imageFile.name.split('.').pop().toLowerCase();
            imageName = `${codigo.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`; // Reemplaza caracteres especiales
            if (imageFile.size > 5 * 1024 * 1024) { // Límite de 5MB
                alert('La imagen excede el límite de 5MB. Por favor, usa una más pequeña.');
                return;
            }
            const { error: uploadError } = await supabase.storage
                .from('imagenes-productos')
                .upload(imageName, imageFile, {
                    contentType: imageFile.type,
                    upsert: true // Sobrescribe si existe
                });
            if (uploadError) {
                console.error('Error subiendo imagen:', uploadError.message);
                alert(`Error al subir la imagen: ${uploadError.message}. Verifica permisos o tamaño.`);
                return;
            }
        }

        const { error: updateError } = await supabase
            .from('articulos')
            .update({ codigo, descripcion, imagen: imageName })
            .eq('id', id);

        if (updateError) {
            console.error('Error actualizando artículo:', updateError);
            alert('Error al actualizar el artículo.');
        } else {
            alert('Artículo actualizado exitosamente.');
            editModal.hide();
            loadArticles(); // Recargar datos
        }
    });

    // 8. Eliminar artículo
    deleteBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de eliminar este artículo?')) {
            const id = document.getElementById('edit-id').value;
            const { error } = await supabase
                .from('articulos')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error eliminando artículo:', error);
                alert('Error al eliminar el artículo.');
            } else {
                alert('Artículo eliminado exitosamente.');
                editModal.hide();
                loadArticles(); // Recargar datos
            }
        }
    });

    // 9. Evento para agrandar la imagen
    imageDisplay.addEventListener('dblclick', () => {
        if (imageDisplay.src) {
            modalImage.src = imageDisplay.src;
            imageModal.show();
        }
    });

    // 10. Evento para agregar nuevo artículo (placeholder)
    addNewBtn.addEventListener('click', () => {
        alert('Función de agregar nuevo artículo. Implementa aquí tu lógica (por ejemplo, un modal similar).');
    });

    // Cargar los artículos al iniciar
    await loadArticles();
});document.addEventListener('DOMContentLoaded', async () => {
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
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    const editForm = document.getElementById('editForm');
    const deleteBtn = document.getElementById('delete-btn');

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
            headers.push('Acciones'); // Nueva columna para botones
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
            
            // Llenar la fila con los datos del artículo (excluyendo 'imagen' en la tabla)
            Object.entries(article).forEach(([key, value]) => {
                if (key !== 'imagen') {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                }
            });

            // Columna de acciones
            const actionCell = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-warning btn-sm me-2';
            editBtn.textContent = 'Editar';
            editBtn.addEventListener('click', () => openEditModal(article));
            const deleteBtnRow = document.createElement('button');
            deleteBtnRow.className = 'btn btn-danger btn-sm';
            deleteBtnRow.textContent = 'Eliminar';
            deleteBtnRow.addEventListener('click', () => deleteArticle(article.id));
            actionCell.appendChild(editBtn);
            actionCell.appendChild(deleteBtnRow);
            row.appendChild(actionCell);

            // Guardar datos en el elemento de la fila
            row.dataset.article = JSON.stringify(article);
            resultsTableBody.appendChild(row);
        });
    };

    // 3. Función de debounce para optimizar la búsqueda
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // 4. Evento al escribir en el campo de búsqueda
    const handleSearch = debounce((query) => {
        if (query === '') {
            resultsTableBody.innerHTML = '';
            loadingState.textContent = 'Escribe algo para buscar...';
            loadingState.style.display = '';
            const fallbackUrl = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/sin_foto.jpg`;
            console.log('Reseteando a fallback:', fallbackUrl);
            imageDisplay.src = fallbackUrl;
            itemCode.textContent = 'Selecciona un artículo';
            itemInfo.textContent = '';
            return;
        }

        const terms = query.split(' ').filter(term => term.length > 0);
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

    // 5. Evento al hacer clic en una fila
    resultsTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row || e.target.tagName === 'BUTTON') return; // Ignorar clics en botones
        
        document.querySelectorAll('#results-table tr').forEach(r => r.classList.remove('table-active'));
        row.classList.add('table-active');

        const articleData = JSON.parse(row.dataset.article);
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/${articleData.imagen || 'sin_foto.jpg'}`;
        console.log('Intentando cargar imagen:', imageUrl);
        imageDisplay.src = imageUrl;

        itemCode.textContent = `Código: ${articleData.codigo}`;
        itemInfo.textContent = articleData.descripcion;

        imageDisplay.onerror = (err) => {
            console.error('Error cargando imagen:', imageUrl, 'Detalles:', err);
            imageDisplay.src = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/sin_foto.jpg`;
        };
    });

    // 6. Abrir modal de edición
    function openEditModal(article) {
        document.getElementById('edit-id').value = article.id;
        document.getElementById('edit-code').value = article.codigo;
        document.getElementById('edit-description').value = article.descripcion;
        editModal.show();
    }

    // 7. Guardar cambios (editar o subir imagen)
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('edit-id').value;
        const codigo = document.getElementById('edit-code').value;
        const descripcion = document.getElementById('edit-description').value;
        const imageFile = document.getElementById('edit-image').files[0];

        let imageName = allArticles.find(a => a.id === parseInt(id)).imagen;

        if (imageFile) {
            // Sanitizar nombre para evitar caracteres problemáticos
            const fileExt = imageFile.name.split('.').pop().toLowerCase();
            imageName = `${codigo.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`; // Reemplaza caracteres especiales
            if (imageFile.size > 5 * 1024 * 1024) { // Límite de 5MB
                alert('La imagen excede el límite de 5MB. Por favor, usa una más pequeña.');
                return;
            }
            const { error: uploadError } = await supabase.storage
                .from('imagenes-productos')
                .upload(imageName, imageFile, {
                    contentType: imageFile.type,
                    upsert: true // Sobrescribe si existe
                });
            if (uploadError) {
                console.error('Error subiendo imagen:', uploadError.message);
                alert(`Error al subir la imagen: ${uploadError.message}. Verifica permisos o tamaño.`);
                return;
            }
        }

        const { error: updateError } = await supabase
            .from('articulos')
            .update({ codigo, descripcion, imagen: imageName })
            .eq('id', id);

        if (updateError) {
            console.error('Error actualizando artículo:', updateError);
            alert('Error al actualizar el artículo.');
        } else {
            alert('Artículo actualizado exitosamente.');
            editModal.hide();
            loadArticles(); // Recargar datos
        }
    });

    // 8. Eliminar artículo
    deleteBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de eliminar este artículo?')) {
            const id = document.getElementById('edit-id').value;
            const { error } = await supabase
                .from('articulos')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error eliminando artículo:', error);
                alert('Error al eliminar el artículo.');
            } else {
                alert('Artículo eliminado exitosamente.');
                editModal.hide();
                loadArticles(); // Recargar datos
            }
        }
    });

    // 9. Evento para agrandar la imagen
    imageDisplay.addEventListener('dblclick', () => {
        if (imageDisplay.src) {
            modalImage.src = imageDisplay.src;
            imageModal.show();
        }
    });

    // 10. Evento para agregar nuevo artículo (placeholder)
    addNewBtn.addEventListener('click', () => {
        alert('Función de agregar nuevo artículo. Implementa aquí tu lógica (por ejemplo, un modal similar).');
    });

    // Cargar los artículos al iniciar
    await loadArticles();
});document.addEventListener('DOMContentLoaded', async () => {
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
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    const editForm = document.getElementById('editForm');
    const deleteBtn = document.getElementById('delete-btn');

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
            headers.push('Acciones'); // Nueva columna para botones
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
            
            // Llenar la fila con los datos del artículo (excluyendo 'imagen' en la tabla)
            Object.entries(article).forEach(([key, value]) => {
                if (key !== 'imagen') {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                }
            });

            // Columna de acciones
            const actionCell = document.createElement('td');
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-warning btn-sm me-2';
            editBtn.textContent = 'Editar';
            editBtn.addEventListener('click', () => openEditModal(article));
            const deleteBtnRow = document.createElement('button');
            deleteBtnRow.className = 'btn btn-danger btn-sm';
            deleteBtnRow.textContent = 'Eliminar';
            deleteBtnRow.addEventListener('click', () => deleteArticle(article.id));
            actionCell.appendChild(editBtn);
            actionCell.appendChild(deleteBtnRow);
            row.appendChild(actionCell);

            // Guardar datos en el elemento de la fila
            row.dataset.article = JSON.stringify(article);
            resultsTableBody.appendChild(row);
        });
    };

    // 3. Función de debounce para optimizar la búsqueda
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // 4. Evento al escribir en el campo de búsqueda
    const handleSearch = debounce((query) => {
        if (query === '') {
            resultsTableBody.innerHTML = '';
            loadingState.textContent = 'Escribe algo para buscar...';
            loadingState.style.display = '';
            const fallbackUrl = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/sin_foto.jpg`;
            console.log('Reseteando a fallback:', fallbackUrl);
            imageDisplay.src = fallbackUrl;
            itemCode.textContent = 'Selecciona un artículo';
            itemInfo.textContent = '';
            return;
        }

        const terms = query.split(' ').filter(term => term.length > 0);
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

    // 5. Evento al hacer clic en una fila
    resultsTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row || e.target.tagName === 'BUTTON') return; // Ignorar clics en botones
        
        document.querySelectorAll('#results-table tr').forEach(r => r.classList.remove('table-active'));
        row.classList.add('table-active');

        const articleData = JSON.parse(row.dataset.article);
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/${articleData.imagen || 'sin_foto.jpg'}`;
        console.log('Intentando cargar imagen:', imageUrl);
        imageDisplay.src = imageUrl;

        itemCode.textContent = `Código: ${articleData.codigo}`;
        itemInfo.textContent = articleData.descripcion;

        imageDisplay.onerror = (err) => {
            console.error('Error cargando imagen:', imageUrl, 'Detalles:', err);
            imageDisplay.src = `${SUPABASE_URL}/storage/v1/object/public/imagenes-productos/sin_foto.jpg`;
        };
    });

    // 6. Abrir modal de edición
    function openEditModal(article) {
        document.getElementById('edit-id').value = article.id;
        document.getElementById('edit-code').value = article.codigo;
        document.getElementById('edit-description').value = article.descripcion;
        editModal.show();
    }

    // 7. Guardar cambios (editar o subir imagen)
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('edit-id').value;
        const codigo = document.getElementById('edit-code').value;
        const descripcion = document.getElementById('edit-description').value;
        const imageFile = document.getElementById('edit-image').files[0];

        let imageName = allArticles.find(a => a.id === parseInt(id)).imagen;

        if (imageFile) {
            // Sanitizar nombre para evitar caracteres problemáticos
            const fileExt = imageFile.name.split('.').pop().toLowerCase();
            imageName = `${codigo.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`; // Reemplaza caracteres especiales
            if (imageFile.size > 5 * 1024 * 1024) { // Límite de 5MB
                alert('La imagen excede el límite de 5MB. Por favor, usa una más pequeña.');
                return;
            }
            const { error: uploadError } = await supabase.storage
                .from('imagenes-productos')
                .upload(imageName, imageFile, {
                    contentType: imageFile.type,
                    upsert: true // Sobrescribe si existe
                });
            if (uploadError) {
                console.error('Error subiendo imagen:', uploadError.message);
                alert(`Error al subir la imagen: ${uploadError.message}. Verifica permisos o tamaño.`);
                return;
            }
        }

        const { error: updateError } = await supabase
            .from('articulos')
            .update({ codigo, descripcion, imagen: imageName })
            .eq('id', id);

        if (updateError) {
            console.error('Error actualizando artículo:', updateError);
            alert('Error al actualizar el artículo.');
        } else {
            alert('Artículo actualizado exitosamente.');
            editModal.hide();
            loadArticles(); // Recargar datos
        }
    });

    // 8. Eliminar artículo
    deleteBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de eliminar este artículo?')) {
            const id = document.getElementById('edit-id').value;
            const { error } = await supabase
                .from('articulos')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error eliminando artículo:', error);
                alert('Error al eliminar el artículo.');
            } else {
                alert('Artículo eliminado exitosamente.');
                editModal.hide();
                loadArticles(); // Recargar datos
            }
        }
    });

    // 9. Evento para agrandar la imagen
    imageDisplay.addEventListener('dblclick', () => {
        if (imageDisplay.src) {
            modalImage.src = imageDisplay.src;
            imageModal.show();
        }
    });

    // 10. Evento para agregar nuevo artículo (placeholder)
    addNewBtn.addEventListener('click', () => {
        alert('Función de agregar nuevo artículo. Implementa aquí tu lógica (por ejemplo, un modal similar).');
    });

    // Cargar los artículos al iniciar
    await loadArticles();
});
