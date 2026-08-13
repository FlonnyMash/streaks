import { LegalList, LegalPageShell, LegalSection } from '@/components/legal/LegalShared'
import { LEGAL } from '@/lib/legalInfo'

export function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" otherHref="/imprint" otherLabel="Imprint">
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
          (PWA) and stores your content in a database and object storage operated by our processor
          Supabase. There are no payments, analytics, advertising, or marketing tools in the App.
          Optional profile photo uploads are the only file uploads supported.
        </p>
      </LegalSection>

      <LegalSection title="3. Hosting and processors">
        <p>We use the following service providers to operate the App:</p>
        <LegalList
          items={[
            'Supabase Inc. — authentication, database, realtime sync, object storage (including optional profile photos), and where applicable confirmation / password-reset / email-change emails',
            'Cloudflare, Inc. — hosting of the static web app (Cloudflare Pages) and CDN delivery',
            'GitHub, Inc. — only if you sign in with “Continue with GitHub” (OAuth)',
            'Google LLC — only if you sign in with “Continue with Google” (OAuth)',
          ]}
        />
        <p>
          Where required, we rely on data processing agreements and/or the providers’ privacy terms
          and Standard Contractual Clauses for transfers outside the EEA. Our Supabase project is hosted
          in the EU (Ireland, region eu-west-1). Cloudflare and identity providers may process data in
          other regions under the safeguards above.
        </p>
      </LegalSection>

      <LegalSection title="4. Data we process">
        <p>Depending on how you use the App, we may process the following categories of personal data:</p>
        <LegalList
          items={[
            'Account data: email address, password hash (via Supabase Auth), user ID',
            'Profile data: first name and date of birth, used to confirm you meet the minimum age requirement (date of birth is also used locally in the App for an optional birthday greeting)',
            'Profile photo (optional): an image you upload (up to 5 MB), stored in Supabase Storage under your user ID, with a publicly accessible URL saved on your profile so the App can display it',
            'OAuth (optional): identity / profile data provided by GitHub or Google, especially email and, where available, first name and provider profile picture URL (used as a fallback avatar when you have not uploaded your own)',
            'Passkeys (optional): WebAuthn credentials including display name and created / last-used timestamps',
            'Content you create: streaks (name, emoji, color, frequency, archived status, time goals, optional reminder time), daily streak entries (completion, notes, mood, minutes), todos (title, notes, due date, importance, topics, completion timestamps, optional linked timesheet workspace, optional due reminders), timesheet workspaces (name, emoji, color, quick duration presets, archived status), running timesheet sessions (workspace, start time, optional topic), timesheet entries (topics, notes, start/end times, minutes, mood), todo timers (which todo is running and since when), and per-day todo timer totals (work date and seconds spent)',
            'Push notifications (optional): browser / device notification permission, a Web Push subscription (endpoint URL and encryption keys for this device), your current device timezone (refreshed when you open the App, used for local reminder scheduling), and whether at least one device is subscribed; used only to deliver reminders you opt into',
            'Optional timesheet PDF export: generated on your device for download (may include your first name and timesheet content); the App does not upload the PDF to our servers',
            'Technical session data: auth access / refresh tokens stored in the browser’s local storage',
            'Display preference: chosen theme (light / dark / system) in local storage',
            'UI preferences in local storage: whether the passkey setup prompt was dismissed or completed (keyed to your user ID), whether the push-notification setup prompt was dismissed or completed (keyed to your user ID), whether the “Add to Home Screen” tip was dismissed, and a cache of active timesheet timers (keyed to your user ID) used to keep running timers available across reloads',
          ]}
        />
        <p>
          We do not set cookies for tracking, advertising, or analytics. No analytics or marketing
          tools are integrated into the App. The App does not request camera, microphone, or location
          permissions. Push-notification permission is requested by the browser/OS when you allow
          notifications (for example from the first-sign-in reminder prompt, Settings, or when enabling
          “Notify me”). The App reads the
          current device permission rather than keeping a separate on/off preference. Installing the
          App as a PWA does not collect additional personal data beyond the preferences described above.
        </p>
      </LegalSection>

      <LegalSection title="5. Purposes and legal bases">
        <p>Processing takes place for the following purposes:</p>
        <LegalList
          items={[
            'Providing and operating your user account and sign-in (Art. 6(1)(b) GDPR)',
            'Verifying you meet the minimum age of 16 to use the App (Art. 6(1)(c) GDPR)',
            'Storing and syncing your personal app content, including running timesheet sessions and todo timers (Art. 6(1)(b) GDPR)',
            'Displaying your optional profile photo in the App (Art. 6(1)(b) GDPR)',
            'Securing authentication (sessions, passkeys, password reset, email change) (Art. 6(1)(b) and (f) GDPR)',
            'Optional sign-in via GitHub, Google, or passkeys at your request (Art. 6(1)(b) GDPR)',
            'Optional push notifications for streak / todo reminders and long-running timer nudges you enable (Art. 6(1)(b) and (a) GDPR)',
            'Storing theme, passkey-prompt, install-tip, and active-timer-cache preferences for a comfortable display (Art. 6(1)(f) GDPR)',
            'Complying with legal obligations where applicable (Art. 6(1)(c) GDPR)',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Retention">
        <p>
          Account data, app content (including running timesheet sessions, todo timers, and per-day
          todo timer totals), push subscription records, and any uploaded profile photo are stored for
          as long as your account exists or until you delete individual records, turn off push
          notifications (which removes stored device subscriptions), stop, discard, or clear a timer,
          replace or clear your photo, or delete the entire account. Clearing or replacing a profile
          photo updates the URL used by the App; older photo files under your user ID may remain in
          storage until you delete your account. The auth session remains until you sign out or the
          tokens expire. Theme, passkey-prompt, install-tip, and active-timer-cache preferences remain
          in local storage until you change them, the timesheet timer cache is cleared when no
          sessions remain, or you clear browser storage. Server and access logs of hosting / auth
          providers may be retained briefly according to their own retention policies.
        </p>
      </LegalSection>

      <LegalSection title="7. Storage on your device (local storage)">
        <p>
          The App uses your browser’s or installed PWA’s local storage for the auth session (Supabase),
          the theme preference, the passkey setup prompt status, the push-notification setup prompt
          status, the “Add to Home Screen” tip dismissal, and a cache of active timesheet timers. Todo
          timers are stored on the server (not in local storage). These local items are not tracking
          cookies. Without storing the session, persistent sign-in would not be possible. Optional
          timesheet PDF exports are created locally on your device and are not stored by the App on our
          servers.
        </p>
      </LegalSection>

      <LegalSection title="8. Recipients and international transfers">
        <p>
          Recipients are the processors listed in section 3 and — if you use GitHub or Google login —
          the respective identity provider. Uploaded profile photos are stored with a publicly
          accessible URL so the App can load them; only your account can upload or replace photos
          under your user ID, and only you can clear the photo URL on your profile. Where personal
          data is transferred outside the EEA, this is based on appropriate safeguards (in particular
          EU Standard Contractual Clauses) of the respective providers.
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
          . In the App you can edit or delete your own content and profile photo, and under Settings
          you can permanently delete your account (“Delete account”). Doing so removes your user data
          and related app content as provided for in our systems.
        </p>
      </LegalSection>

      <LegalSection title="10. Requirement to provide data">
        <p>
          Using the App requires an email address, a first name, and a date of birth, plus — depending
          on the sign-in method — a password, passkey, or a GitHub or Google account. Without this
          information, an account cannot be provided. Your date of birth cannot be changed once saved.
          A profile photo is optional.
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
          The App is not directed at children under 16. We collect your date of birth at sign-up
          specifically to enforce this minimum age, and accounts that do not meet it are not created or
          are deleted. If you are a legal guardian and believe a child has circumvented this check and
          provided us with personal data, please contact us.
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
