// ============================================================
// /housing/scams — how to spot a fake listing
// ============================================================
//
// Linked from every listing page, by requirement and by sense: people
// with records are a targeted group. They are often searching under
// time pressure, from a release date, with cash in hand and few
// alternatives, and they are less likely to report being cheated. That
// combination is exactly what a scammer looks for.
//
// Copy discipline here: short sentences, plain words, no legal jargon,
// and every rule is phrased as something the reader can DO. "Never send
// a deposit by gift card" is usable. "Be cautious of irregular payment
// requests" is not.
//
// Static content on purpose — this page must work when the database is
// down, because it is the page that stops somebody losing money.

import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, XCircle, Flag } from 'lucide-react'
import SeoHead from '@/lib/seo/SeoHead'
import { breadcrumbSchema } from '@/lib/seo/structuredData'
import Section from '@/components/ui/Section'

const RED_FLAGS = [
  {
    title: 'They want money before you have seen the place',
    body: 'Do not send a deposit, an application fee, or a "holding fee" for a place you have not walked through. A real program will let you see the house, or at least meet someone from it, first.',
  },
  {
    title: 'They want a gift card, Cash App, Zelle, Venmo, or a wire',
    body: 'This is the clearest sign of all. Real housing programs take a check, a money order, or a card payment that leaves a record. Money sent by gift card or app is gone the second you send it, and no one can get it back for you.',
  },
  {
    title: 'They promise you will be approved because of your record',
    body: 'Nobody can guarantee approval. Anyone who says "approved no matter your record" and then asks for a fee is selling you a promise they cannot keep.',
  },
  {
    title: 'The rent is far below everything else nearby',
    body: 'If every other place in that neighborhood is $900 and this one is $350, be careful. Cheap rent is the bait.',
  },
  {
    title: 'The landlord is always out of town',
    body: 'They say they are travelling for work, or out of state, and will mail you the keys after you send the deposit. There are no keys.',
  },
  {
    title: 'They rush you',
    body: '"Three other people want it, send the money today." Pressure to decide right now is a tactic, not a market condition.',
  },
  {
    title: 'They ask for your Social Security number before you have met',
    body: 'A program may need it eventually for an application. It does not need it in a text message from someone you have never spoken to.',
  },
  {
    title: 'A "second chance locator" charges you to see a list',
    body: 'Paying a fee for a list of felon-friendly apartments is usually paying for information that is free. This directory is free. So is 211.',
  },
  {
    title: 'A sober home offers to pay you to move in',
    body: 'If a recovery residence offers free rent, cash, or covers your travel to get you in the door, ask why. Some are paid for your insurance rather than for your recovery, and the housing disappears when the insurance does.',
  },
]

const GOOD_SIGNS = [
  'You can call a listed phone number and reach a real person who knows the program.',
  'They will tell you the rent, the deposit, and the house rules before you apply.',
  'They will let you visit, or meet you in person.',
  'They give you something in writing before any money changes hands.',
  'They answer "what happens if I lose my job" without getting annoyed.',
  'They are honest that they may not be able to take you.',
]

export default function HousingScamsPage() {
  return (
    <div className="bg-white dark:bg-slate-900">
      <SeoHead
        title="How to Spot a Fake Housing Listing — StreetRise"
        description="Housing scams target people with criminal records. Learn the warning signs, what a real program does, and what to do if you have already sent money."
        path="/housing/scams"
      >
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Housing after a record', path: '/housing' },
            { name: 'Spotting scams', path: '/housing/scams' },
          ]))}
        </script>
      </SeoHead>

      <Section containerSize="prose" className="pb-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
          How to spot a fake housing listing
        </h1>
        <p className="mt-4 text-lg text-slate-700 dark:text-slate-300">
          People looking for housing after a conviction get targeted. Scammers know you may
          be in a hurry, short on options, and carrying cash from release. Here is how to
          tell a real program from a fake one.
        </p>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <p className="text-base text-amber-900 dark:text-amber-200">
            <strong className="font-semibold">The one rule that catches most scams:</strong>{' '}
            never send money to someone you have not met, for a place you have not seen.
          </p>
        </div>
      </Section>

      <Section containerSize="prose" tone="gray" className="py-10">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Warning signs
        </h2>
        <ul className="mt-6 space-y-6">
          {RED_FLAGS.map((f) => (
            <li key={f.title} className="flex items-start gap-3">
              <XCircle className="mt-1 h-6 w-6 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-1 text-base text-slate-800 dark:text-slate-200">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section containerSize="prose" className="py-10">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          What a real program looks like
        </h2>
        <ul className="mt-4 space-y-3">
          {GOOD_SIGNS.map((s) => (
            <li key={s} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-700 dark:text-green-400" aria-hidden="true" />
              <span className="text-base text-slate-800 dark:text-slate-200">{s}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section containerSize="prose" tone="gray" className="py-10">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Checks you can run in five minutes
        </h2>
        <ol className="mt-4 list-decimal space-y-3 pl-6 text-base text-slate-800 dark:text-slate-200">
          <li>
            <strong>Search the address.</strong> If the same photos show up on a for-sale
            listing, or under a different name and price, it is stolen.
          </li>
          <li>
            <strong>Search the phone number.</strong> Put it in a search engine with the word
            "scam". Other people report these.
          </li>
          <li>
            <strong>Call the organization&rsquo;s main number</strong> — the one on their own
            website, not the one in the ad — and ask if the person you are talking to works
            there.
          </li>
          <li>
            <strong>Ask for the address and look at it on a map.</strong> An empty lot or a
            closed building answers the question.
          </li>
          <li>
            <strong>Call 211.</strong> They know the real programs in your county and will
            tell you if they have never heard of this one.
          </li>
        </ol>
      </Section>

      <Section containerSize="prose" className="py-10">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          If you already sent money
        </h2>
        <p className="mt-3 text-base text-slate-800 dark:text-slate-200">
          It is not your fault, and you are not the first. Do these things now:
        </p>
        <ul className="mt-4 space-y-3 text-base text-slate-800 dark:text-slate-200">
          <li>
            <strong>Contact whoever moved the money</strong> — your bank, the card issuer, or
            the app. Ask them to reverse it. The sooner you call, the better the chance.
          </li>
          <li>
            <strong>Keep everything.</strong> Screenshots, texts, the listing, the receipt.
            Do not delete the conversation.
          </li>
          <li>
            <strong>Report it to the FTC</strong> at{' '}
            <a
              href="https://reportfraud.ftc.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
            >
              reportfraud.ftc.gov
            </a>
            .
          </li>
          <li>
            <strong>Tell your local police</strong>, and if you are on supervision, tell your
            officer. Being scammed is not a violation, and they may know the name already.
          </li>
        </ul>

        <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <Flag className="mt-0.5 h-6 w-6 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          <p className="text-base text-slate-800 dark:text-slate-200">
            <strong className="font-semibold">Found a bad listing on StreetRise?</strong>{' '}
            Tell us and we will take it down. Email{' '}
            <a
              href="mailto:Info@streetrise.org"
              className="text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
            >
              Info@streetrise.org
            </a>
            . We check every report.
          </p>
        </div>

        <p className="mt-8 text-base">
          <Link
            to="/housing"
            className="font-semibold text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
          >
            Back to the housing directory
          </Link>
        </p>
      </Section>
    </div>
  )
}
