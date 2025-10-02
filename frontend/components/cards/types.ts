export type ToolEnvelope = {
  ok?: boolean
  data?: any
  error?: string
  stderr?: string | null
  tool?: string
}

export type ToolCardProps = {
  tool?: string
  envelope: ToolEnvelope | null
}
