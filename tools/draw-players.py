import math, os, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
INK = "#000"
FRAME = "#22303f"
GRIP = "#f4f4f0"
STRINGS = "#eef1f4"
CLOTH = "#ffffff"
CLOTH_EDGE = "#c3cad3"
SOLE = "#8d97a3"
EYE = "#241a15"
MOUTH = "#6b3326"
BLUSH = "#ff7a7a"
SHADE = "#000000"


def write(name, w, h, body):
    with open(os.path.join(OUT, name + ".svg"), "w") as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>\n')


def mirrored(body, w):
    return f'<g transform="translate({w} 0) scale(-1 1)">{body}</g>'


def bent(points, width=4.6, color=INK):
    d = "M" + "L".join(f"{x} {y}" for x, y in points)
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'


def arm(points, hand=True):
    hx, hy = points[-1]
    return bent(points) + (f'<circle cx="{hx}" cy="{hy}" r="2.6" fill="{INK}"/>' if hand else "")


def sleeve(points):
    (sx, sy), (ex, ey) = points[0], points[1]
    ux, uy = ex - sx, ey - sy
    n = (ux * ux + uy * uy) ** 0.5
    tx, ty = round(sx + ux / n * 4.2, 2), round(sy + uy / n * 4.2, 2)
    return bent([(sx, sy), (tx, ty)], 7.4)


def wristband(points):
    (ex, ey), (hx, hy) = points[-2], points[-1]
    ux, uy = hx - ex, hy - ey
    n = (ux * ux + uy * uy) ** 0.5
    ax, ay = hx - ux / n * 4.2, hy - uy / n * 4.2
    bx, by = hx - ux / n * 2.4, hy - uy / n * 2.4
    return f'<path d="M{ax:.2f} {ay:.2f}L{bx:.2f} {by:.2f}" stroke="{CLOTH}" stroke-width="5.2" stroke-linecap="butt"/>'


def racket(hand, head, rx, ry, key):
    hx, hy = hand
    cx, cy = head
    ux, uy = cx - hx, cy - hy
    n = (ux * ux + uy * uy) ** 0.5
    ux, uy = ux / n, uy / n
    angle = round(math.degrees(math.atan2(uy, ux)) - 90, 1)
    grip_end = (hx - ux * 2.5, hy - uy * 2.5)
    throat = (cx - ux * (ry + 3.2), cy - uy * (ry + 3.2))
    rim = (cx - ux * ry, cy - uy * ry)
    px, py = -uy, ux
    strings = "".join(
        f'<path d="M{cx - 12} {cy + d}h24M{cx + d} {cy - 12}v24"/>' for d in (-6, -4, -2, 0, 2, 4, 6)
    )
    return (
        f'<path d="M{grip_end[0]:.2f} {grip_end[1]:.2f}L{throat[0]:.2f} {throat[1]:.2f}" stroke="{FRAME}" stroke-width="2.2" stroke-linecap="round"/>'
        f'<path d="M{grip_end[0]:.2f} {grip_end[1]:.2f}L{hx + ux * 2:.2f} {hy + uy * 2:.2f}" stroke="{GRIP}" stroke-width="2.6" stroke-linecap="round"/>'
        f'<path d="M{throat[0] + px * 0.2:.2f} {throat[1] + py * 0.2:.2f}L{rim[0] + px * 2.8:.2f} {rim[1] + py * 2.8:.2f}M{throat[0] - px * 0.2:.2f} {throat[1] - py * 0.2:.2f}L{rim[0] - px * 2.8:.2f} {rim[1] - py * 2.8:.2f}" stroke="{FRAME}" stroke-width="1.6" stroke-linecap="round"/>'
        f'<clipPath id="head-{key}"><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" transform="rotate({angle} {cx} {cy})"/></clipPath>'
        f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" transform="rotate({angle} {cx} {cy})" fill="{STRINGS}" fill-opacity=".45"/>'
        f'<g clip-path="url(#head-{key})" stroke="#7d8996" stroke-width=".55">{strings}</g>'
        f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" transform="rotate({angle} {cx} {cy})" fill="none" stroke="{FRAME}" stroke-width="2.3"/>'
    )


W, H = 60, 74

HEAD = (22, 12.5, 8.6)
HAIR_TOP = "M13.6 14.2q-1.4-10.2 8.6-10.8q8.8.2 9.4 7.6q-3.2-1.6-6.2-1q-1 2.6-4.4 2.2q-2.8 3.4-7.4 2z"
HAIR_BUZZ = "M13.8 12.8q-.2-8.6 8.2-9q8.2.2 9.2 6.6q-4.6-1.8-9-.8q-4.6 1-8.4 3.2z"
FACE = (
    f'<ellipse cx="25.4" cy="13.6" rx="1.05" ry="1.35" fill="{EYE}"/>'
    f'<ellipse cx="29.2" cy="13.4" rx=".95" ry="1.3" fill="{EYE}"/>'
    f'<circle cx="25.7" cy="13.1" r=".35" fill="#fff"/><circle cx="29.45" cy="12.9" r=".32" fill="#fff"/>'
    f'<path d="M25 17q1.5 1.2 3 0" fill="none" stroke="{MOUTH}" stroke-width=".9" stroke-linecap="round"/>'
    f'<ellipse cx="23.6" cy="16.3" rx="1.7" ry="1.1" fill="{BLUSH}" opacity=".32"/>'
)
LEGS = [[(18.6, 44), (16.2, 54), (15.4, 63)], [(26.4, 44), (29.6, 53.5), (31.6, 62.6)]]




def sneaker(x, y):
    return (
        f'<path d="M{x - 3.4} {y - 3.2}q0-1.4 1.4-1.4h3.4q1 2 3.8 2.6q3.6.6 3.6 2.8v.6h-12.2z" fill="{CLOTH}" stroke="{CLOTH_EDGE}" stroke-width=".8"/>'
        f'<path d="M{x - 3.4} {y + 1.6}h12.2" stroke="{SOLE}" stroke-width="1.4" stroke-linecap="round"/>'
        f'<path d="M{x - .6} {y - 1.2}l2.2 1.6" stroke="{SOLE}" stroke-width=".7" stroke-linecap="round"/>'
    )


def socks():
    out = ""
    for leg in LEGS:
        (kx, ky), (fx, fy) = leg[1], leg[2]
        ux, uy = fx - kx, fy - ky
        n = (ux * ux + uy * uy) ** 0.5
        sx, sy = fx - ux / n * 4.4, fy - uy / n * 4.4
        out += f'<path d="M{sx:.2f} {sy:.2f}L{fx:.2f} {fy:.2f}" stroke="{CLOTH}" stroke-width="5.4" stroke-linecap="butt"/>'
    return out


SKIN = (
    bent(LEGS[0], 5.4) + bent(LEGS[1], 5.4)
    + f'<rect x="19.2" y="17" width="5.8" height="7" fill="{INK}"/>'
    + f'<circle cx="{HEAD[0]}" cy="{HEAD[1]}" r="{HEAD[2]}" fill="{INK}"/>'
    + f'<ellipse cx="18.2" cy="14.6" rx="1.8" ry="2.2" fill="{INK}"/>'
)
SHIRT = {
    "tee": "M12.8 23.6q2-3.2 6.6-3.6q3.4 1.6 6.4 0q4.4.4 6.2 3.4l.8 19.8H12.2z",
    "tank": "M14.2 22.6l2.8-2.2q4.6 3.2 9.8.2l2.8 2.2q1 5.6.6 9.6q1.8 5 2 10.6H11.6q.2-5.6 2-10.6q-.6-4 .6-9.8z",
    "fitted": "M14.8 22.6l2.4-2.2q4.6 3.4 9.4.2l2.6 2.2q1.2 6 .6 10q2 4.4 2.4 9.4H12.4q.4-5 2.4-9.4q-.8-4.2 0-10.2z",
}
TRIM = {
    "tee": f'<path d="M19.4 20q2.8 2.8 6.4 0l-1.4 3.4h-3.6z" fill="{CLOTH}" stroke="{CLOTH_EDGE}" stroke-width=".5"/>',
    "tank": f'<path d="M17 20.4q4.8 3.4 9.8.2" fill="none" stroke="{CLOTH}" stroke-width="1.1"/>'
    f'<path d="M14.4 22.6q1.2 5.2-.2 9.6M29.6 22.6q-1 5.2.4 9.6" fill="none" stroke="{CLOTH}" stroke-width=".8"/>',
    "fitted": f'<path d="M17.2 20.4q4.6 3.4 9.4.2" fill="none" stroke="{CLOTH}" stroke-width="1.1"/>',
}


def collar(top):
    return (
        f'<clipPath id="torso-{top}"><path d="{SHIRT[top]}"/></clipPath>'
        f'<path clip-path="url(#torso-{top})" d="M27.4 18q4.6 10 4 26H40V18z" fill="{SHADE}" opacity=".14"/>'
        + TRIM[top]
    )


BOTTOMS = {
    "man": f'<path d="M12 42.4h21.2l1 11.6h-9.8l-1.8-4.6l-1.8 4.6H11.2z" fill="{CLOTH}" stroke="{CLOTH_EDGE}" stroke-width="1"/>'
    f'<path d="M24.6 44v6" stroke="{CLOTH_EDGE}" stroke-width=".6"/>',
    "woman": f'<path d="M12.2 42.2h20.4l4.6 9.6q-12.6 2.4-25.8 0z" fill="{CLOTH}" stroke="{CLOTH_EDGE}" stroke-width="1"/>'
    f'<path d="M16.4 43.4l-2.6 8.6M21 43.4l-.8 9.2M25.6 43.4l1.2 9.2M29.8 43.4l3.2 8.6" stroke="{CLOTH_EDGE}" stroke-width=".6"/>',
}
LEG_SHADE = f'<path d="M27.2 46L30.2 54L32 61" fill="none" stroke="{SHADE}" stroke-opacity=".16" stroke-width="2" stroke-linecap="round"/>'
CAP_DOME = "M13.2 11.4q-.4-9 8.8-9.2q8.8.2 9.2 8.4z"
CAP_SEAMS = (
    f'<path d="M13.2 11.4q8.4-2.6 18-.8" fill="none" stroke="{SHADE}" stroke-opacity=".22" stroke-width=".9"/>'
    f'<path d="M22 2.4q-1.8 4.2-1.6 8.6" fill="none" stroke="{SHADE}" stroke-opacity=".14" stroke-width=".7"/>'
    f'<circle cx="22" cy="2.6" r="1" fill="{SHADE}" fill-opacity=".2"/>'
)
CAP_SHADE = {
    "cap": CAP_SEAMS + f'<path d="M29.4 11.6q4-.4 8 1" fill="none" stroke="{SHADE}" stroke-opacity=".25" stroke-width=".8"/>',
    "cap-back": CAP_SEAMS + f'<path d="M14.6 11.8q-4-.4-8 1" fill="none" stroke="{SHADE}" stroke-opacity=".25" stroke-width=".8"/>'
    f'<path d="M27 10.9q1.8-3 3.8-.2z" fill="{SHADE}" fill-opacity=".32"/>',
}
GROUND = f'<ellipse cx="23" cy="69.6" rx="16" ry="3.4" fill="{SHADE}" opacity=".22"/>'

BODY = {
    "skin": SKIN,
    "hair-short": f'<path d="{HAIR_TOP}" fill="{INK}"/><path d="M13.6 14.2q-.6 3.8 1.6 5.6q.4-3 1.2-5.2z" fill="{INK}"/>',
    "hair-buzz": f'<path d="{HAIR_BUZZ}" fill="{INK}"/>',
    "hair-ponytail": f'<path d="{HAIR_TOP}" fill="{INK}"/>'
    f'<path d="M15 8.6q-6.4-.8-8.4 5.6q-1.4 5 .6 12.4q1.6-3.6 3.2-5.8q1.6-3.6 1.4-7.6q1.2-2.6 3.6-3.4z" fill="{INK}"/>'
    f'<path d="M13.6 14.2q-.4 3.4 1.2 5.2l.8-4.8z" fill="{INK}"/>',
    "hair-bun": f'<path d="{HAIR_TOP}" fill="{INK}"/>'
    f'<circle cx="12.6" cy="6.6" r="4.6" fill="{INK}"/>'
    f'<path d="M13.6 14.2q-.4 3.4 1.2 5.2l.8-4.8z" fill="{INK}"/>',
    "band-headband": f'<path d="M14 10.2q8.4-6.2 17.4-.6" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>'
    f'<path d="M14.4 10.4q-2.6 1.6-4 4.4M14.6 10.6q-1.6 2.4-1.8 5.4" fill="none" stroke="{INK}" stroke-width="1.5" stroke-linecap="round"/>',
    "band-cap": f'<path d="{CAP_DOME}" fill="{INK}"/>'
    f'<path d="M29 9.8q5.8-.6 9.6 2.2q-.4 1-1.6 1.2q-3.6-1-8.2-.6z" fill="{INK}"/>',
    "band-cap-back": f'<path d="{CAP_DOME}" fill="{INK}"/>'
    f'<path d="M15 9.8q-5.8-.6-9.6 2.2q.4 1 1.6 1.2q3.6-1 8.2-.6z" fill="{INK}"/>',
}
for top, path in SHIRT.items():
    BODY[f"shirt-{top}"] = f'<path d="{path}" fill="{INK}"/>'
    BODY[f"collar-{top}"] = collar(top)
for hat, shade in CAP_SHADE.items():
    BODY[f"shade-{hat}"] = shade
for kind in ("man", "woman"):
    BODY[f"gear-{kind}"] = GROUND + socks() + LEG_SHADE + sneaker(14.6, 66.2) + sneaker(31.2, 66) + BOTTOMS[kind] + FACE

BACK, FRONT = (15.2, 24.6), (29.6, 24.6)
POSES = {
    "ready": (
        [BACK, (15.6, 32.4), (23.4, 36.6)],
        [FRONT, (31.6, 31.8), (26.6, 36.4)],
        lambda hand: racket(hand, (38.8, 27.4), 5.2, 6.8, "ready"),
    ),
    "rally-a": (
        [BACK, (10.2, 29.4), (5.6, 33.8)],
        [FRONT, (35.4, 30.6), (41.6, 35.4)],
        lambda hand: racket(hand, (49.6, 42.8), 6.2, 8.2, "rally-a"),
    ),
    "rally-b": (
        [BACK, (11.2, 31.4), (12.6, 37.8)],
        [FRONT, (36.4, 27.8), (38.2, 20.2)],
        lambda hand: racket(hand, (45.4, 8.6), 5.4, 7.2, "rally-b"),
    ),
    "challenge": (
        [BACK, (12.4, 16.8), (11.6, 8.2)],
        [FRONT, (32.8, 31.6), (33.8, 38.4)],
        lambda hand: racket(hand, (38.4, 52.8), 5, 6.8, "challenge"),
    ),
    "point": (
        [BACK, (10, 17.4), (7.4, 9.2)],
        [FRONT, (35.2, 18.4), (37.6, 10.6)],
        lambda hand: racket(hand, (44.6, 7.4), 4.8, 6.4, "point"),
    ),
}


def finger(hand):
    hx, hy = hand
    return f'<path d="M{hx} {hy - 1}V{hy - 6}" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>'


for side, flip in (("r", False), ("l", True)):
    wrap = (lambda b: mirrored(b, W)) if flip else (lambda b: b)
    for name, body in BODY.items():
        write(f"{name}-{side}", W, H, wrap(body))
    for pose, (back, front, gear) in POSES.items():
        extra = finger(back[-1]) if pose == "challenge" else ""
        write(f"arms-{pose}-{side}", W, H, wrap(arm(back) + arm(front) + extra))
        write(f"sleeves-{pose}-{side}", W, H, wrap(sleeve(back) + sleeve(front)))
        write(f"gear-{pose}-{side}", W, H, wrap(wristband(front) + gear(front[-1])))

BW, BH = 40, 52
BHEAD = (20, 10.2, 7.6)
BENCH_FACE = (
    f'<ellipse cx="17.3" cy="11" rx=".95" ry="1.25" fill="{EYE}"/><ellipse cx="22.7" cy="11" rx=".95" ry="1.25" fill="{EYE}"/>'
    f'<circle cx="17.6" cy="10.5" r=".32" fill="#fff"/><circle cx="23" cy="10.5" r=".32" fill="#fff"/>'
    f'<path d="M18.4 14.2q1.6 1.2 3.2 0" fill="none" stroke="{MOUTH}" stroke-width=".85" stroke-linecap="round"/>'
    f'<ellipse cx="15.6" cy="13.4" rx="1.4" ry=".9" fill="{BLUSH}" opacity=".32"/><ellipse cx="24.4" cy="13.4" rx="1.4" ry=".9" fill="{BLUSH}" opacity=".32"/>'
)
BENCH_ARMS = [[(11.6, 19.4), (8.4, 26.2), (8.2, 32.6)], [(28.4, 19.4), (31.6, 26.2), (31.8, 32.6)]]
BENCH_SHIRT = {
    "tee": f'<path d="M11 19.6q1.6-2.8 6.2-3.2q2.8 1.4 5.6 0q4.6.4 6.2 3.2l1 12.4H10z" fill="{INK}"/>'
    + sleeve(BENCH_ARMS[0]) + sleeve(BENCH_ARMS[1]),
    "tank": f'<path d="M13 18.6l2.2-1.8q4.8 3 9.6 0l2.2 1.8q.8 5 .6 8.4q1.4 2.6 1.6 5H10.8q.2-2.4 1.6-5q-.4-3.4.6-8.4z" fill="{INK}"/>',
    "fitted": f'<path d="M13.4 18.6l2-1.8q4.6 3 9.2 0l2 1.8q.8 5.4.4 8.6q2 2.6 2.4 4.8H10.6q.4-2.2 2.4-4.8q-.4-3.4.4-8.6z" fill="{INK}"/>',
}
BENCH_TRIM = {
    "tee": f'<path d="M17.4 16.6q2.6 2.6 5.2 0l-1 3h-3.2z" fill="{CLOTH}" stroke="{CLOTH_EDGE}" stroke-width=".5"/>',
    "tank": f'<path d="M15.2 16.8q4.8 3 9.6 0" fill="none" stroke="{CLOTH}" stroke-width="1"/>'
    f'<path d="M13.2 18.6q.8 4.4-.2 8.2M26.8 18.6q-.8 4.4.2 8.2" fill="none" stroke="{CLOTH}" stroke-width=".7"/>',
    "fitted": f'<path d="M15.4 16.8q4.6 3 9.2 0" fill="none" stroke="{CLOTH}" stroke-width="1"/>',
}
BENCH_DOME = "M12.2 8.6q0-7.6 7.8-7.6t7.8 7.6z"
BENCH_CAP_SEAMS = f'<circle cx="20" cy="1.4" r=".9" fill="{SHADE}" fill-opacity=".2"/><path d="M20 1.6v6.6" stroke="{SHADE}" stroke-opacity=".12" stroke-width=".6"/>'
BENCH = {
    "bench-skin": bent([(14.6, 36), (14.6, 45.4)], 5) + bent([(25.4, 36), (25.4, 45.4)], 5)
    + f'<rect x="17.2" y="14.6" width="5.6" height="4.4" fill="{INK}"/>'
    + f'<circle cx="{BHEAD[0]}" cy="{BHEAD[1]}" r="{BHEAD[2]}" fill="{INK}"/>'
    + f'<ellipse cx="12.4" cy="11.2" rx="1.4" ry="2" fill="{INK}"/><ellipse cx="27.6" cy="11.2" rx="1.4" ry="2" fill="{INK}"/>'
    + arm(BENCH_ARMS[0]) + arm(BENCH_ARMS[1]),
    "bench-hair-short": f'<path d="M12.4 10.4q-.6-8.4 7.6-8.6q8.2.2 7.6 8.6q-1-3.2-3.2-4q-4.4 1.6-9.6.4q-1.8 1.2-2.4 3.6z" fill="{INK}"/>',
    "bench-hair-buzz": f'<path d="M12.8 8.6q.2-6.8 7.2-6.8t7.2 6.8q-3-2.2-7.2-2.2t-7.2 2.2z" fill="{INK}"/>',
    "bench-hair-ponytail": f'<path d="M12.4 10.4q-.6-8.4 7.6-8.6q8.2.2 7.6 8.6q-1-3.2-3.2-4q-4.4 1.6-9.6.4q-1.8 1.2-2.4 3.6z" fill="{INK}"/>'
    f'<path d="M26.6 5.6q5.2.4 5.4 6.4q0 3.6-1.6 6.6q-.8-3.4-2.6-5.2q.2-3.6-1.2-7.8z" fill="{INK}"/>',
    "bench-hair-bun": f'<path d="M12.4 10.4q-.6-8.4 7.6-8.6q8.2.2 7.6 8.6q-1-3.2-3.2-4q-4.4 1.6-9.6.4q-1.8 1.2-2.4 3.6z" fill="{INK}"/>'
    f'<circle cx="20" cy="1.8" r="3.2" fill="{INK}"/>',
    "bench-band-headband": f'<path d="M12.8 7.4q7.2-3.6 14.4 0" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>',
    "bench-band-cap": f'<path d="{BENCH_DOME}" fill="{INK}"/><ellipse cx="20" cy="8.6" rx="9" ry="2" fill="{INK}"/>',
    "bench-band-cap-back": f'<path d="{BENCH_DOME}" fill="{INK}"/><path d="M12.2 8.6q7.8 1.6 15.6 0v-1.2H12.2z" fill="{INK}"/>',
    "bench-shade-cap": BENCH_CAP_SEAMS
    + f'<path d="M11.4 8.6q8.6 2.2 17.2 0" fill="none" stroke="{SHADE}" stroke-opacity=".22" stroke-width=".8"/>',
    "bench-shade-cap-back": BENCH_CAP_SEAMS
    + f'<path d="M12.2 8.4q7.8 1.6 15.6 0" fill="none" stroke="{SHADE}" stroke-opacity=".2" stroke-width=".7"/>'
    + f'<path d="M17.2 9q2.8-4.2 5.6 0q-2.8.6-5.6 0z" fill="{SHADE}" fill-opacity=".32"/>',
}
for top, body in BENCH_SHIRT.items():
    BENCH[f"bench-shirt-{top}"] = body
    BENCH[f"bench-collar-{top}"] = BENCH_TRIM[top]
BENCH_BOTTOMS = {
    "man": f'<path d="M10 31.4h20l.6 6.4h-8.8l-1.8-2.4l-1.8 2.4H9.4z" fill="{CLOTH}" stroke="{CLOTH_EDGE}" stroke-width=".9"/>',
    "woman": f'<path d="M10.4 31.2h19.2l3.4 6.2q-13 1.8-26 0z" fill="{CLOTH}" stroke="{CLOTH_EDGE}" stroke-width=".9"/>'
    f'<path d="M15 32.4l-1.6 5.6M20 32.4v6M25 32.4l1.6 5.6" stroke="{CLOTH_EDGE}" stroke-width=".55"/>',
}


def bench_shoe(x):
    return (
        f'<path d="M{x - 4} 49.2q0-3.4 2.4-3.6h3.2q2.4.2 2.4 3.6z" fill="{CLOTH}" stroke="{CLOTH_EDGE}" stroke-width=".7"/>'
        f'<path d="M{x - 4} 49.6h8" stroke="{SOLE}" stroke-width="1.3" stroke-linecap="round"/>'
    )


for kind in ("man", "woman"):
    BENCH[f"bench-gear-{kind}"] = (
        f'<ellipse cx="20" cy="50.6" rx="14" ry="2.2" fill="{SHADE}" opacity=".22"/>'
        + f'<path d="M14.6 41.6v3.6M25.4 41.6v3.6" stroke="{CLOTH}" stroke-width="5" stroke-linecap="butt"/>'
        + bench_shoe(14.6) + bench_shoe(25.4) + BENCH_BOTTOMS[kind]
        + BENCH_FACE
    )

for name, body in BENCH.items():
    write(name, BW, BH, body)

write(
    "ball", 24, 24,
    '<defs><radialGradient id="felt" cx=".36" cy=".32" r=".75">'
    '<stop offset="0" stop-color="#f4ff9a"/><stop offset=".55" stop-color="#dcf53e"/><stop offset="1" stop-color="#a9c21e"/>'
    '</radialGradient><clipPath id="ball"><circle cx="12" cy="12" r="11.4"/></clipPath></defs>'
    '<circle cx="12" cy="12" r="11.4" fill="url(#felt)"/>'
    '<g clip-path="url(#ball)" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round">'
    '<path d="M1.6 4.6C9 8.6 9 15.4 1.6 19.4"/><path d="M22.4 4.6C15 8.6 15 15.4 22.4 19.4"/></g>'
    '<circle cx="12" cy="12" r="11.4" fill="none" stroke="#97ae17" stroke-width="1.2"/>',
)
