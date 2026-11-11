import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function ForgotPassword({ onGoToLogin }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
            redirectTo: window.location.origin, // Po kliknięciu w link w mailu użytkownik wraca na stronę główną
        });

        if (error) {
            toast.error('Wystąpił błąd: ' + error.message);
        } else {
            toast.success('Link resetujący został wysłany na podany adres e-mail!');
        }
        setLoading(false);
    };

    return (
        <div style={{ backgroundColor: '#0f172a', color: '#ffffff', fontFamily: 'Arial, sans-serif', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)', border: '1px solid #334155', width: '320px', textAlign: 'center' }}>
                <h2 style={{ color: '#38bdf8', fontSize: '22px', marginTop: 0 }}>Resetowanie hasła</h2>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>Wpisz swój e-mail, aby otrzymać link do zmiany hasła</p>

                <form onSubmit={handleResetPassword}>
                    <input
                        type="email"
                        placeholder="Adres E-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: '100%', boxSizing: 'border-box', padding: '12px', marginBottom: '15px', border: '1px solid #334155', borderRadius: '6px', backgroundColor: '#0f172a', color: 'white', outline: 'none' }}
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}
                    >
                        {loading ? 'Wysyłanie...' : 'Wyślij link'}
                    </button>
                </form>

                <button
                    onClick={onGoToLogin}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#38bdf8';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#94a3b8';
                    }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', transition: 'color 0.2s ease' }}
                >
                    Wróć do logowania
                </button>
            </div>
        </div>
    );
}