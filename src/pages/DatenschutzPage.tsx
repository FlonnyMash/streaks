import { LegalList, LegalPageShell, LegalSection } from '@/components/legal/LegalShared'
import { LEGAL } from '@/lib/legalInfo'

export function DatenschutzPage() {
  return (
    <LegalPageShell title="Datenschutz" otherHref="/impressum" otherLabel="Impressum">
      <p className="mb-6 text-[13px] text-black/45 dark:text-white/45">
        Stand: {LEGAL.privacyUpdated}
      </p>

      <LegalSection title="1. Verantwortlicher">
        <p>
          Verantwortlich für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
        </p>
        <p>
          {LEGAL.name}
          <br />
          {LEGAL.street}
          <br />
          {LEGAL.zip} {LEGAL.city}
          <br />
          {LEGAL.country}
          <br />
          E-Mail:{' '}
          <a className="text-accent-blue" href={LEGAL.emailHref}>
            {LEGAL.email}
          </a>
          <br />
          Telefon:{' '}
          <a className="text-accent-blue" href={LEGAL.phoneHref}>
            {LEGAL.phone}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="2. Gegenstand dieser App">
        <p>
          {LEGAL.appName} („App“) ist eine persönliche Web-Anwendung zur Verwaltung von Gewohnheiten
          (Streaks), Aufgaben (Todos) und Zeiterfassung (Timesheet). Die App wird als Progressive Web App
          (PWA) bereitgestellt und speichert Ihre Inhalte in einer Datenbank bei unserem
          Auftragsverarbeiter Supabase.
        </p>
      </LegalSection>

      <LegalSection title="3. Hosting und Auftragsverarbeitung">
        <p>Für den Betrieb der App setzen wir folgende Dienstleister ein:</p>
        <LegalList
          items={[
            'Supabase Inc. — Authentifizierung, Datenbank und ggf. Versand von Bestätigungs-/Passwort-Reset-E-Mails',
            'Cloudflare, Inc. — Hosting der statischen Web-App (Cloudflare Pages) sowie Auslieferung über das CDN',
            'GitHub, Inc. — nur, wenn Sie sich über „Mit GitHub anmelden“ anmelden (OAuth)',
          ]}
        />
        <p>
          Mit den Auftragsverarbeitern bestehen soweit erforderlich Verträge zur Auftragsverarbeitung
          bzw. es gelten deren Datenschutzvereinbarungen und Standardvertragsklauseln für
          Drittlandtransfers. Die konkrete Server-Region Ihres Supabase-Projekts ergibt sich aus der
          jeweiligen Projektkonfiguration.
        </p>
      </LegalSection>

      <LegalSection title="4. Welche Daten wir verarbeiten">
        <p>Je nach Nutzung können folgende Kategorien personenbezogener Daten verarbeitet werden:</p>
        <LegalList
          items={[
            'Kontodaten: E-Mail-Adresse, Passwort-Hash (bei Supabase Auth), Benutzer-ID',
            'OAuth (optional): von GitHub übermittelte Identitäts-/Profildaten, insbesondere E-Mail',
            'Passkeys (optional): WebAuthn-Anmeldedaten inkl. Anzeigename sowie Erstellungs-/Nutzungszeitpunkt',
            'Inhalte, die Sie selbst anlegen: Streaks (Name, Emoji, Farbe, Zeitziele), Tageseinträge (Notizen, Stimmung, Minuten), Todos (Titel, Notizen, Fälligkeit, Wichtigkeit), Timesheet-Workspaces und -Einträge (Themen, Notizen, Zeiten)',
            'Technische Sitzungsdaten: Zugriffs-/Refresh-Token der Auth-Sitzung im lokalen Speicher des Browsers',
            'Darstellungseinstellung: gewähltes Theme (hell/dunkel/system) im lokalen Speicher',
          ]}
        />
        <p>
          Es werden keine Cookies für Tracking, Werbung oder Analyse gesetzt. Es sind keine
          Analyse- oder Marketing-Tools in die App integriert.
        </p>
      </LegalSection>

      <LegalSection title="5. Zwecke und Rechtsgrundlagen">
        <p>Die Verarbeitung erfolgt zu folgenden Zwecken:</p>
        <LegalList
          items={[
            'Bereitstellung und Betrieb Ihres Nutzerkontos sowie Anmeldung (Art. 6 Abs. 1 lit. b DSGVO)',
            'Speicherung und Synchronisation Ihrer persönlichen App-Inhalte (Art. 6 Abs. 1 lit. b DSGVO)',
            'Sicherheit der Authentifizierung (Sitzungen, Passkeys, Passwort-Reset) (Art. 6 Abs. 1 lit. b und lit. f DSGVO)',
            'Optionale Anmeldung über GitHub oder Passkeys auf Ihre Veranlassung (Art. 6 Abs. 1 lit. b DSGVO)',
            'Speicherung der Theme-Einstellung zur komfortablen Darstellung (Art. 6 Abs. 1 lit. f DSGVO)',
            'Erfüllung rechtlicher Verpflichtungen, soweit einschlägig (Art. 6 Abs. 1 lit. c DSGVO)',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Speicherdauer">
        <p>
          Kontodaten und App-Inhalte werden gespeichert, solange Ihr Konto besteht bzw. bis Sie einzelne
          Einträge oder das gesamte Konto löschen. Die Auth-Sitzung bleibt bis zur Abmeldung oder bis zum
          Ablauf der Tokens bestehen. Die Theme-Einstellung bleibt im lokalen Speicher, bis Sie sie ändern
          oder den Speicher des Browsers leeren. Server- und Zugriffsprotokolle der Hosting- bzw.
          Auth-Anbieter können nach deren eigenen Aufbewahrungsfristen kurzzeitig vorliegen.
        </p>
      </LegalSection>

      <LegalSection title="7. Speicherung im Endgerät (Local Storage)">
        <p>
          Die App nutzt den lokalen Speicher Ihres Browsers bzw. der installierten PWA für die
          Auth-Sitzung (Supabase) und die Theme-Einstellung. Es handelt sich nicht um Tracking-Cookies.
          Ohne Speicherung der Sitzung wäre eine dauerhafte Anmeldung nicht möglich.
        </p>
      </LegalSection>

      <LegalSection title="8. Empfänger und Drittlandtransfer">
        <p>
          Empfänger sind die unter Ziffer 3 genannten Auftragsverarbeiter sowie — bei GitHub-Login —
          GitHub. Soweit eine Übermittlung in Staaten außerhalb des EWR erfolgt, geschieht dies auf
          Grundlage geeigneter Garantien (insbesondere EU-Standardvertragsklauseln) der jeweiligen
          Anbieter.
        </p>
      </LegalSection>

      <LegalSection title="9. Ihre Rechte">
        <p>Sie haben nach der DSGVO insbesondere folgende Rechte:</p>
        <LegalList
          items={[
            'Auskunft (Art. 15 DSGVO)',
            'Berichtigung (Art. 16 DSGVO)',
            'Löschung (Art. 17 DSGVO)',
            'Einschränkung der Verarbeitung (Art. 18 DSGVO)',
            'Datenübertragbarkeit (Art. 20 DSGVO)',
            'Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21 DSGVO)',
            'Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO), z. B. dem Bayerischen Landesamt für Datenschutzaufsicht',
          ]}
        />
        <p>
          Zur Ausübung Ihrer Rechte genügt eine Nachricht an{' '}
          <a className="text-accent-blue" href={LEGAL.emailHref}>
            {LEGAL.email}
          </a>
          . In der App können Sie Inhalte selbst bearbeiten/löschen und unter Einstellungen Ihr Konto
          unwiderruflich löschen („Konto löschen“). Dabei werden Ihre Nutzerdaten und zugehörigen
          App-Inhalte gelöscht, soweit technisch in unserem System vorgesehen.
        </p>
      </LegalSection>

      <LegalSection title="10. Pflicht zur Bereitstellung">
        <p>
          Für die Nutzung der App ist die Angabe einer E-Mail-Adresse und — je nach Anmeldeart — eines
          Passworts, Passkeys oder eines GitHub-Kontos erforderlich. Ohne diese Angaben kann kein Konto
          bereitgestellt werden.
        </p>
      </LegalSection>

      <LegalSection title="11. Keine automatisierte Entscheidungsfindung">
        <p>
          Es findet keine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne von
          Art. 22 DSGVO statt.
        </p>
      </LegalSection>

      <LegalSection title="12. Kinder">
        <p>
          Die App richtet sich nicht an Kinder unter 16 Jahren. Wenn Sie gesetzlicher Vertreter sind und
          vermuten, dass ein Kind uns personenbezogene Daten übermittelt hat, kontaktieren Sie uns bitte.
        </p>
      </LegalSection>

      <LegalSection title="13. Änderungen">
        <p>
          Wir können diese Datenschutzerklärung anpassen, wenn sich die App, die Rechtslage oder unsere
          Verarbeitungsprozesse ändern. Die jeweils aktuelle Fassung ist in der App unter „Datenschutz“
          abrufbar.
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
