import { useState } from 'react';
import { Button } from './ui/button';
import { startGoogleLogin } from '../services/google-auth';
import googleLogo from '../assets/images/logos/logo-google.webp';

export default function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function login() {
    setLoading(true);
    setError('');
    try { await startGoogleLogin(); }
    catch { setError('Não foi possível iniciar o login. Verifique se o navegador permite armazenamento local.'); setLoading(false); }
  }
  return <div className="mt-5 space-y-3">
    <Button type="button" variant="outline" className="w-full font-bold" disabled={loading} onClick={() => void login()}>
      <img src={googleLogo} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
      {loading ? 'Redirecionando...' : 'Continuar com Google'}
    </Button>
    {error && <p role="alert" className="text-body text-danger">{error}</p>}
  </div>;
}
