import React from 'react';

export default function Zasady() {
  return (
    <main style={{ maxWidth: '850px', margin: '30px auto', padding: '0 20px', color: '#ffffff', fontFamily: 'Arial, sans-serif' }}>

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '800', margin: 0 }}>Zasady Gry i Punktacja</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* 1. Podstawowy system punktacji */}
        <div style={{ backgroundColor: '#0f172a', padding: '16px 20px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>Podstawowy System Punktacji</h3>
          <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.6', color: '#e2e8f0', fontSize: '14px' }}>
            <li style={{ marginBottom: '6px' }}>
              <strong style={{ color: '#4ade80' }}>3 punkty</strong> – za trafienie dokładnego wyniku meczu.
            </li>
            <li style={{ marginBottom: '6px' }}>
              <strong style={{ color: '#86efac' }}>1 punkt</strong> – za trafienie rozstrzygnięcia (zwycięzcy lub remisu) przy innym wyniku bramkowym.
            </li>
            <li>
              <strong style={{ color: '#fca5a5' }}>0 punktów</strong> – za całkowicie błędny typ.
            </li>
          </ul>
        </div>

        {/* 2. Karty Specjalne */}
        <div style={{ backgroundColor: '#0f172a', padding: '16px 20px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>Karty Specjalne: Boost & Joker</h3>
          <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '12px', lineHeight: '1.5' }}>
            W każdej kolejce/fazie można przypisać jedną kartę specjalną do wybranego meczu.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ backgroundColor: '#1e293b', padding: '10px 14px', borderRadius: '6px', borderLeft: '3px solid #38bdf8' }}>
              <div style={{ fontWeight: 'bold', color: '#38bdf8', fontSize: '13px', marginBottom: '4px' }}>
                BOOST (Faza Ligowa, 1/16 oraz 1/8 Finału)
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5' }}>
                <li>Dokładny wynik: <strong style={{ color: '#facc15' }}>6 punktów</strong></li>
                <li>Trafiony rezultat: <strong style={{ color: '#84cc16' }}>2 punkty</strong></li>
                <li>Pudło: <strong style={{ color: '#94a3b8' }}>0 punktów</strong></li>
              </ul>
            </div>

            <div style={{ backgroundColor: '#1e293b', padding: '10px 14px', borderRadius: '6px', borderLeft: '3px solid #eab308' }}>
              <div style={{ fontWeight: 'bold', color: '#facc15', fontSize: '13px', marginBottom: '4px' }}>
                JOKER (Od 1/4 Finału wzwyż)
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5' }}>
                <li>Dokładny wynik: <strong style={{ color: '#facc15' }}>9 punktów</strong></li>
                <li>Trafiony rezultat: <strong style={{ color: '#84cc16' }}>2 punkty</strong></li>
                <li>Pudło: <strong style={{ color: '#f87171' }}>-3 punkty (ujemne punkty)</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* 3. Zasady typowania i blokada kart */}
        <div style={{ backgroundColor: '#0f172a', padding: '16px 20px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>Czas na Typowanie i Blokada Kart</h3>
          <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.6', color: '#e2e8f0', fontSize: '14px' }}>
            <li style={{ marginBottom: '6px' }}>Wyniki meczów można edytować do pierwszego gwizdka danego spotkania.</li>
            <li style={{ marginBottom: '6px' }}>Karta Boost / Joker może być swobodnie dodawana lub zmieniana na mecze, które się jeszcze nie rozpoczęły - nawet jeśli inne spotkania w tej kolejce/fazie już trwają. Zablokowaniu ulega jedynie ten bonus, który został przypisany do meczu, który właśnie się rozpoczął.</li>
            <li>Po rozpoczęciu spotkania typy graczy stają się jawne.</li>
          </ul>
        </div>

        {/* 4. Faza pucharowa */}
        <div style={{ backgroundColor: '#0f172a', padding: '16px 20px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '8px', fontSize: '16px' }}>Faza Pucharowa</h3>
          <p style={{ color: '#e2e8f0', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
            Wszystkie mecze typujemy na podstawie wyniku po 90 minutach regulaminowego czasu gry (wliczając doliczony czas przez sędziego, bez dogrywki i rzutów karnych).
          </p>
        </div>

        {/* 5. Remis w tabeli */}
        <div style={{ backgroundColor: '#0f172a', padding: '16px 20px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>Remis w Tabeli Rankingowej</h3>
          <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '8px', lineHeight: '1.5' }}>
            W przypadku równej liczby punktów o wyższej pozycji decyduje kolejno:
          </p>
          <ol style={{ paddingLeft: '20px', margin: 0, color: '#94a3b8', fontSize: '13px', lineHeight: '1.6' }}>
            <li>Większa liczba trafionych dokładnych wyników.</li>
            <li>Większa liczba trafionych rezultatów.</li>
          </ol>
        </div>

      </div>
    </main>
  );
}