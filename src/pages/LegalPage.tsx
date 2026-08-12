import { LegalPageShell, LegalSection } from '@/components/legal/LegalShared'
import { LEGAL } from '@/lib/legalInfo'

export function LegalPage() {
  return (
    <LegalPageShell title="Legal" otherHref="/privacy" otherLabel="Privacy Policy">
      <LegalSection title="Information according to § 5 DDG">
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

      <LegalSection title="Contact">
        <p>
          Phone:{' '}
          <a className="text-accent-blue" href={LEGAL.phoneHref}>
            {LEGAL.phone}
          </a>
          <br />
          Email:{' '}
          <a className="text-accent-blue" href={LEGAL.emailHref}>
            {LEGAL.email}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="VAT ID">
        <p>
          VAT identification number according to § 27a of the German Value Added Tax Act:
          <br />
          {LEGAL.vatId}
        </p>
      </LegalSection>

      <LegalSection title="Responsible for content">
        <p>
          {LEGAL.name}
          <br />
          {LEGAL.street}
          <br />
          {LEGAL.zip} {LEGAL.city}
        </p>
      </LegalSection>

      <LegalSection title="Online dispute resolution">
        <p>
          The European Commission provides a platform for online dispute resolution (ODR):{' '}
          <a
            className="text-accent-blue break-all"
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noreferrer"
          >
            https://ec.europa.eu/consumers/odr
          </a>
          . We are neither obliged nor willing to participate in dispute resolution proceedings before
          a consumer arbitration board.
        </p>
      </LegalSection>

      <LegalSection title="Liability for content and links">
        <p>
          As a service provider we are responsible for our own content under general applicable law.
          We accept no liability for the content of external websites we link to. The respective
          provider is always responsible for the content of linked pages.
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
