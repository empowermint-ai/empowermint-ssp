# Neumorphic restore

The brand refresh (see DESIGN.md) flattened every card, input and button into a plain fill with a
hairline border. This branch brings the soft, dual-tone neumorphic depth back as a visual-layer
change only. Fonts, the colour palette, layout, copy, backend and the planning algorithm are untouched.

What changed
- `app/globals.css`: the six `.neu-*` surface classes use shadow pairs again
  (`--neu-shadow-light/dark` and the orange `--neu-accent-shadow-light/dark` tokens) instead of
  hairline borders. Fills are the existing brand tokens. Borders are kept as `transparent` so every
  box is exactly the size it was in the flat version, and the orange focus border still shows on inputs.
- Light mode: white highlight + warm cream shade (`#DCD7CA`). Dark mode: a soft lighter highlight
  (`#2B2A26`) because a dark shadow cannot show on a black page.
- Timer dials (`TimerClient.tsx`, `ExamTimerSessionClient.tsx`): the recessed inner face is back.

Known trade-off
- Inputs are now defined by a soft inset shadow rather than a visible border, so their edge has less
  contrast than the flat version had. Labels, placeholders and the orange focus border are unchanged.
