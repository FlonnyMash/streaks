import { LegalPageShell, LegalSection } from '@/components/legal/LegalShared'
import { LEGAL } from '@/lib/legalInfo'

export function ImpressumPage() {
  return (
    <LegalPageShell title="Impressum" otherHref="/datenschutz" otherLabel="Datenschutz">
      <LegalSection title="Angaben gemäß § 5 DDG">
        <p>
          {LEGAL.name}
          <br />
          {LEGAL.street}
          <br />
          {LEGAL.zip} {LEGAL.city}
          <br />
          {LEGAL.country}
        </p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>
          Telefon:{' '}
          <a className="text-accent-blue" href={LEGAL.phoneHref}>
            {LEGAL.phone}
          </a>
          <br />
          E-Mail:{' '}
          <a className="text-accent-blue" href={LEGAL.emailHref}>
            {LEGAL.email}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Umsatzsteuer-ID">
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
          <br />
          {LEGAL.vatId}
        </p>
      </LegalSection>

      <LegalSection title="Verantwortlich für den Inhalt">
        <p>
          {LEGAL.name}
          <br />
          {LEGAL.street}
          <br />
          {LEGAL.zip} {LEGAL.city}
        </p>
      </LegalSection>

      <LegalSection title="Online-Streitbeilegung">
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
          <a
            className="text-accent-blue break-all"
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noreferrer"
          >
            https://ec.europa.eu/consumers/odr
          </a>
          . Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </LegalSection>

      <LegalSection title="Haftung für Inhalte und Links">
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte nach den allgemeinen Gesetzen verantwortlich.
          Für Inhalte verlinkter externer Websites übernehmen wir keine Gewähr. Für die Inhalte der
          verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
