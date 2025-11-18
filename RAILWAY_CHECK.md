# Railway 배포 확인 가이드

## 배포 상태 확인

### 1. Deployment 탭 확인
1. Railway 대시보드에서 프로젝트 선택
2. **Deployments** 탭 클릭
3. 최신 배포가 **"Active"** 상태인지 확인
4. ✅ 녹색 체크 표시 = 배포 성공
5. ❌ 빨간색 X 표시 = 배포 실패 (로그 확인 필요)

### 2. Logs 탭에서 봇 상태 확인
1. Railway 대시보드에서 **Logs** 탭 클릭
2. 다음 메시지를 찾아보세요:

**성공 메시지:**
```
Ready! Logged in as 봇이름#태그
```

**실패 메시지:**
- `Error: Incorrect login details were provided` → DISCORD_TOKEN 확인 필요
- `Cannot find module` → 패키지 설치 문제
- `Missing required environment variable` → 환경 변수 확인 필요

### 3. 환경 변수 확인
1. Railway 대시보드에서 **Variables** 탭 클릭
2. 다음 변수들이 모두 설정되어 있는지 확인:
   - ✅ `DISCORD_TOKEN` - 값이 있는지 확인
   - ✅ `CLIENT_ID` - 값이 있는지 확인
   - ✅ `TIMEZONE` - `Asia/Seoul` (선택사항)
   - ✅ `ADMIN_ROLE_ID` - 비어있어도 됨 (선택사항)

### 4. 봇이 디스코드에서 작동하는지 확인
1. 디스코드 서버에 봇이 초대되어 있는지 확인
2. 서버 멤버 목록에서 봇이 **온라인** 상태인지 확인
3. `/통계` 명령어를 입력해서 테스트

---

## 문제 해결

### 봇이 로그인하지 않음
**확인 사항:**
- `DISCORD_TOKEN`이 올바른지 확인
- 토큰에 따옴표가 들어가지 않았는지 확인
- 토큰이 전체 복사되었는지 확인

**해결 방법:**
1. Railway **Variables** 탭
2. `DISCORD_TOKEN` 편집
3. Discord Developer Portal에서 새 토큰 발급
4. 새 토큰으로 업데이트
5. 저장하면 자동 재배포됨

### 배포가 계속 실패함
**확인 사항:**
- Logs 탭에서 오류 메시지 확인
- `package.json`이 올바른지 확인
- 코드에 문법 오류가 없는지 확인

**해결 방법:**
1. 로컬에서 `node index.js` 실행해서 오류 확인
2. 오류 수정 후 GitHub에 푸시
3. Railway가 자동으로 재배포

### 봇이 응답하지 않음
**확인 사항:**
- 봇이 서버에 초대되어 있는지
- 봇에 필요한 권한이 있는지 (View Channels, Send Messages, Use Slash Commands)
- 명령어가 등록되어 있는지 (`/통계`, `/참여현황`, `/리더보드`)

**해결 방법:**
1. 봇을 서버에 다시 초대 (올바른 권한으로)
2. 로컬에서 `node register-commands.js` 실행해서 명령어 재등록

---

## 배포 성공 확인 체크리스트

- [ ] Railway Deployment 탭에서 **Active** 상태
- [ ] Logs 탭에 `Ready! Logged in as 봇이름#태그` 메시지
- [ ] 디스코드 서버에서 봇이 **온라인** 상태
- [ ] `/통계` 명령어가 작동함
- [ ] 음성 채널에 입장 시 봇이 로그에 기록함

---

## 데이터 저장 주의사항

Railway는 재시작 시 파일 시스템이 초기화될 수 있습니다.

**현재 상태:** JSON 파일 기반 저장 (`data/` 폴더)
- ⚠️ Railway 재시작 시 데이터가 사라질 수 있음
- ✅ 개발/테스트 단계에는 괜찮음

**실제 운영 시 권장:**
- Railway **PostgreSQL** 데이터베이스 추가
- 또는 다른 영구 저장소 사용

하지만 디스코드 봇은 항상 실행되므로, Railway가 자동 재시작하지 않는 한 데이터는 유지됩니다!

