# Tennis + Linear for Herdr

The [Tennis](https://github.com/eduardafa/herdr-tennis) layout for the [Herdr app](https://herdr.dev), with your Linear issues beside it: see which issue each agent is playing, change issues without leaving Herdr, and serve one to a new agent in a fresh worktree.

![Tennis + Linear](preview.png?v=2)

## Install

Ask your coding agent:

```
Read ~/.config/herdr-app/AGENTS.md, then add this layout: https://github.com/eduardafa/herdr-tennis-linear
```

Or copy `layouts/`, `mods/` and `themes/` into `~/.config/herdr-app/`, then switch to it with `ctrl-shift-l`.

## Connect Linear

macOS only.

1. In Linear, create a personal API key: Settings > Account > Security & access > Personal API keys. Give it write access if you want to change issues from Herdr.
2. Store it in your Keychain. In a terminal, run this and paste the key at both prompts:
   ```
   security add-generic-password -s herdr-linear -a linear -w
   ```
3. Click Refresh in the "Order of play" panel.

## Serve

To start agents on issues from a fresh worktree, list your repos in `~/.config/herdr-app/mods/linear-court/serve.json`:

```json
{ "agent": ["claude"], "base": "main", "repos": [{ "name": "my-app", "path": "~/code/my-app" }] }
```

## Use

- Pick a court with the Hard (NY or MEL), Grass, Clay and Indoor buttons on the scoreboard, or a tennis theme in Settings. After installing, restart Herdr once so it loads the Melbourne theme.
- Each player wears its space's color, except on grass, where everyone wears white.
- An agent working with no partner on the other side rallies with a ball machine instead.
- Click a player, or an agent in the left panel, to jump to that agent.
- Hover over a player to see its model, program, what it's doing, its branch and when it started.
- Right-click a player, or an agent in the left panel, for its menu: go to it, peek at it, rename it, pin it to the top, split a shell beside it, or close it. A renamed agent shows its new name everywhere; renaming it to nothing goes back to its space's name.
- Agents in Rally and Challenge show how long they've been in that status in the left panel.
- Your name and a settings button sit under the Spaces list.
- The left panel groups your agents into Rally (working), Challenge (needs you), Ready and Point (finished). Each space below shows the same marker for its busiest agent.
- Click a section header, the Spaces header or a repo's arrow to fold it.
- "Order of play" groups your issues by status or by project. Sub-issues fold under their parent; click "N sub-issues" to show them.
- In "Order of play", click an issue to open it in Linear, or right-click it to serve it, change its status, priority or title, comment, or see its parent and sub-issues. Copy branch copies its Linear branch name. The arrow in the header folds the panel.

What each part does is in [RECIPE.md](RECIPE.md).
