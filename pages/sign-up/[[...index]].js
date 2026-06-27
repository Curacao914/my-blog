import { AuthPage } from '@/components/AuthPage'
import { authPageServerProps } from '@/lib/auth/authPage'

const SignUpPage = ({ redirectTo }) => (
  <AuthPage mode='sign-up' redirectTo={redirectTo} />
)

SignUpPage.layout = 'bare'

export const getServerSideProps = authPageServerProps()

export default SignUpPage
