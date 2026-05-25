---
name: feedback-git-author
description: Git commits nesmú obsahovať Claude ako co-author; author vždy kubincanek@gmail.com
metadata:
  type: feedback
---

Nikdy nepoužívaj `Co-Authored-By: Claude ...` v commit správach.

**Why:** Používateľ nechce, aby sa Claude objavoval v git histórii ako autor alebo spoluautor.

**How to apply:** Keď vytváraš commit správy, vynechaj riadok `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`. Ak je autor potrebný, použij `kubincanek@gmail.com`.
