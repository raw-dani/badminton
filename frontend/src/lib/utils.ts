import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const formatFullDate = formatDate

export function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'READY':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'COMPLETED':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    case 'WAITING_APPROVAL':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse'
    case 'DISPUTED':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/40'
    case 'PENDING_ACCEPTANCE':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    case 'CANCELLED':
    case 'REJECTED':
      return 'bg-slate-700/40 text-slate-400 border-slate-600/30'
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700'
  }
}
