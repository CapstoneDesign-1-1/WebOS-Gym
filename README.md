# 🌐 WebOS-Gym (ProzillaOS Fork for AI Agent Benchmark)

<div align="center">
  <br />
  <p>
    <a href="https://github.com/CapstoneDesign-1-1/WebOS-Gym"><img src="https://os.prozilla.dev/assets/banner-logo-title-small.png" width="576" alt="ProzillaOS" /></a>
  </p>
  <p>
    <strong>AI 에이전트 평가용 초고속 가상 Web OS 벤치마크 환경</strong>
  </p>
  <p>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/github/license/prozilla-os/ProzillaOS?style=flat-square&color=FF4D5B&label=License"></a>
    <img alt="Node Version" src="https://img.shields.io/badge/node-%3E%3D18.12-blue?style=flat-square">
    <img alt="Package Manager" src="https://img.shields.io/badge/pnpm-%3E%3D8.0-orange?style=flat-square">
  </p>
</div>

---

## 📌 프로젝트 개요

**WebOS-Gym**은 AI 에이전트(예: LLM, VLM)가 마우스와 키보드로 웹 GUI 환경을 직접 제어하고 탐색하는 능력을 평가하기 위한 **초고속 웹 OS 기반 벤치마크 환경**입니다. 

실제 하드웨어 가상머신(VM) 기반의 벤치마크 환경(OSWorld 등)은 환경 초기화(Reset)에 수십 초 이상 소요되어 평가 효율성이 떨어지는 단점이 있습니다. 본 프로젝트는 경량 브라우저 환경에서 React로 고속 구동되는 **ProzillaOS**를 포크 및 개조하여 **수 밀리초(ms) 단위의 초고속 리셋 파이프라인**을 제공합니다.

### 🎯 핵심 설계 원칙
1. **Zero-Overhead Reset**: Playwright의 임시 프로파일 폐기 및 재생성 메커니즘을 적용하여 추가적인 리셋 코드 없이 깔끔하고 상태 누수(State Leakage)가 없는 무결한 환경 초기화를 보장합니다.
2. **DOM-based Evaluation**: ProzillaOS의 React 가상 파일 시스템(VFS) 상태를 DOM 트리(`#_os-vfs`)에 미러링하는 `OSBridge`를 삽입하여, Surfgym의 기존 규칙 기반 채점 엔진을 100% 재활용합니다.
3. **Accessibility-first UI**: 시각적 에이전트가 화면 요소들을 정확히 조작할 수 있도록 표준 ARIA 역할 및 라벨을 강화합니다.

---

## 🏗️ 시스템 아키텍처

```mermaid
graph TD
    subgraph Surfgym Gateway (평가 프레임워크)
        A[Observation: 스크린샷 & 접근성 트리 캡처]
        B[Action: 마우스 클릭, 키보드 입력 전달]
        C[Reset: Playwright 임시 프로파일 폐기/재생성]
        D[Reward: DOM 기반 룰 평가]
    end

    subgraph ProzillaOS Browser Tab (localhost:3000)
        E[ProzillaOS Core]
        F[OSBridge Component]
        G[VFS State Mirroring: #_os-vfs DOM]
    end

    B -->|Playwright 조작| E
    E -->|React Context| F
    F -->|window._os 바인딩| F
    F -->|재귀 순회| G
    G -.->|DOM Selector 기반 채점| D
```

---

## 📅 핵심 개발 마일스톤

상세 실행 사양 및 코드 명세는 [prozillaos_plan.md](./prozillaos_plan.md)에서 확인하실 수 있습니다.

### [M1] OSBridge 컴포넌트 구현 (파일 시스템 연동)
- **목적**: React Context VFS 상태를 브라우저 전역 객체 `window._os` 및 숨겨진 DOM 노드 `#_os-vfs`에 미러링하여 파일 생성/수정 여부를 감지할 수 있도록 제공합니다.
- **주요 작업**:
  - `OSBridge.tsx` 컴포넌트 구현 및 `<ProzillaOS>` 마운트 지점 연동
  - VFS `update` 이벤트 구독을 통한 실시간 DOM 동기화

### [M2] 시각적 접근성 개선 (Accessibility Tree 강화)
- **목적**: AI 에이전트가 스크린샷과 접근성 트리를 보고 클릭/입력할 UI 요소들을 완벽히 식별할 수 있도록 ARIA 속성을 이식합니다.
- **주요 작업**:
  - 창(Window) 컨테이너에 `role="dialog"`, `aria-label={title}` 적용
  - 바탕화면/탐색기 파일 및 폴더 아이콘에 개별 `aria-label` 적용
  - 작업표시줄 버튼에 `aria-label` 부여

### [M3] Task JSON 설계 및 Surfgym 통합 검증
- **목적**: 개조된 가상 OS 환경에서 실행할 태스크 시나리오를 설계하고 실제 정상 채점 여부를 최종 검증합니다.
- **주요 태스크 세트**:
  - `os-001`: 터미널 창 실행
  - `os-002`: 설정 창 실행
  - `os-003`: 터미널 `echo hello` 명령어 실행 검증
  - `os-004`: 계산기 실행 후 수식(7 + 8 = 15) 계산 및 결과 검증

### [M4] ProzillaOS 코드 에디터 추가 (조건부)
- **목적**: 고난이도 파일 제어 및 코드 작성 태스크가 가능하도록 코드 문법 강조(Syntax Highlighting) 기능이 포함된 코드 에디터 앱 개발.

---

## 🚀 시작하기

### 요구 사항
- [Node.js](https://nodejs.org/) (v18.12 이상)
- [pnpm](https://pnpm.io/) (v8.0 이상 권장)

### 1. 의존성 설치
```sh
npm install -g pnpm
pnpm install
```

### 2. 패키지 빌드 및 로컬 서버 구동
```sh
pnpm run packages:build
pnpm start
```

### 3. 접속 테스트
브라우저를 열고 [http://localhost:3000](http://localhost:3000)에 접속하여 가상 웹 OS 환경이 올바르게 구동되는지 확인합니다.

---

## 📂 패키지 구조

본 저장소는 모노레포 구조로 되어 있습니다. 주요 패키지 목록은 다음과 같습니다.

- `packages/core`: ProzillaOS 핵심 쉘, 데스크톱, 작업표시줄 및 윈도우 매니저 코어 코드
- `packages/apps`: 내장 웹 애플리케이션들 (터미널, 계산기, 텍스트 에디터, 미디어 플레이어 등)
- `demo`: 완성된 데모 웹 빌드 엔트리포인트

---

## ⚖️ 라이선스

본 프로젝트는 원본 ProzillaOS의 정책을 따라 [MIT 라이선스](./LICENSE) 하에 배포됩니다.
