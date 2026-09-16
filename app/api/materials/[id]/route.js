import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getDb } from '../../../../lib/db';

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
