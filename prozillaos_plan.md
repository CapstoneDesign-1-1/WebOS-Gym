# ProzillaOS Fork — 개발 마일스톤 및 온보딩 계획서

이 문서는 AI 에이전트 평가용 **가상 운영체제(Web OS) 벤치마크 환경 구축** 프로젝트의 실행 계획서입니다. 팀원들은 본 계획서에 명시된 아키텍처와 마일스톤에 따라 개발을 진행하며, 각 컴포넌트의 역할과 연동 규격을 준수해야 합니다.

---

## 1. 프로젝트 개요 및 목표

- **목적**: AI 에이전트(예: Claude)가 마우스와 키보드로 컴퓨터(GUI)를 조작하는 능력을 평가하기 위한 **초고속 웹 OS 기반 가상 벤치마크 환경** 구축.
- **핵심 전략**: 실제 가상머신(VM) 기반 초기화(수십 초 소요) 대신, 경량 브라우저에서 동작하는 오픈소스 웹 OS인 **ProzillaOS**를 포크 및 개조하여 초고속 평가 파이프라인(Reset 수 밀리초) 확보.

### 확정 개발 범위

| 항목 | 결정 사항 | 비고 |
|------|------|------|
| **개발/수정 대상** | ProzillaOS 리포지토리로 한정 | Surfgym 코드는 원본 그대로 활용 (수정 없음 ❌) |
| **방해 요소 (Perturbation)** | 구현 대상에서 제외 ❌ | |
| **추가 개발 후보** | ProzillaOS 내 코드 에디터 앱(Code Editor) 추가 | M1~M3 완료 후 진행 여부 결정 (조건부, M4) |

---

## 2. 시스템 아키텍처 및 연동 규격

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

### 2.1 리셋 및 상태 유지 메커니즘
- Surfgym은 에피소드 종료 시 `PlaywrightInstance.delete()`를 통해 브라우저 컨텍스트를 폐기합니다.
- `chromium.launch()` 시 임시 프로파일을 사용하므로, 브라우저가 닫힐 때 `localStorage`를 포함한 임시 디렉토리가 모두 자동 정리됩니다.
- **별도의 상태 초기화(Reset) 코드 구현이 필요하지 않으며 State Leakage가 발생하지 않습니다.**

### 2.2 채점 방식 (Surfgym 기본 룰 기준)
- 에이전트의 액션 영역에는 자바스크립트 실행(`JAVASCRIPT_EVALUATE`)이 포함되지 않아 치팅이 불가능합니다.
- `OSBridge`가 VFS 상태를 숨겨진 DOM(`display: none` 상태의 `#_os-vfs`)에 미러링하며, 이를 Surfgym의 기존 DOM 룰(text, html, url, title, attr)을 활용하여 채점합니다.

#### DOM 미러링 채점 가능 범위

| 평가 시나리오 | 가능 여부 | 방법 |
|-------------|---------|------|
| 특정 앱 창이 열려 있는가 | ✅ (M2 완료 후) | `role=dialog` + `aria-label=앱이름` 탐색 |
| 화면에 특정 텍스트가 보이는가 | ✅ | `text contains "..."` 룰 적용 |
| VFS에 파일이 생성됐는가 | ✅ | OSBridge가 미러링한 `#_os-vfs` 하위 DOM 채점 |
| VFS 파일 내용 검증 | ✅ | 숨겨진 DOM 노드의 `data-content` 속성 조회 |
| VFS 디렉토리 존재 여부 | ✅ | 숨겨진 DOM 노드의 `data-path` 구조 조회 |

---

## 3. 핵심 마일스톤 실행 계획

### M1: OSBridge 컴포넌트 구현 및 삽입 (병렬 가능)
**목적**: React Context에 캡슐화되어 있는 VFS(가상 파일 시스템) 상태를 브라우저 전역 객체(`window._os`) 및 숨겨진 DOM 노드에 미러링하여 Surfgym이 파일 수준의 상태를 채점할 수 있도록 인터페이스를 제공합니다.

#### 🛠️ 구현 상세 사양
- **대상 파일**: `packages/core/src/components/prozilla-os/OSBridge.tsx` (신설)
- **삽입 위치**: `ProzillaOS.tsx` 내의 `<ThemeProvider>` 안, `<Main>`과 형제 노드로 배치.
- **VFS 상태 연동**: `VirtualRoot`는 `useSingleton`을 통해 단 한 번만 mutable 클래스 인스턴스로 생성되므로, 최초 바인딩 시 항상 최신 상태를 유지합니다. `update` 이벤트 구독을 통해 VFS 상태 변경 시 DOM 구조를 실시간 업데이트합니다.

```typescript
// packages/core/src/components/prozilla-os/OSBridge.tsx
import { useContext, useEffect } from "react";
import { VirtualRootContext } from "../../hooks/virtual-drive/virtualRootContext";
import { WindowsManagerContext } from "../../hooks/windows/windowsManagerContext";
import { VirtualFolder } from "../../features/virtual-drive/folder/virtualFolder";
import { VirtualFile } from "../../features/virtual-drive/file/virtualFile";

function syncFolderToDom(folder: VirtualFolder, container: HTMLElement) {
  folder.files.forEach((file) => {
    const el = document.createElement("div");
    el.className = "vfs-file";
    el.setAttribute("data-path", file.path);
    if (file.isFile()) {
      const content = (file as VirtualFile).content ?? "";
      el.setAttribute("data-content", content.slice(0, 4096));
    }
    container.appendChild(el);
  });

  folder.subFolders.forEach((sub) => {
    const el = document.createElement("div");
    el.className = "vfs-dir";
    el.setAttribute("data-path", sub.path);
    container.appendChild(el);
    if (sub.isFolder()) {
      syncFolderToDom(sub as VirtualFolder, container);
    }
  });
}

function syncVfsToDom(virtualRoot: VirtualFolder) {
  let container = document.getElementById("_os-vfs");
  if (!container) {
    container = document.createElement("div");
    container.id = "_os-vfs";
    container.style.display = "none";
    document.body.appendChild(container);
  }
  container.innerHTML = "";
  syncFolderToDom(virtualRoot, container);
}

export function OSBridge() {
  const virtualRoot = useContext(VirtualRootContext);
  const windowsManager = useContext(WindowsManagerContext);

  useEffect(() => {
    (window as any)._os = { virtualRoot, windowsManager };
    syncVfsToDom(virtualRoot);
    const handler = () => syncVfsToDom(virtualRoot);
    virtualRoot.on("update", handler);
    return () => virtualRoot.off("update", handler);
  }, [virtualRoot, windowsManager]);

  return null;
}
```

`ProzillaOS.tsx` 수정 영역:
```tsx
// 수정 전
<ThemeProvider>
  <Main>{children}</Main>
</ThemeProvider>

// 수정 후
<ThemeProvider>
  <Main>{children}</Main>
  <OSBridge />
</ThemeProvider>
```

전역 타입 선언 (`window._os`):
```typescript
declare global {
  interface Window {
    _os: {
      virtualRoot: VirtualRoot;
      windowsManager: WindowsManager;
    };
  }
}
```

#### 📋 태스크 리스트
- [ ] `VirtualRootContext`, `WindowsManagerContext` export 경로 및 정상 임포트 확인
- [ ] `OSBridge.tsx` 작성 및 전역 `window._os` 바인딩 구현
- [ ] `ProzillaOS.tsx` 구조 수정하여 `<OSBridge />` 삽입
- [ ] VFS 상태 변경 시 `#_os-vfs` 하위 DOM이 실시간 동기화되는지 검증

#### 🎯 완료 조건
1. 브라우저 콘솔에서 `window._os.virtualRoot` 호출 시 최신 VFS 객체가 반환됨.
2. `window._os.windowsManager`를 통해 현재 활성화된 창 목록을 정상 조회할 수 있음.
3. 파일 생성 및 수정 이벤트 발생 시 `#_os-vfs` DOM 노드의 `data-path` 및 `data-content`가 즉각 동화됨.

---

### M2: 시각적 접근성 개선 (A11y Enhancement) (병렬 가능)
**목적**: AI 에이전트가 화면 스크린샷과 접근성 트리(Accessibility Tree)를 기반으로 UI 요소를 정확히 식별하고 조작할 수 있도록 HTML 마크업에 표준 ARIA 속성 및 역할을 추가합니다.

#### 🛠️ 구현 상세 사양
- **WindowView.tsx**: 창 컨테이너 div(line 177)에 `role="dialog"`, `aria-label={title}` 속성을 부여합니다. `title`은 이미 앱 이름을 담고 있는 state 변수이며, `appName`이라는 별도 변수는 존재하지 않습니다.
- **DirectoryList.tsx** (`Desktop.tsx` 아님): 바탕화면 아이콘은 `Desktop.tsx`가 직접 렌더링하지 않고 `DirectoryList` 컴포넌트에 위임합니다. 폴더용 `<Interactable>`에 `aria-label={folder.name}`, 파일용 `<Interactable>`에 `aria-label={file.id}`를 추가해야 합니다.
- **AppIcon.tsx** (`Taskbar.tsx` 아님): 작업표시줄 앱 버튼은 `AppButton` 컴포넌트(`AppIcon.tsx`)가 렌더링합니다. `<button>`에 `title={app.name}`은 이미 존재하지만 `aria-label`은 누락되어 있으므로 `aria-label={app.name}`을 추가해야 합니다.

#### 📋 태스크 리스트
- [ ] `packages/core/src/components/windows/WindowView.tsx` 수정: 창 컨테이너 div(line 177)에 `role="dialog"`, `aria-label={title}` 추가
- [ ] `packages/core/src/components/_utils/directory-list/DirectoryList.tsx` 수정: 폴더 `<Interactable>`에 `aria-label={folder.name}`, 파일 `<Interactable>`에 `aria-label={file.id}` 추가 (`Desktop.tsx` 아님 — 아이콘 렌더링은 DirectoryList가 담당)
- [ ] `packages/core/src/components/taskbar/app-icon/AppIcon.tsx` 수정: `<button>`에 `aria-label={app.name}` 추가 (`Taskbar.tsx` 아님 — 버튼은 `AppButton` 컴포넌트가 담당)

#### 🎯 완료 조건
1. Playwright 실행 시 `page.getByRole('dialog', { name: 'Terminal' })` API를 통해 터미널 창을 명확하게 탐색할 수 있음.
2. `page.getByRole('dialog', { name: 'Settings' })` API 호출 시 설정 창이 성공적으로 조회됨.

---

### M3: Task JSON 설계 및 Surfgym 통합 검증
**목적**: 개조된 ProzillaOS 환경에서 AI 에이전트를 평가하기 위한 실제 테스트 시나리오를 정의하고, Surfgym 파이프라인에서의 정상 채점 여부를 최종 검증합니다.

#### 📋 기본 에이전트 태스크 세트 (최소 4종)

| Task ID | 태스크 설명 | 평가지표 및 채점 규칙 (DOM Selector) | 전제 조건 |
| :--- | :--- | :--- | :--- |
| **os-001** | 터미널 창 열기 | `[role='dialog'][aria-label='Terminal']` 요소가 DOM 상에 존재함 | M2 완료 |
| **os-002** | 설정 창 열기 | `[role='dialog'][aria-label='Settings']` 요소가 DOM 상에 존재함 | M2 완료 |
| **os-003** | 터미널에서 `echo hello` 명령어 실행 | `[role='dialog'][aria-label='Terminal'] .WindowContent` `text contains "hello"` (selector 생략 시 페이지 전체 텍스트 검색 → 오탐 위험) | M2 완료 |
| **os-004** | 계산기를 열고 7 + 8을 계산 | `[role='dialog'][aria-label='Calculator'] .WindowContent` `text contains "15"` | M2 완료 |

#### 🛠️ Surfgym Task JSON 설정 템플릿 (요소 존재 우회 기법 적용)
```json
{
  "task_id": "os-001",
  "instruction": "터미널 앱을 실행하세요.",
  "website": "http://localhost:3000",
  "evaluation": {
    "operator": "and",
    "rules": [
      {
        "selector": "[role='dialog'][aria-label='Terminal']",
        "target": "html",
        "match": "regex",
        "value": ".+"
      }
    ]
  }
}
```

#### 📋 태스크 리스트
- [ ] Surfgym의 `tasks/tasks_all.json` 파일에 ProzillaOS 전용 테스트 케이스 4종 병합
- [ ] Surfgym 로컬 실행 환경을 띄워 정의한 Task들이 올바르게 주입되는지 확인
- [ ] 사람이 수동으로 조작하며 성공/실패 시나리오별 실시간 채점 정합성 테스트

#### 🎯 완료 조건
1. 4종의 태스크에 대해 에이전트 또는 테스터가 목표를 성공했을 때 `true`, 실패했을 때 `false`를 정확히 판정함.
2. Surfgym 파이프라인(환경 기동 → 에이전트 관찰 → 행동 및 채점 → 리셋)이 **5회 이상 연속**으로 오류 없이 구동됨.

---

### M4: ProzillaOS 코드 에디터 앱 추가 (조건부 개발)
**목적**: AI 에이전트가 단문 텍스트 외에 코드 파일을 제어하는 고난이도 태스크를 수행할 수 있도록, 문법 강조(Syntax Highlighting) 기능이 포함된 코드 에디터 앱을 새로 구현하여 시스템 내장 앱으로 패키징합니다.

#### 🛠️ 구현 방향 및 사양
- **경로**: `packages/apps/code-editor/` 패키지 신설
- 기존 텍스트 에디터(`packages/apps/text-editor/`) 구조를 확장 참조하여 파일 탐색, 코드 작성 및 수정, 실시간 디스크 저장 기능 연계.
- **필수 라이브러리 검토**: 가볍고 확장성이 우수한 `CodeMirror` 또는 `Monaco Editor` 통합 적용 검토.
- **예시 태스크**: "특정 파이썬 파일(`.py`)을 더블클릭하여 코드 에디터로 열고, 함수 내부 로직을 올바르게 수정 및 저장하십시오."

---

## 4. 마일스톤 일정 및 리소스 요약

M1과 M2는 개발 영역이 분리되어 있으므로 **동시 병렬 진행**이 가능합니다.

### 소요 예산 추정 (인-시간 기준)

| 구분 | 낙관 | 기준 | 비관 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **M1: OSBridge 컴포넌트** | 2시간 | 4시간 | 6시간 | 병렬 진행 가능 🔄 |
| **M2: 시각적 접근성 개선** | 2시간 | 4시간 | 6시간 | 병렬 진행 가능 🔄 |
| **M3: Task JSON 작성 및 검증** | 2시간 | 4시간 | 6시간 | M1, M2 완료 후 진행 |
| **합계 (M1‖M2 병렬 구성 시)** | **8시간** | **12시간** | **18시간** | **학기 기준 1~2주 내 완료 목표** |
| **M4: 코드 에디터 (조건부)** | +8시간 | +16시간 | +30시간 | 필요 시 리소스 추가 배치 |

---

## 5. 논문 요건 매핑

| 마일스톤 | 논문 기여 항목 | 필수 여부 |
|---------|-------------|---------|
| **M1 OSBridge** | Evaluation Protocol — 에이전트 태스크 성공 판별 인터페이스 | 필수 |
| **M2 A11y** | Agent Capability — 접근성 기반 UI 요소 식별 가능성 보장 | 필수 |
| **M3 Task JSON** | Benchmark Design — 평가 태스크 정의 및 검증 | 필수 |
| **M4 코드 에디터** | Benchmark Coverage — 태스크 다양성 확장 | 선택 |

---

## 6. 런타임 운영 및 장애 관리 방침

### 5.1 타임아웃 규정
- 단일 평가 태스크에 할당되는 최대 제한 시간은 **60초**입니다.
- 60초 초과 시 Surfgym은 즉시 실행 실패로 간주하며, 브라우저 컨텍스트를 강제 폐기하고 재생성 절차를 수행합니다.
- 연속 3회 브라우저 재생성 실패 시 전체 평가 루프가 강제 중단(Abort)됩니다.

### 5.2 오류 대응 및 수집 데이터
실패 및 비정상 동작 발생 시 문제 진단을 위해 아래의 정보를 자동 스냅샷으로 저장합니다.
1. 실패 시점의 브라우저 뷰포트 스크린샷 (`.png`)
2. 전체 접근성 트리(Accessibility Tree) 구조 덤프 (`.json`)
3. VFS 내부 상태 정합성 검증을 위한 `window._os.virtualRoot` 스냅샷 데이터 (`.json`)

---

## 7. 향후 협의 및 결정 사항

1. **M4 코드 에디터 진행 여부**: M1~M3 완료 후, AI 에이전트의 코드 편집 태스크 필요성을 평가하여 마일리지를 추가 배정할지 협의합니다.
2. **평가 태스크 스케일업**: 초기 기본 태스크 4개 외에, 논문 기여도를 높이기 위해 추가로 발굴할 시나리오 후보군을 선정합니다. (예: 파일 압축 풀기, 설정 언어 변경 등)
