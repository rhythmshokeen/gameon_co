import NextAuth from "next-auth";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logError } from "@/lib/errors";

// Do NOT export this
const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            logError(new Error("Missing credentials"), "AUTH_AUTHORIZE");
            return null;
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email.toLowerCase(),
            },
          });

          if (!user || !user.password) {
            logError(
              new Error(`Invalid login: ${credentials.email}`),
              "AUTH_AUTHORIZE"
            );
            return null;
          }

          const valid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!valid) {
            logError(
              new Error(`Wrong password: ${credentials.email}`),
              "AUTH_AUTHORIZE"
            );
            return null;
          }

          if (user.status === "SUSPENDED") {
            logError(
              new Error(`Suspended account: ${credentials.email}`),
              "AUTH_AUTHORIZE"
            );
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image,
            onboardingCompleted: user.onboardingCompleted,
          };
        } catch (err) {
          logError(err, "AUTH_AUTHORIZE");
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.onboardingCompleted = user.onboardingCompleted;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.onboardingCompleted =
          token.onboardingCompleted as boolean;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === "development",
};

// Handler
const handler = NextAuth(authOptions);

// Required for App Router
export { handler as GET, handler as POST };