# Visual Studio Build Tools 설치 가이드

## 방법 1: Visual Studio Build Tools 설치 (권장)

### 1. 다운로드
1. [Visual Studio Build Tools 다운로드 페이지](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) 접속
2. **"Build Tools for Visual Studio 2022"** 다운로드
   - 또는 [직접 다운로드 링크](https://aka.ms/vs/17/release/vs_buildtools.exe)

### 2. 설치
1. 다운로드한 `vs_buildtools.exe` 실행
2. **"Desktop development with C++"** 워크로드 체크
   - 이것이 필수입니다!
3. 오른쪽 패널에서 **"C++ CMake tools for Windows"** 체크 (자동으로 체크되어 있을 수 있음)
4. **"설치"** 클릭
5. 설치 완료까지 기다리기 (약 3-6GB 다운로드, 시간 소요)

### 3. 설치 확인
**PowerShell을 다시 시작한 후**:

```powershell
npm install
```

이제 정상적으로 설치될 것입니다!

---

## 방법 2: 더 간단한 대안 - JSON 파일 기반 저장소

Visual Studio Build Tools 설치가 부담스럽다면, JSON 파일 기반 저장소를 사용할 수 있습니다.

**장점:**
- ✅ 컴파일 불필요
- ✅ 추가 설치 불필요
- ✅ 소규모 프로젝트에 충분

**단점:**
- ⚠️ 대량 데이터 처리 시 SQLite보다 느림
- ⚠️ 동시 접근 제어가 제한적

이 방법을 원하시면 `database.js`를 JSON 파일 기반으로 변경할 수 있습니다.


