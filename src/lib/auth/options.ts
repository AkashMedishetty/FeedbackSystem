import Credentials from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { Session, User } from 'next-auth';
import { connectDB } from '@/lib/db/connection';
import AdminUser from '@/lib/db/models/AdminUser';
import bcrypt from 'bcryptjs';

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) {
          return null;
        }

        try {
          await connectDB();

          const user = await AdminUser.findOne({ 
            email: creds.email.toLowerCase(),
            isActive: true 
          });

          if (!user) {
            return null;
          }

          const isPasswordValid = await verifyPassword(creds.password, user.passwordHash);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};