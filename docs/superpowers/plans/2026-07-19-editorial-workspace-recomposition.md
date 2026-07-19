# Editorial Workspace Recomposition Plan

1. Move the permanent workspace entry from the session-dependent account component into `PublicHeader`; add a regression test for the unloaded Clerk state.
2. Recompose the homepage macro grid and library hierarchy with a scoped v9 CSS layer, retaining existing data and interactions.
3. Recompose public discovery/reading and desk shells around solid content/task surfaces and a single global material layer.
4. Run focused regressions, consolidated frontend tests, and production build; push the branch and inspect the Preview at desktop and mobile widths.
