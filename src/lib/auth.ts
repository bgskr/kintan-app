import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const username = typeof raw?.username === "string" ? raw.username.trim() : "";
        const password = typeof raw?.password === "string" ? raw.password : "";
        if (!username || !password) return null;

        let user = await db.user.findUnique({ where: { username } });

        // Lazy seed: first admin from env when no users exist.
        if (!user) {
          const count = await db.user.count();
          const envUser = process.env.ADMIN_USERNAME;
          const envPass = process.env.ADMIN_PASSWORD;
          if (count === 0 && envUser && envPass && username === envUser) {
            const passwordHash = await bcrypt.hash(envPass, 10);
            user = await db.user.create({
              data: { username: envUser, passwordHash },
            });
          }
        }

        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.username };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
