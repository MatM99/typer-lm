import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import './Register.css';

export default function Register({ onGoToLogin }) {
  const [loginVal, setLoginVal] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    const cleanLogin = loginVal.trim().toLowerCase();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanLogin.length < 3 || cleanLogin.length > 20) {
      toast.error('Login musi mieć od 3 do 20 znaków.');
      setLoading(false);
      return;
    }

    if (cleanLogin.includes('@')) {
      toast.error('Login nie może zawierać znaku "@". Znak "@" jest zarezerwowany dla adresów e-mail.');
      setLoading(false);
      return;
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      toast.error('Nick musi mieć od 3 do 20 znaków.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error('Hasło musi mieć co najmniej 6 znaków.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Hasła nie są identyczne.');
      setLoading(false);
      return;
    }

    const { data: existingLogin } = await supabase
      .from('user_credentials')
      .select('login')
      .ilike('login', cleanLogin)
      .maybeSingle();

    if (existingLogin) {
      toast.error('Podany login jest już zajęty przez innego użytkownika.');
      setLoading(false);
      return;
    }

    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (existingUsername) {
      toast.error('Podany nick jest już zajęty.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { login: cleanLogin, username: cleanUsername }
      }
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data?.user) {
      // Usunięto pole email, ponieważ kolumna została usunięta z tabeli profiles dla bezpieczeństwa
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          username: cleanUsername,
          is_admin: false
        });

      if (profileError) {
        console.error('Pełny błąd profilu:', profileError);
        toast.error(`Błąd: ${profileError.message} (Kod: ${profileError.code})`);
        setLoading(false);
        return;
      }

      const { error: credError } = await supabase
        .from('user_credentials')
        .upsert({
          id: data.user.id,
          login: cleanLogin
        });

      if (credError) {
        console.error('Błąd zapisu credentials:', credError);
        toast.error('Błąd bazy (credentials): ' + credError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    toast.success('Konto zostało utworzone. Możesz się teraz zalogować.');
    onGoToLogin();
  };

  const EyeIcon = ({ isOpen }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {isOpen ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </>
      )}
    </svg>
  );

  return (
    <div className="register-wrapper">
      <div className="register-card">
        <h2 className="register-title">Załóż konto</h2>
        <p className="register-subtitle">Dołącz do rywalizacji w lidze</p>

        <form onSubmit={handleRegister}>
          <div className="form-field">
            <input
              type="text"
              placeholder="Login (3-20 znaków)"
              value={loginVal}
              onChange={(e) => setLoginVal(e.target.value)}
              maxLength={20}
              autoComplete="username"
              required
              className="register-input"
            />
            <div className="input-hint">Zamiennik maila do logowania</div>
          </div>

          <div className="form-field">
            <input
              type="text"
              placeholder="Nick (3-20 znaków)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
              required
              className="register-input"
            />
            <div className="input-hint">Widoczna dla wszystkich nazwa gracza</div>
          </div>

          <div className="form-field">
            <input
              type="email"
              placeholder="Adres E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="register-input"
            />
          </div>

          <div className="password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Hasło (min. 6 znaków)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="register-input password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle-btn"
              title={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
            >
              <EyeIcon isOpen={showPassword} />
            </button>
          </div>

          <div className="password-wrapper">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Potwierdź hasło"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="register-input password-input"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="password-toggle-btn"
              title={showConfirmPassword ? "Ukryj hasło" : "Pokaż hasło"}
            >
              <EyeIcon isOpen={showConfirmPassword} />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
          >
            {loading ? 'Tworzenie...' : 'Zarejestruj się'}
          </button>
        </form>

        <p className="login-redirect-container">
          Masz już konto? <br />
          <button onClick={onGoToLogin} className="login-redirect-btn">
            Zaloguj się tutaj
          </button>
        </p>
      </div>
    </div>
  );
}