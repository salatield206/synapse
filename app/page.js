'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'synapse-materias';

async function comprimirImagem(arquivo) {
  const imagem = await createImageBitmap(arquivo);
  const canvas = document.createElement('canvas');
  const largura = Math.min(500, imagem.width);
  const altura = Math.max(1, Math.round(imagem.height * (largura / imagem.width)));
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext('2d');
  if (!contexto) {
    imagem.close();
    throw new Error('Não foi possível preparar a imagem.');
  }

  contexto.drawImage(imagem, 0, 0, largura, altura);
  const imagemComprimida = canvas.toDataURL('image/jpeg', 0.4);
  imagem.close();
  return imagemComprimida;
}

export default function Home() {
  const { status } = useSession();
  const [materias, setMaterias] = useState([]);
  const [aba, setAba] = useState('recentes');
  const [materiaSelecionada, setMateriaSelecionada] = useState(null);
  const [modal, setModal] = useState(null);
  const [gravando, setGravando] = useState(false);
  const [materiaUpload, setMateriaUpload] = useState('');
  const [fotoPendente, setFotoPendente] = useState(null);
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [nomeCadastro, setNomeCadastro] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');
  const [loading, setLoading] = useState(false);
  const [erroLogin, setErroLogin] = useState('');
  const [form, setForm] = useState({ titulo: '', texto: '', url: '', materia: '' });
  const gravador = useRef(null);
  const partesAudio = useRef([]);
  const fotoInput = useRef(null);
  const documentoInput = useRef(null);

  useEffect(() => {
    try {
      const salvas = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(salvas)) setMaterias(salvas);
    } catch { setMaterias([]); }
  }, []);

  async function acessarHub(event) {
    event.preventDefault();
    setErroLogin('');

    const resultado = await signIn('credentials', {
      email,
      password: senha,
      redirect: false
    });

    if (!resultado?.ok) setErroLogin('E-mail ou senha inválidos.');
  }

  async function handleRegister(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const resposta = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeCadastro, email: emailCadastro, senha: senhaCadastro })
      });
      const corpo = await resposta.text();
      let dados = {};
      try { dados = corpo ? JSON.parse(corpo) : {}; } catch { dados = { message: corpo }; }

      if (resposta.status === 200 || resposta.status === 201) {
        alert('Conta criada com sucesso!');
        setIsLogin(true);
        return salvo;
      }

      throw new Error(dados.message || dados.error || 'Não foi possível criar a conta.');
    } catch (error) {
      alert(error.message || 'Ocorreu um erro ao criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    const preenchendoMateria = Object.values(form).some((valor) => valor.trim());
    const temAlteracoesNaoSalvas = modal !== null || preenchendoMateria || gravando;

    if (temAlteracoesNaoSalvas && !window.confirm('Você tem alterações não salvas. Tem certeza que deseja sair?')) {
      return;
    }

    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Não foi possível encerrar a sessão:', error);
    }
  }

  function atualizarMaterias(novas) {
    setMaterias(novas);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novas));
  }

  async function salvarMaterialNoBanco(material) {
    try {
      if (material.tipo === 'foto') {
        console.log(`Tamanho da imagem Base64: ${material.imagem?.length || 0} caracteres`);
      }

      const resposta = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materia: material.materia,
          tipo: material.tipo,
          titulo: material.titulo,
          conteudo: material.texto || material.url || material.arquivo || material.imagem || material.audio
        })
      });
      if (!resposta.ok) {
        console.error('Não foi possível salvar o material no banco.');
        return;
      }

      const salvo = await resposta.json();
      setMaterias((atuais) => {
        const atualizadas = atuais.map((item) => item.criadaEm === material.criadaEm ? { ...item, id: salvo.id } : item);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizadas));
        return atualizadas;
      });
      return salvo;
    } catch (error) {
      console.error('Erro ao salvar material no banco:', error);
      return null;
    }
  }

  async function salvarFoto(event) {
    event.preventDefault();
    if (!fotoPendente) return;
    setSalvandoFoto(true);

    const novoMaterial = {
      tipo: 'foto',
      materia: form.materia.trim() || 'Geral',
      titulo: form.titulo.trim() || fotoPendente.titulo,
      imagem: fotoPendente.imagem,
      criadaEm: new Date().toISOString()
    };

    try {
      const salvo = await salvarMaterialNoBanco(novoMaterial);
      if (!salvo) throw new Error('Não foi possível salvar a foto.');
      const materialSalvo = { ...novoMaterial, id: salvo.id };
      atualizarMaterias([materialSalvo, ...materias]);
      setFotoPendente(null);
      setForm({ titulo: '', texto: '', url: '', materia: '' });
      setModal(null);
      alert('Salvo com sucesso');
    } catch (error) {
      alert(error.message || 'Não foi possível salvar a foto.');
    } finally {
      setSalvandoFoto(false);
    }
  }

  async function excluirMaterial(material) {
    if (!window.confirm('Tem certeza que deseja excluir este material permanentemente?')) return;

    if (material.id) {
      try {
        const resposta = await fetch(`/api/materials/${material.id}`, { method: 'DELETE' });
        if (!resposta.ok) {
          const dados = await resposta.json().catch(() => ({}));
          alert(dados.message || 'Não foi possível excluir o material.');
          return;
        }
      } catch (error) {
        console.error('Erro ao excluir material:', error);
        alert('Não foi possível excluir o material.');
        return;
      }
    }

    setMaterias((atuais) => {
      const atualizadas = atuais.filter((item) => item !== material && (!material.id || item.id !== material.id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizadas));
      return atualizadas;
    });
  }

  function salvarMateria(event) {
    event.preventDefault();
    const novoMaterial = { tipo: 'escrito', materia: form.materia.trim() || 'Sem matéria', titulo: form.titulo.trim(), texto: form.texto.trim(), criadaEm: new Date().toISOString() };
    atualizarMaterias([novoMaterial, ...materias]);
    void salvarMaterialNoBanco(novoMaterial);
    setForm({ titulo: '', texto: '', url: '', materia: '' });
    setModal(null);
  }

  function salvarLink(event) {
    event.preventDefault();
    const novoMaterial = { tipo: 'link', materia: form.materia.trim() || 'Sem matéria', titulo: form.titulo.trim(), url: form.url.trim(), criadaEm: new Date().toISOString() };
    atualizarMaterias([novoMaterial, ...materias]);
    void salvarMaterialNoBanco(novoMaterial);
    setForm({ titulo: '', texto: '', url: '', materia: '' });
    setModal(null);
  }

  function abrirModalLink(event) {
    event.preventDefault();
    setModal('link');
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
        leitor.onloadend = () => { const novoMaterial = { tipo: 'audio', materia: materiaUpload.trim() || 'Geral', titulo: 'Nova matéria em áudio', audio: leitor.result, criadaEm: new Date().toISOString() }; atualizarMaterias([novoMaterial, ...materias]); void salvarMaterialNoBanco(novoMaterial); };
        leitor.readAsDataURL(new Blob(partesAudio.current, { type: gravador.current.mimeType || 'audio/webm' }));
        stream.getTracks().forEach((track) => track.stop());
        setGravando(false);
      };
      gravador.current.start();
      setGravando(true);
    } catch { alert('Não foi possível acessar o microfone. Verifique a permissão do navegador.'); }
  }

  async function lerArquivo(event, tipo) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    if (tipo === 'foto') {
      setSalvandoFoto(true);
      try {
        const imagem = await comprimirImagem(arquivo);
        setFotoPendente({ titulo: arquivo.name, imagem });
        setForm({ titulo: arquivo.name, texto: '', url: '', materia: materiaUpload });
        setModal('foto');
      } catch (error) {
        alert(error.message || 'Não foi possível processar a foto.');
      } finally {
        setSalvandoFoto(false);
        event.target.value = '';
      }
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => { const novoMaterial = { tipo, materia: materiaUpload.trim() || 'Geral', titulo: arquivo.name, [tipo === 'foto' ? 'imagem' : 'arquivo']: leitor.result, criadaEm: new Date().toISOString() }; atualizarMaterias([novoMaterial, ...materias]); void salvarMaterialNoBanco(novoMaterial); };
    leitor.readAsDataURL(arquivo);
    event.target.value = '';
  }

  if (status === 'loading') return <main className="screen login" />;

  if (status !== 'authenticated') return <main className="screen login"><div className="logo-container"><div className="logo-s">S</div><h1>SYNAPSE</h1><p>SYNAPSE STUDY SYSTEM</p></div>{isLogin ? <form onSubmit={acessarHub}><div className="input-group"><label>E-mail Acadêmico</label><input className="input-real" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="estudante@universidade.edu.br" required /></div><div className="input-group"><label>Senha</label><input className="input-real" type="password" value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="••••••••••••" required /></div>{erroLogin && <p role="alert">{erroLogin}</p>}<button type="submit" className="btn-primary">Entrar</button><button type="button" className="auth-toggle" onClick={() => setIsLogin(false)}>Não tem uma conta? Cadastre-se</button></form> : <form onSubmit={handleRegister}><div className="input-group"><label>Nome</label><input className="input-real" type="text" value={nomeCadastro} onChange={(event) => setNomeCadastro(event.target.value)} required /></div><div className="input-group"><label>E-mail</label><input className="input-real" type="email" value={emailCadastro} onChange={(event) => setEmailCadastro(event.target.value)} required /></div><div className="input-group"><label>Senha</label><input className="input-real" type="password" value={senhaCadastro} onChange={(event) => setSenhaCadastro(event.target.value)} required /></div><button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Criando conta...' : 'Registrar'}</button><button type="button" className="auth-toggle" onClick={() => setIsLogin(true)}>Já tem uma conta? Faça login</button></form>}</main>;

  const nomesMaterias = [...new Set(materias.map((material) => material.materia).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  return <main className="screen dashboard">
    <header className="dash-header"><div><h2>Hipocampo Digital</h2><p>Repositório Universal Ativo</p></div><button type="button" className="btn-logout" onClick={handleLogout}>Sair</button></header>
    <nav className="dashboard-tabs" aria-label="Navegação do repositório"><button type="button" className={aba === 'recentes' ? 'tab-active' : ''} onClick={() => { setAba('recentes'); setMateriaSelecionada(null); }}>Recentes</button><button type="button" className={aba === 'materias' ? 'tab-active' : ''} onClick={() => { setAba('materias'); setMateriaSelecionada(null); }}>Minhas Matérias</button></nav>
    {aba === 'recentes' ? <>
    <h3 className="section-title">Adicionar Novo Estímulo</h3>
    <div className="upload-subject"><label htmlFor="materia-upload">Nome da Matéria</label><input id="materia-upload" className="input-real" type="text" value={materiaUpload} onChange={(event) => setMateriaUpload(event.target.value)} list="materias-existentes" placeholder="Ex: Matemática, Biologia" /><datalist id="materias-existentes">{nomesMaterias.map((nome) => <option value={nome} key={nome} />)}</datalist><p>Essa matéria será usada nos uploads de foto, áudio e documento.</p></div>
    <div className="grid-container">
      <button type="button" className="card" onClick={() => setModal('materia')}><span className="card-icon">📝</span><span>Matéria<br />Escrita</span></button>
      <button type="button" className="card" onClick={() => fotoInput.current.click()}><span className="card-icon">📷</span><span>Matéria<br />por Foto</span></button>
      <button type="button" className={`card ${gravando ? 'gravando' : ''}`} onClick={alternarGravacao}><span className="card-icon">🎧</span><span>{gravando ? <>Parar<br />gravação</> : <>Matéria<br />por Áudio</>}</span></button>
      <button type="button" className="card" onClick={abrirModalLink}><span className="card-icon">🔗</span><span>Matéria<br />de Link</span></button>
      <button type="button" className="card full-width" onClick={() => documentoInput.current.click()}><span className="card-icon">📄</span><span>Matéria por Documento (PDF, Doc)</span></button>
    </div>
    <h3 className="section-title">Revisão Recente</h3>
    {materias.map((materia, index) => <Materia key={`${materia.criadaEm}-${index}`} materia={materia} excluir={excluirMaterial} />)}
    </> : <Albumes materias={materias} selecionada={materiaSelecionada} selecionar={setMateriaSelecionada} excluir={excluirMaterial} />}
    <input ref={fotoInput} className="file-input" type="file" accept="image/*" capture="environment" onChange={(event) => lerArquivo(event, 'foto')} />
    <input ref={documentoInput} className="file-input" type="file" accept="application/pdf,.pdf,.doc,.docx" onChange={(event) => lerArquivo(event, 'documento')} />
    {modal && <Modal tipo={modal} form={form} setForm={setForm} fechar={() => { if (!salvandoFoto) { setModal(null); setFotoPendente(null); } }} salvar={modal === 'link' ? salvarLink : modal === 'foto' ? salvarFoto : salvarMateria} foto={fotoPendente} salvando={salvandoFoto} />}
  </main>;
}

function Materia({ materia, excluir }) {
  const descricao = { foto: 'Matéria por foto', audio: 'Matéria por áudio', link: 'Link de estudos', documento: 'Documento', escrito: 'Matéria escrita' }[materia.tipo];
  return <article className="list-item saved-item"><div className="material-heading"><div><div className="li-title">{materia.titulo}</div><div className="li-desc">{materia.materia || 'Sem matéria'} • {descricao} • {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(materia.criadaEm))}</div></div><button type="button" className="delete-material" onClick={() => excluir(materia)} aria-label={`Excluir ${materia.titulo}`} title="Excluir material">🗑️</button></div>{materia.tipo === 'foto' && <img className="materia-foto" src={materia.imagem} alt={materia.titulo} />}{materia.tipo === 'audio' && <audio className="materia-audio" controls src={materia.audio} />}{materia.tipo === 'link' && <a className="materia-link" href={materia.url}>Abrir material de estudos</a>}{materia.tipo === 'documento' && <a className="materia-link" href={materia.arquivo} download={materia.titulo}>Baixar documento</a>}{materia.tipo === 'escrito' && <div className="li-content">{materia.texto}</div>}</article>;
}

function Albumes({ materias, selecionada, selecionar, excluir }) {
  const grupos = materias.reduce((acumulado, material) => {
    const nome = material.materia?.trim() || 'Sem matéria';
    if (!acumulado[nome]) acumulado[nome] = [];
    acumulado[nome].push(material);
    return acumulado;
  }, {});

  if (selecionada) {
    const materiais = grupos[selecionada] || [];
    return <section className="albums-view"><button type="button" className="back-link" onClick={() => selecionar(null)}>Voltar para Minhas Matérias</button><div className="albums-heading"><span className="album-large-icon">📁</span><div><h3>{selecionada}</h3><p>{materiais.length} material(is) salvo(s)</p></div></div>{materiais.map((material, index) => <Materia key={`${material.criadaEm}-${index}`} materia={material} excluir={excluir} />)}</section>;
  }

  const nomes = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return <section className="albums-view"><div className="albums-intro"><h3 className="section-title">Minhas Matérias</h3><p>Organize seus estudos por assunto.</p></div>{nomes.length === 0 ? <p className="empty-state">Nenhuma matéria criada ainda.</p> : <div className="albums-grid">{nomes.map((nome) => <button type="button" className="album-card" key={nome} onClick={() => selecionar(nome)}><span className="album-icon">📁</span><strong>{nome}</strong><span>{grupos[nome].length} material(is)</span></button>)}</div>}</section>;
}

function Modal({ tipo, form, setForm, fechar, salvar, foto, salvando }) {
  return <div className="modal active"><div className="modal-content"><div className="modal-header"><h2>{tipo === 'link' ? 'Salvar link de estudos' : tipo === 'foto' ? 'Salvar foto' : 'Escrever matéria'}</h2><button type="button" className="modal-close" onClick={fechar} disabled={salvando}>&times;</button></div><form onSubmit={salvar}>{tipo === 'foto' && foto && <img className="foto-preview" src={foto.imagem} alt="Pré-visualização da foto" />}<div className="input-group"><label>Nome da Matéria</label><input className="input-real" value={form.materia} onChange={(event) => setForm({ ...form, materia: event.target.value })} placeholder="Ex: Matemática, Biologia" required /></div><div className="input-group"><label>Título</label><input className="input-real" value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} required /></div>{tipo === 'link' ? <div className="input-group"><label>Link de estudos</label><input className="input-real" type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} required /></div> : tipo !== 'foto' && <div className="input-group"><label>Texto</label><textarea className="input-real textarea-real" value={form.texto} onChange={(event) => setForm({ ...form, texto: event.target.value })} required /></div>}<button className="btn-primary" type="submit" disabled={salvando}>{salvando ? 'Carregando...' : 'Salvar'}</button></form></div></div>;
}