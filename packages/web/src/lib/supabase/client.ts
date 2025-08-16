import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars are missing')
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true
    }
  })
}

// Función para traducir errores de Supabase al español usando códigos de error
export function translateSupabaseError(error: { code?: string; message?: string } | null): string {
  const errorCode = error?.code

  // Mapeo de códigos de error de Supabase Auth a mensajes en español
  const errorTranslations: Record<string, string> = {
    'invalid_credentials': 'Credenciales inválidas. Verifica tu email y contraseña.',
    'email_not_confirmed': 'Tu correo electrónico no ha sido confirmado. Revisa tu bandeja de entrada.',
    'signup_disabled': 'El registro de nuevos usuarios está deshabilitado.',
    'email_address_invalid': 'La dirección de correo electrónico no es válida.',
    'password_too_short': 'La contraseña debe tener al menos 6 caracteres.',
    'weak_password': 'La contraseña es demasiado débil. Usa una combinación de letras, números y símbolos.',
    'email_already_in_use': 'Este correo electrónico ya está registrado.',
    'user_not_found': 'No se encontró una cuenta con este correo electrónico.',
    'too_many_requests': 'Demasiados intentos. Inténtalo de nuevo más tarde.',
    'session_not_found': 'Sesión no encontrada. Por favor, inicia sesión de nuevo.',
    'invalid_request': 'Solicitud inválida. Verifica los datos ingresados.',
    'email_rate_limit_exceeded': 'Has excedido el límite de correos. Inténtalo más tarde.',
    'captcha_failed': 'Verificación fallida. Inténtalo de nuevo.',
    'provider_email_needs_verification': 'Necesitas verificar tu correo con el proveedor externo.'
  }

  // Si tenemos un código de error y una traducción, usar la traducción
  if (errorCode && errorTranslations[errorCode]) {
    return errorTranslations[errorCode]
  }

  // Si no hay código o traducción, usar mensaje genérico en español
  return 'Ha ocurrido un error. Por favor, inténtalo de nuevo.'
}


