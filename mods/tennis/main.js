import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, panes, props, run, settings, theme, setAgentOrder } from "herdr";

const COURTS = [
  { theme: "tennis-hard", label: "Hard", venue: "Hard court", court: "#3a6db3", stripe: "#3a6db3", outside: "#3f7f47", line: "#ffffff" },
  { theme: "tennis-grass", label: "Grass", venue: "Grass court", court: "#5c9a3c", stripe: "#69a847", outside: "#4a7f30", line: "#fbfbf3" },
  { theme: "tennis-clay", label: "Clay", venue: "Clay court", court: "#c8632f", stripe: "#c8632f", outside: "#a8512a", line: "#fff7ee" },
  { theme: "tennis-indoor", label: "Indoor", venue: "Indoor arena", court: "#2346a8", stripe: "#2346a8", outside: "#141826", line: "#ffffff" },
];
const CALL = { working: "Rally", blocked: "Challenge", done: "Point", idle: "Ready", unknown: "Warm-up" };
const QUIET = new Set(["idle", "unknown"]);
const COURT_PRIORITY = { blocked: 0, working: 1, done: 2, idle: 3, unknown: 4 };
const BALL = "#dfff4f", BALL_EDGE = "#a8c225";
const PLAYER_W = 46, PLAYER_H = 57, PLAYER_SPACING = 132, MIN_PLAYER_SPACING = 66, LABEL_W = 180, PLAYER_LABEL_REACH = (LABEL_W - PLAYER_W) / 2 + 8, RALLY_MS = 1800;
const BENCH_AFTER = 10, SEAT_W = 48, BENCH_ROW_H = 78, WOOD = "#b07a45", WOOD_DARK = "#7a5130";

const courtNow = () => {
  const picked = settings()?.theme;
  const name = typeof picked === "string" ? picked : picked?.dark ?? picked?.light;
  return COURTS.find((c) => c.theme === name) ?? COURTS[0];
};
const icon = (p, size) => p?.icon
  ? (p.tint ? svg(p.icon).text_color(p.color ?? "#ffffff") : image(p.icon)).size(size)
  : div().size(size);
const rect = (x, y, w, h, color) => div().absolute().left(x).top(y).w(w).h(h).bg(color);

export default class Tennis extends View {
  init() {
    this.size = { width: 1200, height: 230 };
  }

  render() {
    const role = props()?.role;
    if (role === "pane") return this.paneHeader();
    if (role === "scoreboard") return this.scoreboard();
    return this.scene();
  }

  scene() {
    const t = theme(), c = courtNow(), list = agents();
    setAgentOrder(list.map((a) => a.address));
    const zoom = Number(settings()?.zoom) || 1;
    const W = this.size.width / zoom, H = this.size.height / zoom;
    const showBench = list.length > BENCH_AFTER;
    const benchW = Math.min(240, Math.max(170, W * 0.15)), benchX = W - benchW - 24;
    const my = Math.max(34, H * 0.16), cl = Math.max(60, W * 0.04), titleX = Math.max(90, cl);
    const ct = my, cw = Math.max(240, showBench ? benchX - 40 - cl : W - cl * 2), ch = Math.max(90, H - my * 2);
    const net = cl + cw / 2, singles = ch * 0.125, service = cw * 0.23, lw = 2;

    const surface = [rect(cl, ct, cw, ch, c.court)];
    if (c.stripe !== c.court) {
      for (let i = 1; i < 12; i += 2) surface.push(rect(cl + (i * cw) / 12, ct, cw / 12, ch, c.stripe));
    }
    const lines = [
      rect(cl, ct, cw, lw, c.line), rect(cl, ct + ch - lw, cw, lw, c.line),
      rect(cl, ct, lw, ch, c.line), rect(cl + cw - lw, ct, lw, ch, c.line),
      rect(cl, ct + singles, cw, lw, c.line), rect(cl, ct + ch - singles - lw, cw, lw, c.line),
      rect(net - service, ct + singles, lw, ch - singles * 2, c.line),
      rect(net + service - lw, ct + singles, lw, ch - singles * 2, c.line),
      rect(net - service, ct + ch / 2 - lw / 2, service * 2, lw, c.line),
      rect(cl, ct + ch / 2 - lw / 2, 9, lw, c.line), rect(cl + cw - 9, ct + ch / 2 - lw / 2, 9, lw, c.line),
    ];
    const netParts = [
      rect(net + 2, ct - 10, 6, ch + 20, "#00000030"),
      rect(net - 2, ct - 10, 4, ch + 20, "#f2f2f2"),
      div().absolute().left(net - 5).top(ct - 17).size(10).rounded(5).bg("#2a2a2a"),
      div().absolute().left(net - 5).top(ct + ch + 7).size(10).rounded(5).bg("#2a2a2a"),
    ];

    const reach = Math.max(0, cw / 2 - cw * 0.05 - 36 - PLAYER_W - PLAYER_LABEL_REACH);
    let spacing = PLAYER_SPACING, perSide = Math.floor(reach / spacing) + 1;
    const wanted = Math.ceil(list.length / 2);
    if (!showBench && wanted > perSide) {
      spacing = Math.max(MIN_PLAYER_SPACING, reach / (wanted - 1));
      perSide = Math.floor(reach / spacing) + 1;
    }
    const place = (side, arr) => arr.map((a, i) => {
      const fromBaseline = cw * 0.05 + 36 + i * spacing;
      const up = side === "left" ? i % 2 === 0 : i % 2 === 1;
      return {
        a, side,
        x: side === "left" ? cl + fromBaseline : cl + cw - fromBaseline - PLAYER_W,
        y: ct + ch / 2 - PLAYER_H / 2 - 14 + (up ? -ch * 0.17 : ch * 0.17),
      };
    });
    const onCourt = [...list].sort((a, b) => (COURT_PRIORITY[a.status] ?? 9) - (COURT_PRIORITY[b.status] ?? 9));
    const left = place("left", onCourt.filter((_, i) => i % 2 === 0).slice(0, perSide));
    const right = place("right", onCourt.filter((_, i) => i % 2 === 1).slice(0, perSide));
    const placed = new Set([...left, ...right].map((p) => p.a.address));
    const benched = onCourt.filter((a) => !placed.has(a.address));

    const racket = (p) => ({
      x: p.x + (p.side === "left" ? PLAYER_W * 0.85 : PLAYER_W * 0.15),
      y: p.y + PLAYER_H * 0.6,
    });
    const hitter = left.find((p) => p.a.status === "working"), returner = right.find((p) => p.a.status === "working");
    let rally = null;
    if (hitter && returner) rally = [racket(hitter), racket(returner)];
    else if (hitter) rally = [racket(hitter), { x: cl + cw * 0.9, y: ct + ch / 2 }];
    else if (returner) rally = [{ x: cl + cw * 0.1, y: ct + ch / 2 }, racket(returner)];

    const blocked = list.filter((a) => a.status === "blocked").length;
    const working = list.filter((a) => a.status === "working").length;
    const done = list.filter((a) => a.status === "done").length;
    const umpire = blocked ? [`Challenge! ${blocked} ${blocked === 1 ? "agent needs" : "agents need"} you`, t.blocked]
      : working ? ["Quiet please, rally in progress", "#ffffff"]
      : done ? ["Point! Check the results", "#ffffff"]
      : list.length ? ["Players ready", "#ffffffb0"]
      : ["", "#ffffff"];
    const active = spaces().find((s) => s.active);

    return div().id("court").relative().size_full().overflow_hidden().bg(c.outside)
      .on_size_change((size, cx) => { this.size = size; cx.notify(); })
      .children(surface).children(lines).children(netParts)
      .child(h_flex().absolute().left(titleX).top(my / 2 - 9).gap(8).items_center()
        .child(div().size(10).rounded(5).bg(BALL))
        .child(div().text_size(14).font_weight(800).text_color("#ffffff").child(c.venue))
        .child(div().text_size(13).text_color("#ffffffb0").child(active?.name ?? "")))
      .child(div().absolute().right(W - cl - cw).top(my / 2 - 9).text_size(13).font_weight(700).text_color(umpire[1])
        .when(blocked > 0, (el) => el.id("umpire").loop("opacity", { from: 0.55, to: 1, period: 900 }))
        .child(umpire[0]))
      .when(list.length === 0, (el) => el.child(v_flex().absolute().left(cl).top(ct + ch / 2 - 12).w(cw).items_center()
        .child(div().px(12).py(4).rounded(10).bg("#00000055").text_size(13).font_weight(600).text_color("#ffffff")
          .child("No players on court yet. Start an agent to serve."))))
      .children([...left, ...right].map((p) => this.player(p, t)))
      .when(rally !== null, (el) => el.child(this.ball(rally[0], rally[1])))
      .when(showBench, (el) => el
        .child(h_flex().absolute().left(benchX).top(my / 2 - 9).gap(6).items_center()
          .child(div().text_size(12).font_weight(800).text_color("#ffffff").child("BENCH"))
          .child(div().text_size(12).text_color("#ffffffb0").child(String(benched.length))))
        .children(this.bench(benched, benchX, ct, benchW, ch, t)))
      .when(!showBench && benched.length > 0, (el) => el.child(div().absolute().right(cl + 8).bottom(my + 6).px(8).py(2).rounded(8)
        .bg("#00000055").text_size(11).font_weight(600).text_color("#ffffff").child(`+${benched.length} waiting`)));
  }

  bench(list, x, y, w, h, t) {
    const perRow = Math.max(1, Math.floor((w - 16) / SEAT_W));
    const rows = Math.max(1, Math.min(3, Math.floor((h + 12) / BENCH_ROW_H)));
    const seated = list.slice(0, perRow * rows);
    const extra = list.length - seated.length;
    const top = y + (h - rows * BENCH_ROW_H) / 2 + 4;
    const parts = [rect(x - 10, y - 6, w + 20, h + 12, "#00000026").rounded(10)];
    for (let r = 0; r < rows; r++) {
      const ry = top + r * BENCH_ROW_H;
      parts.push(
        rect(x, ry + 16, w, 7, WOOD_DARK).rounded(2),
        rect(x + 8, ry + 23, 4, 11, WOOD_DARK), rect(x + w - 12, ry + 23, 4, 11, WOOD_DARK),
        rect(x, ry + 34, w, 7, WOOD).rounded(2),
        rect(x + 8, ry + 41, 4, 12, WOOD_DARK), rect(x + w - 12, ry + 41, 4, 12, WOOD_DARK),
      );
    }
    seated.forEach((a, i) => {
      const ry = top + Math.floor(i / perRow) * BENCH_ROW_H, sx = x + 8 + (i % perRow) * SEAT_W;
      const pulsing = a.status === "working" || a.status === "blocked";
      parts.push(v_flex().id(`bench-${a.address}`).absolute().left(sx).top(ry).w(SEAT_W).items_center().cursor_pointer()
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(() => run("agent.focus", { terminal: a.address }))
        .child(div().relative().w(40).h(52)
          .child(image("mods/tennis/player-sitting.svg").w(40).h(52))
          .child(div().id(`bench-dot-${a.address}`).absolute().right(0).top(0).size(8).rounded(4).bg(t[a.status] ?? t.idle)
            .when(pulsing, (d) => d.loop("opacity", { from: 0.4, to: 1, period: 800 }))))
        .child(div().max_w(SEAT_W).text_size(9).font_weight(600).text_color("#ffffff").truncate().child(a.space_name)));
    });
    if (extra > 0) {
      parts.push(div().absolute().left(x + w - 60).top(y + h - 6).text_size(11).font_weight(600)
        .text_color("#ffffffb0").child(`+${extra} more`));
    }
    return parts;
  }

  player(p, t) {
    const { a, x, y, side } = p;
    const color = t[a.status] ?? t.idle;
    const art = side === "left" ? "player-facing-right" : "player-facing-left";
    let figure = div().id(`figure-${a.address}`).relative().w(PLAYER_W).h(PLAYER_H)
      .child(image(`mods/tennis/${art}.svg`).w(PLAYER_W).h(PLAYER_H));
    if (a.status === "working") figure = figure.loop("top", { from: 0, to: -5, period: 560 });
    if (a.status === "blocked") figure = figure.loop("top", { from: 0, to: -16, period: 760 });
    if (a.status === "idle" || a.status === "unknown") {
      figure = figure.child(div().id(`bounce-${a.address}`).absolute()
        .left(side === "left" ? PLAYER_W * 0.62 : PLAYER_W * 0.2).top(PLAYER_H - 10).size(8).rounded(4)
        .bg(BALL).border(1).border_color(BALL_EDGE)
        .loop("top", { from: PLAYER_H - 10, to: PLAYER_H - 26, period: 900, easing: "ease-out" }));
    }
    const badge = a.status === "blocked" || a.status === "done"
      ? div().id(`call-${a.address}`).px(8).py(2).rounded(8).bg(color).text_size(10).font_weight(800)
        .text_color("#10140c").child(CALL[a.status].toUpperCase())
        .when(a.status === "blocked", (el) => el.loop("opacity", { from: 0.6, to: 1, period: 700 }))
      : div().h(16);
    return v_flex().id(`player-${a.address}`).absolute().left(x + PLAYER_W / 2 - LABEL_W / 2).top(y - 18).w(LABEL_W).items_center().gap(1)
      .cursor_pointer()
      .transition("top", { duration: 500, easing: "ease-in-out" })
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(() => run("agent.focus", { terminal: a.address }))
      .child(badge)
      .child(figure)
      .child(v_flex().items_center().max_w(LABEL_W).px(7).py(1).rounded(6).bg("#00000066")
        .when(a.focused, (el) => el.border(1).border_color(BALL))
        .child(h_flex().gap(4).items_center().max_w(LABEL_W - 14)
          .child(icon(a.program, 12))
          .child(div().text_size(11).font_weight(600).text_color("#ffffff").truncate().child(a.space_name)))
        .child(div().text_size(9.5).font_weight(700).text_color(QUIET.has(a.status) ? "#ffffffb0" : color).child(CALL[a.status] ?? "")));
  }

  ball(from, to) {
    return div().id("rally-y").absolute().left(0).top(from.y).w(1).h(1)
      .loop("top", { from: from.y, to: to.y, period: RALLY_MS, easing: "linear" })
      .child(div().id("rally-x").absolute().left(from.x).top(0).w(1).h(1)
        .loop("left", { from: from.x, to: to.x, period: RALLY_MS, easing: "linear" })
        .child(div().absolute().left(-6).top(5).w(12).h(5).rounded(3).bg("#00000044"))
        .child(div().id("rally-arc").absolute().left(-6).top(-6).size(12).rounded(6).bg(BALL).border(1).border_color(BALL_EDGE)
          .loop("top", { from: -6, to: -34, period: RALLY_MS / 2, easing: "ease-out" })));
  }

  scoreboard() {
    const t = theme(), c = courtNow(), list = agents();
    const space = spaces().find((s) => s.active), tab = space?.tabs.find((x) => x.active);
    const count = (status) => list.filter((a) => a.status === status).length;
    const divider = () => div().w(1).h(18).bg(t.border);
    const cell = (status) => {
      const n = count(status);
      return h_flex().gap(6).items_center().px(12)
        .child(div().text_size(10).font_weight(700).text_color(t.muted).child(CALL[status].toUpperCase()))
        .child(div().text_size(15).font_weight(800).text_color(n ? t[status] : t.dim).child(String(n)));
    };
    const chip = (court) => {
      const on = court.theme === c.theme;
      return h_flex().id(`court-${court.label}`).gap(5).items_center().px(9).py(3).rounded(10).cursor_pointer()
        .bg(on ? t.accent : t.raised).hover((s) => s.bg(on ? t.accent : t.hover))
        .on_click(() => run("app.theme", { name: court.theme }))
        .child(div().size(8).rounded(4).bg(court.court).border(1).border_color(court.line))
        .child(div().text_size(11).font_weight(700).text_color(on ? t.accent_foreground : t.foreground).child(court.label));
    };
    return h_flex().size_full().px(14).items_center().justify_between().bg(t.chrome).text_color(t.foreground)
      .child(h_flex().gap(8).items_center().min_w(0)
        .child(div().text_size(10).font_weight(800).text_color(t.accent).child("SCOREBOARD"))
        .child(div().text_size(13).font_weight(600).truncate().child(`${space?.name ?? ""}  /  ${tab?.name ?? ""}`)))
      .child(h_flex().items_center()
        .child(cell("working")).child(divider()).child(cell("blocked")).child(divider())
        .child(cell("done")).child(divider()).child(cell("idle")))
      .child(h_flex().gap(6).items_center().children(COURTS.map(chip)));
  }

  paneHeader() {
    const t = theme();
    const pane = panes().find((x) => x.pane === props()?.pane);
    const status = pane?.status;
    const color = status ? t[status] ?? t.muted : t.muted;
    return h_flex().size_full().px(10).gap(8).items_center().bg(t.chrome).text_size(12)
      .child(icon(pane?.program, 15))
      .child(div().font_weight(600).text_color(t.foreground).child(pane?.program?.name ?? "Terminal"))
      .child(div().text_color(t.dim).truncate().child(pane?.branch ? `on ${pane.branch}` : ""))
      .child(div().flex_1())
      .when(Boolean(status), (el) => el.child(h_flex().gap(5).items_center()
        .child(div().id(`dot-${props()?.pane}`).size(8).rounded(4).bg(status === "working" ? BALL : color)
          .when(status === "working", (d) => d.loop("opacity", { from: 0.35, to: 1, period: 800 })))
        .child(div().font_weight(600).text_color(color).child(CALL[status] ?? status))));
  }
}
