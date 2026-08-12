import { LegalList, LegalPageShell, LegalSection } from '@/components/legal/LegalShared'
import { LEGAL } from '@/lib/legalInfo'

export function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" otherHref="/legal" otherLabel="Legal">
      <p className="mb-6 text-[13px] text-black/45 dark:text-white/45">
        Last updated: {LEGAL.privacyUpdated}
      </p>

      <LegalSection title="1. Controller">
        <p>
          The controller responsible for data processing under the EU General Data Protection
          Regulation (GDPR) is:
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
          Email:{' '}
          <a className="text-accent-blue" href={LEGAL.emailHref}>
            {LEGAL.email}
          </a>
          <br />
          Phone:{' '}
          <a className="text-accent-blue" href={LEGAL.phoneHref}>
            {LEGAL.phone}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="2. About this app">
        <p>
          {LEGAL.appName} (“the App”) is a personal web application for managing habits (streaks),
          tasks (todos), and time tracking (timesheet). The App is provided as a Progressive Web App
          (PWA) and stores your content in a database operated by our processor Supabase.
        </p>
      </LegalSection>

      <LegalSection title="3. Hosting and processors">
        <p>We use the following service providers to operate the App:</p>
        <LegalList
          items={[
            'Supabase Inc. — authentication, database, and where applicable confirmation / password-reset emails',
            'Cloudflare, Inc. — hosting of the static web app (Cloudflare Pages) and CDN delivery',
            'GitHub, Inc. — only if you sign in with “Continue with GitHub” (OAuth)',
          ]}
        />
        <p>
          Where required, we rely on data processing agreements and/or the providers’ privacy terms
          and Standard Contractual Clauses for transfers outside the EEA. The exact server region of
          your Supabase project depends on the project configuration.
        </p>
      </LegalSection>

      <LegalSection title="4. Data we process">
        <p>Depending on how you use the App, we may process the following categories of personal data:</p>
        <LegalList
          items={[
            'Account data: email address, password hash (via Supabase Auth), user ID',
            'OAuth (optional): identity / profile data provided by GitHub, especially email',
            'Passkeys (optional): WebAuthn credentials including display name and created / last-used timestamps',
            'Content you create: streaks (name, emoji, color, time goals), daily entries (notes, mood, minutes), todos (title, notes, due date, importance), timesheet workspaces and entries (topics, notes, times)',
            'Technical session data: auth access / refresh tokens stored in the browser’s local storage',
            'Display preference: chosen theme (light / dark / system) in local storage',
          ]}
        />
        <p>
          We do not set cookies for tracking, advertising, or analytics. No analytics or marketing
          tools are integrated into the App.
        </p>
      </LegalSection>

      <LegalSection title="5. Purposes and legal bases">
        <p>Processing takes place for the following purposes:</p>
        <LegalList
          items={[
            'Providing and operating your user account and sign-in (Art. 6(1)(b) GDPR)',
            'Storing and syncing your personal app content (Art. 6(1)(b) GDPR)',
            'Securing authentication (sessions, passkeys, password reset) (Art. 6(1)(b) and (f) GDPR)',
            'Optional sign-in via GitHub or passkeys at your request (Art. 6(1)(b) GDPR)',
            'Storing the theme preference for a comfortable display (Art. 6(1)(f) GDPR)',
            'Complying with legal obligations where applicable (Art. 6(1)(c) GDPR)',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Retention">
        <p>
          Account data and app content are stored for as long as your account exists or until you
          delete individual records or the entire account. The auth session remains until you sign out
          or the tokens expire. The theme preference remains in local storage until you change it or
          clear browser storage. Server and access logs of hosting / auth providers may be retained
          briefly according to their own retention policies.
        </p>
      </LegalSection>

      <LegalSection title="7. Storage on your device (local storage)">
        <p>
          The App uses your browser’s or installed PWA’s local storage for the auth session (Supabase)
          and the theme preference. These are not tracking cookies. Without storing the session,
          persistent sign-in would not be possible.
        </p>
      </LegalSection>

      <LegalSection title="8. Recipients and international transfers">
        <p>
          Recipients are the processors listed in section 3 and — if you use GitHub login — GitHub.
          Where personal data is transferred outside the EEA, this is based on appropriate safeguards
          (in particular EU Standard Contractual Clauses) of the respective providers.
        </p>
      </LegalSection>

      <LegalSection title="9. Your rights">
        <p>Under the GDPR you have in particular the following rights:</p>
        <LegalList
          items={[
            'Access (Art. 15 GDPR)',
            'Rectification (Art. 16 GDPR)',
            'Erasure (Art. 17 GDPR)',
            'Restriction of processing (Art. 18 GDPR)',
            'Data portability (Art. 20 GDPR)',
            'Objection to processing based on Art. 6(1)(f) GDPR (Art. 21 GDPR)',
            'Complaint with a supervisory authority (Art. 77 GDPR), e.g. the Bavarian Data Protection Authority (BayLDA)',
          ]}
        />
        <p>
          To exercise your rights, contact us at{' '}
          <a className="text-accent-blue" href={LEGAL.emailHref}>
            {LEGAL.email}
          </a>
          . In the App you can edit or delete your own content, and under Settings you can permanently
          delete your account (“Delete account”). Doing so removes your user data and related app
          content as provided for in our systems.
        </p>
      </LegalSection>

      <LegalSection title="10. Requirement to provide data">
        <p>
          Using the App requires an email address and — depending on the sign-in method — a password,
          passkey, or GitHub account. Without this information, an account cannot be provided.
        </p>
      </LegalSection>

      <LegalSection title="11. No automated decision-making">
        <p>
          We do not use automated decision-making, including profiling, within the meaning of Art. 22
          GDPR.
        </p>
      </LegalSection>

      <LegalSection title="12. Children">
        <p>
          The App is not directed at children under 16. If you are a legal guardian and believe a child
          has provided us with personal data, please contact us.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes">
        <p>
          We may update this Privacy Policy if the App, the law, or our processing practices change.
          The current version is always available in the App under “Privacy Policy”.
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
