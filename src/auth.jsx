import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);
const logoPath = `${import.meta.env.BASE_URL}ehi-logo.svg`;

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function LoadingScreen({ leaving }) {
  return (
    <div className={`loading-screen${leaving ? ' loading-screen--leaving' : ''}`} role="status" aria-label="Загрузка EHI! CINEMA">
      <div className="loading-screen__mark">
        <img src={logoPath} alt="EHI!" />
        <span>EHI! CINEMA</span>
      </div>
      <i className="loading-screen__line" aria-hidden="true" />
    </div>
  );
}

export function AuthProvider({ children }) {
  const authDisabled = import.meta.env.VITE_AUTH_DISABLED === 'true';
  const [user, setUser] = useState(authDisabled ? { id: 'preview', first_name: 'Ева' } : null);
  const [ready, setReady] = useState(authDisabled);
  const [showLoader, setShowLoader] = useState(true);
  const [loaderLeaving, setLoaderLeaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function boot() {
      const sessionRequest = authDisabled
        ? Promise.resolve()
        : fetch('/api/auth/me', { credentials: 'include' })
          .then(async (response) => {
            if (!active) return;
            if (response.ok) {
              const result = await response.json();
              setUser(result.user || null);
            }
          })
          .catch(() => undefined);

      await Promise.all([sessionRequest, wait(1050)]);
      if (!active) return;
      setReady(true);
      setLoaderLeaving(true);
      await wait(420);
      if (active) setShowLoader(false);
    }

    boot();
    return () => { active = false; };
  }, [authDisabled]);

  const value = useMemo(() => ({
    user,
    ready,
    signIn: setUser,
    async signOut() {
      if (!authDisabled) {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
      }
      setUser(null);
    },
  }), [authDisabled, ready, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showLoader && <LoadingScreen leaving={loaderLeaving} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function RequireAuth({ children }) {
  const { ready, user } = useAuth();
  const location = useLocation();
  if (!ready) return null;
  if (!user) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?return=${encodeURIComponent(returnTo)}`} replace />;
  }
  return children;
}

export function AuthPage() {
  const { ready, user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [botUsername, setBotUsername] = useState('');
  const [error, setError] = useState('');
  const returnTo = new URLSearchParams(location.search).get('return') || '/cinema';

  useEffect(() => {
    if (!ready || user) return undefined;
    let active = true;

    fetch('/api/config')
      .then(async (response) => {
        if (!response.ok) throw new Error('config');
        const result = await response.json();
        if (active) setBotUsername(result.botUsername || '');
      })
      .catch(() => {
        if (active) setError('Вход сейчас недоступен. Попробуйте чуть позже.');
      });

    return () => { active = false; };
  }, [ready, user]);

  useEffect(() => {
    if (!botUsername || user) return undefined;
    const holder = document.getElementById('telegram-login-holder');
    if (!holder) return undefined;

    window.onEhiTelegramAuth = async (telegramUser) => {
      setError('');
      try {
        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(telegramUser),
        });
        const result = await response.json();
        if (!response.ok || !result.user) throw new Error(result.error || 'auth');
        signIn(result.user);
        navigate(returnTo.startsWith('/') ? returnTo : '/cinema', { replace: true });
      } catch {
        setError('Не получилось войти через Telegram. Повторите попытку.');
      }
    };

    holder.replaceChildren();
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '4');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-lang', 'ru');
    script.setAttribute('data-onauth', 'onEhiTelegramAuth(user)');
    holder.appendChild(script);

    return () => {
      delete window.onEhiTelegramAuth;
      holder.replaceChildren();
    };
  }, [botUsername, navigate, returnTo, signIn, user]);

  if (ready && user) return <Navigate to={returnTo.startsWith('/') ? returnTo : '/cinema'} replace />;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="auth-brand" href="/" aria-label="EHI! CINEMA">
          <img src={logoPath} alt="EHI!" />
          <span>CINEMA</span>
        </a>
        <div className="auth-card__copy">
          <span className="eyebrow">Личный кинотеатр</span>
          <h1>Войти</h1>
          <p>Билеты и бронирования будут доступны после входа через Telegram.</p>
        </div>
        <div id="telegram-login-holder" className="telegram-login" aria-live="polite">
          {!botUsername && !error && <span className="telegram-login__placeholder">Подключаем Telegram…</span>}
        </div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <small>Мы получим только имя, фотографию и Telegram ID.</small>
      </section>
      <p className="auth-footnote">EHI! CINEMA · 2026</p>
    </main>
  );
}
