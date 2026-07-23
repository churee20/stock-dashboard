# Task 008: Vercel Cron 등록

## 개요
- **목표**: `/api/cron/collect`를 평일(월~금) 한국시간 오후 4시(UTC 07:00)에 Vercel Cron으로 자동 호출
- **관련 기능**: Google Sheets 수집 파이프라인 스케줄링
- **참조 문서**: `docs/PRD.md`(6.2/6.3/9.4), `docs/ROADMAP.md`(Phase 4)
- **프로덕션 URL**: `https://stock-dashboard-lime-six.vercel.app`

---

## 사전 조사 결과 (계획 단계에서 확인한 사실)

- PRD 6.2: "Vercel Cron이 매일 정해진 시각에 `/api/cron/collect` API Route를 자동 호출하는 서버리스 수집 파이프라인"
- PRD 6.3: "스케줄 작업은 1일 1회 이상 실행"
- PRD 9.4 리스크: "무료 플랜은 하루 1회 실행 제한 및 실행 시각 오차가 있을 수 있음"
- `src/app/api/cron/collect/route.ts`는 Task 006에서 이미 구현 완료: `Authorization: Bearer {process.env.CRON_SECRET}` 헤더 검증 후 시트 수집·파싱·DB upsert 수행
- Vercel Cron Jobs는 실행 시 자동으로 `Authorization: Bearer {프로젝트 환경변수 CRON_SECRET}` 헤더를 첨부하는 플랫폼 기능을 제공(환경변수명이 정확히 `CRON_SECRET`이어야 함)
- 사용자 확정: 수집 주기는 평일(월~금) 오후 4시(KST), 공휴일 제외는 이번 범위에서 적용하지 않음

---

## 구현 사항

### 1. vercel.json 작성 및 배포
- [x] 프로젝트 루트에 `vercel.json` 생성, `crons: [{ path: "/api/cron/collect", schedule: "0 7 * * 1-5" }]`
- [x] 코드(route.ts, collect.ts) 변경 없음(기존 로직 재사용)
- [x] 사용자 승인 후 커밋 및 `origin/main` push(Vercel GitHub 연동으로 자동 재배포)

### 2. Vercel 프로덕션 환경변수 확인
- [x] `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHEET_ID` 6개를 사용자가 Vercel Production 환경변수에 로컬 `.env.local`과 동일한 값으로 직접 입력 완료

### 3. Google 서비스 계정 인증키 재발급 및 검증
- [x] 기존 서비스 계정 키(`3a4ec84a67d4`)를 신규 키(`fbdda87a36c86159241ce0786b38ae49a2eedcc9`)로 재발급
- [x] `.env.local`의 `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`/`GOOGLE_SERVICE_ACCOUNT_EMAIL`을 새 키로 갱신
- [x] `Google/` 폴더 전체를 `.gitignore`에 추가, 이미 커밋되어 있던 구 키 파일을 git 추적에서 제거(원격 origin/main에도 반영)
- [x] 로컬에서 Google Sheets API(`spreadsheets.get`, `spreadsheets.values.get`) 직접 호출로 새 키 인증 성공 확인

### 4. 배포 후 Cron 등록 및 동작 검증
- [x] `curl`로 프로덕션 URL(`https://stock-dashboard-lime-six.vercel.app/api/cron/collect?dryRun=true`)에 `Authorization: Bearer {CRON_SECRET}` 헤더로 수동 호출 → HTTP 200, `rawRowCount:123`, 계좌 8건 파싱, 자산군 6종 집계 정상 응답 확인(Google 인증키가 프로덕션에서도 정상 동작함을 함께 검증)
- [x] 사용자가 dryRun 없이 직접 실행해 실 데이터가 Supabase에 반영됨을 확인(`account_snapshots` 8건, `asset_class_snapshots` 6건, `snapshot_date=2026-07-23`)
- [x] 테스트로 발생한 2026-07-23자 스냅샷은 사용자 요청에 따라 두 테이블에서 삭제(SQL `DELETE ... WHERE snapshot_date = CURRENT_DATE`), 삭제 후 재조회로 0건 확인. `accounts`(계좌 마스터)는 변경하지 않음
- [x] `vercel.json`의 스케줄(`0 7 * * 1-5`)이 UTC 07:00 = KST 16:00(오후 4시), 평일 실행임을 재확인

### 5. 문서화
- [x] 본 문서 구현 완료 내용으로 갱신
- [x] `docs/ROADMAP.md` Task 008 항목을 실제 범위(Vercel Cron 등록 + 인증키 재발급/검증)로 갱신

---

## 수락 기준

1. [x] `vercel.json`이 올바른 형식으로 평일 오후 4시(KST) cron을 등록
2. [x] Production 환경변수 6개 모두 설정 확인(사용자가 직접 입력)
3. [x] 프로덕션에서 수동 호출 시 정상 응답 확인(dry-run으로 인증 및 데이터 파싱 검증, 실제 실행으로 DB 반영까지 확인)
4. [x] Google 서비스 계정 인증키 재발급 후 프로덕션 환경에서 정상 동작 확인
5. [x] 테스트 과정에서 발생한 오늘자 실 데이터는 정리(삭제) 완료

---

## 관련 파일

### 생성/수정된 파일
```
vercel.json                 (신규)
.gitignore                  (Google/ 폴더 추가)
.env.local                  (Google 서비스 계정 키 갱신, 로컬 전용)
docs/tasks/TASK-008.md
```

### git 이력 정리
```
Google/stock-dashboard-503106-3a4ec84a67d4.json  (구 키 파일, git 추적 제거)
```

---

## 검증 결과

- 프로덕션 dry-run 호출: `HTTP 200`, `rawRowCount:123`, 계좌 8종/자산군 6종 정상 파싱
- Google 인증키(신규): 로컬 + 프로덕션 양쪽에서 Sheets API 정상 호출 확인
- Supabase 반영: 사용자의 실 실행으로 `account_snapshots`/`asset_class_snapshots`에 2026-07-23자 데이터 upsert 확인 → 이후 테스트 데이터 삭제로 정리 완료
- Cron 스케줄: `0 7 * * 1-5`(UTC) = 평일 KST 16:00, 다음 정규 실행분부터 정상 자동 수집 예정

---

## 주의사항

1. **공휴일 미제외**: cron 자체에는 공휴일 개념이 없어 API route 내부 로직이 필요하나 이번 범위에서는 적용하지 않음(향후 필요 시 별도 과제)
2. **git push는 사용자 승인 필수**: 원격 저장소 반영 및 Vercel 자동 재배포를 트리거하는 행위 — 실제로 매 단계 사용자 승인 하에 진행함
3. **Hobby 플랜 제약**: 평일만 실행되므로 "하루 1회 이하" 조건을 만족해 Hobby 플랜에서도 정상 동작
4. **과거 커밋 히스토리 잔존**: 구 서비스 계정 키는 git 추적에서 제거했지만 과거 커밋(히스토리)에는 원문이 남아있음. 완전 제거하려면 `git filter-repo` 등으로 히스토리 재작성 및 force-push가 필요하나 이번엔 진행하지 않음(구 키 자체는 재발급으로 이미 무효화됨)

---

## 다음 단계

Task 008 완료 후: 성능 최적화(쿼리/캐싱), 모니터링/로깅 기초 구성, 공휴일 제외 로직은 필요 시 별도 후속 과제로 진행
