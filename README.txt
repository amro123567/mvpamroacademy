Amro Academy - working MVP (static, no server)

Open index.html, or upload this folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, S3).
Keep the assets/ folder next to index.html.

What works
- Admin: students, parents, tutors, enrollments with price and tutor pay, packages, booking, session logs,
  payments, family ledgers, tutor payroll and payouts, practice tests (create, assign, results),
  automation rules with on/off switches, message log, settings, backup and restore.
- Tutor: own students only, booking inside the parent's free time, session log, earnings, practice results.
- Parent: weekly free time, schedule (reschedule / cancel with late-cancellation rule), billing, messages.
- Student: homework, timed practice tests with resume, scores and skill mastery.
- SAT Library (yearly subscription per student): 33 topics covering every Digital SAT skill area,
  each with a video slot, a study guide, practice with explanations, and resources.
  Students without a subscription can still book sessions; they see the library outline and
  free preview items only. Parents and students can request a subscription.
- Tutor hiring: a public "Apply to teach" form for university students (minimum SAT score,
  scores must add up, score-report link), then a pipeline: screening, demo lesson, contractor
  agreement, tutor account. Polite rejection messages.
- Tutor pay: tutors are contractors paid after each completed session. Each logged session
  creates a payout due (session price minus the academy commission); the admin pays it in one
  click. Tutors see price, academy cut, their share and paid/due status, plus their contract.
  Minimum SAT, commission % and standard price are in Settings.
- Admin library tools: add, rename or delete topics; add video links (unlisted YouTube, Vimeo,
  Google Drive, .mp4), guides, practice sets and resource links; mark items as free preview;
  activate, renew or cancel subscriptions; renewal reminders 30, 7 and 1 days before expiry.
  Plan name and price are in Settings.

Limits of a static version (the full system removes these)
- Data is saved in the browser you use (localStorage). Other devices do not see it. Use Settings > Download backup.
- No passwords: anyone with the link can open any portal. Do not put real family data on a public link.
- Messages are created in the log; you send each one with its Email or WhatsApp button. Reminders are
  created when the app is opened, not on a timer.
- Practice answer keys are inside the page code, so a technical student could read them.
- The library lock is enforced in the browser only, and video links can be shared, so it is not
  real content protection. The full system streams videos with signed, expiring links.
- Videos are links, not uploads: host them as unlisted YouTube/Vimeo or Google Drive files.

- The contractor agreement in the app is a short summary for the demo, not a legal contract.

Start with your own data: Settings > Erase everything and start empty (the library content is kept).
