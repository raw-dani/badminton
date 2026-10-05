/**
 * soundNotification.ts
 * Web Audio API synthesizer & Haptic Vibration helper for mobile & desktop browsers.
 * No external audio assets required; produces crisp, lightweight chimes and mobile vibrations.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

// Unlock audio on first user touch/click (mandatory for mobile browser autoplay policy)
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext()
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
    } catch {}
    window.removeEventListener('click', unlockAudio)
    window.removeEventListener('touchstart', unlockAudio)
  }
  window.addEventListener('click', unlockAudio, { passive: true })
  window.addEventListener('touchstart', unlockAudio, { passive: true })
}

/**
 * Checks if sound notification is enabled by user preference (default: true)
 */
export function isNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const saved = localStorage.getItem('bcl_sound_enabled')
  return saved === null ? true : saved === 'true'
}

/**
 * Toggle sound notification preference
 */
export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('bcl_sound_enabled', enabled ? 'true' : 'false')
}

/**
 * Play general notification chime (Match invitation, Score approval, Completion)
 * Tone: Pleasant ascending harmonic chime (587Hz D5 -> 880Hz A5)
 */
export function playNotificationSound(): void {
  if (!isNotificationSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.12) // A5

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.25, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.4)
  } catch (e) {
    // Autoplay or audio restriction silently caught
  }
}

/**
 * Play team chat message pop sound
 * Tone: Modern subtle bubble pop (700Hz -> 1050Hz)
 */
export function playChatSound(): void {
  if (!isNotificationSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(698.46, now) // F5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.08) // C6

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.22)
  } catch (e) {}
}

/**
 * Trigger mobile haptic vibration using Browser Navigator Vibration API
 * Supported on mobile Chrome, Android WebView, Firefox mobile, Opera mobile, etc.
 */
export function triggerHaptic(pattern: number | number[] = [80, 50, 80]): void {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch (e) {}
}

/**
 * Combined sound + vibration for general platform notifications
 */
export function notifyGeneralNotification(): void {
  playNotificationSound()
  triggerHaptic([120, 80, 160])
}

/**
 * Combined sound + vibration for new incoming team chat message
 */
export function notifyTeamChatMessage(): void {
  playChatSound()
  triggerHaptic([70, 40, 70])
}
