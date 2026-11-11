import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import './Login.css';

export default function Login({ onLoginSuccess, onGoToRegister, onGoToForgot }) {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanInput = loginInput.trim().toLowerCase();
      let emailToUse = cleanInput;

      // 1. Próba znalezienia e-maila w bazie za pomocą zaktualizowanej funkcji RPC
      const { data: foundEmail, error: rpcError } = await supabase.rpc('get_email_by_login_or_email', {
        search_text: cleanInput,
      });

      // Jeśli RPC zwróciło e-mail (znaczy to, że inputem był login lub e-mail), używamy go
      if (!rpcError && foundEmail) {
        emailToUse = foundEmail;
      }

      // 2. Właściwe logowanie do Supabase (używając znalezionego e-maila)
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      // 3. Obsługa odpowiedzi
      if (loginError) {
        // Nie podajemy szczegółów błędu (czy e-mail nie istnieje, czy hasło złe), by nie ułatwiać ataków
        toast.error('Błędny login, e-mail lub hasło.');
      } else {
        toast.success('Zalogowano pomyślnie!');
        onLoginSuccess(data.user);
      }
    } catch (err) {
      console.error('Nieoczekiwany błąd logowania:', err);
      toast.error('Wystąpił nieoczekiwany błąd serwera.');
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ isOpen }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <div className="login-wrapper">
      <div className="login-card">
        <h2 className="login-title">Logowanie</h2>
        <p className="login-subtitle">Zaloguj się, aby typować mecze</p>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Login lub Adres E-mail"
            value={loginInput}
            onChange={(e) => setLoginInput(e.target.value)}
            autoComplete="username"
            required
            className="login-input"
          />

          <div className="password-container">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Hasło"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="login-input password-input"
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

          <div className="forgot-password-container">
            <button
              type="button"
              onClick={onGoToForgot}
              className="forgot-password-btn"
            >
              Nie pamiętam hasła?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
          >
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        <p className="register-redirect-container">
          Nie masz jeszcze konta? <br />
          <button onClick={onGoToRegister} className="register-redirect-btn">
            Zarejestruj się tutaj
          </button>
        </p>
      </div>
    </div>
  );
}