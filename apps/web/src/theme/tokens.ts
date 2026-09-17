// Design tokens taken from the Figma "Finance Dashboard UI". Every colour, radius and size
// used in the app comes from here, so the look can be changed in one place.
export const tokens = {
  color: {
    canvas: '#282C35',
    surface: '#1C1F26',
    surfaceRaised: '#2F333D',
    border: '#353945',
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A8B4',
    textMuted: '#6E7482',
    // Green: income, positive numbers, "Paid", primary actions.
    brand: '#1FCB4F',
    brandSoft: 'rgba(31, 203, 79, 0.14)',
    // Yellow: expenses, "Pending".
    warning: '#FFC01E',
    warningSoft: 'rgba(255, 192, 30, 0.14)',
    // Red: a negative net and errors.
    danger: '#FF5B5B',
    dangerSoft: 'rgba(255, 91, 91, 0.14)',
  },
  radius: { sm: 6, md: 10, lg: 14 },
  font: {
    family: '"Poppins", "Segoe UI", system-ui, -apple-system, sans-serif',
  },
  layout: {
    sidebarWidth: 232,
    // Below this width the table turns into cards and the sidebar hides.
    mobileMaxWidth: 767,
  },
} as const;
