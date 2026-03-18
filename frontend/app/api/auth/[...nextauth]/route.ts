import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.publisher.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;
        if (user.passwordHash) {
          const ok = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!ok) return null;
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { email?: string }).email = token.email as string;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
