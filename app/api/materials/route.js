import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../auth/[...nextauth]/route';
import { getDb } from '../../../lib/db';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const userId = session.user.id;
  if (!userId) {
    return NextResponse.json({ error: 'Sessão sem identificador de usuário' }, { status: 401 });
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
      VALUES (${userId}, ${materiaNormalizada}, ${tipo}, ${tituloNormalizado}, ${conteudo || null})
      RETURNING id, user_id, materia, tipo, titulo, conteudo, data
    `;

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error('Erro ao salvar material:', error);
    return NextResponse.json({ message: 'Não foi possível salvar o material.' }, { status: 500 });
  }
}
