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
  // Two eased flap phases, slightly offset, so the two wings are never a
  // perfectly rigid mirror -> reads as a live bird, not a folded paper V.
  const upL = easeFlap(b.phase)
  const upR = easeFlap(b.phase + 0.05 * (0.5 + b.asym)) // far wing lags a touch

  const span = size
  const halfSpan = span * 0.5
  const rise = span * (0.34 + 0.06 * b.asym) // vertical travel of the wingtips

  // Wingtip elevations (negative = up on canvas). A glide frame sits near 0.
  const tipLy = -upL * rise
  const tipRy = -upR * rise
  // Elbow (wrist) points give the wing an S-curve rather than a straight arm.
  const elbowLift = 0.42
  const elbowLx = -halfSpan * 0.34
  const elbowRx = halfSpan * 0.34
  const elbowLy = tipLy * elbowLift - span * 0.02
  const elbowRy = tipRy * elbowLift - span * 0.02
  const noseY = -span * 0.015

  ctx.save()
  ctx.globalAlpha = b.alpha
  ctx.strokeStyle = b.color
  ctx.fillStyle = b.color
  ctx.lineJoin = "round"
  ctx.lineCap = "round"
  ctx.lineWidth = Math.max(0.8, span * 0.055 * b.weight)

  // ONE continuous ink stroke: left wingtip -> wrist -> head -> wrist -> right
  // wingtip. A single flowing contour reads far more elegant at any scale than
  // two disconnected wing lines.
  ctx.beginPath()
  ctx.moveTo(-halfSpan, tipLy)
  ctx.quadraticCurveTo(elbowLx, elbowLy, span * 0.02, noseY)
  ctx.quadraticCurveTo(elbowRx, elbowRy, halfSpan, tipRy)
  ctx.stroke()

  // Tiny body accent at the head so near birds gain a little weight/direction.
  if (span > 9) {
    ctx.beginPath()
    ctx.ellipse(span * 0.05, noseY + span * 0.01, span * 0.07, span * 0.045, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}
