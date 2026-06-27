import { AuthPage } from '@/components/AuthPage'
import { authPageServerProps } from '@/lib/auth/authPage'

const SignInPage = ({ redirectTo }) => (
  <AuthPage mode='sign-in' redirectTo={redirectTo} />
)

SignInPage.layout = 'bare'

export const getServerSideProps = authPageServerProps()

export default SignInPage
