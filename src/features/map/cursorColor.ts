export function colorParaUsuario(usuarioId: number): string {
  const hue = (usuarioId * 47) % 360
  return `hsl(${hue}, 85%, 65%)`
}
