# 회원 카드

**https://dongbaeklee.github.io/crossfit-members/**

발리인미사 · 메이커스 회원의 **운동 역량**과 **특성**을 카드 한 장으로 보고 기록하는 코치용 화면.

> 지금 올라가 있는 것은 **미리보기(가짜 데이터)** 다. 이 저장소는 공개라 실제 회원 정보를 번들에 넣지 않는다.
> Supabase 접속 정보(`.env.local`)를 넣고 다시 배포하면 로그인이 켜지고 실제 회원이 뜬다.

허브(참모 대시보드, `bm-ops-hub`)와는 별개 사이트다. 허브는 운영 숫자를, 여기는 회원 개인을 다룬다.

## 무엇을 담나

| 구분 | 항목 | 채우는 주체 |
| --- | --- | --- |
| 운동 역량 | 역도 · 체조 · 유산소 (0=미평가, 1~5) | 코치가 관찰해 입력 |
| 회원 특성 | 목표 · 성향 · 리스크(부상 이력) | 코치가 입력 |
| 실제 운동 시작일 | `started_on` | 코치가 아는 회원부터 |
| 사실값 | 상태 · 회원권 · 시작/종료일 · 최근 출석 · 가입일 | 엑셀에서 자동 동기화 |

강점/약점은 따로 입력하지 않는다. 평가된 축 중 **최고점이 4 이상이면 강점**, **최저점이 2 이하이면 약점**으로 자동 표시된다.

> ⚠️ **가입일은 실제 운동시작일이 아니다.** 2026-06-10~12 에 앱 대량 이관이 있어 회원 66~78% 의 가입일이 그 사흘에 몰려 있다.
> 근속은 `started_on`(코치 입력)이 있으면 그것을, 없으면 가입일을 쓰며 화면에 "(가입일 기준)"이라고 표기한다.

## 구조

- **DB**: 기존 `crossfit-billing` Supabase 프로젝트를 공유한다. 인증·역할(`profiles`, `my_role()`, `has_role()`)은 `crossfit-booking` 이 만든 것을 그대로 쓴다.
- **새 테이블 2개** (결제앱의 `members` 는 건드리지 않는다)
  - `member_snapshots` — 엑셀에서 온 사실값. 시드가 매주 덮어쓴다.
  - `member_profiles` — 코치가 입력한 판단값. **시드가 절대 건드리지 않는다.**
  - `member_cards` 뷰 — 위 둘을 합쳐 화면에 넘긴다 (`security_invoker` 라 RLS 그대로 적용).
- **권한**: 코치 이상만, 자기 지점만. 대표(owner)는 전체.

## 준비

```bash
cp .env.example .env.local   # 값 채우기
npm install
```

`SUPABASE_SERVICE_ROLE_KEY` 는 RLS 를 우회한다. 시드 스크립트 전용이며 **절대 `VITE_` 접두사를 붙이지 말 것** — 붙이는 순간 프런트 번들에 박혀 공개된다.

## 마이그레이션 적용

```bash
supabase link --project-ref jofzfytactglagfzyeip
supabase db push
```

`crossfit-booking` 의 마이그레이션(booking_core → tighten_billing_rls → rename_current_role)이 먼저 적용돼 있어야 한다. 안 돼 있으면 마이그레이션이 스스로 멈추고 알려준다.

## 회원 명단 동기화

허브에서 쓰는 `_members.json` 을 그대로 읽는다. 주간 갱신 절차에서 `build_hub.py` 를 돌린 뒤 이어서 실행하면 된다.

```bash
npm run seed:dry   # 무엇이 반영될지 먼저 확인 (DB 접속 없이 동작)
npm run seed       # 실제 반영 (upsert — 여러 번 돌려도 안전)
```

## 개발 · 검증 · 배포

```bash
npm run dev           # 로컬 개발
npm run check:rules   # 강점/약점·근속·필터 규칙 검증 (25건, DB 불필요)
npm run build         # dist/ 생성 (GitHub Pages 용 base 경로 적용)
```

저장소 이름을 바꾸면 `VITE_BASE=/새이름/ npm run build` 로 덮어쓴다.
