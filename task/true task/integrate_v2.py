import json
from pathlib import Path

def normalize_rules(rules):
    normalized = []
    for rule in rules:
        new_rule = {}
        # 0507/Prozilla_A 표준 스키마 룰 순서 정의 (selector, target, attr, value, match)
        keys_order = ["selector", "target", "attr", "value", "match"]
        
        # 1. text -> target/value 변환 처리
        if "text" in rule and "target" not in rule:
            new_rule["target"] = "text"
            new_rule["value"] = rule["text"]
        elif "target" in rule:
            new_rule["target"] = rule["target"]
            if "value" in rule:
                new_rule["value"] = rule["value"]
        elif "value" in rule and "target" not in rule:
            new_rule["target"] = "text"
            new_rule["value"] = rule["value"]
        
        # 2. selector 지정
        if "selector" in rule:
            new_rule["selector"] = rule["selector"]
            
        # 3. attr 속성 처리
        if "attr" in rule:
            new_rule["attr"] = rule["attr"]
            new_rule["target"] = "attr"
            
        # 4. value 매핑 백업 (아직 지정되지 않은 경우)
        if "value" in rule and "value" not in new_rule:
            new_rule["value"] = rule["value"]
            
        # 5. match 처리
        if "match" in rule:
            new_rule["match"] = rule["match"]
            
        # 6. 기타 부가 필드 복사
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

def process_tasks_with_types(base_dir, files_config, prefix):
    counters = {}
    normalized_tasks = []
    
    for item in files_config:
        fp = base_dir.parent / item["path"]
        t = item["type"]
        
        with open(fp, "r", encoding="utf-8") as f:
            tasks = json.load(f)
            
        for task in tasks:
            counters[t] = counters.get(t, 0) + 1
            idx = counters[t]
            
            new_task = {
                "task_id": f"{prefix}_{t}_{idx:02d}",
                "instruction": task.get("instruction", ""),
                "website": task.get("website", ""),
                "evaluation": {}
            }
            
            old_eval = task.get("evaluation", {})
            new_eval = {}
            
            # mode 정규화
            original_mode = old_eval.get("mode", "dom")
            if original_mode == "all":
                new_eval["mode"] = "dom"
            else:
                new_eval["mode"] = original_mode
            
            # rules 정규화
            old_rules = old_eval.get("rules", [])
            new_rules = normalize_rules(old_rules)
            
            # operator 설정
            if len(new_rules) >= 2:
                new_eval["operator"] = old_eval.get("operator", "and")
            elif "operator" in old_eval:
                new_eval["operator"] = old_eval["operator"]
                
            new_eval["rules"] = new_rules
            
            # 기타 evaluation 필드 복사
            for k, v in old_eval.items():
                if k not in ["mode", "operator", "rules"]:
                    new_eval[k] = v
                    
            new_task["evaluation"] = new_eval
            normalized_tasks.append(new_task)
            
    return normalized_tasks

def main():
    base_dir = Path(__file__).parent.resolve()
    print(f"Base Directory: {base_dir}")
    
    # ProzillaOS 소스 설정 (A->A, C->c, 그외 터미널->b)
    prozilla_config = [
        {"path": "task_prozillaos_A_1~10.json", "type": "A"},
        {"path": "task_prozillaos_A_11~20.json", "type": "A"},
        {"path": "task_prozillaos_A_21~30.json", "type": "A"},
        {"path": "task_prozillaos_C_01~10.json", "type": "c"},
        {"path": "surfgym_tasks_001_010.json", "type": "b"},
        {"path": "surfgym_tasks_011_020.json", "type": "b"},
        {"path": "task_prozillaos_0507 copy.json", "type": "b"}
    ]
    
    # Web 소스 설정 (web task 8->E, web sample->D)
    web_config = [
        {"path": "web_tasks_8.json", "type": "E"},
        {"path": "tasks_sampled.json", "type": "D"}
    ]
    
    print("\nProcessing task normalization and integration with origin tracking IDs...")
    prozilla_tasks = process_tasks_with_types(base_dir, prozilla_config, "prozilla_task")
    web_tasks = process_tasks_with_types(base_dir, web_config, "web_task")
    
    print(f"-> ProzillaOS Tasks converted: {len(prozilla_tasks)}")
    print(f"-> Web Tasks converted: {len(web_tasks)}")
    print(f"-> Total: {len(prozilla_tasks) + len(web_tasks)}")
    
    # 검증
    assert len(prozilla_tasks) == 73, f"Error: ProzillaOS task count mismatch! Expected: 73, Got: {len(prozilla_tasks)}"
    assert len(web_tasks) == 22, f"Error: Web task count mismatch! Expected: 22, Got: {len(web_tasks)}"
    
    # 파일 저장
    prozilla_output = base_dir / "prozillaos_tasks.json"
    web_output = base_dir / "web_tasks.json"
    
    with open(prozilla_output, "w", encoding="utf-8") as f:
        json.dump(prozilla_tasks, f, indent=4, ensure_ascii=False)
    print(f"[OK] prozillaos_tasks.json saved successfully to {prozilla_output}")
        
    with open(web_output, "w", encoding="utf-8") as f:
        json.dump(web_tasks, f, indent=4, ensure_ascii=False)
    print(f"[OK] web_tasks.json saved successfully to {web_output}")
    
    print("\nAll tasks integrated and tracked successfully!")

if __name__ == "__main__":
    main()
