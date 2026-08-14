// A single hand-drawn ink bird. Drawn in local space centered at (0,0),
// pointing along +X. Caller sets translate/rotate/scale.
//
// The flap is an eased curve (not a raw sine) so wings avoid the
// mechanical "door hinge" look: a quick downstroke, a held glide at the
// top, and organic asymmetry between the two wings.

function easeFlap(phase: number): number {
  // phase in [0,1). Returns wing elevation in roughly [-1, 1].
  const p = phase % 1
  // Downstroke is faster than the recovery -> asymmetric wingbeat.
  const shaped = p < 0.45 ? Math.pow(p / 0.45, 0.7) : 1 - Math.pow((p - 0.45) / 0.55, 1.6)
  return shaped * 2 - 1
}

export type BirdDraw = {
  phase: number // 0..1 wingbeat phase for this bird
  size: number // wingspan in px
  color: string
  alpha: number
  weight: number // stroke weight scale
  asym: number // per-bird asymmetry 0..1
}

export function drawBird(ctx: CanvasRenderingContext2D, b: BirdDraw) {
  const { size } = b
  const upA = easeFlap(b.phase)
  const upB = easeFlap(b.phase + 0.04 * b.asym) // slight lag on far wing

  const span = size
  const rise = span * 0.5
  const sweep = span * 0.42

  // Elevation of each wing tip.
  const tipAy = -upA * rise * (0.55 + 0.15 * b.asym)
  const tipBy = -upB * rise * (0.55 + 0.15 * (1 - b.asym))

  ctx.save()
  ctx.globalAlpha = b.alpha
  ctx.strokeStyle = b.color
  ctx.fillStyle = b.color
  ctx.lineJoin = "round"
  ctx.lineCap = "round"
  ctx.lineWidth = Math.max(0.75, span * 0.05 * b.weight)

  // Body: a small tapered core so distant birds still read as birds.
  const bodyLen = span * 0.16
  ctx.beginPath()
  ctx.moveTo(-bodyLen * 0.5, 0)
  ctx.quadraticCurveTo(bodyLen * 0.2, -span * 0.03, bodyLen * 0.7, 0)
  ctx.stroke()

  // Near wing (down/back to tip).
  ctx.beginPath()
  ctx.moveTo(bodyLen * 0.55, 0)
  ctx.quadraticCurveTo(-sweep * 0.15, -span * 0.02 + tipAy * 0.35, -sweep, tipAy)
  ctx.stroke()

  // Far wing.
  ctx.beginPath()
  ctx.moveTo(bodyLen * 0.55, 0)
  ctx.quadraticCurveTo(-sweep * 0.15, span * 0.02 + tipBy * 0.35, -sweep, tipBy + span * 0.06)
  ctx.stroke()

  ctx.restore()
}
