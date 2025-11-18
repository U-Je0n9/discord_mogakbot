# 디스코드 모각공 봇

모각공 운영을 위한 디스코드 봇입니다. 음성 채널 참여를 추적하고 통계를 제공합니다.

## 주요 기능

- ✅ 24시간을 30분 단위로 나누어 음성 채널 참여 추적
- ✅ 각 30분 중 20분 이상 참여 시 출석 인정
- ✅ 운영자 전용: 날짜별 참여 현황 확인 (유저 x 시간 O/X 표)
- ✅ 개인 통계: 오늘/이번주/이번달/전체 기간 참여 시간 및 출석일수
- ✅ 출석일수 기준 리더보드

## 설치 방법

### 1. 필수 요구사항

- Node.js 18 이상
- 디스코드 봇 토큰
- 디스코드 서버 관리 권한

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env` 파일을 프로젝트 루트 디렉토리에 생성하고 다음 내용을 입력하세요:

```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_bot_client_id_here
ADMIN_ROLE_ID=
TIMEZONE=Asia/Seoul
```

**필수 항목:**
- `DISCORD_TOKEN`: 디스코드 개발자 포털에서 발급받은 봇 토큰
  - 위치: Discord Developer Portal > Application > Bot > Token
- `CLIENT_ID`: 봇의 클라이언트 ID (명령어 등록에 필요)
  - 위치: Discord Developer Portal > Application > General Information > Application ID

**선택 항목:**
- `ADMIN_ROLE_ID`: 운영자 역할 ID (선택사항)
  - 특정 역할을 운영자로 지정하려면 설정
  - 생략하거나 비워두면 서버 관리자 권한을 가진 사람도 `/참여현황` 명령어 사용 가능
  - 역할 ID 확인 방법: Discord 설정 > 고급 > 개발자 모드 활성화 > 역할 우클릭 > ID 복사
- `TIMEZONE`: 시간대 (기본값: Asia/Seoul)
  - 한국 시간을 사용하려면 그대로 두면 됩니다

### 4. 명령어 등록

```bash
node register-commands.js
```

### 5. 봇 실행

```bash
npm start
```

또는

```bash
node index.js
```

## 명령어

### `/통계 [기간]`
개인 참여 통계를 확인합니다.
- 기간: 오늘, 이번주 (월~일), 이번달, 전체

### `/참여현황 [날짜]`
운영자 전용: 지정한 날짜의 참여 현황을 확인합니다.
- 날짜: YYYY-MM-DD 형식 (예: 2024-01-15), 생략 시 오늘

### `/리더보드 [기간] [인원수]`
출석일수 기준 리더보드를 확인합니다.
- 기간: 이번달, 전체
- 인원수: 표시할 상위 인원수 (기본: 10, 최대: 20)

## 동작 방식

1. **시간 추적**: 봇은 24시간을 48개의 30분 슬롯으로 나눕니다 (00:00-00:29, 00:30-00:59, ...).

2. **참여 확인**: 사용자가 음성 채널에 참여하면 해당 슬롯의 시간이 누적됩니다. 각 슬롯에서 20분 이상 참여하면 출석으로 인정됩니다.

3. **데이터 저장**: JSON 파일 기반으로 모든 참여 정보가 저장됩니다 (`data/` 폴더).

## 파일 구조

```
discord-study-bot/
├── index.js              # 메인 봇 파일
├── config.js             # 설정 파일
├── database.js           # 데이터베이스 관리 (JSON 파일 기반)
├── register-commands.js  # 명령어 등록 스크립트
├── commands/             # 명령어 파일들
│   ├── participation.js  # 참여 현황 명령어
│   ├── stats.js          # 통계 명령어
│   └── leaderboard.js    # 리더보드 명령어
├── utils/                # 유틸리티 함수
│   ├── dateUtils.js      # 날짜/시간 유틸리티
│   └── tracker.js        # 음성 채널 추적
└── package.json          # 패키지 정보
```

## 24시간 운영하기 (Railway 배포)

컴퓨터를 꺼도 봇이 계속 작동하려면 클라우드 서비스를 사용해야 합니다.

### Railway 배포 (권장)

Railway는 간단하고 무료 크레딧($5)을 제공합니다.

자세한 배포 방법은 [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) 파일을 참고하세요.

**간단 요약:**
1. GitHub에 코드 업로드
2. [Railway.app](https://railway.app/) 가입 (GitHub 연동)
3. GitHub 저장소 연결
4. 환경 변수 설정 (`DISCORD_TOKEN`, `CLIENT_ID` 등)
5. 자동 배포 완료!

### 다른 클라우드 서비스
- **Replit**: [replit.com](https://replit.com/) - 웹 IDE, 무료 플랜 제공
- **AWS/Google Cloud**: 고급 사용자용
- **VPS 서버**: 더 많은 제어권 필요

## 라이선스

MIT

