-- ================================================================
-- StreetRise — Migration 003: Seed Data (dev/staging only)
-- ================================================================

-- FAQ seed
INSERT INTO faq (question, answer, category, "order", is_active) VALUES
  ('How do I find a shelter?',
   'Use the map on the home screen. Tap "Find Resources Near Me" and filter by "Shelter". Green markers mean beds are available now.',
   'finding_resources', 1, TRUE),

  ('Do I need ID to access services?',
   'It depends on the provider. Each listing shows whether ID is required. Many shelters offer no-ID options — filter by "No ID Required" on the map.',
   'access', 2, TRUE),

  ('How current is the bed availability information?',
   'Providers update their bed counts directly through the StreetRise portal. Most update at least twice a day. The time of the last update is shown on each listing.',
   'reliability', 3, TRUE),

  ('Can I book anonymously?',
   'Yes. You can request a spot without creating an account. We only ask for your name and an optional phone number so the provider can confirm.',
   'privacy', 4, TRUE),

  ('How do I list my organization on StreetRise?',
   'Click "Provider Login" in the top navigation, create an account, and complete the onboarding form. Our team reviews all new providers within 2 business days.',
   'providers', 5, TRUE),

  ('What is the Work Exchange program?',
   'Work Exchange connects volunteers and job-seekers with local organizations. Opportunities range from fully volunteer to paid positions and skills trades.',
   'work_exchange', 6, TRUE),

  ('Is StreetRise free to use?',
   'Yes — completely free for people seeking resources. Provider listings are also free. We are funded by community donations.',
   'general', 7, TRUE),

  ('How do I report incorrect information?',
   'Tap "Report an issue" on any resource listing. Our moderation team reviews reports within 24 hours.',
   'accuracy', 8, TRUE),

  ('I am in immediate danger. What should I do?',
   'If you are in immediate danger, call 911. For domestic violence crisis, call the National DV Hotline: 1-800-799-7233. For mental health crisis, call 988.',
   'crisis', 9, TRUE),

  ('How are providers verified?',
   'Every provider goes through a manual verification process: we confirm organizational legitimacy, contact information, and that listings are accurate before approving.',
   'trust', 10, TRUE);
