import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/support')({
  component: SupportPage,
})

const FAQS = [
  {
    question: 'What is Golden Hour?',
    answer:
      'Golden Hour is a happy hour discovery app that helps you find the best drink and food deals at bars and restaurants near you. Browse venues, view daily specials, and save your favorites — all in one place.',
  },
  {
    question: 'How do I find happy hours near me?',
    answer:
      'Open the app and allow location access, or search for your city. Venues with active happy hour deals will appear on the map and in the list view. You can filter by day, time, and deal type to find exactly what you\'re looking for.',
  },
  {
    question: 'Is Golden Hour free to use?',
    answer: 'Yes — Golden Hour is completely free for users. Browse venues, view deals, and save favorites at no cost.',
  },
  {
    question: 'How do I save a venue to my favorites?',
    answer:
      'Tap the heart icon on any venue card or detail page to save it to your favorites. You can view all your saved venues in the Favorites tab.',
  },
  {
    question: 'How do I suggest a venue or report incorrect information?',
    answer:
      'On any venue detail page, tap "Suggest an edit" to submit a correction or update. We review all submissions and update the app regularly. You can also email us directly at lisamarieherzberg@gmail.com.',
  },
  {
    question: 'Why is a venue\'s happy hour information out of date?',
    answer:
      'Happy hour schedules change frequently. We do our best to keep listings current, but we recommend confirming details with the venue directly before you go. If you spot something wrong, please use the "Suggest an edit" option on the venue page.',
  },
  {
    question: 'Which cities are available?',
    answer:
      'Golden Hour is currently available in select cities and expanding regularly. If your city isn\'t listed yet, check back soon — or email us to request it.',
  },
  {
    question: 'How do I delete my account?',
    answer:
      'To delete your account and all associated data, email us at lisamarieherzberg@gmail.com with the subject line "Delete my account." We will process your request within 30 days.',
  },
]

function SupportPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-heading text-3xl font-semibold text-dark">Support</h1>

        <section className="mt-6 space-y-3 text-sm text-dark leading-relaxed">
          <p>
            <strong>Golden Hour</strong> is a happy hour discovery app that makes it easy to find
            drink and food specials at bars and restaurants near you. Whether you&apos;re a local
            looking for your next go-to spot or visiting a new city, Golden Hour helps you make the
            most of happy hour every day of the week.
          </p>
          <p>
            If you need help or have a question not answered below, reach out to us directly at{' '}
            <a
              href="mailto:lisamarieherzberg@gmail.com"
              className="text-primary underline underline-offset-2"
            >
              lisamarieherzberg@gmail.com
            </a>
            . We typically respond within 1–2 business days.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-heading text-xl font-semibold text-dark">
            Frequently Asked Questions
          </h2>

          <div className="mt-6 space-y-6">
            {FAQS.map((faq) => (
              <div
                key={faq.question}
                className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
              >
                <p className="font-medium text-dark">{faq.question}</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-xl border border-border/70 bg-muted/40 p-4 text-sm text-dark space-y-1">
          <p className="font-medium">Still need help?</p>
          <p className="text-muted-foreground">
            Email us at{' '}
            <a
              href="mailto:lisamarieherzberg@gmail.com"
              className="text-primary underline underline-offset-2"
            >
              lisamarieherzberg@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
