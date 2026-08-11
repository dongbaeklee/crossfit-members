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

## 로그인 — 매직링크 (비밀번호 없음)

사이트에서 이메일을 넣으면 로그인 링크가 메일로 온다. 누르면 바로 들어와진다. 비밀번호를 만들지도, 나눠주지도 않는다.

**가입만으로는 아무 권한도 없다**(`pending`). Supabase 는 공개 가입이 기본이라, 가입 즉시 권한을 주면 아무나 회원 정보를 보게 되기 때문이다. 관장이 직접 올려줘야 한다.

1. 코치가 사이트에서 이메일 입력 → 링크 클릭 → 로그인 (이 시점 권한은 `pending`)
2. 화면에 자기 이메일이 뜬다. 그걸 관장에게 전달
3. 관장이 SQL Editor 에서 권한 부여

```sql
-- 관장(전 지점)
update public.staff set role = 'owner', display_name = '이도형'
where email = '관장이메일@example.com';

-- 코치(담당 지점만)
update public.staff set role = 'coach', box = '메이커스', display_name = '조강희'
where email = '코치이메일@example.com';
```

권한을 회수하려면 `role = 'pending'` 으로 되돌린다.

> ⚠️ **메일 발송은 시간당 2통**이다(Supabase 기본 메일 서비스, `rate_limit_email_sent: 2`).
> 코치 여러 명을 한 번에 등록할 때 걸린다. 자주 쓸 거면 Authentication → Emails 에서 커스텀 SMTP(예: Resend, SendGrid)를 붙이면 풀린다.
>
> 매직링크가 동작하려면 `site_url` 과 `uri_allow_list` 에 배포 주소가 들어 있어야 한다. 기본값이 `http://localhost:3000` 이라 그대로 두면 링크가 로컬로 간다. (설정 완료됨 — 저장소 주소가 바뀌면 같이 고칠 것)

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
