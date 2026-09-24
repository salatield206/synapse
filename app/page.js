'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, File, FileImage, FileText, Folder, FolderPlus, Home as HomeIcon, Link as LinkIcon, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

const SENHA_FRACA_MENSAGEM = 'Senha muito fraca. Por favor, não utilize sequências fáceis de números ou letras.';

function senhaTemSequenciaFacil(senha) {
  const valor = senha.toLowerCase();
  const padroesTeclado = ['qwerty', 'asdfgh', 'zxcvbn', 'qwertz', 'azerty'];
  if (padroesTeclado.some((padrao) => valor.includes(padrao))) return true;

  for (let indice = 0; indice <= valor.length - 4; indice += 1) {
    const trecho = valor.slice(indice, indice + 4);
    const crescente = trecho.split('').every((caractere, posicao) => posicao === 0 || caractere.charCodeAt(0) === trecho.charCodeAt(posicao - 1) + 1);
    const decrescente = trecho.split('').every((caractere, posicao) => posicao === 0 || caractere.charCodeAt(0) === trecho.charCodeAt(posicao - 1) - 1);
    if (crescente || decrescente) return true;
  }

  return false;
}

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
  const [materiasAbertas, setMateriasAbertas] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Início' }]);
  const [modal, setModal] = useState(null);
  const [fotoPendente, setFotoPendente] = useState(null);
  const [documentoPendente, setDocumentoPendente] = useState(null);
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [nomeCadastro, setNomeCadastro] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');
  const [erroSenhaCadastro, setErroSenhaCadastro] = useState('');
  const [loading, setLoading] = useState(false);
  const [erroLogin, setErroLogin] = useState('');
  const [form, setForm] = useState({ titulo: '', texto: '', url: '', materia: '', folderId: '' });
  const fotoInput = useRef(null);
  const documentoInput = useRef(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setMaterias([]);
    } else if (status === 'authenticated') {
      fetch('/api/materials')
        .then((res) => res.json())
        .then((dados) => {
          if (Array.isArray(dados)) {
            const materiasMapeadas = dados.map(item => {
              const base = {
                id: item.id,
                tipo: item.tipo,
                materia: item.materia,
                titulo: item.titulo,
                parentId: item.parent_id || null,
                criadaEm: item.data || new Date().toISOString()
              };
              if (item.tipo === 'escrito') base.texto = item.conteudo;
              else if (item.tipo === 'link') base.url = item.conteudo;
              else if (item.tipo === 'foto') base.imagem = item.conteudo;
              else if (item.tipo === 'documento') base.arquivo = item.conteudo;
              return base;
            });
            setMaterias(materiasMapeadas);
          }
        })
        .catch(console.error);
    }
  }, [status]);

  useEffect(() => {
    const senhaFraca = Boolean(senhaCadastro) && senhaTemSequenciaFacil(senhaCadastro);
    setErroSenhaCadastro(senhaFraca ? SENHA_FRACA_MENSAGEM : '');
    document.body.classList.toggle('cadastro-senha-fraca', senhaFraca && !isLogin);
    return () => document.body.classList.remove('cadastro-senha-fraca');
  }, [senhaCadastro, isLogin]);

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
    if (senhaTemSequenciaFacil(senhaCadastro)) {
      setErroSenhaCadastro(SENHA_FRACA_MENSAGEM);
      return;
    }

    setErroSenhaCadastro('');
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
    const temAlteracoesNaoSalvas = modal !== null || preenchendoMateria;

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
  }

  async function salvarMaterialNoBanco(material) {
    try {
      if (material.tipo === 'foto') {
        console.log(`Tamanho da imagem Base64: ${material.imagem?.length || 0} caracteres`);
      }

      const resposta = await fetch('/api/materials', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materia: material.materia,
          tipo: material.tipo,
          titulo: material.titulo,
          conteudo: material.texto || material.url || material.arquivo || material.imagem,
          parentId: material.parentId ?? null,
          folderId: material.parentId ?? null
        })
      });
      if (!resposta.ok) {
        console.error('Não foi possível salvar o material no banco.');
        return;
      }

      const salvo = await resposta.json();
      setMaterias((atuais) => {
        const atualizadas = atuais.map((item) => item.criadaEm === material.criadaEm ? { ...item, id: salvo.id } : item);
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
    if (!fotoPendente || !form.folderId) {
      alert('Selecione uma pasta antes de salvar o material.');
      return;
    }
    setSalvandoFoto(true);

    const novoMaterial = {
      tipo: 'foto',
      materia: form.materia.trim() || 'Geral',
      titulo: form.titulo.trim() || fotoPendente.titulo,
      imagem: fotoPendente.imagem,
      parentId: form.folderId,
      criadaEm: new Date().toISOString()
    };

    try {
      const salvo = await salvarMaterialNoBanco(novoMaterial);
      if (!salvo) throw new Error('Não foi possível salvar a foto.');
      const materialSalvo = { ...novoMaterial, id: salvo.id };
      atualizarMaterias([materialSalvo, ...materias]);
      setFotoPendente(null);
      setForm({ titulo: '', texto: '', url: '', materia: '', folderId: '' });
      setModal(null);
      alert('Salvo com sucesso');
    } catch (error) {
      alert(error.message || 'Não foi possível salvar a foto.');
    } finally {
      setSalvandoFoto(false);
    }
  }

  async function salvarDocumento(event) {
    event.preventDefault();
    if (!documentoPendente || !form.folderId) {
      alert('Selecione uma pasta antes de salvar o material.');
      return;
    }

    const novoMaterial = {
      tipo: 'documento',
      materia: form.materia.trim() || 'Geral',
      titulo: form.titulo.trim() || documentoPendente.titulo,
      arquivo: documentoPendente.arquivo,
      parentId: form.folderId,
      criadaEm: new Date().toISOString()
    };
    const salvo = await salvarMaterialNoBanco(novoMaterial);
    if (!salvo) {
      alert('Não foi possível salvar o documento.');
      return;
    }

    atualizarMaterias([{ ...novoMaterial, id: salvo.id }, ...materias]);
    setDocumentoPendente(null);
    setForm({ titulo: '', texto: '', url: '', materia: '', folderId: '' });
    setModal(null);
    alert('Salvo com sucesso');
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
      return atualizadas;
    });
  }

  function salvarMateria(event) {
    event.preventDefault();
    if (!form.folderId) {
      alert('Selecione uma pasta antes de salvar o material.');
      return;
    }
    const novoMaterial = { tipo: 'escrito', materia: form.materia.trim() || 'Sem matéria', titulo: form.titulo.trim() || 'Documento sem título', texto: form.texto, parentId: form.folderId, criadaEm: new Date().toISOString() };
    
    if (form.id) {
      novoMaterial.id = form.id;
      atualizarMaterias(materias.map((item) => item.id === form.id ? { ...item, ...novoMaterial } : item));
      fetch(`/api/materials/${form.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo: novoMaterial.titulo, conteudo: novoMaterial.texto }) }).catch(console.error);
    } else {
      atualizarMaterias([novoMaterial, ...materias]);
      void salvarMaterialNoBanco(novoMaterial);
    }
    setForm({ id: null, titulo: '', texto: '', url: '', materia: '', folderId: '' });
    setModal(null);
  }

  function salvarLink(event) {
    event.preventDefault();
    if (!form.folderId) {
      alert('Selecione uma pasta antes de salvar o material.');
      return;
    }
    const novoMaterial = { tipo: 'link', materia: form.materia.trim() || 'Sem matéria', titulo: form.titulo.trim(), url: form.url.trim(), parentId: form.folderId, criadaEm: new Date().toISOString() };
    atualizarMaterias([novoMaterial, ...materias]);
    void salvarMaterialNoBanco(novoMaterial);
    setForm({ titulo: '', texto: '', url: '', materia: '', folderId: '' });
    setModal(null);
  }

  function abrirModalLink(event) {
    event.preventDefault();
    setModal('link');
  }

  async function criarSubpasta(parentId) {
    const titulo = window.prompt('Nome da nova subpasta:')?.trim();
    if (!titulo) return;

    try {
      const parentIdNormalizado = parentId ?? null;
      const resposta = await fetch('/api/materials', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'pasta', titulo, materia: titulo, parentId: parentIdNormalizado })
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(dados.message || dados.error || 'Não foi possível criar a pasta.');
      }
      const pastaMapeada = {
        id: dados.id,
        tipo: 'pasta',
        materia: dados.materia || dados.titulo,
        titulo: dados.titulo || titulo,
        parentId: dados.parent_id ?? dados.parentId ?? parentIdNormalizado,
        criadaEm: dados.data || new Date().toISOString()
      };
      setMaterias((atuais) => {
        const atualizadas = [pastaMapeada, ...atuais.filter((item) => item.id !== pastaMapeada.id)];
        return atualizadas;
      });
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      alert(error.message || 'Não foi possível criar a subpasta.');
    }
  }

  async function renomearMaterial(material) {
    const titulo = window.prompt('Novo nome:', material.titulo)?.trim();
    if (!titulo || titulo === material.titulo) return;

    try {
      const resposta = await fetch(`/api/materials/${material.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo })
      });
      if (!resposta.ok) throw new Error('Não foi possível renomear o item.');
      setMaterias((atuais) => atuais.map((item) => item.id === material.id ? { ...item, titulo, ...(item.tipo === 'pasta' ? { materia: titulo } : {}) } : item));
    } catch (error) {
      alert(error.message || 'Não foi possível renomear o item.');
    }
  }

  function abrirEdicao(material) {
    setForm({ id: material.id, titulo: material.titulo, texto: material.texto || '', url: material.url || '', materia: material.materia, folderId: material.parentId || '' });
    setModal('materia');
  }

  function navegarParaPasta(folderId) {
    setCurrentFolderId(folderId);
    if (!folderId) {
      setBreadcrumbs([{ id: null, name: 'Início' }]);
      return;
    }

    const caminho = [];
      let pasta = materias.find((item) => item.id === folderId && item.tipo === 'pasta');
    while (pasta) {
      caminho.unshift({ id: pasta.id, name: pasta.titulo });
      pasta = materias.find((item) => item.id === pasta.parentId && item.tipo === 'pasta');
    }
    setBreadcrumbs([{ id: null, name: 'Início' }, ...caminho]);
  }

  async function lerArquivo(event, tipo) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    if (tipo === 'foto') {
      setSalvandoFoto(true);
      try {
        const imagem = await comprimirImagem(arquivo);
        setFotoPendente({ titulo: arquivo.name, imagem });
        setForm({ titulo: arquivo.name, texto: '', url: '', materia: '', folderId: '' });
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
    leitor.onload = () => {
      if (tipo === 'documento') {
        setDocumentoPendente({ titulo: arquivo.name, arquivo: leitor.result });
        setForm({ titulo: arquivo.name, texto: '', url: '', materia: '', folderId: '' });
        setModal('documento');
        return;
      }

      const novoMaterial = { tipo, materia: 'Geral', titulo: arquivo.name, arquivo: leitor.result, criadaEm: new Date().toISOString() };
      atualizarMaterias([novoMaterial, ...materias]);
      void salvarMaterialNoBanco(novoMaterial);
    };
    leitor.readAsDataURL(arquivo);
    event.target.value = '';
  }

  if (status === 'loading') return <main className="screen login" />;

  if (status !== 'authenticated') return <main className="screen login"><div className="logo-container"><img src="/logo.png" alt="Synapse Logo" className="main-logo" /><p>STUDY SYSTEM</p></div>{isLogin ? <form onSubmit={acessarHub}><div className="input-group"><label>E-mail Acadêmico</label><input className="input-real" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="estudante@universidade.edu.br" required /></div><div className="input-group"><label>Senha</label><div className="password-field"><input className="input-real" type={showPassword ? 'text' : 'password'} value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="••••••••••••" required /><button type="button" className="password-toggle" onClick={() => setShowPassword((visivel) => !visivel)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button></div></div>{erroLogin && <p role="alert">{erroLogin}</p>}<button type="submit" className="btn-primary">Entrar</button><button type="button" className="auth-toggle" onClick={() => setIsLogin(false)}>Não tem uma conta? Cadastre-se</button></form> : <form onSubmit={handleRegister}><div className="input-group"><label>Nome</label><input className="input-real" type="text" value={nomeCadastro} onChange={(event) => setNomeCadastro(event.target.value)} required /></div><div className="input-group"><label>E-mail</label><input className="input-real" type="email" value={emailCadastro} onChange={(event) => setEmailCadastro(event.target.value)} required /></div><div className="input-group"><label>Senha</label><div className="password-field"><input className="input-real" type={showPassword ? 'text' : 'password'} value={senhaCadastro} onChange={(event) => setSenhaCadastro(event.target.value)} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((visivel) => !visivel)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button></div></div><button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Criando conta...' : 'Registrar'}</button><button type="button" className="auth-toggle" onClick={() => setIsLogin(true)}>Já tem uma conta? Faça login</button></form>}</main>;

  return <main className="screen dashboard">
    <header className="dash-header"><div><h2>Hipocampo Digital</h2><p>Repositório Universal Ativo</p></div><button type="button" className="btn-logout" onClick={handleLogout}>Sair</button></header>
    <section className="home-create"><h3 className="section-title">Adicionar Novo Estímulo</h3><MaterialActions setModal={setModal} fotoInput={fotoInput} documentoInput={documentoInput} abrirModalLink={abrirModalLink} /></section>
    {!materiasAbertas && <section className="home-actions"><p className="home-actions-copy">Acesse o seu acervo organizado por matérias e subpastas.</p><button type="button" className="btn-materias bg-synapse-primary text-white" onClick={() => { setMateriasAbertas(true); navegarParaPasta(null); }}><span aria-hidden="true">📁</span> Acessar Matérias Criadas</button></section>}
    {materiasAbertas && <section className="materias-explorer"><Albumes materias={materias} currentFolderId={currentFolderId} breadcrumbs={breadcrumbs} navegarParaPasta={navegarParaPasta} criarSubpasta={criarSubpasta} excluir={excluirMaterial} renomear={renomearMaterial} editar={abrirEdicao} onExit={() => { setMateriasAbertas(false); navegarParaPasta(null); }} /></section>}
    <input ref={fotoInput} className="file-input" type="file" accept="image/*" onChange={(event) => lerArquivo(event, 'foto')} />
    <input ref={documentoInput} className="file-input" type="file" accept="application/pdf,.pdf,.doc,.docx" onChange={(event) => lerArquivo(event, 'documento')} />
    {modal && <Modal tipo={modal} form={form} setForm={setForm} materias={materias} fechar={() => { if (!salvandoFoto) { setModal(null); setFotoPendente(null); setDocumentoPendente(null); } }} salvar={modal === 'link' ? salvarLink : modal === 'foto' ? salvarFoto : modal === 'documento' ? salvarDocumento : salvarMateria} foto={fotoPendente} documento={documentoPendente} salvando={salvandoFoto} />}
  </main>;
}

function EyeIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
}

function EyeOffIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c6.5 0 10 8 10 8a18.3 18.3 0 0 1-3.1 4.3" /><path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.5 8 10 8a10.2 10.2 0 0 0 4.1-.9" /></svg>;
}

function Materia({ materia, excluir, renomear, editar }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const descricao = { foto: 'Foto', link: 'Link', documento: 'Documento', escrito: 'Documento escrito' }[materia.tipo];
  const IconeArquivo = materia.tipo === 'foto' ? FileImage : materia.tipo === 'link' ? LinkIcon : materia.tipo === 'escrito' ? FileText : File;
  return <article className="drive-file-row"><div className="drive-file-main"><IconeArquivo size={20} strokeWidth={1.8} aria-hidden="true" /><div><div className="li-title">{materia.titulo}</div><div className="li-desc">{materia.materia || 'Sem matéria'} • {descricao} • {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(materia.criadaEm))}</div>{materia.tipo === 'foto' && <img className="materia-foto" src={materia.imagem} alt={materia.titulo} />}{materia.tipo === 'link' && <a className="materia-link" href={materia.url}>Abrir material de estudos</a>}{materia.tipo === 'documento' && <a className="materia-link" href={materia.arquivo} download={materia.titulo}>Baixar documento</a>}{materia.tipo === 'escrito' && <div className="li-content rich-content" dangerouslySetInnerHTML={{ __html: materia.texto }} />}</div></div><div className="drive-item-actions"><button type="button" className="drive-menu-button" onClick={(event) => { event.stopPropagation(); setMenuAberto(!menuAberto); }} aria-label={`Abrir opções de ${materia.titulo}`} title="Opções do arquivo"><MoreVertical size={18} /></button>{menuAberto && <div className="folder-popover drive-popover"><button type="button" onClick={() => { setMenuAberto(false); renomear(materia); }}><Pencil size={15} /> Renomear</button>{materia.tipo === 'escrito' && <button type="button" onClick={() => { setMenuAberto(false); editar(materia); }}><Pencil size={15} /> Editar</button>}<button type="button" onClick={() => { setMenuAberto(false); excluir(materia); }}><Trash2 size={15} /> Excluir</button></div>}</div></article>;
}

function Albumes({ materias = [], currentFolderId, breadcrumbs = [{ id: null, name: 'Início' }], navegarParaPasta, criarSubpasta, excluir, renomear, editar, onExit }) {
  const [menuAberto, setMenuAberto] = useState(null);
  const pasta = materias.find((item) => item.id === currentFolderId && item.tipo === 'pasta');
  const pastas = materias.filter((item) => item.tipo === 'pasta' && item.parentId === currentFolderId).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  const conteudos = currentFolderId === null ? [] : materias.filter((item) => item.tipo !== 'pasta' && item.parentId === currentFolderId);
  const selecionar = (folderId) => {
    console.log('Abrindo pasta:', folderId);
    navegarParaPasta(folderId);
  };
  const caminho = breadcrumbs.slice(1).map((item) => ({ id: item.id, titulo: item.name }));
  return <section className="albums-view"><nav className="drive-breadcrumbs" aria-label="Caminho de navegação"><button type="button" onClick={onExit}><HomeIcon size={16} /> Início</button><ChevronRight size={15} /><button type="button" onClick={() => selecionar(null)}>Minhas Matérias</button>{caminho.map((item) => <span className="breadcrumb-level" key={item.id}><ChevronRight size={15} /><button type="button" onClick={() => selecionar(item.id)}>{item.titulo}</button></span>)}</nav><div className="drive-heading"><div><h3>{pasta ? pasta.titulo : 'Minhas Matérias'}</h3><p>{pasta ? 'Pastas e arquivos nesta matéria.' : 'Organize as suas matérias como no Google Drive.'}</p></div><button type="button" className="drive-new-folder" onClick={() => criarSubpasta(pasta?.id || null)}><FolderPlus size={17} /> Nova pasta</button></div>{pastas.length > 0 && <div className="drive-folder-grid">{pastas.map((item) => <div className="drive-folder-card bg-white rounded-lg" key={item.id}><button type="button" className="drive-folder-main" onClick={() => selecionar(item.id)}><Folder size={22} fill="currentColor" /><span>{item.titulo}</span></button><button type="button" className="drive-menu-button" onClick={() => setMenuAberto(menuAberto === item.id ? null : item.id)} aria-label={`Abrir opções de ${item.titulo}`} title="Opções da pasta"><MoreVertical size={18} /></button>{menuAberto === item.id && <div className="folder-popover drive-popover"><button type="button" onClick={() => { setMenuAberto(null); criarSubpasta(item.id); }}><FolderPlus size={15} /> Nova Subpasta</button><button type="button" onClick={() => { setMenuAberto(null); renomear(item); }}><Pencil size={15} /> Renomear</button><button type="button" onClick={() => { setMenuAberto(null); excluir(item); }}><Trash2 size={15} /> Excluir</button></div>}</div>)}</div>}{conteudos.length > 0 && <section className="drive-files"><h4><FileText size={17} /> Arquivos</h4>{conteudos.map((material, index) => <Materia key={`${material.id || material.criadaEm}-${index}`} materia={material} excluir={excluir} renomear={renomear} editar={editar} />)}</section>}{!pastas.length && !conteudos.length && <p className="empty-state">Nenhuma pasta ou material aqui.</p>}</section>;
}

function MaterialActions({ setModal, fotoInput, documentoInput, abrirModalLink }) {
  return <div className="grid-container"><button type="button" className="card" onClick={() => setModal('materia')}><span className="card-icon">📝</span><span>Matéria<br />Escrita</span></button><button type="button" className="card" onClick={() => fotoInput.current.click()}><span className="card-icon">📷</span><span>Matéria<br />por Foto</span></button><button type="button" className="card" onClick={abrirModalLink}><span className="card-icon">🔗</span><span>Matéria<br />de Link</span></button><button type="button" className="card" onClick={() => documentoInput.current.click()}><span className="card-icon">📄</span><span>Matéria por Documento (PDF, Doc)</span></button></div>;
}

function Modal({ tipo, form, setForm, materias, fechar, salvar, foto, documento, salvando }) {
  const materiaEscrita = tipo === 'materia';
  const pastas = materias.filter((material) => material.tipo === 'pasta').sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  const atualizarPasta = (event) => {
    const val = event.target.value;
    const folderId = val ? Number(val) : '';
    const pasta = pastas.find((item) => item.id === folderId);
    setForm({ ...form, folderId, materia: pasta?.titulo || '' });
  };
  return <div className={`modal active ${materiaEscrita ? 'modal-document-editor' : ''}`}><div className="modal-content"><div className="modal-header"><h2>{tipo === 'link' ? 'Salvar link de estudos' : tipo === 'foto' ? 'Salvar foto' : tipo === 'documento' ? 'Salvar documento' : 'Novo documento'}</h2><button type="button" className="modal-close" onClick={fechar} disabled={salvando}>&times;</button></div><form onSubmit={salvar}>{tipo === 'foto' && foto && <img className="foto-preview" src={foto.imagem} alt="Pré-visualização da foto" />}{tipo === 'documento' && documento && <p className="file-pending">Arquivo selecionado: {documento.titulo}</p>}<div className="input-group"><label>Pasta de destino</label>{pastas.length === 0 ? <p className="empty-state">Crie uma pasta primeiro antes de adicionar materiais.</p> : <select className="input-real" value={form.folderId} onChange={atualizarPasta} required><option value="">Selecione uma pasta...</option>{pastas.map((pasta) => <option key={pasta.id} value={pasta.id}>{pasta.titulo}</option>)}</select>}</div>{!materiaEscrita && <div className="input-group"><label>Título</label><input className="input-real" value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} required /></div>}{tipo === 'link' ? <div className="input-group"><label>Link de estudos</label><input className="input-real" type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} required /></div> : materiaEscrita ? <RichTextEditor value={form.texto} onChange={(texto) => setForm({ ...form, texto })} /> : tipo !== 'foto' && tipo !== 'documento' && <div className="input-group"><label>Texto</label><textarea className="input-real textarea-real" value={form.texto} onChange={(event) => setForm({ ...form, texto: event.target.value })} required /></div>}<button className="btn-primary" type="submit" disabled={salvando || pastas.length === 0 || !form.folderId}>{salvando ? 'Carregando...' : materiaEscrita ? 'Salvar Documento' : 'Salvar'}</button></form></div></div>;
}