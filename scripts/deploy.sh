#!/usr/bin/env bash
# 빌드 산출물(dist)을 gh-pages 브랜치로 올린다. 주소는 그대로 유지된다.
#
#   ./scripts/deploy.sh
#
# 빌드는 로컬에서 한다(허브 배포와 같은 방식). .env.local 의 VITE_* 값이 번들에 들어가므로,
# 값이 없으면 미리보기 모드(가짜 데이터)로 배포된다는 점에 주의.
set -euo pipefail
cd "$(dirname "$0")/.."

BRANCH=gh-pages
WORKTREE=.deploy-worktree

if [[ -n "$(git status --porcelain)" ]]; then
  echo "커밋되지 않은 변경이 있습니다. 먼저 커밋하세요." >&2
  git status --short >&2
  exit 1
fi

npm run build

# .nojekyll 이 없으면 GitHub Pages 가 _ 로 시작하는 asset 을 무시한다
touch dist/.nojekyll
# SPA 는 아니지만, 새로고침 시 404 를 index 로 넘겨 주소가 깨지지 않게 한다
cp dist/index.html dist/404.html

rm -rf "$WORKTREE"
git worktree prune
if git show-ref --quiet "refs/heads/$BRANCH"; then
  git worktree add "$WORKTREE" "$BRANCH"
else
  git worktree add --detach "$WORKTREE"
  git -C "$WORKTREE" checkout --orphan "$BRANCH"
  git -C "$WORKTREE" rm -rf . >/dev/null 2>&1 || true
fi

# 이전 산출물을 지우고 새 것으로 교체 (.git 은 건드리지 않는다)
find "$WORKTREE" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R dist/. "$WORKTREE"/

git -C "$WORKTREE" add -A
if git -C "$WORKTREE" diff --cached --quiet; then
  echo "변경 없음 — 배포 생략"
else
  git -C "$WORKTREE" commit -q -m "배포 $(git rev-parse --short HEAD)"
  git -C "$WORKTREE" push -q origin "$BRANCH"
  echo "배포 완료"
fi

git worktree remove "$WORKTREE" --force
