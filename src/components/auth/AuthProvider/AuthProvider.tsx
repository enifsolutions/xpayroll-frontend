'use client'
import SessionContext from './SessionContext'
import type { Session as NextAuthSession } from 'next-auth'
type Session = NextAuthSession | null
type AuthProviderProps = {
    session: Session | null
    children: React.ReactNode
}
const AuthProvider = (props: AuthProviderProps) => {
    const { session, children } = props
    return (
        <SessionContext.Provider value={session}>
            {children}
        </SessionContext.Provider>
    )
}
export default AuthProvider
