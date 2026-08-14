# Coordinated Natural Flock Choreography

The flock moves as a single leftward group, not as six unrelated trajectories. One shared group spline controls the entire formation from right entry to left exit.

| Role | Contour | Formation offset from leader | Scale | Wing phase offset |
| --- | --- | --- | --- | --- |
| Leader | C | 0, 0 | 430 px | 0.00 rad |
| High wingman | B | +145 px, -88 px | 225 px | +0.32 rad |
| Low wingman | C | +175 px, +95 px | 250 px | +0.58 rad |
| Upper follower | A | +280 px, -175 px | 170 px | +0.85 rad |
| Mid follower | D | +330 px, -35 px | 155 px | +1.10 rad |
| Lower follower | D | +300 px, +185 px | 130 px | +1.32 rad |

The leader occupies the left/front edge of the group. Followers trail to the right and modulate a few pixels around their formation offset, preserving a relaxed, coherent flock silhouette. All contour assets share the leftward orientation. Wingbeats share a group cadence, with only modest phase separation.
