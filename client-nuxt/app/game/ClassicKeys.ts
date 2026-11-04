// Physical controls stay consistent with a Korean or other non-Latin input source.
export function classicKey(event: Pick<KeyboardEvent, 'code' | 'key'>): string {
    if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3).toLowerCase()
    if (/^Digit[123789]$/.test(event.code)) return event.code.slice(5)
    if (event.code === 'Space') return ' '
    if (event.code.startsWith('Shift')) return 'Shift'
    return event.key.length === 1 ? event.key.toLowerCase() : event.key
}
