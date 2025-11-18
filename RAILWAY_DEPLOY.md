# Railway 배포 가이드

Railway를 사용하여 디스코드 봇을 24시간 무료로 운영하는 방법입니다.

## 1단계: GitHub에 코드 업로드

### GitHub 저장소 생성
1. [GitHub](https://github.com)에 로그인
2. **New repository** 클릭
3. 저장소 이름 입력 (예: `discord-study-bot`)
4. **Public** 또는 **Private** 선택
5. **Create repository** 클릭

### 코드 업로드
**방법 1: GitHub Desktop 사용**
1. [GitHub Desktop](https://desktop.github.com/) 다운로드 및 설치
2. GitHub Desktop 실행
3. **File** → **Add Local Repository**
4. `C:\discord-study-bot` 폴더 선택
5. 커밋 메시지 입력 후 **Commit to main**
6. **Publish repository** 클릭

**방법 2: Git 명령어 사용**
```powershell
cd C:\discord-study-bot
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/사용자이름/discord-study-bot.git
git push -u origin main
```

## 2단계: Railway 가입 및 프로젝트 생성

1. [Railway.app](https://railway.app/) 접속
2. **Login** 클릭 → **GitHub**로 가입/로그인
3. **New Project** 클릭
4. **Deploy from GitHub repo** 선택
5. 방금 만든 GitHub 저장소 선택

## 3단계: 환경 변수 설정

Railway 대시보드에서:
1. 프로젝트 선택
2. **Variables** 탭 클릭
3. 다음 환경 변수 추가:

```
DISCORD_TOKEN=여기에_봇_토큰_입력
CLIENT_ID=여기에_클라이언트_ID_입력
ADMIN_ROLE_ID=
TIMEZONE=Asia/Seoul
```

각 변수를 개별적으로 **New Variable**로 추가하세요.

## 4단계: 배포 확인

1. Railway가 자동으로 코드를 배포합니다
2. **Deployments** 탭에서 배포 상태 확인
3. 로그에서 `Ready! Logged in as 봇이름#태그` 메시지 확인
4. 배포 완료!

## 중요 참고사항

### 무료 플랜 제한
- Railway는 무료 크레딧 $5를 제공합니다
- 사용량에 따라 일부 요금이 발생할 수 있습니다
- 월 500시간 무료 제공 (충분함!)

### 데이터 저장
- JSON 파일은 Railway의 임시 파일 시스템에 저장됩니다
- Railway는 재시작 시 파일이 사라질 수 있으므로, 실제 운영 시에는 데이터베이스 서비스(PostgreSQL 등)를 추가하는 것을 권장합니다

### 재배포
- GitHub에 코드를 푸시하면 자동으로 재배포됩니다
- Railway는 자동으로 최신 코드를 감지하여 재배포합니다

## 문제 해결

### 배포 실패
- **Variables** 탭에서 환경 변수가 제대로 설정되었는지 확인
- 로그에서 오류 메시지 확인

### 봇이 응답하지 않음
- Railway 로그 확인
- 환경 변수 확인 (특히 `DISCORD_TOKEN`)
- 봇이 서버에 초대되어 있는지 확인

## 업그레이드 (선택사항)

더 안정적인 운영을 위해:
1. Railway에서 **PostgreSQL** 데이터베이스 추가
2. `database.js`를 PostgreSQL로 변경

하지만 JSON 파일 기반도 일반적인 사용에는 충분합니다!

