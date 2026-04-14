/**
 * products.js — Single source of truth for all QI Spine care plan data.
 *
 * IMPORTANT: This is the ONLY file you need to edit when adding, removing,
 * or updating a plan. All three store pages (index, detail, checkout) load
 * this file first, so changes here propagate everywhere automatically.
 *
 * Field reference:
 *   slug        {string}       Unique URL key used for routing between pages.
 *   name        {string}       Display name shown on cards and detail pages.
 *   tagline     {string}       Short subtitle shown below the name.
 *   description {string}       Full paragraph shown on the detail page.
 *   price       {number}       Base price in the currency below (per unit).
 *   currency    {string}       ISO 4217 code — used in GTM/analytics events.
 *   duration    {string}       Human-readable plan length ("3 Months").
 *   sessions    {string}       Human-readable session count ("12 Sessions").
 *   badge       {string|null}  Short label shown on the card badge, or null.
 *   badgeClass  {string}       CSS class for badge colour (badge-new / badge-popular / badge-value).
 *   category    {string}       GTM item_category value for analytics.
 *   features    {string[]}     Bullet points. First 3 shown on list card; all shown on detail.
 */
const PRODUCTS = [
  {
    slug: 'plan-posture-1m',
    name: 'Posture Correction Sprint',
    tagline: '30-Day Desk Worker Program',
    description:
      'Targeted 30-day plan for office workers suffering from neck stiffness, shoulder tension, and mild lower-back pain caused by prolonged sitting. Get personalized guidance from expert physiotherapists without leaving your desk.',
    price: 1299,
    currency: 'INR',
    duration: '1 Month',
    sessions: '4 Sessions',
    badge: 'New',
    badgeClass: 'badge-new',
    category: 'posture',
    features: [
      '4 live physiotherapy sessions',
      'Ergonomic desk setup guide',
      'Daily stretch reminder notifications',
      'Curated video exercise library',
      'WhatsApp support',
    ],
  },
  {
    slug: 'plan-basic-3m',
    name: 'Basic Care Plan',
    tagline: '3 Months of Guided Recovery',
    description:
      'Personalized exercise program with weekly physiotherapist check-ins for mild to moderate back pain. Designed to restore mobility, reduce pain, and build lasting habits for a healthier spine.',
    price: 2999,
    currency: 'INR',
    duration: '3 Months',
    sessions: '12 Sessions',
    badge: null,
    badgeClass: '',
    category: 'spine_care',
    features: [
      '12 live physiotherapy sessions',
      'Customized exercise video program',
      'Pain tracking dashboard',
      'WhatsApp support',
      'Monthly progress summary',
    ],
  },
  {
    slug: 'plan-standard-6m',
    name: 'Standard Care Plan',
    tagline: '6 Months Comprehensive Program',
    description:
      'Complete spine rehabilitation with bi-weekly sessions and a dedicated posture correction module. Ideal for moderate to severe back pain, post-physiotherapy maintenance, and long-term spinal health.',
    price: 5499,
    currency: 'INR',
    duration: '6 Months',
    sessions: '24 Sessions',
    badge: 'Most Popular',
    badgeClass: 'badge-popular',
    category: 'spine_care',
    features: [
      '24 live physiotherapy sessions',
      'Posture correction module',
      'Nutrition guidance for spine health',
      'Priority WhatsApp support',
      'Monthly progress report',
      'Access to group exercise sessions',
    ],
  },
  {
    slug: 'plan-advanced-12m',
    name: 'Advanced Care Plan',
    tagline: '12 Months Full Spine Rehab',
    description:
      'Our most comprehensive annual program for chronic back pain, sciatica, and post-surgery recovery. Includes surgeon consultation and a dedicated care manager who coordinates every aspect of your treatment journey.',
    price: 9999,
    currency: 'INR',
    duration: '12 Months',
    sessions: '48 Sessions',
    badge: 'Best Value',
    badgeClass: 'badge-value',
    category: 'spine_care',
    features: [
      '48 live physiotherapy sessions',
      'Surgeon consultation (1 included session)',
      'Advanced posture analysis report',
      'Dedicated care manager',
      'Unlimited WhatsApp support',
      'Quarterly progress reports',
      'Access to all group sessions',
    ],
  },
];
