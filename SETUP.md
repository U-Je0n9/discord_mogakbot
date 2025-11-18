# Node.js 설치 가이드

## Windows에서 Node.js 설치하기

### 1. Node.js 다운로드

1. [Node.js 공식 웹사이트](https://nodejs.org/) 접속
2. **LTS (Long Term Support)** 버전 다운로드 (권장)
   - 최신 LTS 버전: v20.14.0 (2024년 5월 기준)
3. Windows Installer (.msi) 다운로드

### 2. 설치

1. 다운로드한 `.msi` 파일 실행
2. 설치 마법사에서 **Next** 클릭
3. 라이선스 동의
4. 설치 경로 확인 (기본값 그대로 사용 권장)
5. **"Automatically install the necessary tools"** 옵션이 있으면 체크 (선택사항)
6. **Install** 클릭
7. 설치 완료 후 **Finish** 클릭

### 3. 설치 확인

**PowerShell을 다시 시작한 후** 다음 명령어로 확인:

```powershell
node --version
npm --version
```

정상적으로 설치되었다면 버전 번호가 표시됩니다:
- 예: `v20.14.0` (Node.js)
- 예: `10.8.0` (npm)

### 4. 설치가 안 되는 경우

**PowerShell을 닫고 다시 열어주세요!**
- 설치 후 환경 변수가 적용되려면 터미널을 다시 시작해야 합니다.
- 또는 컴퓨터를 재시작하면 됩니다.

### 5. 여전히 안 되는 경우 (수동 환경 변수 설정)

1. 시작 메뉴에서 **"환경 변수"** 검색
2. **"시스템 환경 변수 편집"** 선택
3. **"환경 변수"** 버튼 클릭
4. 시스템 변수에서 **Path** 선택 후 **편집**
5. 다음 경로가 있는지 확인:
   - `C:\Program Files\nodejs\`
6. 없다면 **새로 만들기**로 추가

## 설치 후 할 일

Node.js 설치가 완료되면 프로젝트 디렉토리에서:

```powershell
cd C:\discord-study-bot
npm install
```

을 실행하세요!




