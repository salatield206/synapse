import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getDb } from '../../../../lib/db';

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ message: 'Usuário não autenticado.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { titulo, conteudo } = await request.json();
    if (!id) return Response.json({ message: 'ID inválido.' }, { status: 400 });

    const sql = getDb();
    let query;
    if (titulo !== undefined && conteudo !== undefined) {
      query = sql`UPDATE materials SET titulo = ${titulo.trim()}, conteudo = ${conteudo} WHERE id = ${id} AND user_id = ${session.user.id} RETURNING id, user_id, materia, tipo, titulo, conteudo, parent_id, data`;
    } else if (conteudo !== undefined) {
      query = sql`UPDATE materials SET conteudo = ${conteudo} WHERE id = ${id} AND user_id = ${session.user.id} RETURNING id, user_id, materia, tipo, titulo, conteudo, parent_id, data`;
    } else if (titulo !== undefined) {
      const t = titulo.trim();
      query = sql`UPDATE materials SET titulo = ${t}, materia = CASE WHEN tipo = 'pasta' THEN ${t} ELSE materia END WHERE id = ${id} AND user_id = ${session.user.id} RETURNING id, user_id, materia, tipo, titulo, conteudo, parent_id, data`;
    } else {
      return Response.json({ message: 'Nada para atualizar.' }, { status: 400 });
    }
    
    const [atualizado] = await query;
    if (!atualizado) return Response.json({ message: 'Item não encontrado.' }, { status: 404 });
    return Response.json(atualizado);
  } catch (error) {
    console.error('Erro ao renomear material:', error);
    return Response.json({ message: 'Não foi possível renomear o item.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ message: 'Usuário não autenticado.' }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!id) return Response.json({ message: 'Material inválido.' }, { status: 400 });

    const sql = getDb();
    const apagados = await sql`
      DELETE FROM materials
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING id
    `;

    if (apagados.length === 0) {
      return Response.json({ message: 'Material não encontrado.' }, { status: 404 });
    }

    return Response.json({ message: 'Material excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir material:', error);
    return Response.json({ message: 'Não foi possível excluir o material.' }, { status: 500 });
  }
}
