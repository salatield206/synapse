import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getDb } from '../../../lib/db';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ message: 'Usuário não autenticado.' }, { status: 401 });
  }

  try {
    const { materia, tipo, titulo, conteudo } = await request.json();
    const materiaNormalizada = materia?.trim() || 'Geral';
    const tituloNormalizado = titulo?.trim();

    if (!tipo || !tituloNormalizado) {
      return Response.json({ message: 'Tipo e título são obrigatórios.' }, { status: 400 });
    }

    const sql = getDb();
    const [material] = await sql`
      INSERT INTO materials (user_id, materia, tipo, titulo, conteudo)
      VALUES (${session.user.id}, ${materiaNormalizada}, ${tipo}, ${tituloNormalizado}, ${conteudo || null})
      RETURNING id, user_id, materia, tipo, titulo, conteudo, data
    `;

    return Response.json(material, { status: 201 });
  } catch (error) {
    console.error('Erro ao salvar material:', error);
    return Response.json({ message: 'Não foi possível salvar o material.' }, { status: 500 });
  }
}
