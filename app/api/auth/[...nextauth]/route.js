import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { getDb } from '../../../../lib/db';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credenciais',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials) {
        const sql = getDb();
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const usuarios = await sql`
          SELECT id, nome, email, senha_hash
          FROM usuarios
          WHERE email = ${email}
          LIMIT 1
        `;
        const usuario = usuarios[0];
        if (!usuario || !(await compare(password, usuario.senha_hash))) return null;

        return { id: String(usuario.id), name: usuario.nome, email: usuario.email };
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/'
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
