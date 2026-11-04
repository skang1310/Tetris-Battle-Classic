# macOS 실행 안내

## 빌드

저장소 루트에서 실행합니다.

```sh
npm --prefix client-nuxt ci
bash macos/build.sh
open 'dist/Tetris Battle.app'
```

Apple Silicon/macOS 12+, Node.js 20+, Go(`go.mod` 기준), Xcode Command Line Tools가 필요합니다. `dist/`에 앱과 ZIP을 만듭니다. 빌드 스크립트는 Nuxt 정적 파일, Go 서버, AppKit/WebKit 실행기를 묶습니다. Apple Development 서명이 있으면 사용하고, 없으면 임시 서명을 사용합니다. `TETRIS_SIGN_IDENTITY` 환경 변수로 서명 ID를 지정할 수 있습니다. 공증된 일반 배포용 앱은 아닙니다.

## 실행과 네트워크

앱은 포트 8080에서 자체 서버를 실행합니다. 같은 Wi-Fi의 아이폰·맥은 앱의 친구와 연결 메뉴에서 생성한 QR/링크와 방 코드를 사용합니다. 앱이 서버를 호스팅하므로 경기 중 실행해 두세요. 앱 종료 시 서버도 정리합니다.

브라우저용 서버를 직접 실행할 때는 정적 파일을 생성해 루트 `public/`에 복사한 뒤 실행합니다.

```sh
go run ./cmd/macos
```

기본 접속 주소는 `http://localhost:8080`입니다. 외부 인터넷은 별도 호스팅 또는 연결 경로가 필요합니다. 앱의 Internet Play 도구는 외부 연결 도구 설치가 별도로 필요할 수 있습니다.

## 키보드 두 개

메인에서 각자 키보드를 선택하고 시작 준비에서 등록합니다. macOS 시스템 설정 → 개인정보 보호 및 보안 → 입력 모니터링에서 앱을 허용해야 합니다. 각 키보드에서 Space를 눌러 등록하거나 장치 목록을 선택합니다. 재등록·해제·1P/2P 교환을 지원합니다. 등록 정보는 이 맥에 저장하고, 하드웨어 정보가 명확하게 일치할 때 복원합니다. 분리 시 일시정지하며, 재연결 후 재개합니다.

## 저장과 로그

프로필·키 배치·속도·기록은 WebKit의 로컬 저장소에 보관합니다. 앱 서버 로그는 `~/Library/Logs/Tetris Battle/server.log`에 있습니다. 이 데이터와 로그는 저장소에 포함하지 않습니다.

## 개발 검증

`npm --prefix client-nuxt run typecheck`, `npm --prefix client-nuxt test`, `go test -race ./...`를 사용합니다. 브라우저 검증 스크립트는 실행 중인 앱의 `http://127.0.0.1:8080`을 대상으로 합니다. 일부 과거 스크립트는 이전 UI 또는 개발자의 Playwright 경로에 맞춰 작성되어 있습니다. 현재 런처 UI 검증은 `verify-hub43.mjs`입니다.
