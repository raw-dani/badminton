import React from 'react'

interface GoldShuttlecockProps {
  className?: string
  size?: number
}

export const GoldShuttlecock: React.FC<GoldShuttlecockProps> = ({
  className = 'w-6 h-6',
  size,
}) => {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined

  return (
    <img
      src="/logo.png"
      alt="Badminton Champion League Logo"
      className={`object-contain drop-shadow ${className}`}
      style={style}
    />
  )
}
