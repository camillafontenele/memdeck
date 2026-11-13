import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { completeGoogleLogin } from '../services/google-auth';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void completeGoogleLogin().then(() => { if (active) navigate('/dashboard', { replace: true }); })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Não foi possível autenticar.'); });
    return () => { active = false; };
  }, [navigate]);
  return <main className="min-h-screen bg-background px-5 py-10 text-foreground">
    <section className="mx-auto max-w-md space-y-5 text-center">
      <h1 className="text-h1">Login com Google</h1>
      {error ? <><p role="alert" className="text-body text-danger">{error}</p><Button onClick={() => navigate('/login', { replace: true })}>Voltar para o login</Button></>
        : <p role="status" className="text-body">Concluindo seu login...</p>}
    </section>
  </main>;
}
