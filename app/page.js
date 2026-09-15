'use client';

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'synapse-materias';
const AUTH_STORAGE_KEY = 'synapse-autenticado';

export default function Home() {
  const [autenticado, setAutenticado] = useState(false);
  const [materias, setMaterias] = useState([]);
  const [modal, setModal] = useState(null);
  const [gravando, setGravando] = useState(false);
  const [form, setForm] = useState({ titulo: '', texto: '', url: '' });
  const gravador = useRef(null);
  const partesAudio = useRef([]);
  const fotoInput = useRef(null);
  const documentoInput = useRef(null);

  useEffect(() => {
    try {
      setAutenticado(localStorage.getItem(AUTH_STORAGE_KEY) === 'true');
      const salvas = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(salvas)) setMaterias(salvas);
    } catch { setMaterias([]); }
  }, []);

  function acessarHub() {
    localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    setAutenticado(true);
  }

  function atualizarMaterias(novas) {
    setMaterias(novas);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novas));
  }

  function salvarMateria(event) {
    event.preventDefault();
    atualizarMaterias([{ tipo: 'escrito', titulo: form.titulo.trim(), texto: form.texto.trim(), criadaEm: new Date().toISOString() }, ...materias]);
    setForm({ titulo: '', texto: '', url: '' });
    setModal(null);
  }

  function salvarLink(event) {
    event.preventDefault();
    atualizarMaterias([{ tipo: 'link', titulo: form.titulo.trim(), url: form.url.trim(), criadaEm: new Date().toISOString() }, ...materias]);
    setForm({ titulo: '', texto: '', url: '' });
    setModal(null);
  }

  async function alternarGravacao() {
    if (gravador.current?.state === 'recording') { gravador.current.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) return alert('Seu navegador não oferece suporte à gravação de áudio.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      partesAudio.current = [];
      gravador.current = new MediaRecorder(stream);
      gravador.current.ondataavailable = (event) => { if (event.data.size) partesAudio.current.push(event.data); };
      gravador.current.onstop = () => {
        const leitor = new FileReader();
        leitor.onloadend = () => atualizarMaterias([{ tipo: 'audio', titulo: 'Nova matéria em áudio', audio: leitor.result, criadaEm: new Date().toISOString() }, ...materias]);
        leitor.readAsDataURL(new Blob(partesAudio.current, { type: gravador.current.mimeType || 'audio/webm' }));
        stream.getTracks().forEach((track) => track.stop());
        setGravando(false);
      };
      gravador.current.start();
      setGravando(true);
    } catch { alert('Não foi possível acessar o microfone. Verifique a permissão do navegador.'); }
  }

  function lerArquivo(event, tipo) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => atualizarMaterias([{ tipo, titulo: arquivo.name, [tipo === 'foto' ? 'imagem' : 'arquivo']: leitor.result, criadaEm: new Date().toISOString() }, ...materias]);
    leitor.readAsDataURL(arquivo);
    event.target.value = '';
  }

  if (!autenticado) return <main className="screen login"><div className="logo-container"><div className="logo-s">S</div><h1>SYNAPSE</h1><p>SYNAPSE STUDY SYSTEM</p></div><div className="input-group"><label>E-mail Acadêmico</label><input className="input-real" type="email" placeholder="estudante@universidade.edu.br" /></div><div className="input-group"><label>Senha</label><input className="input-real" type="password" placeholder="••••••••••••" /></div><button type="button" className="btn-primary" onClick={acessarHub}>Acessar o Hub</button></main>;

  return <main className="screen dashboard">
    <header className="dash-header"><h2>Hipocampo Digital</h2><p>Repositório Universal Ativo</p></header>
    <h3 className="section-title">Adicionar Novo Estímulo</h3>
    <div className="grid-container">
      <button type="button" className="card" onClick={() => setModal('materia')}><span className="card-icon">📝</span><span>Matéria<br />Escrita</span></button>
      <button type="button" className="card" onClick={() => fotoInput.current.click()}><span className="card-icon">📷</span><span>Matéria<br />por Foto</span></button>
      <button type="button" className={`card ${gravando ? 'gravando' : ''}`} onClick={alternarGravacao}><span className="card-icon">🎧</span><span>{gravando ? <>Parar<br />gravação</> : <>Matéria<br />por Áudio</>}</span></button>
      <button type="button" className="card" onClick={(event) => { event.preventDefault(); setModal('link'); }}><span className="card-icon">🔗</span><span>Matéria<br />de Link</span></button>
      <button type="button" className="card full-width" onClick={() => documentoInput.current.click()}><span className="card-icon">📄</span><span>Matéria por Documento (PDF, Doc)</span></button>
    </div>
    <h3 className="section-title">Revisão Recente</h3>
    {materias.map((materia, index) => <Materia key={`${materia.criadaEm}-${index}`} materia={materia} />)}
    <input ref={fotoInput} className="file-input" type="file" accept="image/*" capture="environment" onChange={(event) => lerArquivo(event, 'foto')} />
    <input ref={documentoInput} className="file-input" type="file" accept="application/pdf,.pdf,.doc,.docx" onChange={(event) => lerArquivo(event, 'documento')} />
    {modal && <Modal tipo={modal} form={form} setForm={setForm} fechar={() => setModal(null)} salvar={modal === 'link' ? salvarLink : salvarMateria} />}
  </main>;
}

function Materia({ materia }) {
  const descricao = { foto: 'Matéria por foto', audio: 'Matéria por áudio', link: 'Link de estudos', documento: 'Documento', escrito: 'Matéria escrita' }[materia.tipo];
  return <article className="list-item saved-item"><div className="li-title">{materia.titulo}</div><div className="li-desc">{descricao} • {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(materia.criadaEm))}</div>{materia.tipo === 'foto' && <img className="materia-foto" src={materia.imagem} alt={materia.titulo} />}{materia.tipo === 'audio' && <audio className="materia-audio" controls src={materia.audio} />}{materia.tipo === 'link' && <a className="materia-link" href={materia.url} target="_blank" rel="noopener">Abrir material de estudos</a>}{materia.tipo === 'documento' && <a className="materia-link" href={materia.arquivo} target="_blank" rel="noopener">Abrir documento</a>}{materia.tipo === 'escrito' && <div className="li-content">{materia.texto}</div>}</article>;
}

function Modal({ tipo, form, setForm, fechar, salvar }) {
  return <div className="modal active"><div className="modal-content"><div className="modal-header"><h2>{tipo === 'link' ? 'Salvar link de estudos' : 'Escrever matéria'}</h2><button type="button" className="modal-close" onClick={fechar}>&times;</button></div><form onSubmit={salvar}><div className="input-group"><label>Título</label><input className="input-real" value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} required /></div>{tipo === 'link' ? <div className="input-group"><label>Link de estudos</label><input className="input-real" type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} required /></div> : <div className="input-group"><label>Texto</label><textarea className="input-real textarea-real" value={form.texto} onChange={(event) => setForm({ ...form, texto: event.target.value })} required /></div>}<button className="btn-primary" type="submit">Salvar</button></form></div></div>;
}