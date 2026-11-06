# Tetris Battle — iOS / iPadOS / tvOS

기존 TypeScript `ModeSession`, `BattleGame`, SRS, 동일 7-bag, CPU, KO 및 아이템 규칙을 JavaScriptCore에서 실행합니다. 웹뷰가 없는 Apple TV에서도 같은 엔진을 사용합니다. 게임 화면은 맥의 `public/classic` 원본 PNG와 같은 800×600 보드 좌표를 Core Graphics로 그립니다. 원본 출처와 라이선스는 `Resources/ClassicArt/REFERENCE-LICENSE.txt`에 유지합니다.

## 플레이

1. 기기 설정의 Bluetooth에서 DualSense / Xbox 게임패드를 연결합니다.
2. 기본전·스피드전·아이템전을 선택합니다.
3. 컴퓨터 대전 또는 컨트롤러 2P를 선택하고 시작합니다. 3·2·1 후 입력됩니다.

| 기능 | DualSense | Xbox |
|---|---|---|
| 이동 / 소프트 드롭 | 방향패드 또는 왼쪽 스틱 | 방향패드 또는 왼쪽 스틱 |
| 회전 | ✕ | A |
| 하드 드롭 | ○ | B |
| 홀드 | L1 | LB |
| 아이템 1 / 2 / 3 | □ / △ / R1 | X / Y / RB |
| 일시정지 | Options | Menu |

연결 순서로 1P / 2P를 배정하고 혼합 모델을 지원합니다. 아이폰에서는 가로 방향으로 놓으면 맥과 같은 두 보드 화면을 크게 볼 수 있습니다. 연결이 끊기면 일시정지하며, 남아 있는 패드의 자리는 바꾸지 않습니다. 2P는 매 판 직전과 다른 랜덤 맵을 두 사람에게 동일하게 적용합니다. 배경 음악과 반복 입력 속도는 기기별로 저장됩니다. 앱이 백그라운드로 가면 일시정지합니다.

이 네이티브 버전의 현재 범위는 오프라인 CPU / 같은 기기 2P입니다. 맥 버전의 온라인 방, 프로필, 리플레이, 선승제 UI, 전체 사운드 설정은 아직 연결하지 않았습니다. iPhone에는 기본 터치 버튼도 있지만 빠른 플레이는 게임패드 기준입니다.

## 빌드

Xcode와 XcodeGen, 기존 `client-nuxt/node_modules`가 필요합니다.

```sh
bash apple/build-engine.sh
xcodegen generate --spec apple/project.yml
open apple/TetrisBattle.xcodeproj
```

`TetrisBattle-iOS` 또는 `TetrisBattle-tvOS` 스킴을 선택합니다. 다른 계정에서는 Signing Team과 번들 ID를 바꾸세요. 실기기는 개발 기기로 페어링한 뒤 Xcode에서 실행합니다. App Store / TestFlight 배포는 별도입니다.

```sh
swift apple/verify-engine.swift apple/Resources/engine.js
xcodebuild -project apple/TetrisBattle.xcodeproj -scheme TetrisBattle-iOS -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO build
xcodebuild -project apple/TetrisBattle.xcodeproj -scheme TetrisBattle-tvOS -sdk appletvsimulator CODE_SIGNING_ALLOWED=NO build
```

`--smoke-gameplay --item` 실행 인수는 Debug 빌드에서만 시각 검증을 위해 CPU 아이템전을 자동 시작합니다. 릴리스에는 이 자동 시작 경로가 없습니다.

## 검증 기록 — 2026-11-06

- iOS / tvOS 시뮬레이터 빌드 및 실제 원본 이미지 게임 화면 확인.
- iOS / tvOS 서명 빌드, 연결된 iPhone 및 Apple TV 4K 설치·프로세스 실행.
- JavaScriptCore에서 세 모드, 독립 2인 입력, 동일 블록, 이동·회전·홀드·낙하·아이템 공격, 일시정지, 시간 종료/승자, CPU 검증.
- 기존 프런트엔드 419개 테스트 통과.
- 실제 DualSense + Xbox 동시 입력과 무선 연결 지연은 사용자 기기에서 추가 확인이 필요합니다.

Apple TV 시뮬레이터 설치로 공간이 부족해져, 화면 검증 후 이번 작업에서 추가한 tvOS 런타임과 테스트 기기만 제거했습니다. tvOS SDK 및 앱 프로젝트는 유지됩니다.
