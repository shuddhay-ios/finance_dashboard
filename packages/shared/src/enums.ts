// The allowed values for each fixed-choice field, defined once. The API's Mongoose
// schemas and the web app's dropdowns both read from here, so they can't drift apart.

export const TRANSACTION_CATEGORIES = ['Revenue', 'Expense'] as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const TRANSACTION_STATUSES = ['Paid', 'Pending'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

// The dataset has no currency field; every amount is treated as USD.
export const CURRENCIES = ['USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const USER_ROLES = ['analyst', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];
