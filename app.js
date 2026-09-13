function entrarNoApp() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('dashboard-screen').classList.add('active');
}

const STORAGE_KEY = 'synapse-materias';
let gravadorAudio = null;
let partesAudio = [];

function abrirModalMateria() {
    document.getElementById('materia-modal').classList.add('active');
    document.getElementById('materia-titulo').focus();
}

function abrirCamera() {
    document.getElementById('foto-input').click();
}

function abrirAbaDeLink() {
    const url = `${window.location.href.split('?')[0]}?modo=link`;
    const novaAba = window.open(url, '_blank');
    if (!novaAba) abrirModalLink();
}

function abrirModalLink() {
    document.getElementById('link-modal').classList.add('active');
    document.getElementById('link-titulo').focus();
}

function fecharModalLink() {
    document.getElementById('link-modal').classList.remove('active');
}

function salvarLink(event) {
    event.preventDefault();
    const url = document.getElementById('link-url').value.trim();
    const materias = carregarMaterias();
    materias.unshift({
        tipo: 'link',
        titulo: document.getElementById('link-titulo').value.trim(),
        url,
        criadaEm: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(materias));
    renderizarMaterias();
    event.target.reset();
    fecharModalLink();
}

async function alternarGravacao() {
    if (gravadorAudio && gravadorAudio.state === 'recording') {
        gravadorAudio.stop();
        return;
    }

    if (!navigator.mediaDevices || !window.MediaRecorder) {
        alert('Seu navegador não oferece suporte à gravação de áudio.');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        partesAudio = [];
        gravadorAudio = new MediaRecorder(stream);
        gravadorAudio.addEventListener('dataavailable', (evento) => {
            if (evento.data.size > 0) partesAudio.push(evento.data);
        });
        gravadorAudio.addEventListener('stop', salvarGravacao);
        gravadorAudio.start();
        atualizarBotaoAudio(true);
    } catch (error) {
        alert('Não foi possível acessar o microfone. Verifique a permissão do navegador.');
    }
}

function atualizarBotaoAudio(gravando) {
    const botao = document.getElementById('audio-card');
    botao.classList.toggle('gravando', gravando);
    botao.querySelector('.card-label').innerHTML = gravando ? 'Parar<br>gravação' : 'Matéria<br>por Áudio';
    botao.setAttribute('aria-label', gravando ? 'Parar gravação de áudio' : 'Gravar matéria por áudio');
}

function salvarGravacao() {
    const blob = new Blob(partesAudio, { type: gravadorAudio.mimeType || 'audio/webm' });
    const leitor = new FileReader();
    leitor.onloadend = () => {
        const materias = carregarMaterias();
        materias.unshift({
            tipo: 'audio',
            titulo: 'Nova matéria em áudio',
            audio: leitor.result,
            criadaEm: new Date().toISOString()
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(materias));
        renderizarMaterias();
    };
    leitor.readAsDataURL(blob);
    gravadorAudio.stream.getTracks().forEach((faixa) => faixa.stop());
    atualizarBotaoAudio(false);
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
        const ehAudio = materia.tipo === 'audio';
        const ehLink = materia.tipo === 'link';
        const ehDocumento = materia.tipo === 'documento';
        return `
            <div class="list-item saved-item ${ehFoto ? 'photo-item' : ''}">
                <div class="li-title">${escaparHtml(materia.titulo)}</div>
                <div class="li-desc">${ehFoto ? 'Matéria por foto' : ehAudio ? 'Matéria por áudio' : ehLink ? 'Link de estudos' : ehDocumento ? 'Documento' : 'Matéria escrita'} • ${formatarData(materia.criadaEm)}</div>
                ${ehFoto ? `<img class="materia-foto" src="${materia.imagem}" alt="${escaparHtml(materia.titulo)}">` : ehAudio ? `<audio class="materia-audio" controls src="${materia.audio}"></audio>` : ehLink ? `<a class="materia-link" href="${escaparHtml(materia.url)}" target="_blank" rel="noopener">Abrir material de estudos</a>` : ehDocumento ? `<a class="materia-link" href="${materia.arquivo}" target="_blank" rel="noopener">Abrir documento</a>` : `<div class="li-content">${escaparHtml(materia.texto)}</div>`}
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
    } else if (tipo === 'documento') {
        const leitor = new FileReader();
        const documentoUrl = URL.createObjectURL(arquivo);
        window.open(documentoUrl, '_blank');
        leitor.onload = () => {
            const materias = carregarMaterias();
            materias.unshift({
                tipo: 'documento',
                titulo: arquivo.name,
                arquivo: leitor.result,
                criadaEm: new Date().toISOString()
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(materias));
            renderizarMaterias();
        };
        leitor.readAsDataURL(arquivo);
    }
    input.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    renderizarMaterias();
    if (new URLSearchParams(window.location.search).get('modo') === 'link') abrirModalLink();
});
window.addEventListener('storage', renderizarMaterias);