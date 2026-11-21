const makeColor = (fill, text) => ({ fill, soft: `${fill}24`, text });

export const PALETTE = [
  makeColor('#2a78d6', '#1b559c'),
  makeColor('#eb6834', '#9f3410'),
  makeColor('#1baf7a', '#0b6847'),
  makeColor('#eda100', '#704a00'),
  makeColor('#e87ba4', '#a62b5a'),
  makeColor('#008300', '#006100'),
  makeColor('#4a3aa7', '#3b2e8a'),
  makeColor('#e34948', '#a82424'),
];

export const KNOWN_CATEGORIES = {
  Dining: PALETTE[1],
  Groceries: PALETTE[2],
  Transport: PALETTE[0],
  Entertainment: PALETTE[6],
  Shopping: PALETTE[4],
  Health: PALETTE[7],
  Utilities: PALETTE[3],
  Other: makeColor('#7c8aa5', '#3f4a61'),
  Transfer: makeColor('#7c8aa5', '#3f4a61'),
  Salary: makeColor('#1baf7a', '#0b6847'),
  'Other income': makeColor('#1baf7a', '#0b6847'),
  Uncategorized: makeColor('#a3acbf', '#4b5568'),
};

export const DEFAULT_QUICK_CATEGORIES = [
  'Dining',
  'Groceries',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health',
  'Utilities',
];

export const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Gift',
  'Reimbursement',
  'Loan repayment',
  'Sale',
  'Business',
  'Interest',
  'Other income',
];

export function getCategoryColor(name) {
  if (!name) return KNOWN_CATEGORIES.Uncategorized;
  const known = KNOWN_CATEGORIES[name];
  if (known) return known;

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export function findMatchingRuleCategory(rules = [], merchant = '') {
  const normalized = merchant.trim().toLowerCase();
  if (!normalized) return null;

  let bestRule = null;
  let bestLength = 0;

  for (const rule of rules) {
    const pattern = (rule.merchant_pattern || '').trim().toLowerCase();
    if (!pattern || !normalized.includes(pattern)) continue;

    const isEarlier =
      bestRule !== null &&
      pattern.length === bestLength &&
      (rule.created_at ?? '') < (bestRule.created_at ?? '');

    if (pattern.length > bestLength || isEarlier) {
      bestRule = rule;
      bestLength = pattern.length;
    }
  }

  return bestRule?.category ?? null;
}

export function inferCategoryFromHistory(merchant = '', transactions = [], rules = []) {
  const normalized = merchant.trim().toLowerCase();
  if (!normalized) return null;

  for (const tx of transactions) {
    const txMerchant = (tx.merchant ?? '').trim().toLowerCase();
    const category = (tx.category ?? '').trim();
    if (
      txMerchant === normalized &&
      category &&
      category.toLowerCase() !== 'uncategorized'
    ) {
      return category;
    }
  }

  return findMatchingRuleCategory(rules, merchant);
}
