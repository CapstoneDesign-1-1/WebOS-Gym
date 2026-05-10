# ProzillaOS Terminal 명령어 정리

ProzillaOS Terminal에서 확인해볼 수 있는 명령어들을 기능별로 정리한 문서입니다.  
실제 Linux 터미널이라기보다는 웹 OS 내부에서 동작하는 shell/terminal이므로, 일부 명령어는 가상 파일 시스템이나 브라우저 환경에 맞게 제한적으로 동작할 수 있습니다.

---

## 1. 파일 / 디렉터리 관련 명령어

| 명령어 | 설명 |
|---|---|
| `ls` | 현재 디렉터리의 파일과 폴더 목록을 출력합니다. | -> Desktop에서만 가능 
| `dir` | 디렉터리 내용을 출력합니다. `ls`와 비슷한 역할을 합니다. |
| `cd` | 현재 작업 디렉터리를 변경합니다. |
| `pwd` | 현재 작업 중인 디렉터리 경로를 출력합니다. |
| `cat` | 파일 내용을 터미널에 출력합니다. | (txt 파일 O, md 파일 X)
| `less` | 파일 내용을 페이지 단위로 확인합니다. |
| `head` | 파일의 앞부분 내용을 출력합니다. |
| `tail` | 파일의 뒷부분 내용을 출력합니다. |
| `mkdir` | 새 디렉터리를 생성합니다. | -> 만들자 마자 현재 보고 있는 폴더 내부에 바로 생기지는 않음 (창을 한번 껏다가 켜야함)
| `rmdir` | 비어 있는 디렉터리를 삭제합니다. | -> 삭제는 되는데 'command failed' 라고 뜸
| `rm` | 파일 또는 디렉터리를 삭제합니다. | -> 특정 파일 삭제가 안됨. 삭제는 되는데, terminal 상에서 ls 결과와 실제 폴더 결과가 다르다. 'command failed' 라고 뜬다
| `touch` | 새 파일을 생성하거나 파일의 수정 시간을 갱신합니다. |
| `grep` | 파일이나 출력 결과에서 특정 텍스트 패턴을 검색합니다. |
| `uniq` | 중복된 연속 줄을 제거하거나 정리합니다. |
| `rev` | 입력된 문자열 또는 파일 내용을 거꾸로 출력합니다. |

### 대표 예시

```bash
pwd
ls
mkdir test
cd test
touch memo.txt
echo "hello" > memo.txt
cat memo.txt
grep hello memo.txt
cd ..
rm test/memo.txt
rmdir test
```

---

## 2. 셸 / 실행 관련 명령어

| 명령어 | 설명 |
|---|---|
| `sh` | shell script 파일을 실행합니다. |
| `eval` | 입력된 코드를 평가하여 실행합니다. ProzillaOS에서는 JavaScript 코드 실행 용도로 볼 수 있습니다. |
| `watch` | 특정 명령어를 주기적으로 반복 실행합니다. |
| `sleep` | 지정한 시간만큼 실행을 지연합니다. | -> 안된다.
| `true` | 항상 성공 상태를 반환합니다. |
| `false` | 항상 실패 상태를 반환합니다. |
| `[[` | 조건식을 평가합니다. 파일 존재 여부, 문자열 비교, 숫자 비교 등에 사용할 수 있습니다. |

### 대표 예시

```bash
true && echo success
false || echo fallback
[[ 1 -eq 1 ]] && echo same
sleep 1
watch date
```

---

## 3. 도움말 / 조회 관련 명령어

| 명령어 | 설명 |
|---|---|
| `help` | 사용 가능한 명령어 목록 또는 간단한 도움말을 출력합니다. |
| `man` | 명령어의 매뉴얼을 확인합니다. |
| `whatis` | 특정 명령어가 무엇을 하는지 짧게 설명합니다. |
| `compgen` | 사용 가능한 명령어 목록을 출력합니다. | -> Incoreect usage 뜬다
| `history` | 이전에 입력한 명령어 기록을 출력합니다. |
| `printenv` | 환경 변수 정보를 출력합니다. |
| `whoami` | 현재 사용자 이름을 출력합니다. |
| `hostname` | 시스템 또는 환경의 호스트 이름을 출력합니다. |
| `date` | 현재 날짜와 시간을 출력합니다. |
| `uptime` | 시스템이 실행된 시간을 출력합니다. |

### 대표 예시

```bash
help
compgen -c
man ls
whatis grep
history
whoami
hostname
date
uptime
printenv
```

---

## 4. 출력 / 텍스트 관련 명령어

| 명령어 | 설명 |
|---|---|
| `echo` | 입력한 문자열을 출력합니다. |
| `yes` | 지정한 문자열을 반복 출력합니다. | -> ctrl + c 를 통해서 interrupt 해야 끝남
| `banner` | 큰 글자 형태의 텍스트 배너를 출력합니다. |
| `cowsay` | 소 모양 ASCII 아트와 함께 문장을 출력합니다. |
| `lolcat` | 출력 텍스트에 색상 효과를 적용합니다. |

### 대표 예시

```bash
echo hello
yes hello
banner ProzillaOS
cowsay hello
echo hello | lolcat
```

---

## 5. 시스템 / 세션 관련 명령어

| 명령어 | 설명 |
|---|---|
| `clear` | 터미널 화면을 지웁니다. |
| `reload` | 현재 환경 또는 앱을 다시 불러옵니다. |
| `reboot` | ProzillaOS 환경을 재시작합니다. |
| `exit` | 현재 터미널 세션을 종료합니다. |

### 대표 예시

```bash
clear
reload
reboot
exit
```

---

## 6. 비주얼 / 이펙트 관련 명령어

| 명령어 | 설명 |
|---|---|
| `cmatrix` | Matrix 스타일의 터미널 애니메이션을 출력합니다. |
| `pipes` | 파이프가 움직이는 형태의 터미널 이펙트를 출력합니다. |
| `rain` | 비가 내리는 듯한 터미널 이펙트를 출력합니다. |
| `snow` | 눈이 내리는 듯한 터미널 이펙트를 출력합니다. |
| `afire` | 불꽃 또는 화염 형태의 터미널 이펙트를 출력합니다. |
| `sl` | 기차 애니메이션을 출력하는 장난용 명령어입니다. |

### 대표 예시

```bash
cmatrix
pipes
rain
snow
afire
sl
```

---

## 7. 에디터 / 유틸 관련 명령어

| 명령어 | 설명 |
|---|---|
| `nano` | 간단한 터미널 텍스트 에디터를 실행합니다. |
| `vi` | vi 스타일의 터미널 텍스트 에디터를 실행합니다. |

### 대표 예시

```bash
nano memo.txt
vi memo.txt
```

---

## 8. 기타 명령어

| 명령어 | 설명 |
|---|---|
| `fortune` | 랜덤 문구나 짧은 메시지를 출력합니다. |
| `neofetch` | 시스템 정보를 보기 좋게 출력합니다. |

### 대표 예시

```bash
fortune
neofetch
```



## 10. 프로젝트에서 테스트할 때 우선순위

OS mock 또는 WebGym task로 사용할 목적이라면, 아래 기능이 실제로 되는지 먼저 확인하는 것이 좋습니다.

| 우선순위 | 확인할 기능 | 예시 명령어 |
|---|---|---|
| 1 | 현재 위치 확인 | `pwd` |
| 2 | 파일/폴더 목록 확인 | `ls`, `dir` |
| 3 | 디렉터리 이동 | `cd <path>` |
| 4 | 파일 생성 | `touch memo.txt`, `echo hello > memo.txt` |
| 5 | 파일 읽기 | `cat memo.txt`, `less memo.txt` |
| 6 | 텍스트 검색 | `grep hello memo.txt` |
| 7 | 파이프 동작 | `cat memo.txt \| grep hello` |
| 8 | 리다이렉션 동작 | `echo hello > memo.txt`, `echo world >> memo.txt` |
| 9 | 조건식 동작 | `[[ -f memo.txt ]] && echo exists` |
| 10 | 스크립트 실행 | `sh test.sh` |

---

## 11. 지원안하는 명령어

다음과 같은 명령어는 일반 Linux에서는 자주 쓰이지만, ProzillaOS Terminal의 기본 명령어 목록에는 없을 수 있습니다.

```bash
git
curl
wget
apt
pip
npm
node
python
```

따라서 ProzillaOS 기반 task를 만들 때는 실제 시스템 패키지 설치나 외부 네트워크 작업보다는, 가상 파일 시스템 조작, 텍스트 출력, 검색, 조건식, 간단한 shell script 실행 중심으로 설계하는 것이 적절합니다.
