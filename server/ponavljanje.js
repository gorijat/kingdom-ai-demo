const MAX_POKUSAJA = 4;          // ukupno: 1 prvi pokušaj + 3 ponavljanja
const POCETNA_PAUZA_MS = 1000;   // prva pauza je 1 sekunda
const MAX_PAUZA_MS = 20000;      // nijedna pauza nije duža od 20 sekundi

function cekaj(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Odlučuje da li greška može da nestane sama od sebe
function vrediPonoviti(err) {
  const status = err && err.status;

  if (status === 408 || status === 409 || status === 429) return true;
  if (typeof status === 'number' && status >= 500) return true;

  const ime = (err && err.constructor && err.constructor.name) || '';
  return ime === 'APIConnectionError' || ime === 'APIConnectionTimeoutError';
}

// Ako server kaže koliko da čekamo (Retry-After header), poštujemo to
function procitajRetryAfter(err) {
  const h = err && err.headers;
  if (!h) return null;

  const vrednost = typeof h.get === 'function' ? h.get('retry-after') : h['retry-after'];
  const sekunde = Number(vrednost);

  return Number.isFinite(sekunde) && sekunde > 0 ? sekunde * 1000 : null;
}

async function pozoviSaPonavljanjem(poziv, opis = 'AI poziv') {
  for (let pokusaj = 1; pokusaj <= MAX_POKUSAJA; pokusaj++) {
    try {
      return await poziv();
    } catch (err) {
      const poslednji = pokusaj === MAX_POKUSAJA;

      if (!vrediPonoviti(err) || poslednji) {
        throw err;
      }

      const eksponencijalna = Math.min(POCETNA_PAUZA_MS * 2 ** (pokusaj - 1), MAX_PAUZA_MS);
      const jitter = Math.random() * 0.3 * eksponencijalna;
      const pauza = Math.min(procitajRetryAfter(err) ?? (eksponencijalna + jitter), MAX_PAUZA_MS);

      console.warn(`[ponavljanje] ${opis}: pokušaj ${pokusaj}/${MAX_POKUSAJA} nije uspeo (${err.status || err.constructor.name}), čekam ${Math.round(pauza)} ms`);
      await cekaj(pauza);
    }
  }
}

module.exports = { pozoviSaPonavljanjem };