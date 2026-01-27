import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnWorkspace =
        nextUrl.pathname.startsWith("/warehouses") ||
        nextUrl.pathname.startsWith("/elements") ||
        nextUrl.pathname.startsWith("/scenarios") ||
        nextUrl.pathname.startsWith("/visualization") ||
        nextUrl.pathname.startsWith("/wiki")

      if (isOnWorkspace) {
        if (isLoggedIn) return true
        return false
      } else if (isLoggedIn) {
        return Response.redirect(new URL("/warehouses", nextUrl))
      }
      return true
    },
  },
} satisfies NextAuthConfig

const nextAuth = NextAuth(authConfig)

export const handlers = nextAuth.handlers
export const auth = nextAuth.auth
export const signIn = nextAuth.signIn
export const signOut = nextAuth.signOut
