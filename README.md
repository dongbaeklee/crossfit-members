# 회원 카드

**https://dongbaeklee.github.io/crossfit-members/**

발리인미사 · 메이커스 회원의 **운동 역량**과 **특성**을 카드 한 장으로 보고 기록하는 코치용 화면.

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

전용 Supabase 프로젝트 **`profile card`** (`hwnvgmdkttaiasqohndz`, 서울) 하나를 쓴다. 결제앱·예약앱과 DB를 공유하지 않는다.

| 테이블 | 내용 | 시드가 덮어쓰나 |
| --- | --- | --- |
| `staff` | 로그인 계정의 권한(`pending`/`coach`/`manager`/`owner`)과 담당 지점 | — |
| `boxes` | 지점 목록 | — |
| `member_snapshots` | 엑셀에서 온 사실값 | **덮어씀** |
| `member_profiles` | 코치가 입력한 역량·특성 | **절대 안 건드림** |
| `member_cards` (뷰) | 위 둘을 합쳐 화면에 넘김 (`security_invoker`) | — |

스냅샷과 프로필을 가른 이유: 매주 엑셀을 다시 밀어넣어도 코치가 쌓아온 기록이 살아남아야 하기 때문이다.

**권한**: 코치 이상만, 자기 지점만. `box`가 비어 있는 `owner`는 전 지점. 로그인하지 않았거나 `pending` 이면 아무것도 안 보인다(RLS).

## 로그인 — 입장 코드 하나 (이메일 없음)

허브와 같은 방식이다. 코치는 **입장 코드만** 친다. 이메일도, 메일함 확인도, 개인 계정도 없다.

구조는 이렇다: 팀 공용 계정 하나를 만들고, **그 계정의 비밀번호가 곧 입장 코드**다. 계정 주소(`VITE_TEAM_EMAIL`)는 비밀이 아니라 번들에 들어가도 되고, 비밀은 코드 쪽이다. 코드를 통과해야 세션이 생기고, 그래야 RLS 를 넘어 회원 데이터가 내려온다.

**설치 (한 번만)**

1. [Authentication → Users → Add user](https://supabase.com/dashboard/project/hwnvgmdkttaiasqohndz/auth/users)
   - Email: `team@crossfit-members.app` (`.env.local` 의 `VITE_TEAM_EMAIL` 과 정확히 같아야 한다)
   - Password: 원하는 입장 코드 (**6자 이상**)
   - **Auto Confirm User 체크** — 안 하면 로그인이 막힌다
2. SQL Editor 에서 권한 부여

```sql
-- 공용 계정에 전 지점 권한
update public.staff set role = 'owner', display_name = '공용'
where email = 'team@crossfit-members.app';
```

**코드를 바꾸려면** 대시보드에서 그 계정의 비밀번호를 바꾸면 된다. 배포는 다시 할 필요 없다.

> ⚠️ **모두가 같은 계정을 쓴다.** 누가 무엇을 고쳤는지는 구분되지 않는다(`member_profiles.updated_by` 가 전부 공용 계정). 지점별로 접근을 나누거나 사람별 이력이 필요해지면 개인 계정 방식으로 되돌려야 한다 — `staff` 테이블은 이미 `coach`/`box` 를 지원하므로 스키마 변경 없이 가능하다.
>
> 코드가 새면 주소를 아는 사람 누구나 회원 197명 정보를 본다. 외부에 공유하지 말 것.

## 준비

```bash
cp .env.example .env.local   # 값 채우기
npm install
```

`SUPABASE_SERVICE_ROLE_KEY` 는 RLS 를 우회한다. 시드 스크립트 전용이며 **절대 `VITE_` 접두사를 붙이지 말 것** — 붙이는 순간 프런트 번들에 박혀 공개된다.

접속 정보가 없으면 사이트는 **미리보기 모드**(가짜 데이터)로 뜬다. 이 저장소는 공개라 실제 회원 정보는 번들에 넣지 않는다.

## 마이그레이션

```bash
supabase link --project-ref hwnvgmdkttaiasqohndz
supabase db push
```

## 회원 명단 동기화

허브에서 쓰는 `_members.json` 을 그대로 읽는다. 주간 갱신 절차에서 `build_hub.py` 를 돌린 뒤 이어서 실행하면 된다.

```bash
npm run seed:dry   # 무엇이 반영될지 먼저 확인 (DB 접속 없이 동작)
npm run seed       # 실제 반영 (upsert — 여러 번 돌려도 안전)
```

## 개발 · 검증 · 배포

```bash
npm run dev           # 로컬 개발 (http://localhost:5173/crossfit-members/)
npm run check:rules   # 강점/약점·근속·필터 규칙 검증 (25건, DB 불필요)
npm run deploy        # 빌드 후 gh-pages 브랜치로 배포 (주소 유지)
```

저장소 이름을 바꾸면 `VITE_BASE=/새이름/` 을 붙여 빌드한다.
