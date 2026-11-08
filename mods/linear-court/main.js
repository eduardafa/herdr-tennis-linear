import { View, div, image, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { agents, spaces, panes, exec, run, theme, props, openOverlay, closeOverlay, notify, shared, setShared, home, appHome, readTextFile } from "herdr";

const KEYCHAIN_SERVICE = "herdr-linear";
const LINEAR_API = "https://api.linear.app/graphql";
const REFRESH_MS = 60000;
const CHANGE_CHECK_MS = 1000;
const CHANGED_KEY = "linear.changed";
const SPORTS = {
  tennis: {
    ball: "mods/tennis/players/ball.svg", color: "#dfff4f", title: "Order of play", start: "SERVE", column: "tennis-linear",
    call: { working: "Rally", blocked: "Challenge", done: "Point", idle: "Ready", unknown: "Warm-up" },
  },
  soccer: {
    ball: "mods/soccer/players/ball.svg", color: "#ffffff", title: "Team sheet", start: "KICK OFF", column: "soccer-linear",
    call: { working: "Attack", blocked: "VAR", done: "Goal", idle: "Warm-up", unknown: "Warm-up" },
  },
};
const sport = () => SPORTS[props()?.sport] ?? SPORTS.tennis;
const sportBall = (size) => image(sport().ball).size(size);
const LINEAR_ICON = "mods/linear-court/linear.svg";
const LINEAR_PURPLE = "#5e6ad2";
const SERVE_CONFIG = "mods/linear-court/serve.json";
const SERVE_DEFAULTS = { agent: ["claude"], base: "main", repos: [] };
const STATE_TYPE_ORDER = { started: 0, unstarted: 1, backlog: 2, triage: 3, completed: 4, canceled: 5 };
const HIDDEN_STATE_TYPES = ["completed", "canceled", "duplicate"];
const URGENCY = ["blocked", "done", "working", "idle", "unknown"];
const PRIORITIES = [
  { value: 1, label: "Urgent" },
  { value: 2, label: "High" },
  { value: 3, label: "Medium" },
  { value: 4, label: "Low" },
  { value: 0, label: "None" },
];
const MENU_W = 340, MENU_H = 700;
const PANEL_W = 300, RAIL_W = 36;
const ISSUES_QUERY = `query {
  viewer {
    assignedIssues(first: 150, filter: { state: { type: { nin: ${JSON.stringify(HIDDEN_STATE_TYPES)} } } }) {
      nodes { id identifier title url priority branchName team { id } state { id name type color position } }
    }
  }
  teams(first: 50) { nodes { id states(first: 50) { nodes { id name type color position } } } }
}`;
const ISSUE_FAMILY = `query($id: String!) {
  issue(id: $id) {
    parent { identifier title url state { name color } assignee { name } }
    children(first: 50) { nodes { identifier title url state { name color } assignee { name } } }
  }
}`;
const ISSUE_DESCRIPTION = `query($id: String!) { issue(id: $id) { description } }`;
const SET_STATE = `mutation($id: String!, $stateId: String!) { issueUpdate(id: $id, input: { stateId: $stateId }) { success } }`;
const SET_PRIORITY = `mutation($id: String!, $priority: Int!) { issueUpdate(id: $id, input: { priority: $priority }) { success } }`;
const SET_TITLE = `mutation($id: String!, $title: String!) { issueUpdate(id: $id, input: { title: $title }) { success } }`;
const ADD_COMMENT = `mutation($issueId: String!, $body: String!) { commentCreate(input: { issueId: $issueId, body: $body }) { success } }`;
const ADD_KEY_COMMAND = `security add-generic-password -s ${KEYCHAIN_SERVICE} -a linear -w`;

class MissingKey extends Error {}

const expandHome = (path) => (path.startsWith("~/") ? `${home()}/${path.slice(2)}` : path);

async function serveConfig() {
  const text = await readTextFile(`${appHome()}/${SERVE_CONFIG}`);
  const config = { ...SERVE_DEFAULTS, ...(text ? JSON.parse(text) : {}) };
  return { ...config, repos: (config.repos ?? []).map((r) => ({ name: r.name, path: expandHome(r.path) })) };
}

const worktreeFolder = (branch) => branch.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");

async function git(cwd, args) {
  const r = await exec("git", ["-C", cwd, ...args]);
  return { ok: r.code === 0, out: r.stdout.trim(), err: r.stderr.trim() };
}

function worktreeOn(listing, branch) {
  return listing.split("\n\n")
    .map((block) => ({ path: block.match(/^worktree (.+)$/m)?.[1], branch: block.match(/^branch refs\/heads\/(.+)$/m)?.[1] }))
    .find((w) => w.branch === branch)?.path;
}

async function linearKey() {
  const key = await exec("security", ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"]);
  if (key.code !== 0 || !key.stdout.trim()) throw new MissingKey("No Linear key in the Keychain");
  return key.stdout.trim();
}

async function linear(query, variables) {
  const response = await fetch(LINEAR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: await linearKey() },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (!response.ok || body.errors) throw new Error(body.errors?.[0]?.message ?? `Linear answered ${response.status}`);
  return body.data;
}

const tint = (color, alpha, fallback) => (/^#[0-9a-f]{6}$/i.test(color ?? "") ? color + alpha : fallback);
const clock = (date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
const byWorkflow = (a, b) => (STATE_TYPE_ORDER[a.type] ?? 9) - (STATE_TYPE_ORDER[b.type] ?? 9) || a.position - b.position;
const label = (text, t) => div().pt(8).pb(3).px(6).text_size(10).font_weight(800).text_color(t.dim).child(text);
const spacesOn = (identifier) => {
  const mentions = new RegExp(`(^|[^a-z0-9])${identifier.toLowerCase()}([^0-9]|$)`);
  const onBranch = (branch) => Boolean(branch) && mentions.test(branch.toLowerCase());
  const all = spaces();
  const spaceOfTab = {};
  for (const space of all) for (const tab of space.tabs ?? []) spaceOfTab[tab.id] = space.id;
  const ids = new Set(panes().filter((pane) => onBranch(pane.branch)).map((pane) => spaceOfTab[pane.tab]).filter(Boolean));
  for (const space of all) if (onBranch(space.branch)) ids.add(space.id);
  return all.filter((space) => ids.has(space.id));
};

export default class LinearCourt extends View {
  init(_props, cx) {
    if (props()?.role === "menu") {
      const { issue } = props();
      this.titleInput = InputState.new({ value: issue.title });
      this.titleInput.on("submit", (_e, cx) => this.saveTitle(cx));
      this.comment = InputState.new({ placeholder: "Write a comment, then Enter" });
      this.comment.on("submit", (_e, cx) => this.postComment(cx));
      this.busy = null;
      this.error = null;
      this.family = null;
      this.serve = null;
      cx.spawn(async (cx) => {
        try {
          this.serve = await serveConfig();
        } catch (e) {
          this.serve = { ...SERVE_DEFAULTS, failed: String(e?.message ?? e) };
        }
        cx.notify();
      });
      cx.spawn(async (cx) => {
        try {
          this.family = (await linear(ISSUE_FAMILY, { id: issue.id })).issue;
        } catch (e) {
          this.family = { failed: String(e?.message ?? e) };
        }
        cx.notify();
      });
      return;
    }
    this.issues = null;
    this.states = {};
    this.error = null;
    this.missingKey = false;
    this.loading = false;
    this.updated = null;
    this.seenChange = shared(CHANGED_KEY);
    this.folded = new Set(JSON.parse(localStorage.getItem("linear.folded") ?? "[]"));
    this.collapsed = JSON.parse(localStorage.getItem("linear.collapsed") ?? "false");
    this.refresh(cx);
    cx.timer.every(REFRESH_MS, (cx) => this.refresh(cx));
    cx.timer.every(CHANGE_CHECK_MS, (cx) => {
      const changed = shared(CHANGED_KEY);
      if (changed !== this.seenChange) {
        this.seenChange = changed;
        this.refresh(cx);
      }
    });
  }

  refresh(cx) {
    if (this.loading) return;
    this.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const data = await linear(ISSUES_QUERY);
        this.issues = data.viewer.assignedIssues.nodes;
        this.states = Object.fromEntries(data.teams.nodes.map((team) => [team.id, [...team.states.nodes].sort(byWorkflow)]));
        this.missingKey = false;
        this.error = null;
        this.updated = new Date();
      } catch (e) {
        if (e instanceof MissingKey) {
          this.missingKey = true;
          this.issues = null;
          this.error = null;
        } else {
          this.error = String(e?.message ?? e);
        }
      }
      this.loading = false;
      cx.notify();
    });
  }

  openMenu(issue) {
    openOverlay({
      mod: "linear-court",
      kind: "popup",
      width: MENU_W,
      height: MENU_H,
      props: {
        role: "menu",
        sport: props()?.sport,
        issue: { id: issue.id, identifier: issue.identifier, title: issue.title, url: issue.url, priority: issue.priority, stateId: issue.state.id, branchName: issue.branchName },
        states: (this.states[issue.team.id] ?? []).filter((s) => s.type !== "canceled" && s.type !== "duplicate"),
      },
    });
  }

  playing(issue) {
    const onIt = new Set(spacesOn(issue.identifier).map((s) => s.id));
    const players = agents().filter((a) => onIt.has(a.space));
    if (!players.length) return null;
    players.sort((a, b) => URGENCY.indexOf(a.status) - URGENCY.indexOf(b.status));
    return players[0];
  }

  marker(agent, t) {
    const key = agent.address;
    if (agent.status === "working") return div().id(`issue-mark-${key}`).relative().size(8).child(sportBall(8)).loop("top", { from: 2, to: -2, period: 560 });
    if (agent.status === "blocked") return div().id(`issue-mark-${key}`).size(8).rounded(4).bg(t.blocked).loop("opacity", { from: 0.35, to: 1, period: 700 });
    if (agent.status === "done") return div().size(8).rounded(4).border(2).border_color(t.done);
    return div().size(7).rounded(4).bg(t.idle);
  }

  groups() {
    const byState = new Map();
    for (const issue of this.issues ?? []) {
      const name = issue.state.name;
      if (!byState.has(name)) byState.set(name, { state: issue.state, issues: [] });
      byState.get(name).issues.push(issue);
    }
    return [...byState.values()].sort((a, b) => byWorkflow(a.state, b.state));
  }

  issueRow(issue, t) {
    const agent = this.playing(issue);
    return h_flex().id(`issue-${issue.identifier}`).flex_none().px(8).py(4).gap(9).items_start().rounded(6).cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click(() => exec("open", [issue.url]))
      .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); this.openMenu(issue); })
      .child(h_flex().id(`issue-agent-${issue.identifier}`).w(14).h(17).flex_none().items_center().justify_center()
        .when(Boolean(agent), (el) => el.child(this.marker(agent, t))
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => { cx.stop_propagation(); run("agent.focus", { terminal: agent.address }); })))
      .child(v_flex().flex_1().min_w(0)
        .child(div().truncate().text_size(12.5).text_color(t.foreground).child(issue.title))
        .child(h_flex().gap(6).items_center().text_size(10.5)
          .child(div().text_color(t.dim).child(issue.identifier))
          .when(Boolean(agent), (el) => el.child(div().font_weight(700)
            .text_color(agent.status === "working" ? t.working : t[agent.status] ?? t.muted).child(sport().call[agent.status] ?? "")))
          .child(div().flex_1())
          .when(Boolean(issue.branchName), (el) => el.child(div().id(`issue-branch-${issue.identifier}`).flex_none().px(5).rounded(4)
            .text_color(t.dim).cursor_pointer().hover((s) => s.bg(t.raised).text_color(t.foreground))
            .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
            .on_click((_e, cx) => { cx.stop_propagation(); this.copyBranch(issue); })
            .child("Copy branch")))));
  }

  copyBranch(issue) {
    exec("sh", ["-c", 'printf %s "$1" | pbcopy', "sh", issue.branchName])
      .then((r) => notify(r.code === 0
        ? { title: "Branch copied", body: issue.branchName, level: "success", timeout: 3000 }
        : { title: "Couldn't copy the branch", body: r.stderr.trim(), level: "error" }));
  }

  section(group, t) {
    const color = group.state.color;
    const folded = this.folded.has(group.state.name);
    return v_flex().flex_none().mx(8).mt(6).pb(folded ? 0 : 4).rounded(8)
      .bg(tint(color, "14", t.raised)).border(1).border_color(tint(color, "40", t.border))
      .child(h_flex().id(`state-${group.state.name}`).h(28).px(10).gap(8).items_center().cursor_pointer()
        .on_click((_e, cx) => {
          folded ? this.folded.delete(group.state.name) : this.folded.add(group.state.name);
          localStorage.setItem("linear.folded", JSON.stringify([...this.folded]));
          cx.notify();
        })
        .child(div().size(8).flex_none().rounded(4).bg(color ?? t.muted))
        .child(div().flex_1().truncate().text_size(11).font_weight(800).text_color(color ?? t.foreground).child(group.state.name.toUpperCase()))
        .child(div().text_size(11.5).font_weight(700).text_color(t.foreground).child(String(group.issues.length)))
        .child(svg(`mods/workspace-chrome/chevron-${folded ? "right" : "down"}.svg`).size(11).flex_none().text_color(t.dim)))
      .when(!folded, (el) => el.children(group.issues.map((issue) => this.issueRow(issue, t))));
  }

  body(t) {
    if (this.missingKey) {
      return v_flex().px(14).py(10).gap(8).text_size(12).text_color(t.muted)
        .child(div().child("Add your Linear API key to the Keychain to see your issues. In a terminal, run:"))
        .child(div().px(8).py(6).rounded(6).bg(t.raised).text_size(11).text_color(t.foreground).child(ADD_KEY_COMMAND))
        .child(div().child("Paste the key when it asks for a password, then click Refresh."));
    }
    if (this.error && !this.issues) {
      return v_flex().px(14).py(10).gap(4).text_size(12)
        .child(div().text_color(t.blocked).child("Couldn't load your issues."))
        .child(div().text_color(t.muted).child(this.error));
    }
    if (!this.issues) return div().px(14).py(10).text_size(12).text_color(t.dim).child("Loading your issues...");
    if (!this.issues.length) return div().px(14).py(10).text_size(12).text_color(t.dim).child("Nothing assigned to you. Enjoy the break.");
    return v_flex().children(this.groups().map((g) => this.section(g, t)));
  }

  change(cx, what, query, variables, done) {
    if (this.busy) return;
    this.busy = what;
    this.error = null;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const data = await linear(query, variables);
        if (!Object.values(data)[0]?.success) throw new Error("Linear didn't accept the change");
        setShared(CHANGED_KEY, Date.now());
        notify({ title: done, level: "success", timeout: 4000 });
        closeOverlay(props().overlay);
      } catch (e) {
        this.error = String(e?.message ?? e);
        this.busy = null;
        cx.notify();
      }
    });
  }

  saveTitle(cx) {
    const { issue } = props();
    const title = this.titleInput.value().trim();
    if (!title || title === issue.title) return;
    this.change(cx, "title", SET_TITLE, { id: issue.id, title }, `${issue.identifier} renamed`);
  }

  postComment(cx) {
    const { issue } = props();
    const body = this.comment.value().trim();
    if (!body) return;
    this.change(cx, "comment", ADD_COMMENT, { issueId: issue.id, body }, `Comment added to ${issue.identifier}`);
  }

  startServe(cx, busyText, go) {
    if (this.busy) return;
    const { issue } = props();
    this.busy = "serve";
    this.busyText = busyText;
    this.error = null;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const description = (await linear(ISSUE_DESCRIPTION, { id: issue.id })).issue?.description?.trim() ?? "";
        const task = [`Work on Linear issue ${issue.identifier}: ${issue.title}`, issue.url, description].filter(Boolean).join("\n\n");
        notify({ ...(await go(task)), level: "success", timeout: 5000 });
        closeOverlay(props().overlay);
      } catch (e) {
        this.error = String(e?.message ?? e);
        this.busy = null;
        this.busyText = null;
        cx.notify();
      }
    });
  }

  serveHere(cx, space) {
    const { issue } = props();
    this.startServe(cx, "Starting Claude Code...", async (task) => {
      run("tab.new", { space: space.id, name: issue.identifier, argv: this.serve.agent, task });
      return { title: `Serving ${issue.identifier}`, body: `New Claude Code tab in ${space.name}` };
    });
  }

  serveFrom(cx, target) {
    const { issue } = props();
    const repoName = target.name;
    const base = this.serve.base;
    this.startServe(cx, `Creating a worktree in ${repoName}...`, async (task) => {
      const branch = issue.branchName;
      if (!branch) throw new Error("This issue has no branch name in Linear.");
      const repo = target.path;
      const listed = await git(repo, ["worktree", "list", "--porcelain"]);
      if (!listed.ok) throw new Error(listed.err || `${repo} is not a git repository.`);
      let folder = worktreeOn(listed.out, branch);
      const reused = Boolean(folder);
      if (!folder) {
        const fetched = await git(repo, ["fetch", "origin", base]);
        if (!fetched.ok) throw new Error(fetched.err || `git fetch origin ${base} failed.`);
        folder = `${home()}/.herdr/worktrees/${repoName}/${worktreeFolder(branch)}`;
        const local = (await git(repo, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`])).ok;
        const added = await git(repo, local
          ? ["worktree", "add", folder, branch]
          : ["worktree", "add", "--no-track", "-b", branch, folder, `origin/${base}`]);
        if (!added.ok) throw new Error(added.err || "git worktree add failed.");
      }
      run("space.new", { folder, tab: issue.identifier, argv: this.serve.agent, task });
      return {
        title: `Serving ${issue.identifier}`,
        body: reused ? `Reusing the worktree at ${folder}` : `New worktree from ${base} in ${repoName}`,
      };
    });
  }

  serveBlock(issue, t) {
    const here = spacesOn(issue.identifier)[0];
    const button = (id, text, primary, onClick) => div().id(id).px(10).py(5).rounded(6).cursor_pointer().text_size(12)
      .font_weight(primary ? 700 : 500)
      .bg(primary ? t.accent : t.raised).text_color(primary ? t.accent_foreground : t.foreground)
      .hover((s) => s.opacity(0.85))
      .on_click(onClick)
      .child(text);
    return v_flex().mx(6).p(8).gap(6).rounded(8).bg(tint(sport().color, "14", t.raised)).border(1).border_color(tint(sport().color, "40", t.border))
      .child(h_flex().gap(6).items_center()
        .child(div().size(8).flex_none().child(sportBall(8)))
        .child(div().text_size(10).font_weight(800).text_color(t.foreground).child(sport().start))
        .child(div().flex_1().min_w(0).truncate().text_size(10.5).text_color(t.dim).child(issue.branchName ?? "no branch name in Linear")))
      .when(Boolean(here) && Boolean(this.serve), (el) => el.child(button("menu-serve-here", `New Claude Code tab in ${here?.name}`, true, (_e, cx) => this.serveHere(cx, here))))
      .child(this.serveRepos(here, button, t));
  }

  serveRepos(here, button, t) {
    if (!this.serve) return div().text_size(11).text_color(t.dim).child("Loading...");
    if (this.serve.failed) return div().text_size(11).text_color(t.blocked).child(`Couldn't read ${SERVE_CONFIG}: ${this.serve.failed}`);
    if (!this.serve.repos.length) {
      return div().text_size(11).text_color(t.muted).child(`To serve from ${this.serve.base}, list your repos in ~/.config/herdr-app/${SERVE_CONFIG}.`);
    }
    return v_flex().gap(6)
      .child(div().text_size(11).text_color(t.muted).child(`${here ? "Or a fresh worktree" : "New worktree"} from ${this.serve.base} in:`))
      .child(h_flex().gap(6).children(this.serve.repos.map((repo) =>
        button(`menu-serve-${repo.name}`, repo.name, !here, (_e, cx) => this.serveFrom(cx, repo)).flex_1().flex().justify_center())));
  }

  familySections(t) {
    if (!this.family) return div().px(6).pt(8).text_size(11).text_color(t.dim).child("Loading parent and sub-issues...");
    if (this.family.failed) return div().px(6).pt(8).text_size(11).text_color(t.blocked).child(`Couldn't load parent and sub-issues: ${this.family.failed}`);
    const row = (related) => h_flex().id(`menu-family-${related.identifier}`).h(24).px(6).gap(7).items_center().rounded(6).cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .tooltip(related.state?.name ?? "")
      .on_click(() => { exec("open", [related.url]); closeOverlay(props().overlay); })
      .child(div().size(8).flex_none().rounded(4).bg(related.state?.color ?? t.muted))
      .child(div().flex_none().text_size(10.5).text_color(t.dim).child(related.identifier))
      .child(div().flex_1().min_w(0).truncate().text_size(12).child(related.title))
      .child(div().flex_none().max_w(70).truncate().text_size(10.5).text_color(t.dim).child(related.assignee?.name?.split(" ")[0] ?? "nobody"));
    const children = this.family.children?.nodes ?? [];
    return v_flex()
      .when(Boolean(this.family.parent), (el) => el.child(label("PARENT", t)).child(row(this.family.parent)))
      .when(children.length > 0, (el) => el.child(label(`SUB-ISSUES (${children.length})`, t)).children(children.map(row)));
  }

  field(id, state, action, onClick, t) {
    return h_flex().px(6).gap(6).items_center()
      .child(div().id(id).flex_1().min_w(0).h(30).px(8).flex().items_center().rounded(6).border_1().border_color(t.border)
        .cursor_text().on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .child(Input.new(state).h_full().text_size(12).text_color(t.foreground)))
      .child(div().id(`${id}-go`).px(8).py(4).rounded(6).cursor_pointer().bg(t.raised).hover((s) => s.bg(t.hover))
        .on_click(onClick).child(action));
  }

  menu() {
    const t = theme();
    const { issue, states } = props();
    const option = (id, on, children, onClick) => h_flex().id(id).h(26).px(6).gap(8).items_center().rounded(6).cursor_pointer()
      .when(on, (el) => el.bg(t.selected))
      .when(!on, (el) => el.hover((s) => s.bg(t.hover)))
      .on_click(onClick)
      .children(children);
    return v_flex().id("menu-scroll").size_full().p(6).overflow_y_scrollbar().text_size(12.5).text_color(t.foreground)
      .child(v_flex().px(6).pt(2).pb(6)
        .child(div().text_size(10.5).text_color(t.dim).child(issue.identifier))
        .child(div().truncate().font_weight(600).child(issue.title)))
      .child(this.serveBlock(issue, t))
      .child(label("STATUS", t))
      .children(states.map((s) => option(`menu-state-${s.id}`, s.id === issue.stateId, [
        div().size(8).flex_none().rounded(4).bg(s.color ?? t.muted),
        div().flex_1().truncate().child(s.name),
        div().text_size(10.5).text_color(t.dim).child(s.id === issue.stateId ? "current" : ""),
      ], (_e, cx) => {
        if (s.id !== issue.stateId) this.change(cx, "status", SET_STATE, { id: issue.id, stateId: s.id }, `${issue.identifier} moved to ${s.name}`);
      })))
      .child(label("PRIORITY", t))
      .child(h_flex().px(6).gap(4).flex_wrap().children(PRIORITIES.map((p) => {
        const on = p.value === issue.priority;
        return div().id(`menu-priority-${p.value}`).px(8).py(2).rounded(10).cursor_pointer().text_size(11.5)
          .bg(on ? t.accent : t.raised).text_color(on ? t.accent_foreground : t.foreground)
          .hover((s) => s.bg(on ? t.accent : t.hover))
          .on_click((_e, cx) => {
            if (!on) this.change(cx, "priority", SET_PRIORITY, { id: issue.id, priority: p.value }, `${issue.identifier} priority set to ${p.label}`);
          })
          .child(p.label);
      })))
      .child(label("TITLE", t))
      .child(this.field("menu-title", this.titleInput, "Save", (_e, cx) => this.saveTitle(cx), t))
      .child(label("COMMENT", t))
      .child(this.field("menu-comment", this.comment, "Post", (_e, cx) => this.postComment(cx), t))
      .when(Boolean(this.busy), (el) => el.child(div().px(6).pt(6).text_size(11.5).text_color(t.muted).child(this.busyText ?? `Saving ${this.busy}...`)))
      .when(Boolean(this.error), (el) => el.child(div().px(6).pt(6).text_size(11.5).text_color(t.blocked).child(this.error)))
      .child(this.familySections(t))
      .child(div().h(1).mx(6).mt(8).mb(4).bg(t.border))
      .child(option("menu-open", false, [div().child("Open in Linear")], () => { exec("open", [issue.url]); closeOverlay(props().overlay); }));
  }

  togglePanel(cx) {
    this.collapsed = !this.collapsed;
    localStorage.setItem("linear.collapsed", JSON.stringify(this.collapsed));
    run("layout.resize", { id: sport().column, px: this.collapsed ? RAIL_W : PANEL_W });
    cx.notify();
  }

  rail(t) {
    return v_flex().id("linear-rail").size_full().bg(t.chrome).pt(8).gap(10).items_center().cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .tooltip("Show your Linear issues")
      .on_click((_e, cx) => this.togglePanel(cx))
      .child(svg(LINEAR_ICON).size(14).text_color(LINEAR_PURPLE))
      .child(svg("mods/workspace-chrome/chevron-left.svg").size(13).text_color(t.muted))
      .when(Boolean(this.issues), (el) => el
        .child(div().text_size(11.5).font_weight(700).text_color(t.foreground).child(String(this.issues.length)))
        .children(this.groups().map((g) => v_flex().items_center().gap(2)
          .child(div().size(8).rounded(4).bg(g.state.color ?? t.muted))
          .child(div().text_size(10).text_color(t.muted).child(String(g.issues.length))))))
      .when(this.missingKey || Boolean(this.error && !this.issues), (el) => el.child(div().size(8).rounded(4).bg(t.blocked)));
  }

  render() {
    if (props()?.role === "menu") return this.menu();
    const t = theme();
    if (this.collapsed) return this.rail(t);
    return v_flex().size_full().min_h(0).bg(t.chrome).text_size(13)
      .child(h_flex().h(31).flex_none().pl(14).pr(8).gap(8).items_center().text_size(11.5).text_color(t.dim)
        .child(svg(LINEAR_ICON).size(13).flex_none().text_color(LINEAR_PURPLE))
        .child(div().font_weight(700).text_color(t.foreground).child(sport().title))
        .when(Boolean(this.issues), (el) => el.child(div().child(String(this.issues.length))))
        .child(div().flex_1())
        .child(div().id("linear-collapse").p(3).rounded(4).cursor_pointer().tooltip("Hide the Linear panel")
          .hover((s) => s.bg(t.hover))
          .on_click((_e, cx) => this.togglePanel(cx))
          .child(svg("mods/workspace-chrome/chevron-right.svg").size(12).text_color(t.dim)))
        .child(div().id("linear-refresh").px(6).py(1).rounded(4).cursor_pointer()
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .on_click((_e, cx) => this.refresh(cx))
          .child(this.loading ? "Loading" : "Refresh")))
      .child(v_flex().id("linear-issues").flex_1().min_h(0).pb(10).overflow_y_scrollbar().child(this.body(t)))
      .child(h_flex().h(24).flex_none().px(14).gap(6).text_size(10.5).text_color(t.dim)
        .child(div().flex_1().truncate().child("Right-click an issue to change it"))
        .when(Boolean(this.updated), (el) => el.child(div().child(`${this.error ? "Refresh failed, last " : "Updated "}${clock(this.updated)}`))));
  }
}
