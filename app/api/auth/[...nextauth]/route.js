import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credenciais',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials) {
        if (
          credentials?.email === 'estudante@universidade.edu.br' &&
          credentials?.password === '123456'
        ) {
          return {
            id: 'estudante-1',
            name: 'Estudante',
            email: 'estudante@universidade.edu.br'
          };
        }

        return null;
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
