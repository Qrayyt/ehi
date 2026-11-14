export function pluralizeKisses(value) {
  const absolute = Math.abs(value) % 100;
  const last = absolute % 10;

  if (absolute > 10 && absolute < 20) return 'поцелуев';
  if (last === 1) return 'поцелуй';
  if (last > 1 && last < 5) return 'поцелуя';
  return 'поцелуев';
}

export function formatKisses(value, emoji = false) {
  return emoji ? `${value} 💋` : `${value} ${pluralizeKisses(value)}`;
}
