type Props = {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function Avatar({ name, src, size = 'md' }: Props) {
  const dims = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-lg' : 'h-10 w-10 text-sm'
  if (src) return <img src={src} alt={name} className={`rounded-full object-cover ${dims}`} />
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className={`rounded-full bg-primary-600 text-white inline-flex items-center justify-center ${dims}`}>{initials}</div>
  )
}
