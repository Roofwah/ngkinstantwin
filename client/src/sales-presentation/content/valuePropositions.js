/**
 * Editable commercial narrative for Explore PUK.
 * Headings, statements, and hold timing live here — keep components free of copy.
 */

export const PRESENTATION_CONTACT = {
  email: 'chris@flowmarketing.com.au',
  mailto: 'mailto:chris@flowmarketing.com.au?subject=PUK%20inquiry',
  ctaLabel: 'Enquire now',
  brandLabel: 'Flow MKTG',
};

/** Fallback hold when an item omits holdMs (ms). */
export const PROPOSITION_HOLD_MS = 6500;

/**
 * Commercial story. Sequence loops until closed.
 * holdMs: longer for dense copy / CTA; shorter for brief lines.
 */
export const VALUE_PROPOSITIONS = [
  {
    id: 'puk',
    number: '01',
    heading: 'PUK',
    statement:
      'PUK exists to put sales promotion back where it has the greatest influence — at the point of purchase.',
    holdMs: 6500,
  },
  {
    id: 'opportunity',
    number: '02',
    heading: 'The Opportunity',
    statement:
      'Give customers another reason to choose, staff something powerful to sell with, and brands a way to drive sales without relying on discounting.',
    holdMs: 8500,
  },
  {
    id: 'experience',
    number: '03',
    heading: 'The Experience',
    statement: 'Visible enough to influence.\nSimple enough to enjoy.',
    holdMs: 5000,
  },
  {
    id: 'advantage',
    number: '04',
    heading: 'The Advantage',
    statement:
      'A promotional experience that connects brands, frontline staff and customers at the moment of purchase.',
    holdMs: 7000,
  },
  {
    id: 'possibilities',
    number: '05',
    heading: 'The Possibilities',
    statement:
      'From individual retail locations to national networks, PUK creates new possibilities for purchase-linked promotions.',
    holdMs: 7500,
  },
  {
    id: 'form-factor',
    number: '06',
    heading: 'Form Factor',
    statement:
      'Brilliantly Simple.\n\nCompact form, measuring just 94.5 × 62.8 mm (3.72 × 2.47 in), PUK can be easily mounted to a 40 mm EFTPOS terminal pole, LCD screen, desktop or beer font.',
    holdMs: 9000,
  },
  {
    id: 'lets-talk',
    number: '07',
    heading: "Let's Talk",
    statement: 'Discover what PUK could do for your business.',
    holdMs: 9500,
    showContact: true,
  },
];
