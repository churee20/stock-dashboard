# 인증 시스템 테스트 가이드

## 개요
Task 008에서 구현한 인증 시스템의 기능을 검증하기 위한 테스트 시나리오와 예상 동작을 문서화합니다.

## 구현된 기능

### 1. 데이터베이스 트리거 (프로필 자동 생성)
**파일**: Supabase Migration - `create_profile_auto_creation_trigger`

**기능**:
- 새 사용자가 `auth.users`에 생성될 때 자동으로 `public.profiles` 레코드 생성
- OAuth 또는 이메일/비밀번호 회원가입 모두 지원

**테스트 시나리오**:
```sql
-- 테스트 1: 새 사용자 생성 시 프로필 자동 생성
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  '{"full_name": "테스트 사용자", "avatar_url": "https://example.com/avatar.png"}'::jsonb
);

-- 검증: profiles 테이블에 새 레코드 생성 확인
SELECT * FROM public.profiles WHERE email = 'test@example.com';
-- 예상 결과: role='user', full_name='테스트 사용자'

-- 테스트 2: 중복 생성 시도 (unique_violation 예외 처리)
-- 동일한 ID로 두 번 생성 시도 → 에러 없이 통과
```

### 2. Row Level Security (RLS) 정책
**파일**: Supabase Migration - `enable_rls_policies_profiles`

**정책**:
1. `profiles_select_own`: 사용자는 자신의 프로필만 조회 가능
2. `profiles_update_own`: 사용자는 자신의 프로필만 수정 가능
3. `profiles_select_admin`: 관리자는 모든 프로필 조회 가능

**테스트 시나리오**:
```typescript
// 테스트 1: 일반 사용자가 자신의 프로필 조회
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', currentUser.id)
  .single();
// 예상: 성공

// 테스트 2: 일반 사용자가 다른 사용자 프로필 조회
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', otherUserId)
  .single();
// 예상: 빈 결과 또는 권한 에러

// 테스트 3: 관리자가 모든 프로필 조회
const { data, error } = await supabase
  .from('profiles')
  .select('*');
// 예상: 모든 프로필 반환
```

### 3. 관리자 로그인 인증
**파일**: `components/admin/admin-login-form.tsx`

**기능**:
- 이메일/비밀번호로 Supabase 인증
- 인증 후 `profiles` 테이블에서 `role` 확인
- `role !== 'admin'`인 경우 자동 로그아웃 및 에러 처리
- Toast 알림으로 성공/실패 피드백

**테스트 시나리오**:

#### 시나리오 3-1: 관리자 로그인 성공
```typescript
// Given: bruce.lean17@gmail.com (role='admin')
email = "bruce.lean17@gmail.com"
password = "correct_password"

// When: 로그인 버튼 클릭
await handleLogin()

// Then:
// 1. Supabase signInWithPassword 호출
// 2. profiles에서 role 조회 → 'admin'
// 3. Toast: "로그인되었습니다"
// 4. 리다이렉트: /admin/dashboard
```

#### 시나리오 3-2: 일반 사용자가 관리자 로그인 시도
```typescript
// Given: user@example.com (role='user')
email = "user@example.com"
password = "correct_password"

// When: 로그인 버튼 클릭
await handleLogin()

// Then:
// 1. Supabase signInWithPassword 호출 성공
// 2. profiles에서 role 조회 → 'user'
// 3. 자동 로그아웃 (signOut 호출)
// 4. Toast: "관리자 권한이 없습니다"
// 5. 폼 에러 메시지 표시
```

#### 시나리오 3-3: 잘못된 비밀번호
```typescript
// Given: 올바른 이메일, 잘못된 비밀번호
email = "bruce.lean17@gmail.com"
password = "wrong_password"

// When: 로그인 버튼 클릭
await handleLogin()

// Then:
// 1. Supabase signInWithPassword 실패
// 2. Toast: "Invalid login credentials" (또는 Supabase 에러 메시지)
// 3. 폼 에러 메시지 표시
```

### 4. OAuth 로직 공통화
**파일**: `lib/auth/oauth.ts`

**기능**:
- Google OAuth 로그인 공통 함수
- `redirectPath` 파라미터로 로그인 후 이동 경로 지정

**테스트 시나리오**:

#### 시나리오 4-1: 일반 로그인에서 Google OAuth
```typescript
// When
await signInWithGoogle('/');

// Then
// 1. OAuth 팝업 또는 리다이렉트
// 2. 성공 시 /auth/callback?next=/ 로 이동
// 3. 최종적으로 / (홈)으로 리다이렉트
```

#### 시나리오 4-2: 관리자 로그인에서 Google OAuth
```typescript
// When
await signInWithGoogle('/admin/dashboard');

// Then
// 1. OAuth 팝업 또는 리다이렉트
// 2. 성공 시 /auth/callback?next=/admin/dashboard 로 이동
// 3. 최종적으로 /admin/dashboard로 리다이렉트
```

### 5. 일반 로그인 Toast 알림
**파일**: `components/login-form.tsx`

**기능**:
- 로그인 성공/실패 시 Toast 알림 표시
- 기존 Toast 시스템 재사용

**테스트 시나리오**:

#### 시나리오 5-1: 로그인 성공
```typescript
// Given: 올바른 이메일/비밀번호
email = "user@example.com"
password = "correct_password"

// When: 로그인 버튼 클릭
await handleLogin()

// Then:
// 1. Toast: "로그인되었습니다" (성공 아이콘)
// 2. 리다이렉트: /
```

#### 시나리오 5-2: 로그인 실패
```typescript
// Given: 잘못된 비밀번호
email = "user@example.com"
password = "wrong_password"

// When: 로그인 버튼 클릭
await handleLogin()

// Then:
// 1. Toast: 에러 메시지 (에러 아이콘)
// 2. 폼 에러 메시지도 표시
// 3. 페이지 이동 없음
```

## 통합 시나리오

### 시나리오 A: 새 사용자 Google OAuth 회원가입
```
1. 사용자가 "Google로 계속하기" 클릭
2. Google OAuth 인증 완료
3. auth.users에 새 사용자 생성
4. Database Trigger 자동 실행 → profiles에 레코드 생성 (role='user')
5. /auth/callback → / 리다이렉트
6. 로그인 완료
```

### 시나리오 B: 관리자 권한 체크
```
1. 일반 사용자 로그인 (role='user')
2. 브라우저에서 /admin/dashboard 직접 접근
3. Middleware에서 profiles 조회 → role='user'
4. / (홈)으로 리다이렉트
5. 관리자 페이지 접근 차단 성공
```

### 시나리오 C: 관리자 워크플로우
```
1. 관리자가 /admin/login 접속
2. bruce.lean17@gmail.com / 비밀번호 입력
3. signInWithPassword 성공
4. profiles 조회 → role='admin'
5. Toast: "로그인되었습니다"
6. /admin/dashboard 접근
7. Middleware 통과 (role='admin' 확인)
8. 대시보드 표시
```

## 코드 품질 검증

### 타입 체크
```bash
npm run typecheck
```
**예상**: 모든 TypeScript 타입 에러 없음

### 빌드 테스트
```bash
npm run build
```
**예상**: 빌드 성공, 모든 페이지 정적/동적 생성 완료

### Lint 검사
```bash
npm run lint
```
**예상**: ESLint 규칙 위반 없음

## 결론

이 문서는 Task 008에서 구현한 인증 시스템의 모든 기능에 대한 테스트 시나리오를 정의합니다. 실제 E2E 테스트 구현 시 이 시나리오들을 Playwright 또는 다른 테스트 프레임워크로 자동화할 수 있습니다.

**구현 완료 항목**:
- ✅ 프로필 자동 생성 Database Trigger
- ✅ RLS 정책 (profiles 테이블)
- ✅ 관리자 로그인 실제 인증
- ✅ OAuth 로직 공통화
- ✅ 일반 로그인 Toast 알림

**검증 완료**:
- ✅ TypeScript 타입 체크 통과
- ✅ 프로덕션 빌드 성공
- ✅ 모든 컴포넌트 정상 렌더링
