# Railway 수동 재배포 가이드

## 방법 1: Deployments 탭에서 재배포 (가장 간단)

1. **Railway 대시보드 열기**
   - [railway.app](https://railway.app) 접속 및 로그인

2. **프로젝트 선택**
   - 배포하고 싶은 프로젝트 클릭 (예: `discord-study-bot`)

3. **Deployments 탭 클릭**
   - 왼쪽 메뉴에서 **"Deployments"** 클릭
   - 또는 상단 탭에서 **"Deployments"** 선택

4. **재배포 실행**
   - 방법 A: 최신 배포 기록의 우측에 있는 **"⋯" (점 3개)** 또는 **"Redeploy"** 버튼 클릭
   - 방법 B: 배포 기록 카드에서 **"Redeploy"** 옵션 선택
   - 확인 메시지가 나오면 **"Confirm"** 또는 **"Redeploy"** 클릭

5. **배포 확인**
   - 배포 상태가 **"Building"** → **"Deploying"** → **"Active"**로 변경되는지 확인
   - **Logs** 탭에서 `Ready! Logged in as...` 메시지 확인

---

## 방법 2: Settings 탭에서 재배포

1. **Railway 대시보드 열기**

2. **프로젝트 선택**

3. **Settings 탭 클릭**
   - 왼쪽 메뉴에서 **"Settings"** 클릭

4. **재배포 버튼 찾기**
   - 페이지 하단 또는 "Deployment" 섹션에서
   - **"Redeploy"** 또는 **"Redeploy Latest"** 버튼 클릭

5. **배포 확인**
   - **Deployments** 탭으로 이동하여 배포 상태 확인

---

## 방법 3: GitHub에 푸시 (자동 재배포)

코드를 수정한 경우:

1. **로컬에서 변경사항 커밋**
   ```powershell
   cd C:\discord-study-bot
   git add .
   git commit -m "수정사항 설명"
   ```

2. **GitHub에 푸시**
   ```powershell
   git push
   ```

3. **자동 재배포 확인**
   - Railway가 자동으로 변경사항을 감지
   - **Deployments** 탭에서 새 배포가 시작되는지 확인

---

## 방법 4: 코드 변경 없이 재시작

배포된 코드는 그대로 두고 봇만 재시작하고 싶을 때:

1. **Deployments 탭 이동**

2. **최신 배포 기록 선택**

3. **Redeploy 클릭**
   - 같은 코드로 다시 배포되며 봇이 재시작됨

---

## 재배포 후 확인 사항

✅ **Deployments 탭:**
- 배포 상태가 **"Active"**인지 확인
- 빨간색 ❌ 표시가 없어야 함

✅ **Logs 탭:**
- `Ready! Logged in as 봇이름#태그` 메시지 확인
- 에러 메시지가 없는지 확인

✅ **디스코드:**
- 서버에서 봇이 **온라인** 상태인지 확인
- `/통계` 명령어로 테스트

---

## 문제 해결

### 재배포가 시작되지 않음
- Railway 계정 상태 확인
- 인터넷 연결 확인
- 잠시 후 다시 시도

### 재배포 후 봇이 작동하지 않음
- **Logs** 탭에서 오류 메시지 확인
- **Variables** 탭에서 환경 변수 확인 (특히 `DISCORD_TOKEN`)
- 봇이 서버에 초대되어 있는지 확인

### 배포가 계속 실패함
- 로그에서 오류 메시지 확인
- `package.json` 확인
- 코드에 문법 오류가 없는지 확인

---

## 팁

💡 **자주 사용하는 방법:**
- 코드 수정 후: 방법 3 (GitHub 푸시 - 자동 재배포)
- 긴급 재시작: 방법 1 (Deployments 탭 - 수동 재배포)

💡 **배포 시간:**
- 보통 1-3분 정도 소요
- **Logs** 탭에서 실시간으로 진행 상황 확인 가능

