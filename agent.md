# 투자 실적 집계 Agent 지침서

> 이 파일은 Claude(Cowork)가 투자 실적 집계 작업을 자동으로 수행할 때 따라야 할 전체 워크플로우를 정의합니다.
> 집 PC / 회사 PC 어디서든 동일하게 실행됩니다.

---

## 📋 Agent 역할

Google Sheets에서 실시간 투자 데이터를 수집하여 `투자실적_집계보고서.xlsx`를 업데이트하고, Investment Dashboard를 생성한다.

---

## ⏰ 실행 스케줄

| 스케줄 | 실행 내용 |
|--------|----------|
| 평일 오후 4시 (매일) | 장 마감 후 최종 집계 |

> 등록된 스케줄: `investment-daily-aggregate` (cron: `0 16 * * 1-5`)

---

## 📊 데이터 소스

**Google Sheets 파일명:** `1. 자산 투자 실적(종목별)`

- Claude in Chrome 확장 프로그램을 통해 접근
- Chrome에 해당 시트가 열려 있거나, Google Drive MCP로 접근 가능해야 함
- 시트 구성: 계좌별 투자원금 / 현재금액 / 수익금액 / 수익률 데이터 포함

**수집 대상 계좌:**
- 퇴직연금 (220-91)
- 개인연금 (기존)
- 개인연금 (신)
- 개인투자 계좌

---

## 📁 출력 파일

모두 `D:\00.은퇴계획\01.투자실적\` 폴더 기준:

| 파일 | 설명 |
|------|------|
| `투자실적_집계보고서.xlsx` | 메인 집계 보고서 (4개 시트) |
| `투자실적_일별추적.json` | 일별 원시 데이터 이력 |

---

## 🔄 실행 워크플로우

### STEP 1. Google Sheets 데이터 수집

> 🚨 **필수: 반드시 Claude in Chrome으로 gviz API를 사용해 실시간 데이터를 직접 읽어야 한다.**
> Google Drive MCP(`read_file_content`)는 캐시된 스냅샷을 반환하므로 당일 시세가 반영되지 않을 수 있다.
> 실제로 2026-06-22 실행 시 Drive MCP는 전날(6/21) 캐시를 반환하여 ₩10.63억으로 오집계되었다.
> 올바른 실시간 값은 Chrome gviz API로 확인한 ₩10.90억이었다. (차이 +₩0.27억)

**반드시 아래 순서로 실행한다:**

#### 1단계: Chrome gviz API로 실시간 데이터 수집 (최우선)

```javascript
// Claude in Chrome의 javascript_tool로 실행
// tabId: 시트가 열린 탭 (없으면 navigate 먼저)
// URL: https://docs.google.com/spreadsheets/d/1ZroPOkUSwNqHiVWENaoVxlR6AK-AlBV3axVBscxZgRA/edit

const resp = await fetch('https://docs.google.com/spreadsheets/d/1ZroPOkUSwNqHiVWENaoVxlR6AK-AlBV3axVBscxZgRA/gviz/tq?tqx=out:csv&gid=1035245516');
const text = await resp.text();
const lines = text.split('\n');
// 합계 행 추출
const sumLines = lines.filter(l => l.includes('연금(합계)') || l.includes('개인 투자(합계)') || l.includes('전체(합계)'));
JSON.stringify(sumLines)
```

**Chrome 탭 확보 절차:**
1. `mcp__Claude_in_Chrome__navigate` → `https://docs.google.com/spreadsheets/d/1ZroPOkUSwNqHiVWENaoVxlR6AK-AlBV3axVBscxZgRA/edit`
2. `mcp__Claude_in_Chrome__javascript_tool` → 위 fetch 코드 실행
3. 반환된 CSV에서 연금(합계) / 개인 투자(합계) / 전체(합계) 행 파싱

**열 구조 (gviz CSV):** `"","계좌명","투자원금","","","","","","","calc_inv","","현재금액","수익금액","수익률%",""`

**날짜 확인:**
```javascript
// 시트의 현재 날짜 컬럼 확인
lines.filter(l => l.includes('2026')).slice(0, 5).join('\n')
```

#### 2단계: Drive MCP는 백업 수단으로만 사용

Chrome 접근이 불가능한 경우에만 Drive MCP를 fallback으로 사용한다.
단, 이 경우 **캐시 가능성을 명시적으로 경고**하고 결과에 `(캐시 가능)` 표기를 붙인다.

```
Spreadsheet ID: 1ZroPOkUSwNqHiVWENaoVxlR6AK-AlBV3axVBscxZgRA
gid(시트1): 1035245516
```

**수집 항목:**
- 연금(합계): 투자원금, 현재금액, 수익금액, 수익률(%)
- 개인 투자(합계): 투자원금, 현재금액, 수익금액, 수익률(%)
- 전체(합계): 투자원금, 현재금액, 수익금액, 수익률(%)
- 기준 시각: 수집 시점의 날짜/시간 (YYYY-MM-DD HH:MM 형식)
- 시트 날짜 확인: `lines.filter(l => l.includes('2026'))` 으로 현재 날짜 검증

### STEP 2. 투자실적_일별추적.json 업데이트

`D:\00.은퇴계획\01.투자실적\투자실적_일별추적.json` 파일에 오늘 데이터를 추가/갱신한다.

```json
{
  "date": "YYYY-MM-DD",
  "time": "YYYY-MM-DD HH:MM",
  "source": "google_sheets_live",
  "total_inv": 총투자원금,
  "total_cur": 총현재금액,
  "total_profit": 총수익금액,
  "total_rate": 총수익률(배),
  "pension_inv": 연금투자원금,
  "pension_cur": 연금현재금액,
  "pension_rate": 연금수익률,
  "personal_inv": 개인투자원금,
  "personal_cur": 개인현재금액,
  "personal_rate": 개인수익률,
  "day_profit": 일일수익금액,
  "day_rate_pct": 일일수익률(%),
  "pension_day_profit": 연금일일수익,
  "personal_day_profit": 개인일일수익
}
```

- 같은 날짜 데이터가 있으면 가장 최신 집계로 **덮어쓰기**
- 다른 날짜면 배열에 **추가**

### STEP 3. 투자실적_집계보고서.xlsx 업데이트

4개 시트를 모두 업데이트한다.

> ⚠️ **엑셀 서식 보존 규칙 (반드시 준수)**
> `load_workbook(path)` 로 파일을 열고 셀 값(`.value`)만 수정한다.
> `.fill`, `.font`, `.border`, `.alignment`, `.number_format` 등 서식 속성은 절대 변경하지 않는다.
> 새 행을 추가할 때도 서식을 지정하지 않거나, 바로 위 행의 서식을 복사해서 사용한다.
> (2026-06-19 모던 블루 스타일 적용 — 이후 갱신 시 서식 초기화 방지)

#### 시트 1: 현재 실적

| 열 | 내용 |
|----|------|
| A | 계좌명 |
| B | 투자원금 |
| C | 현재금액 |
| D | 수익금액 |
| E | 수익률(배) |
| F | 수익률(%) |

- 헤더 행 1: `📊 투자 실적 현황  |  기준일: YYYY-MM-DD HH:MM  [Google Sheets 실시간]`
- 계좌별 개별 행 + 합계 행 포함
- 오늘 데이터로 **전체 갱신**

#### 시트 2: 일별 추적

| 열 | 내용 |
|----|------|
| A | 날짜 |
| B | 구분 (연금 / 개인투자) |
| C | 투자원금 |
| D | 현재금액 |
| E | 수익금액 |
| F | 수익률(%) |

- 헤더: `📅 일별 투자 실적 추적`
- 오늘 날짜가 이미 있으면 **덮어쓰기**, 없으면 **추가**
- `투자실적_일별추적.json` 데이터 기반으로 채움

#### 시트 3: 주별 추적

- **반영 조건: 매주 금요일 스케줄 실행 시에만 집계 반영**
- 날짜 표기 기준: **스케줄을 실행한 날짜(금요일 실행일 그대로)** 를 주차 날짜로 기록한다. (월요일 날짜로 환산하지 않음)
- 해당 주의 최신 데이터(금요일 값)를 그대로 사용
- 헤더: `📅 주별 투자 실적 추적`
- 열 구성: 일별 추적과 동일하되, A열 헤더는 `주차(금요일)`

#### 시트 4: 월별 실적

| 열 | 내용 |
|----|------|
| A | 월 (YYYY-MM) |
| B | 계좌명 |
| C | 투자원금 |
| D | 현재금액 |
| E | 수익금액 |
| F | 수익률(%) |

- 헤더: `📆 월별 투자 실적`
- **반영 조건: 매일 스케줄 실행 시마다 이번 달 데이터 업데이트**
- **신규 월 추가: 한국 주식 시장 기준 매월 첫 번째 거래일에 신규 월 행 추가**
  - 한국 주식 시장 휴장일(공휴일, 주말) 제외한 첫 번째 영업일 판단
  - 해당 월 데이터가 없으면 신규 행 추가, 있으면 덮어쓰기
- 과거 월 데이터 유지 (수정 불가)
- 계좌별 상세 행 + 합계 행 포함

### STEP 4. Investment Dashboard 생성/업데이트

`D:\00.은퇴계획\01.투자실적\index.html` 파일을 **전체 재생성**한다. 부분 수치 교체가 아니라, xlsx 데이터를 읽어 HTML 전체를 새로 작성해야 한다.

**데이터 소스 (반드시 xlsx에서 읽어서 반영):**

| 시트 | 사용 위치 |
|------|----------|
| 현재 실적 | 헤더 기준일, KPI 카드, 도넛 차트, 계좌별 진행 바, 상세 테이블 |
| 일별 추적 | 꺾은선 차트(현재금액 추이), 바 차트(수익률 추이), 일별 상세 테이블 |
| 주별 추적 | 누적 바 차트, 주별 상세 테이블 |
| 월별 실적 | 누적 바 차트, 월별 상세 테이블 |

**Dashboard 구성 요소 (4탭 구조):**

| 탭 | 구성 |
|----|------|
| 현재 실적 | KPI 카드 3개(총 현재금액/수익금액/전일대비) + 도넛 차트 + 계좌별 진행 바 + 상세 테이블 |
| 일별 추적 | 꺾은선 차트(현재금액) + 바 차트(수익률%) + 상세 테이블 |
| 주별 추적 | 누적 바 차트(연금+개인투자) + 상세 테이블 |
| 월별 실적 | 누적 바 차트(연금+개인투자) + 상세 테이블 |

**테이블 갱신 규칙:**
- `일별 추적` 시트의 모든 행을 읽어 날짜×3행(연금/개인투자/전체합계)으로 구성
- `주별 추적`, `월별 실적` 시트도 동일 패턴으로 구성
- 날짜가 None인 행은 앞 행의 날짜를 이어받아 표시
- 빈 데이터 행은 출력하지 않음

**⚠️ 일별 추이 차트 범위 제한 (반드시 준수, 2026-07-09 추가):**
- 일별 추적 탭의 **꺾은선 차트(현재금액)와 바 차트(수익률%)는 실행일이 속한 "이번 달" 데이터만** 사용한다. (예: 실행일이 2026-07-09이면 2026-07-01 ~ 2026-07-09만 차트에 표시)
- 이유: 날짜가 누적될수록 라벨이 촘촘해져 차트가 읽기 어려워짐(깨짐) — 매달 초기화되는 월별 뷰로 전환해 가독성 유지.
- **상세 테이블(일별 상세)은 이번 달 제한 없이 전체 이력을 그대로 유지**한다 (테이블은 스크롤 가능하므로 문제 없음).
- 주별 추적/월별 실적 차트는 데이터 개수가 자연히 제한적이므로(주 단위, 월 단위) 전체 이력을 그대로 사용한다.

**기술 사항 (반드시 준수):**
- 파일명: `index.html` (GitHub Pages 기본 진입 파일)
- 허용 CDN: Chart.js 4.5.0 (`https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.0/chart.umd.min.js`)
- light mode 전용 (`:root { color-scheme: light }`)
- `localStorage` 사용 금지
- 모바일 반응형 (viewport 메타태그, 가로 스크롤 처리)

**⚠️ 억 단위 표시 규칙 (반드시 준수):**
- 1억 = 100,000,000 (1e8)
- 올바른 계산: `값 / 100,000,000` → 예) 943,254,114 / 1e8 = **9.43억** ✅
- 잘못된 계산: `값 / 100,000` → 예) 943,254,114 / 1e5 = 9,433억 ❌
- 카드, stat chip, 카카오톡 메시지 등 모든 억 단위 표시에 적용

### STEP 5. 카카오톡 알림 전송

스케줄 실행 시 항상 카카오톡으로 투자 실적 요약을 전송한다.

```
MCP 도구: mcp__2f6af25d-505d-4e7a-8bee-84e1989ad903__KakaotalkChat-MemoChat
최대 200자 제한 — 반드시 200자 이내로 작성
```

**메시지 형식 (200자 이내, 공백 최소화):**
```
📊 투자 실적 (YYYY-MM-DD 16:00)
💰 연금
현재:₩X.XX억|수익:+X.XX억|+X.X%
전일대비:▲/▼X.XX억(X.X%)
📈 개인투자
현재:₩X.XX억|수익:+X.XX억|+X.X%
전일대비:▲/▼X.XX억(X.X%)
🏦 전체
현재:₩X.XX억|수익:+X.XX억|+X.X%
전일대비:▲/▼X.XX억(X.X%)
```

- 시간 표기는 실행 시각 그대로 사용
- 숫자는 억 단위 소수점 2자리 (÷1억, 예: 526,750,590 → ₩5.27억)

> ⚠️ 200자 초과 시 숫자를 억 단위로 줄여서 전송 (예: ₩5.27억)

#### STEP 5-2. Slack 알림 전송 (카카오톡과 동일 메시지)

카카오톡 전송 직후, 동일한 메시지를 Slack `#투자실적` 채널에도 전송한다.

```
MCP 도구: mcp__ea57c98f-23e7-4619-add7-a0c22e93ed4d__slack_send_message
채널: #투자실적
```

**메시지 형식:** STEP 5의 카카오톡 메시지와 동일한 내용을 그대로 사용

```python
# 예시 호출
slack_send_message(
  channel="#투자실적",
  text="📊 투자 실적 (YYYY-MM-DD 16:00)\n💰 연금\n현재:₩X.XX억|수익:+X.XX억|+X.X%\n..."
)
```

- 카카오톡 전송 실패 시에도 Slack은 독립적으로 전송 시도
- Slack 전송 실패 시 에러 로그 출력 후 다음 STEP 계속 진행

### STEP 6. 구글 캘린더 이벤트 등록

스케줄 실행 시 당일 날짜에 투자 실적 요약 이벤트를 구글 캘린더에 등록한다.

```
MCP 도구: mcp__8b516d6a-48b2-41b5-9ff8-4de430f69d36__create_event
```

**이벤트 구성:**

| 항목 | 값 |
|------|-----|
| summary | `주식 : ₩X.XX억` (전체합계 현재금액, 억 단위 소수점 2자리) |
| startTime | `YYYY-MM-DDT16:00:00` (당일 16:00) |
| endTime | `YYYY-MM-DDT16:30:00` (당일 16:30) |
| timeZone | `Asia/Seoul` |
| colorId | `7` (Peacock — 청록색) |
| availability | `AVAILABILITY_FREE` (바쁨 표시 없음) |

**description 형식:**
```
💰 연금 합계: ₩X.XX억 (수익 +₩X.XX억 | +XXX.XX%)
📈 개인 합계: ₩X.XX억 (수익 +₩X.XX억 | +XXX.XX%)
🏦 전체 합계: ₩X.XX억 (수익 +₩X.XX억 | +XXX.XX%)
전일대비: ▲/▼₩X.XX억 (+X.XX%)
원금: ₩X.XX억 (연금 ₩X.XX억 + 개인 ₩X.XX억)
```

**예시 호출:**
```
create_event(
  summary="주식 : ₩10.90억",
  startTime="2026-06-22T16:00:00",
  endTime="2026-06-22T16:30:00",
  timeZone="Asia/Seoul",
  colorId="7",
  availability="AVAILABILITY_FREE",
  description="💰 연금 합계: ₩6.37억 (수익 +₩4.37억 | +217.85%)\n📈 개인 합계: ₩4.53억 (수익 +₩3.34억 | +281.15%)\n🏦 전체 합계: ₩10.90억 (수익 +₩7.71억 | +241.40%)\n전일대비: ▲₩0.27억 (+2.58%)\n원금: ₩3.19억 (연금 ₩2.01억 + 개인 ₩1.19억)"
)
```

---

### STEP 8. 현황 메모리 저장 및 화면 출력 (모든 실행 시)

실행 완료 후 오늘의 투자 현황을 Claude 메모리에 저장하고, CLAUDE.md의 현황 테이블을 갱신한 뒤 화면에 출력한다.

**① Claude 메모리 파일 업데이트**

파일 경로:
```
C:\Users\10490\AppData\Roaming\Claude\local-agent-mode-sessions\...\memory\project_investment_status.md
```

저장 형식:
```markdown
---
name: investment-current-status
description: 투자 실적 일별 현황 (데일리 스케줄 실행 시 자동 갱신)
metadata:
  type: project
---

## 현재 데이터 현황 (YYYY-MM-DD 기준)
| 날짜 | 총 현재금액 | 총 수익금액 | 전일대비 |
|------|------------|------------|---------|
| ... (최근 5영업일) ... |
투자원금: ₩3.5억 (연금 ₩2.0억 + 개인투자 ₩1.5억)
```

- 최근 5영업일 데이터만 유지 (오래된 행은 삭제)
- 억 단위 소수점 2자리 표기 (÷1억)
- MEMORY.md에 포인터가 없으면 추가: `- [투자 현황](project_investment_status.md) — 데일리 집계 현황 테이블 (자동 갱신)`

**② CLAUDE.md 현황 섹션 갱신**

`## 현재 데이터 현황 (YYYY-MM-DD 기준)` 섹션을 오늘 날짜와 최신 데이터로 업데이트한다.

**③ 카카오톡 MemoChat 전송**

```
MCP 도구: mcp__2f6af25d-505d-4e7a-8bee-84e1989ad903__KakaotalkChat-MemoChat
최대 200자 제한 — 반드시 200자 이내로 작성
```

메시지 형식 (200자 이내):
```
📊 투자현황 (YYYY-MM-DD)
MM/DD ₩X.XX억 +₩X.XX억
MM/DD ₩X.XX억 +₩X.XX억 ▲/▼X.XX억(X.X%)
MM/DD ₩X.XX억 +₩X.XX억 ▲/▼X.XX억(X.X%)
MM/DD ₩X.XX억 +₩X.XX억 ▲/▼X.XX억(X.X%)
MM/DD ₩X.XX억 +₩X.XX억 ▲/▼X.XX억(X.X%)
원금₩X.XX억(연금₩X.XX억+개인₩X.XX억)
```

- 최근 5영업일 데이터를 날짜 오름차순으로 나열
- 200자 초과 시 가장 오래된 행부터 제거하여 200자 이내로 조정

**③-2. Slack 전송 (카카오톡과 동일 메시지)**

```
MCP 도구: mcp__ea57c98f-23e7-4619-add7-a0c22e93ed4d__slack_send_message
채널: #투자실적
```

- 카카오톡 ③과 동일한 최근 5영업일 현황 메시지를 `#투자실적` 채널에 전송
- 카카오톡 전송 실패와 무관하게 독립적으로 전송 시도

**④ 화면 출력**

아래 포맷 그대로 채팅창에 출력:
```
## 현재 데이터 현황 (YYYY-MM-DD 기준)
| 날짜 | 총 현재금액 | 총 수익금액 | 전일대비 |
|------|------------|------------|---------|
| YYYY-MM-DD | ₩X.XX억 | +₩X.XX억 | ▲/▼X.XX억 (±X.X%) |
...
투자원금: ₩3.5억 (연금 ₩2.0억 + 개인투자 ₩1.5억)
```

---

### STEP 7. Live Artifact 갱신 (모든 실행 시)

Cowork sidebar의 **"Investment Dashboard"** artifact를 최신 데이터로 업데이트한다.

```
방법:
1. mcp__cowork__list_artifacts 로 artifact ID 확인 (id: "investment-dashboard")
2. STEP 4에서 생성한 `index.html`과 동일한 4탭 구조로 artifact HTML 작성 (light mode, :root{color-scheme:light})
3. mcp__cowork__update_artifact 호출
   - id: "investment-dashboard"
   - html_path: 작성한 HTML 파일 경로
   - update_summary: "YYYY-MM-DD HH:MM 기준 데이터 갱신 — 현재금액 ₩X억, 수익률 X%"
```

**주의사항:**
- Artifact는 light mode 전용 (배경 밝은색, 텍스트 어두운색)
- 허용 CDN만 사용: Chart.js 4.5.0 (위 URL 그대로)
- localStorage 사용 금지

---

## 🖥️ 회사 PC 실행 전 체크리스트

```
□ Cowork 앱 실행 중 (churee20@gmail.com 로그인)
□ Chrome 열려 있음 + Claude in Chrome 확장 로그인됨
□ 은퇴준비 폴더 Cowork에 연결됨
□ Google Drive MCP 커넥터 연결됨 (또는 Chrome에 Google Sheets 탭 열려 있음)
```

---

## 💬 수동 실행 명령어

Cowork 채팅창에 아래 메시지 중 하나를 입력하면 즉시 실행된다:

```
지금 투자 실적 집계 실행해줘
```
```
투자 실적 업데이트해줘
```
```
Google Sheets에서 투자 실적 가져와서 보고서 업데이트해줘
```

---

## ⚠️ 에러 대응

| 상황 | 조치 |
|------|------|
| Chrome 연결 안 됨 | Chrome 재시작 → Claude in Chrome 확장 재로그인 |
| Google Sheets 접근 불가 | Google Drive MCP 재연결 또는 Chrome에서 시트 직접 열기 |
| 파일 쓰기 오류 | 엑셀 파일이 열려 있으면 닫고 재실행 |
| 데이터 없음 | 장 시간 외(오전 9시 이전, 오후 4시 이후) 시트 미업데이트 상태일 수 있음 |

---

## 📂 폴더 구조

```
D:\00.은퇴계획\01.투자실적\
├── agent.md                          ← 이 파일 (Agent 지침)
├── 투자실적_집계보고서.xlsx            ← 메인 집계 보고서
├── 투자실적_일별추적.json              ← 일별 원시 데이터
├── index.html                          ← Investment Dashboard (GitHub Pages 기본 진입점)
└── 백업/
    ├── 회사PC_설치가이드.md
    └── 투자실적_일별추적.json (백업)
```

---

*최종 업데이트: 2026-06-11 (STEP 8 카카오톡 현황 전송 추가) | Claude Cowork 자동 생성*
