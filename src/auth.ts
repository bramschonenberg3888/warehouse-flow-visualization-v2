import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    // Auth disabled - allow all requests
    authorized() {
      return true
    },
  },
} satisfies NextAuthConfig

const nextAuth = NextAuth(authConfig)

export const handlers = nextAuth.handlers
export const auth = nextAuth.auth
export const signIn = nextAuth.signIn
export const signOut = nextAuth.signOut
