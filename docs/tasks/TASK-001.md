# Task 001: 프로젝트 구조 및 라우팅 설정

## 개요
- **목표**: Next.js App Router 기반 프로젝트를 초기화하고, 4개 조회 화면의 라우트와 공통 레이아웃 골격을 구축하여 이후 UI/기능 개발의 토대를 마련
- **관련 기능**: 전체 화면(대시보드/일별/주별/월별)의 기반 구조
- **의존성**: 없음 (Phase 1 최초 작업)
- **참조 문서**: `docs/PRD.md`, `docs/ROADMAP.md`, `docs/guides/project-structure.md`, `docs/guides/nextjs-15.md`, `docs/guides/styling-guide.md`

## 구현 사항

### 1. Next.js 프로젝트 초기화
- [x] `create-next-app`으로 TypeScript + App Router + Tailwind CSS 기반 프로젝트 생성 (`src/` 디렉토리 구조 사용)
- [x] ESLint, Prettier 설정 확인
- [x] `shadcn/ui` 초기화 (`components.json`, `new-york` 스타일)
- [x] 경로 별칭(`@/components`, `@/lib`, `@/hooks` 등) 설정 확인

### 2. 기본 shadcn/ui 컴포넌트 설치
- [x] Button, Card, Tabs 컴포넌트 설치 (헤더 탭 내비게이션에 필요)

### 3. 라우트 구조 생성
- [x] `src/app/page.tsx` — 대시보드(`/`, 현재 실적) 빈 페이지
- [x] `src/app/daily/page.tsx` — 일별 추적(`/daily`) 빈 페이지
- [x] `src/app/weekly/page.tsx` — 주별 추적(`/weekly`) 빈 페이지
- [x] `src/app/monthly/page.tsx` — 월별 실적(`/monthly`) 빈 페이지
- [x] 각 페이지는 화면명을 표시하는 최소한의 placeholder만 포함 (예: `<h1>대시보드</h1>`)

### 4. 공통 레이아웃 골격 구현
- [x] `src/app/layout.tsx` — 루트 레이아웃에 헤더 포함
- [x] `src/components/layout/header.tsx` — 서비스명(Investment Dashboard), 부제(투자 실적 현황) 표시
- [x] `src/components/navigation/main-nav.tsx` — 탭 내비게이션 (`현재 실적 | 일별 추적 | 주별 추적 | 월별 실적`), 현재 경로 활성화 표시
- [x] 데이터 기준일시 표시 영역은 placeholder로 확보 (실제 값은 Task 005 이후 연동)

### 5. 반응형 기본 골격
- [x] 헤더/탭 내비게이션 모바일 대응 (`docs/guides/styling-guide.md`의 반응형 네비게이션 패턴 참고)
- [x] 컨테이너 레이아웃(`container mx-auto px-4`) 적용

## 수락 기준

1. [x] `npm run dev` 실행 시 4개 라우트(`/`, `/daily`, `/weekly`, `/monthly`)가 모두 정상 렌더링된다
2. [x] 모든 화면에서 공통 헤더와 탭 내비게이션이 동일하게 표시된다
3. [x] 탭 내비게이션 클릭 시 해당 라우트로 정상 이동하고, 현재 페이지 탭이 시각적으로 구분된다
4. [x] 모바일 너비(375px)와 데스크톱 너비(1280px)에서 헤더/내비게이션이 깨지지 않는다 (Playwright로 실제 브라우저 시각 확인 완료)
5. [x] `npm run typecheck`, `npm run lint`, `npm run build`가 에러 없이 통과한다
6. [x] any 타입 사용 없음, 컴포넌트는 kebab-case 파일명 + PascalCase 컴포넌트명 규칙 준수

## 관련 파일

### 생성할 파일
```
src/
├── app/
│   ├── layout.tsx            # 루트 레이아웃 (헤더 포함)
│   ├── page.tsx               # 대시보드 (/)
│   ├── daily/
│   │   └── page.tsx           # 일별 추적 (/daily)
│   ├── weekly/
│   │   └── page.tsx           # 주별 추적 (/weekly)
│   ├── monthly/
│   │   └── page.tsx           # 월별 실적 (/monthly)
│   └── globals.css
├── components/
│   ├── layout/
│   │   └── header.tsx         # 헤더 (서비스명, 기준일시 placeholder)
│   ├── navigation/
│   │   └── main-nav.tsx       # 탭 내비게이션
│   └── ui/                    # shadcn/ui (button, card, tabs)
└── lib/
    └── utils.ts                # cn() 헬퍼
```

## 구현 단계

### Step 1: 프로젝트 초기화
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
npx shadcn@latest init
npx shadcn@latest add button card tabs
```

### Step 2: 라우트 생성
1. `src/app/daily`, `src/app/weekly`, `src/app/monthly` 디렉토리 생성
2. 각 `page.tsx`에 최소 placeholder 컴포넌트 작성

### Step 3: 공통 레이아웃 구현
1. `components/layout/header.tsx` 작성 (서비스명 + 기준일시 placeholder)
2. `components/navigation/main-nav.tsx` 작성 (`usePathname`으로 활성 탭 판별, `'use client'` 필요)
3. `app/layout.tsx`에 Header 통합

### Step 4: 반응형 검증
1. 브라우저 개발자 도구로 모바일/데스크톱 뷰포트 확인
2. 탭 내비게이션 모바일 대응 여부 점검

### Step 5: 품질 검증
```bash
npm run typecheck
npm run lint
npm run build
```

## 주의사항

1. **Server Components 우선**: 상태나 이벤트 핸들러가 필요한 `main-nav.tsx`(활성 탭 판별)만 `'use client'` 사용, 나머지는 Server Component 유지
2. **any 타입 금지**: 전역 규칙 준수
3. **데이터 연동 없음**: 이 Task는 골격만 구축하며, 실제 데이터 조회/표시는 Task 002(타입/DB 설계) 및 Task 005(Supabase 연동) 이후 진행
4. **Pages Router 금지**: App Router만 사용

## 다음 단계

Task 001 완료 후:
1. **Task 003**: 공통 컴포넌트 라이브러리 구현 (요약 카드, 테이블, 차트, 더미 데이터)
2. **Task 004**: 4개 화면 UI 완성 (더미 데이터 기반)
