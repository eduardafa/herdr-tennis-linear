import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { agents, spaces, run, props, closeOverlay, openOverlay, theme } from "herdr";

const ICONS = "mods/workspace-chrome";

const agentName = (a) =>
  spaces().find((s) => s.id === a.space)?.tabs?.find((c) => c.id === a.tab)?.named ? a.tab_name : a.space_name;

function items(a) {
  const name = agentName(a);
  return [
    { label: "Go to agent", icon: "terminal", act: () => run("agent.focus", { terminal: a.address }) },
    { label: "Peek", icon: "search", act: () => run("terminal.peek", { terminal: a.address }) },
    {
      label: "Rename",
      icon: "square-pen",
      act: () => openOverlay({ mod: "prompt", kind: "dialog", width: 380, height: 210, props: {
        title: "Rename agent", value: name, hint: "Leave it empty to go back to the space's name.",
        command: { name: "tab.rename", args: { id: a.tab } },
      } }),
    },
    a.pinned
      ? { label: "Unpin", icon: "pin-off", act: () => run("terminal.pin", { terminal: a.address, pinned: false }) }
      : { label: "Pin to top", icon: "pin", act: () => run("terminal.pin", { terminal: a.address, pinned: true }) },
    { label: "Split right", icon: "panel-right", act: () => run("pane.split", { direction: "right", pane: a.pane }) },
    {
      label: "Close",
      icon: "x",
      apart: true,
      act: () => openOverlay({ mod: "confirm", kind: "dialog", width: 380, height: 170, props: {
        title: `Close ${name}?`, detail: "Its terminal closes and the agent stops.",
        command: { name: "pane.close", args: { pane: a.pane } },
      } }),
    },
  ];
}

export default class AgentMenu extends View {
  init(_props, cx) {
    this.at = 0;
    this.handle = cx.focus_handle();
    this.handle.focus();
  }

  agent() {
    const terminal = props()?.terminal;
    return agents().find((a) => (terminal ? a.address === terminal : a.focused));
  }

  choose(it) {
    closeOverlay(props()?.overlay);
    it.act();
  }

  render() {
    const t = theme();
    const a = this.agent();
    const list = a ? items(a) : [];
    return v_flex().id("agent-menu").track_focus(this.handle).w_full().min_h(0).p(5).bg(t.popover).text_size(12.8)
      .on_key_down((e, cx) => {
        if (e.key === "down") this.at = (this.at + 1) % list.length;
        else if (e.key === "up") this.at = (this.at + list.length - 1) % list.length;
        else if (e.key === "enter" && list[this.at]) this.choose(list[this.at]);
        else if (e.key === "escape") closeOverlay(props()?.overlay);
        else return;
        cx.notify();
      })
      .when(Boolean(a), (el) => el.child(div().px(8).pt(4).pb(5).text_size(11).font_weight(700).text_color(t.dim).truncate().child(agentName(a))))
      .when(!a, (el) => el.child(div().px(8).py(6).text_color(t.dim).child("This agent has gone.")))
      .children(list.map((it, i) => v_flex()
        .when(Boolean(it.apart), (el) => el.child(div().mx(7).my(4).h(1).bg(t.border)))
        .child(h_flex().id(`am-${i}`).h(31).px(8).gap(9).rounded(7).items_center().text_color(t.foreground)
          .when(i === this.at, (el) => el.bg(t.selected))
          .hover((s) => s.bg(t.hover))
          .on_click(() => this.choose(it))
          .child(svg(`${ICONS}/${it.icon}.svg`).size(14).flex_none().text_color(t.muted))
          .child(div().flex_1().child(it.label)))));
  }
}
