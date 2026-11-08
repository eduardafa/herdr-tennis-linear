import os, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
INK = "#000"
GEAR = "#2b2b2b"
OUTLINE = "#c7ccd2"


def write(name, w, h, body):
    with open(os.path.join(OUT, name + ".svg"), "w") as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>\n')


def mirrored(body, w):
    return f'<g transform="translate({w} 0) scale(-1 1)">{body}</g>'


def limb(x1, y1, x2, y2, width=5):
    return f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{INK}" stroke-width="{width}" stroke-linecap="round"/>'


def racket(hx, hy, tx, ty, cx, cy, rx, ry, angle, key):
    return (
        f'<path d="M{hx} {hy}L{tx} {ty}" stroke="{GEAR}" stroke-width="3" stroke-linecap="round"/>'
        f'<clipPath id="head-{key}"><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" transform="rotate({angle} {cx} {cy})"/></clipPath>'
        f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" transform="rotate({angle} {cx} {cy})" fill="#f7f7f7" fill-opacity=".35"/>'
        f'<g clip-path="url(#head-{key})" stroke="{GEAR}" stroke-width=".7" opacity=".6">'
        + "".join(f'<path d="M{cx - 12} {cy + d}h24M{cx + d} {cy - 12}v24"/>' for d in (-6, -3, 0, 3, 6))
        + "</g>"
        f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" transform="rotate({angle} {cx} {cy})" fill="none" stroke="{GEAR}" stroke-width="2.5"/>'
    )


W, H = 60, 74

BODY = {
    "skin": limb(17, 50, 14, 65) + limb(26, 50, 30, 65)
    + f'<rect x="18" y="18" width="6" height="6" fill="{INK}"/><circle cx="21" cy="13" r="8" fill="{INK}"/>',
    "shirt": f'<path d="M12 22q10-5 19 0l2 21H10z" fill="{INK}"/>',
    "hair-short": f'<path d="M14 12q-1-8 7-9q8 1 7 8q-6-4-14 1z" fill="{INK}"/>',
    "hair-buzz": f'<path d="M13.5 11q0-7 7.5-7.5q7.5.5 7.5 6.5q-7-3-15 1z" fill="{INK}"/>',
    "hair-ponytail": f'<path d="M14 12q-1-8 7-9q8 1 7 8q-6-4-14 1z" fill="{INK}"/>'
    f'<path d="M14 9q-9 0-9 16q5-3 7-11z" fill="{INK}"/>',
    "hair-bun": f'<path d="M14 12q-1-8 7-9q8 1 7 8q-6-4-14 1z" fill="{INK}"/>'
    f'<circle cx="12" cy="7" r="4.8" fill="{INK}"/>',
    "band-woman": f'<path d="M13 9q8-6 16 0" fill="none" stroke="{INK}" stroke-width="2.5"/>',
    "band-man": f'<path d="M12.5 11q0-8.5 8.5-8.5q8 0 8 8z" fill="{INK}"/>'
    f'<path d="M27 10q5 0 9 2" fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>'
    '<path d="M12.5 11q8-2.5 16.5-.5" fill="none" stroke="#00000030" stroke-width="1"/>',
    "gear-woman": '<ellipse cx="22" cy="69" rx="15" ry="4" fill="#000" opacity=".22"/>'
    f'<g fill="#fff" stroke="{OUTLINE}" stroke-width="1.5"><path d="M9 68h9v-4h-9zM26 68h10v-4H26z"/><path d="M11 42h21l4.5 10H6.5z"/></g>'
    '<path d="M12 22q10-5 19 0l2 21H10z" fill="none" stroke="#00000038" stroke-width="1.2"/>'
    '<path d="M12 31h21" stroke="#ffffff80" stroke-width="2"/>',
    "gear-man": '<ellipse cx="22" cy="69" rx="15" ry="4" fill="#000" opacity=".22"/>'
    f'<g fill="#fff" stroke="{OUTLINE}" stroke-width="1.5"><path d="M9 68h9v-4h-9zM26 68h10v-4H26z"/><path d="M11 42h21l.5 12h-9.5l-1.5-4-1.5 4H10.5z"/></g>'
    '<path d="M12 22q10-5 19 0l2 21H10z" fill="none" stroke="#00000038" stroke-width="1.2"/>'
    '<path d="M12 31h21" stroke="#ffffff80" stroke-width="2"/>',
}

POSES = {
    "ready": (
        limb(13, 27, 11, 40) + limb(30, 27, 40, 38),
        racket(11, 40, 8, 46, 6, 53, 4.5, 6.5, 20, "ready"),
    ),
    "rally-a": (
        limb(13, 27, 7, 37) + limb(30, 27, 39, 34),
        racket(39, 34, 46, 40, 51, 45, 7, 9, -40, "rally-a"),
    ),
    "rally-b": (
        limb(13, 27, 19, 36) + limb(30, 26, 37, 17),
        racket(37, 17, 41, 11, 46, 8, 5.5, 7.5, 40, "rally-b"),
    ),
    "challenge": (
        limb(13, 25, 9, 7) + f'<path d="M9 6V1" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>' + limb(30, 27, 35, 40),
        racket(35, 40, 38, 47, 41, 55, 5, 7, -20, "challenge"),
    ),
    "point": (
        limb(13, 25, 6, 9) + limb(30, 25, 37, 9),
        racket(37, 9, 42, 6, 49, 6, 5, 7, 60, "point"),
    ),
}

for side, flip in (("r", False), ("l", True)):
    wrap = (lambda b: mirrored(b, W)) if flip else (lambda b: b)
    for name, body in BODY.items():
        write(f"{name}-{side}", W, H, wrap(body))
    for pose, (arms, gear) in POSES.items():
        write(f"arms-{pose}-{side}", W, H, wrap(arms))
        write(f"gear-{pose}-{side}", W, H, wrap(gear))

BW, BH = 40, 52
BENCH = {
    "bench-skin": f'<g fill="{INK}"><rect x="12" y="37" width="5" height="11" rx="2"/><rect x="23" y="37" width="5" height="11" rx="2"/>'
    '<rect x="17" y="14" width="6" height="5"/><circle cx="20" cy="10" r="7"/></g>'
    + limb(11, 20, 8, 33, 4) + limb(29, 20, 32, 33, 4),
    "bench-shirt": f'<path d="M11 17q9-4 18 0l2 15H9z" fill="{INK}"/>',
    "bench-hair-short": f'<path d="M13 9q0-7 7-7t7 7q-7-3-14 0z" fill="{INK}"/>',
    "bench-hair-buzz": f'<path d="M13.5 8.5q0-6 6.5-6t6.5 6q-6.5-2.5-13 0z" fill="{INK}"/>',
    "bench-hair-ponytail": f'<path d="M13 9q0-7 7-7t7 7q-7-3-14 0z" fill="{INK}"/>'
    f'<path d="M27 7q5 2 4 10q-2-4-5-6z" fill="{INK}"/>',
    "bench-hair-bun": f'<path d="M13 9q0-7 7-7t7 7q-7-3-14 0z" fill="{INK}"/>'
    f'<circle cx="20" cy="2.5" r="3" fill="{INK}"/>',
    "bench-band-woman": f'<path d="M13 8q7-3 14 0" fill="none" stroke="{INK}" stroke-width="2"/>',
    "bench-band-man": f'<path d="M12.5 8.5q0-7 7.5-7t7.5 7z" fill="{INK}"/><ellipse cx="20" cy="8.5" rx="8.5" ry="1.8" fill="{INK}"/>'
    '<ellipse cx="20" cy="8.5" rx="8.5" ry="1.8" fill="none" stroke="#00000030" stroke-width=".8"/>',
    "bench-gear-woman": '<ellipse cx="20" cy="50" rx="14" ry="2.5" fill="#000" opacity=".22"/>'
    f'<g fill="#fff" stroke="{OUTLINE}" stroke-width="1.2"><rect x="9" y="46" width="9" height="4" rx="2"/><rect x="22" y="46" width="9" height="4" rx="2"/><path d="M10 31h20l3.5 8H6.5z"/></g>'
    '<path d="M11 17q9-4 18 0l2 15H9z" fill="none" stroke="#00000038" stroke-width="1"/>',
    "bench-gear-man": '<ellipse cx="20" cy="50" rx="14" ry="2.5" fill="#000" opacity=".22"/>'
    f'<g fill="#fff" stroke="{OUTLINE}" stroke-width="1.2"><rect x="9" y="46" width="9" height="4" rx="2"/><rect x="22" y="46" width="9" height="4" rx="2"/><path d="M9 31h22v9h-9.5l-1.5-3-1.5 3H9z"/></g>'
    '<path d="M11 17q9-4 18 0l2 15H9z" fill="none" stroke="#00000038" stroke-width="1"/>',
}
for name, body in BENCH.items():
    write(name, BW, BH, body)
