import json
from pathlib import Path

def normalize_rules(rules):
    normalized = []
    for rule in rules:
        new_rule = {}
        # 0507 표준 스키마 룰 순서 정의 (selector, target, attr, value, match)
        keys_order = ["selector", "target", "attr", "value", "match"]
        
        # 1. text -> target/value 변환 처리
        if "text" in rule and "target" not in rule:
            new_rule["target"] = "text"
            new_rule["value"] = rule["text"]
        elif "target" in rule:
            new_rule["target"] = rule["target"]
            if "value" in rule:
                new_rule["value"] = rule["value"]
        
        # 2. selector 지정
        if "selector" in rule:
            new_rule["selector"] = rule["selector"]
            
        # 3. attr 속성 처리
        if "attr" in rule:
            new_rule["attr"] = rule["attr"]
            if "target" not in rule and "target" not in new_rule:
                new_rule["target"] = "attr"
                
        # 4. value 매핑 (아직 정의되지 않은 경우 백업)
        if "value" in rule and "value" not in new_rule:
            new_rule["value"] = rule["value"]
            
        # 5. match 처리
        if "match" in rule:
            new_rule["match"] = rule["match"]
            
        # 6. 기타 부가 필드 (case_sensitive 등) 복사
        for k, v in rule.items():
            if k not in ["text", "target", "selector", "attr", "value", "match"]:
                new_rule[k] = v
                
        # 보기 좋은 순서대로 키 정렬
        ordered_rule = {}
        for key in keys_order:
            if key in new_rule:
                ordered_rule[key] = new_rule[key]
        for key, value in new_rule.items():
            if key not in ordered_rule:
                ordered_rule[key] = value
                
        normalized.append(ordered_rule)
    return normalized

def process_tasks(file_paths, prefix):
    all_tasks = []
    for fp in file_paths:
        with open(fp, "r", encoding="utf-8") as f:
            tasks = json.load(f)
            all_tasks.extend(tasks)
            
    normalized_tasks = []
    for idx, task in enumerate(all_tasks, 1):
        new_task = {
            "task_id": f"{prefix}_{idx:03d}",
            "instruction": task.get("instruction", ""),
            "website": task.get("website", ""),
            "evaluation": {}
        }
        
        old_eval = task.get("evaluation", {})
        new_eval = {}
        
        # mode 기본값을 "dom"으로 설정 (웹 태스크 지원)
        new_eval["mode"] = old_eval.get("mode", "dom")
        
        # operator가 있는 경우 추가 (and / or)
        if "operator" in old_eval:
            new_eval["operator"] = old_eval["operator"]
            
        # rules 배열 정규화
        old_rules = old_eval.get("rules", [])
        new_eval["rules"] = normalize_rules(old_rules)
        
        # 기타 누락된 evaluation 필드 복사
        for k, v in old_eval.items():
            if k not in ["mode", "operator", "rules"]:
                new_eval[k] = v
                
        new_task["evaluation"] = new_eval
        normalized_tasks.append(new_task)
        
    return normalized_tasks

def main():
    base_dir = Path(__file__).parent.resolve()
    print(f"Base Directory: {base_dir}")
    
    # 1. CLI 터미널 기반 태스크 파일
    cli_files = [
        base_dir / "surfgym_tasks_001_010.json",
        base_dir / "surfgym_tasks_011_020.json"
    ]
    
    # 2. GUI 데스크톱 기반 태스크 파일
    gui_files = [
        base_dir / "task_prozillaos_0507 copy.json",
        base_dir / "task_prozillaos_A_1~10.json",
        base_dir / "task_prozillaos_A_11~20.json",
        base_dir / "task_prozillaos_A_21~34.json"
    ]
    
    # 3. Web 일반 브라우저 기반 태스크 파일
    web_files = [
        base_dir / "web_tasks_8.json"
    ]
    
    print("\nProcessing task normalization and integration...")
    cli_tasks = process_tasks(cli_files, "prozilla_cli")
    gui_tasks = process_tasks(gui_files, "prozilla_gui")
    web_tasks = process_tasks(web_files, "web_task")
    
    total_tasks = len(cli_tasks) + len(gui_tasks) + len(web_tasks)
    print(f"-> CLI Tasks converted: {len(cli_tasks)}")
    print(f"-> GUI Tasks converted: {len(gui_tasks)}")
    print(f"-> Web Tasks converted: {len(web_tasks)}")
    print(f"-> Total generated tasks: {total_tasks}")
    
    # 이행 데이터 무손실 검증 (총합 74개 확인)
    assert total_tasks == 74, f"Error: Task count mismatch! (Expected: 74, Got: {total_tasks})"
    
    # 표준화된 JSON 파일 쓰기
    with open(base_dir / "prozilla_cli_tasks.json", "w", encoding="utf-8") as f:
        json.dump(cli_tasks, f, indent=4, ensure_ascii=False)
    print("[OK] prozilla_cli_tasks.json saved successfully")
        
    with open(base_dir / "prozilla_gui_tasks.json", "w", encoding="utf-8") as f:
        json.dump(gui_tasks, f, indent=4, ensure_ascii=False)
    print("[OK] prozilla_gui_tasks.json saved successfully")
        
    with open(base_dir / "web_tasks.json", "w", encoding="utf-8") as f:
        json.dump(web_tasks, f, indent=4, ensure_ascii=False)
    print("[OK] web_tasks.json saved successfully")
    
    print("\nAll tasks normalized and integrated successfully based on 0507 schema!")

if __name__ == "__main__":
    main()
