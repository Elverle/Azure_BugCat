import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

const SRC = resolve(__dirname, '../../src')

/**
 * Words that cannot plausibly appear in english source. Deliberately a smoke
 * detector, not a proof: its job is to stop a future italian string from
 * sneaking back in, not to certify that the initial pass was exhaustive.
 * When a false positive shows up, narrow the pattern — do not delete the test.
 */
const ITALIAN_MARKERS =
  /\b(perch[éè]|cos[ìi]|gi[àa]|della|delle|degli|nella|nelle|sulla|questo|questa|quindi|nessun[ao]?|errore|errori|elaborazione|categorizzat[oaie]|impostazioni|annulla|salva|chiudi|aggiorna|seleziona|determinabile|assegnat[oi]|descrizione|titolo|storico|gruppo|gruppi|simili|dettagli|conferma|pulizia|sessione|raggrupp[a-z]*)\b/i

/**
 * Italian that is there on purpose. The few-shot examples in the categorization
 * prompt show the model how to handle bugs written in italian, which is a
 * documented product feature, and the forbidden-category rule has to name the
 * italian phrases the model might otherwise invent.
 */
const ALLOWED = [
  'Title: "Validazioni finali - Valore non mostrato durante il caricamento"',
  'Best category: "Validazioni"',
  'Title: "Costo extra - errore apertura modale"',
  'Best category: "Costi"',
  '- Do not return Non categorizzato, Altro, Unknown, Other, or any invented category',
  // The v4 migration's conversion table is keyed by the italian values as they
  // were persisted; a migration describes a historical state of the data and
  // cannot be translated. Listing the keys one by one is deliberate: adding a
  // conversion makes this test fail until someone confirms the new key belongs
  // here.
  "'Non categorizzato': '__uncategorized__'",
  "'Errore elaborazione': '__processing_error__'",
  "'Nessuna risposta LLM': '__no_llm_response__'",
  "'Errore parsing': '__parse_error__'",
  "'Non determinabile': 'Undetermined'",
  // normalizeTechnicalLayer still has to recognise the italian layer the model
  // may emit when it reads a bug written in italian.
  '/^non determinabile$/i'

]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(full) ? [full] : []
  })
}

describe('no italian strings in src/', () => {
  it('finds no italian marker in any source line', () => {
    const offenders: string[] = []

    for (const file of sourceFiles(SRC)) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (ALLOWED.some((allowed) => line.includes(allowed))) return
        if (ITALIAN_MARKERS.test(line)) {
          offenders.push(`${file.replace(SRC, 'src')}:${index + 1}: ${line.trim()}`)
        }
      })
    }

    expect(offenders).toEqual([])
  })
})
