# Task 003: 공통 컴포넌트 라이브러리 구현

## 개요
- **목표**: 재사용 가능한 공통 컴포넌트 라이브러리를 구축하고 더미 데이터를 준비하여 Phase 2의 UI 개발 기반을 마련
- **예상 소요 시간**: 2일
- **관련 기능**: F001-F015 (모든 기능의 UI 기반)
- **의존성**: Task 002 (타입 정의 및 인터페이스 설계) 완료

## 구현 사항

### 1. shadcn/ui 컴포넌트 추가 설치
- [ ] Avatar 컴포넌트 설치
- [ ] Dialog 컴포넌트 설치
- [ ] Sonner (Toast) 컴포넌트 설치 및 Provider 설정
- [ ] Form 컴포넌트 설치 (React Hook Form 통합)
- [ ] Select 컴포넌트 설치
- [ ] Skeleton 컴포넌트 설치

**참고**: 이미 설치된 컴포넌트
- ✅ Badge, Button, Card, Checkbox, Dropdown Menu, Input, Label, Empty State

### 2. 이벤트 카드 컴포넌트 구현
- [ ] EventCard 컴포넌트 생성 (`components/events/event-card.tsx`)
  - 이벤트 썸네일 이미지 표시 (Card + Avatar)
  - 이벤트 제목, 날짜, 장소 표시
  - 호스트 프로필 (아바타 + 이름)
  - 참여자 수 표시 (Badge)
  - 이벤트 상태 표시 (Badge: upcoming/ongoing/ended)
  - variant 지원 (default, compact)
  - 호버 효과 및 클릭 액션

**타입 사용**: `EventCardProps` from `lib/types/components.ts`

### 3. 참여자 프로필 카드 컴포넌트 구현
- [ ] ParticipantCard 컴포넌트 생성 (`components/participants/participant-card.tsx`)
  - 참여자 아바타 (Avatar)
  - 참여자 이름
  - 역할 표시 (Badge: host/participant)
  - size 지원 (sm, md, lg)
  - 선택적 showRole prop

**타입 사용**: `ParticipantCardProps` from `lib/types/components.ts`

### 4. 로딩 스켈레톤 컴포넌트 구현
- [ ] EventCardSkeleton 컴포넌트 생성 (`components/skeletons/event-card-skeleton.tsx`)
  - 이벤트 카드와 동일한 레이아웃
  - Skeleton 컴포넌트 활용
  - variant 지원 (default, compact)

- [ ] ParticipantCardSkeleton 컴포넌트 생성 (`components/skeletons/participant-card-skeleton.tsx`)
  - 참여자 카드와 동일한 레이아웃
  - size 지원 (sm, md, lg)

- [ ] ListSkeleton 컴포넌트 생성 (`components/skeletons/list-skeleton.tsx`)
  - 범용 리스트 스켈레톤
  - count prop으로 개수 조절 가능

### 5. 빈 상태 UI 컴포넌트
- [x] EmptyState 컴포넌트 이미 구현됨 (`components/ui/empty-state.tsx`)
  - ✅ 아이콘, 제목, 설명, 액션 버튼 지원
  - **추가 작업 불필요**

### 6. 더미 데이터 생성 및 관리 유틸리티
- [ ] 더미 데이터 디렉토리 생성 (`lib/data/`)
- [ ] 더미 사용자 데이터 생성 (`lib/data/users.ts`)
  - 10명의 더미 사용자 (호스트 5명, 참여자 5명)
  - 실제 같은 이름, 이메일, 아바타 URL
  - 생성일시는 현재로부터 -30일 ~ -1일 범위

- [ ] 더미 이벤트 데이터 생성 (`lib/data/events.ts`)
  - 20개의 더미 이벤트
  - 상태별 분포: upcoming (10), ongoing (5), ended (5)
  - 이벤트 날짜: 과거 5개, 진행 중 5개, 미래 10개
  - 다양한 카테고리 (모임, 스터디, 파티, 워크샵 등)
  - 실제 장소명 사용 (서울 주요 지역)
  - 커버 이미지 URL (Unsplash 활용)
  - 각 이벤트마다 랜덤 호스트 할당

- [ ] 더미 참여자 관계 데이터 생성 (`lib/data/participants.ts`)
  - 각 이벤트당 3-15명의 참여자
  - 호스트는 자동으로 'host' 역할
  - 나머지는 'participant' 역할
  - 참여 일시는 이벤트 생성일 이후, 이벤트 날짜 이전

- [ ] 더미 데이터 인덱스 파일 (`lib/data/index.ts`)
  - 모든 더미 데이터 export
  - 데이터 조회 헬퍼 함수 제공
    - `getUserById(id: string): User | undefined`
    - `getEventById(id: string): Event | undefined`
    - `getEventsByStatus(status: string): Event[]`
    - `getEventParticipants(eventId: string): ParticipantWithUser[]`
    - `getUserEvents(userId: string): Event[]`
    - `getUpcomingEvents(limit?: number): Event[]`

## 수락 기준

### 기능 완성도
1. ✅ shadcn/ui 6개 컴포넌트 설치 완료 (Avatar, Dialog, Sonner, Form, Select, Skeleton)
2. ✅ EventCard 컴포넌트가 모든 필수 정보를 표시하고 2가지 variant 지원
3. ✅ ParticipantCard 컴포넌트가 3가지 size를 지원하고 역할 표시 가능
4. ✅ 3종류의 스켈레톤 컴포넌트가 실제 컴포넌트와 일치하는 레이아웃
5. ✅ 더미 데이터가 현실적이고 다양한 시나리오를 커버

### 데이터 품질
1. ✅ 최소 10명의 더미 사용자
2. ✅ 최소 20개의 더미 이벤트 (상태별 고르게 분포)
3. ✅ 각 이벤트당 3-15명의 참여자
4. ✅ 날짜 데이터가 논리적으로 일관성 있음 (참여일 < 이벤트 날짜)
5. ✅ 헬퍼 함수들이 정확하게 데이터를 조회

### 코드 품질
1. ✅ 모든 컴포넌트가 TypeScript 타입 정의 사용
2. ✅ 컴포넌트가 재사용 가능하고 props로 커스터마이징 가능
3. ✅ 일관된 스타일 (Tailwind CSS, shadcn/ui 테마)
4. ✅ 다크 모드 지원
5. ✅ 접근성 고려 (적절한 aria-label, 시맨틱 HTML)

### 통합 테스트
1. ✅ 모든 컴포넌트가 Storybook 또는 테스트 페이지에서 정상 렌더링
2. ✅ 더미 데이터 헬퍼 함수가 정확한 결과 반환
3. ✅ 라이트/다크 모드에서 컴포넌트가 올바르게 표시
4. ✅ 모바일/데스크톱 반응형 동작 확인

## 관련 파일

### 생성할 파일
```
components/
├── events/
│   └── event-card.tsx           # 새로 생성
├── participants/
│   └── participant-card.tsx     # 새로 생성
├── skeletons/
│   ├── event-card-skeleton.tsx  # 새로 생성
│   ├── participant-card-skeleton.tsx  # 새로 생성
│   └── list-skeleton.tsx        # 새로 생성
└── ui/
    ├── avatar.tsx               # shadcn add
    ├── dialog.tsx               # shadcn add
    ├── sonner.tsx               # shadcn add
    ├── form.tsx                 # shadcn add
    ├── select.tsx               # shadcn add
    └── skeleton.tsx             # shadcn add

lib/
└── data/
    ├── users.ts                 # 새로 생성
    ├── events.ts                # 새로 생성
    ├── participants.ts          # 새로 생성
    └── index.ts                 # 새로 생성
```

### 참조할 파일
- `lib/types/models.ts` - 도메인 모델 타입
- `lib/types/components.ts` - 컴포넌트 Props 타입
- `components/ui/empty-state.tsx` - 기존 컴포넌트 참고
- `components.json` - shadcn/ui 설정

## 구현 단계

### Step 1: shadcn/ui 컴포넌트 설치 (30분)
```bash
# 필수 컴포넌트 일괄 설치
npx shadcn@latest add avatar dialog sonner form select skeleton

# Sonner Provider를 app/layout.tsx에 추가
```

**중요**: Form 컴포넌트는 React Hook Form과 Zod를 함께 설치합니다.

### Step 2: 이벤트 카드 컴포넌트 구현 (2시간)
1. `components/events/` 디렉토리 생성
2. EventCard 컴포넌트 구현
   - Card 컴포넌트를 베이스로 사용
   - 이미지는 next/image 컴포넌트 사용
   - 날짜 포맷팅은 date-fns 또는 Intl API 사용
   - 호버 효과: `hover:shadow-lg transition-shadow`
3. Variant별 스타일 분기
   - default: 풀 레이아웃, 모든 정보 표시
   - compact: 간소화된 레이아웃, 핵심 정보만

### Step 3: 참여자 카드 컴포넌트 구현 (1시간)
1. `components/participants/` 디렉토리 생성
2. ParticipantCard 컴포넌트 구현
   - Avatar 컴포넌트 활용
   - Badge로 역할 표시
   - size에 따른 아바타 크기 조절
3. 반응형 및 접근성 고려

### Step 4: 스켈레톤 컴포넌트 구현 (1.5시간)
1. `components/skeletons/` 디렉토리 생성
2. 각 카드 컴포넌트에 대응하는 스켈레톤 구현
   - 실제 컴포넌트와 동일한 레이아웃 유지
   - Skeleton 컴포넌트로 각 영역 표시
3. ListSkeleton 범용 컴포넌트 구현

### Step 5: 더미 데이터 생성 (3시간)
1. `lib/data/` 디렉토리 생성
2. 더미 사용자 데이터 작성
   - 실제 같은 한국 이름 사용
   - UI Avatars API 또는 Unsplash 아바타 이미지
3. 더미 이벤트 데이터 작성
   - 다양한 카테고리와 시나리오
   - 현실적인 제목과 설명
   - Unsplash 이미지 활용
4. 참여자 관계 데이터 생성
   - 랜덤하게 사용자를 이벤트에 배정
   - 논리적인 날짜 순서 유지
5. 헬퍼 함수 구현 및 테스트

### Step 6: 통합 및 검증 (1시간)
1. 컴포넌트가 더미 데이터와 잘 동작하는지 확인
2. Toaster 컴포넌트를 layout.tsx에 추가
3. 다크 모드 테스트
4. 반응형 동작 확인
5. TypeScript 타입 체크
6. ESLint 및 Prettier 실행

## 주의사항

### 컴포넌트 설계
1. **Props 최소화**: 필요한 props만 정의하고, 기본값 제공
2. **타입 안정성**: 모든 props에 TypeScript 타입 지정
3. **재사용성**: 다양한 상황에서 사용 가능하도록 유연하게 설계
4. **접근성**: ARIA 속성 및 키보드 네비게이션 고려

### 더미 데이터
1. **현실성**: 실제 프로덕션에서 사용할 것 같은 데이터 생성
2. **다양성**: 엣지 케이스를 커버하는 다양한 시나리오
3. **일관성**: 날짜, 관계 등이 논리적으로 일관되어야 함
4. **확장성**: 쉽게 데이터를 추가/수정할 수 있는 구조

### 성능
1. **이미지 최적화**: next/image 컴포넌트 사용
2. **지연 로딩**: 필요한 경우 lazy loading 적용
3. **메모이제이션**: React.memo 적용 고려 (필요시)

### 스타일링
1. **일관성**: shadcn/ui 디자인 시스템 준수
2. **반응형**: 모바일 퍼스트 접근
3. **다크 모드**: 모든 컴포넌트에서 지원
4. **애니메이션**: 부드러운 전환 효과 (transition-all)

## 다음 단계

Task 003 완료 후:
1. **Task 004**: 주최자 모바일 UI/UX 완성
   - 완성된 공통 컴포넌트 활용
   - 더미 데이터로 전체 페이지 구현
2. **Task 005**: 참여자 모바일 UI/UX 완성
   - Task 004의 컴포넌트 재사용
3. **Task 006**: 관리자 데스크톱 페이지 UI 완성

## 참고 자료

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Tailwind CSS](https://tailwindcss.com)
- [React Hook Form](https://react-hook-form.com)
- [Unsplash Source API](https://source.unsplash.com)
