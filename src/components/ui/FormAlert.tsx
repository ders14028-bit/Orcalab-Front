export function FormAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-control border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-red-300"
    >
      {message}
    </div>
  )
}
