# Dynamic Flocking Choreography

This pass removes the rigid line formation. The six extracted birds follow a broad **right-to-left ascending-and-descending arc** with delayed follow behavior.

| Behavior | Implementation |
| --- | --- |
| Lead path | Starts low-right, rises through the center of the field, then drops gently toward the left exit. |
| Follower paths | Each bird follows the leader’s route 0.04–0.17 normalized-time units later rather than holding a fixed x/y offset. |
| Formation | The group compresses while climbing and stretches gently at the top of the arc. Small lateral variation prevents a row-like silhouette. |
| Wing timing | Each bird has its own 0.20–0.33 Hz wingbeat and phase offset, so flaps drift rather than fire together. |
| Group bank | Every contour banks modestly with the tangent of its own curved path, not a shared screen-direction rotation. |

The loop remains 12 seconds, begins blank, carries one flock movement, and ends blank.
