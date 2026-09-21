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
    const payload = await request.json();
    const { materia, tipo, titulo, conteudo } = payload;
    const parentId = payload.parentId ?? payload.parent_id ?? null;
    const materiaNormalizada = materia?.trim() || 'Geral';
    const tituloNormalizado = titulo?.trim();

    if (!tipo || !tituloNormalizado || !['pasta', 'escrito', 'foto', 'link', 'documento'].includes(tipo)) {
      return Response.json({ message: 'Tipo e título são obrigatórios.' }, { status: 400 });
    }

    const sql = getDb();
    if (parentId) {
      const [pastaPai] = await sql`
        SELECT id FROM materials
        WHERE id = ${parentId} AND user_id = ${userId} AND tipo = 'pasta'
      `;
      if (!pastaPai) return Response.json({ message: 'A pasta de destino não foi encontrada.' }, { status: 404 });
    }

    const [material] = await sql`
      INSERT INTO materials (user_id, materia, tipo, titulo, conteudo, parent_id)
      VALUES (${userId}, ${materiaNormalizada}, ${tipo}, ${tituloNormalizado}, ${conteudo || null}, ${parentId || null})
      RETURNING id, user_id, materia, tipo, titulo, conteudo, parent_id, data
    `;

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.log(error);
    console.error('Erro ao salvar material:', error);
    return NextResponse.json({ message: 'Não foi possível salvar o material.' }, { status: 500 });
  }
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const userId = session.user.id;
  if (!userId) {
    return NextResponse.json({ error: 'Sessão sem identificador de usuário' }, { status: 401 });
  }

  try {
    const sql = getDb();
    const materiais = await sql`
      SELECT id, user_id, materia, tipo, titulo, conteudo, parent_id, data
      FROM materials
      WHERE user_id = ${userId}
      ORDER BY data DESC
    `;
    return NextResponse.json(materiais, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    return NextResponse.json({ message: 'Não foi possível buscar os materiais.' }, { status: 500 });
  }
}
