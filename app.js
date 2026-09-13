function entrarNoApp() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('dashboard-screen').classList.add('active');
}

const STORAGE_KEY = 'synapse-materias';

function abrirModalMateria() {
    document.getElementById('materia-modal').classList.add('active');
    document.getElementById('materia-titulo').focus();
}

function abrirCamera() {
    document.getElementById('foto-input').click();
}

function fecharModalMateria() {
    document.getElementById('materia-modal').classList.remove('active');
}

function salvarMateria(event) {
    event.preventDefault();

    const materia = {
        tipo: 'escrita',
        titulo: document.getElementById('materia-titulo').value.trim(),
        texto: document.getElementById('materia-texto').value.trim(),
        criadaEm: new Date().toISOString()
    };
    const materias = carregarMaterias();
    materias.unshift(materia);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(materias));
    renderizarMaterias();
    event.target.reset();
    fecharModalMateria();
}

function carregarMaterias() {
    try {
        const materias = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(materias) ? materias : [];
    } catch (error) {
        return [];
    }
}

function renderizarMaterias() {
    const lista = document.getElementById('materias-salvas');
    lista.innerHTML = carregarMaterias().map((materia) => {
        const ehFoto = materia.tipo === 'foto';
        return `
            <div class="list-item saved-item ${ehFoto ? 'photo-item' : ''}">
                <div class="li-title">${escaparHtml(materia.titulo)}</div>
                <div class="li-desc">${ehFoto ? 'Matéria por foto' : 'Matéria escrita'} • ${formatarData(materia.criadaEm)}</div>
                ${ehFoto ? `<img class="materia-foto" src="${materia.imagem}" alt="${escaparHtml(materia.titulo)}">` : `<div class="li-content">${escaparHtml(materia.texto)}</div>`}
            </div>
        `;
    }).join('');
}

function formatarData(data) {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(data));
}

function escaparHtml(texto) {
    return texto.replace(/[&<>'"]/g, (caractere) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[caractere]));
}

function mostrarArquivoSelecionado(input, tipo) {
    const arquivo = input.files[0];
    if (!arquivo) return;

    if (tipo === 'foto') {
        const leitor = new FileReader();
        leitor.onload = () => {
            const materias = carregarMaterias();
            materias.unshift({
                tipo: 'foto',
                titulo: `Foto: ${arquivo.name}`,
                imagem: leitor.result,
                criadaEm: new Date().toISOString()
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(materias));
            renderizarMaterias();
            alert('Foto adicionada às suas matérias.');
        };
        leitor.readAsDataURL(arquivo);
    } else {
        alert(`PDF selecionado: ${arquivo.name}`);
    }
    input.value = '';
}

document.addEventListener('DOMContentLoaded', renderizarMaterias);