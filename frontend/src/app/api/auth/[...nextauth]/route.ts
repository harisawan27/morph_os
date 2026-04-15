import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import * as jose from "jose";

const MAX_AGE = 30 * 24 * 60 * 60; // 30 days

/**
 * True HS256 signed JWT — next-auth's built-in encode/decode uses JWE (encrypted),
 * which Python's python-jose cannot verify. We use jose.SignJWT directly to produce
 * a standard signed HS256 token that FastAPI can verify with the same NEXTAUTH_SECRET.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge:   MAX_AGE,
  },

  jwt: {
    maxAge: MAX_AGE,

    encode: async ({ secret, token }) => {
      const key = new TextEncoder().encode(secret as string);
      return new jose.SignJWT(token as jose.JWTPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + MAX_AGE)
        .sign(key);
    },

    decode: async ({ secret, token }) => {
      if (!token) return null;
      const key = new TextEncoder().encode(secret as string);
      const { payload } = await jose.jwtVerify(token, key, { algorithms: ["HS256"] });
      return payload as ReturnType<typeof jose.decodeJwt>;
    },
  },

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.picture = (profile as { picture?: string }).picture ?? token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.image = token.picture as string | null | undefined;
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
