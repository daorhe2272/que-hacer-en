import { LoginLink } from '@/components/LoginLink'

export default function AuthCodeErrorPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/hero-background.jpeg')"
      }}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-hero-gradient opacity-80"></div>
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6 text-center relative z-10">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Error de autenticación
        </h1>
        
        <p className="text-gray-600 mb-6">
          Hubo un problema al procesar tu autenticación. Por favor, intenta nuevamente.
        </p>
        
        <LoginLink className="w-full inline-flex justify-center items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors">
          Volver al inicio de sesión
        </LoginLink>
      </div>
    </div>
  )
}