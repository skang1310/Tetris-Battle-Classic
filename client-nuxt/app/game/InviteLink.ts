/** Clipboard fallback is required on local-network HTTP Safari pages. */
export async function copyInviteLink(url: string): Promise<boolean> {
  const desktop = (window as any).webkit?.messageHandlers?.desktop
  if (desktop) { desktop.postMessage({ action:'copyLink', url }); return true }
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); return true } } catch {}
  const field = document.createElement('textarea'), focused = document.activeElement as HTMLElement | null
  field.value = url; field.readOnly = true; field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px'
  document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, url.length)
  let copied = false
  try { copied = document.execCommand('copy') } catch {}
  field.remove(); focused?.focus(); return copied
}
export async function shareInviteLink(url: string): Promise<'shared' | 'copied' | 'cancelled' | 'manual'> {
  const desktop = (window as any).webkit?.messageHandlers?.desktop
  if (desktop) { desktop.postMessage({ action:'shareLink', url }); return 'shared' }
  if (navigator.share) {
    try { await navigator.share({ title:'Tetris Battle 초대', text:'같은 Wi-Fi에서 테트리스 한 판!', url }); return 'shared' }
    catch (error) { if ((error as Error).name === 'AbortError') return 'cancelled' }
  }
  return await copyInviteLink(url) ? 'copied' : 'manual'
}
