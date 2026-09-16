import { hash } from 'bcryptjs';
import { getDb } from '../../../lib/db';

export async function POST(request) {
  try {
    const sql = getDb();
    const { nome, email, senha } = await request.json();
    const nomeNormalizado = nome?.trim();
    const emailNormalizado = email?.trim().toLowerCase();

    if (!nomeNormalizado || !emailNormalizado || !senha) {
      return Response.json({ message: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    if (senha.length < 6) {
      return Response.json({ message: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    const usuarios = await sql`SELECT id FROM users WHERE email = ${emailNormalizado} LIMIT 1`;
    if (usuarios.length > 0) {
      return Response.json({ message: 'Este e-mail já está cadastrado.' }, { status: 409 });
    }

    const senhaHash = await hash(senha, 12);
    await sql`
      INSERT INTO users (name, email, password)
      VALUES (${nomeNormalizado}, ${emailNormalizado}, ${senhaHash})
    `;

    return Response.json({ message: 'Conta criada com sucesso.' }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    return Response.json({ message: 'Não foi possível criar a conta.' }, { status: 500 });
  }
}
