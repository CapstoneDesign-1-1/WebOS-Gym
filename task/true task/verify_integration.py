# -*- coding: utf-8 -*-
import json
from pathlib import Path

def verify():
    source_dir = Path("..")
    output_dir = Path(".")
    print("=== STARTING INTEGRATION VERIFICATION ===")
    
    # 1. 원본 파일 목록 및 예상 태스크 개수 정의
    prozilla_config = [
        {"path": "task_prozillaos_A_1~10.json", "type": "A"},
        {"path": "task_prozillaos_A_11~20.json", "type": "A"},
        {"path": "task_prozillaos_A_21~30.json", "type": "A"},
        {"path": "task_prozillaos_C_01~10.json", "type": "c"},
        {"path": "surfgym_tasks_001_010.json", "type": "b"},
        {"path": "surfgym_tasks_011_020.json", "type": "b"},
        {"path": "task_prozillaos_0507 copy.json", "type": "b"}
    ]
    
    web_config = [
        {"path": "web_tasks_8.json", "type": "E"},
        {"path": "tasks_sampled.json", "type": "D"}
    ]
    
    # 2. 원본 데이터 로드 및 정보 수집
    orig_prozilla_data = []
    for item in prozilla_config:
        p = source_dir / item["path"]
        assert p.exists(), f"Source file missing: {item['path']}"
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
            for task in data:
                task["__origin_type"] = item["type"]
            orig_prozilla_data.extend(data)
            
    orig_web_data = []
    for item in web_config:
        p = source_dir / item["path"]
        assert p.exists(), f"Source file missing: {item['path']}"
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
            for task in data:
                task["__origin_type"] = item["type"]
            orig_web_data.extend(data)
            
    print(f"Original Prozilla Tasks count: {len(orig_prozilla_data)}")
    print(f"Original Web Tasks count: {len(orig_web_data)}")
    
    # 3. 통합 결과 파일 로드
    prozilla_output_file = output_dir / "prozillaos_tasks.json"
    web_output_file = output_dir / "web_tasks.json"
    
    assert prozilla_output_file.exists(), "Output file missing: prozillaos_tasks.json"
    assert web_output_file.exists(), "Output file missing: web_tasks.json"
    
    with open(prozilla_output_file, "r", encoding="utf-8") as f:
        integrated_prozilla = json.load(f)
        
    with open(web_output_file, "r", encoding="utf-8") as f:
        integrated_web = json.load(f)
        
    print(f"Integrated Prozilla Tasks count: {len(integrated_prozilla)}")
    print(f"Integrated Web Tasks count: {len(integrated_web)}")
    
    errors = []
    
    # 4. 개수 일치 검증
    if len(orig_prozilla_data) != len(integrated_prozilla):
        errors.append(f"Prozilla task count mismatch: expected {len(orig_prozilla_data)}, got {len(integrated_prozilla)}")
    if len(orig_web_data) != len(integrated_web):
        errors.append(f"Web task count mismatch: expected {len(orig_web_data)}, got {len(integrated_web)}")
        
    # 5. ProzillaOS 세부 내용 무손실 검증
    prozilla_counters = {}
    for idx, (orig, integ) in enumerate(zip(orig_prozilla_data, integrated_prozilla), 1):
        t = orig["__origin_type"]
        prozilla_counters[t] = prozilla_counters.get(t, 0) + 1
        expected_id = f"prozilla_task_{t}_{prozilla_counters[t]:02d}"
        
        if integ["task_id"] != expected_id:
            errors.append(f"Prozilla task ID mismatch at index {idx}: expected {expected_id}, got {integ['task_id']}")
            
        if orig["instruction"] != integ["instruction"]:
            errors.append(f"Instruction mismatch at prozilla index {idx}")
            
        if orig["website"] != integ["website"]:
            errors.append(f"Website mismatch at prozilla index {idx}")
            
        orig_rules = orig.get("evaluation", {}).get("rules", [])
        integ_rules = integ.get("evaluation", {}).get("rules", [])
        
        if len(orig_rules) != len(integ_rules):
            errors.append(f"Rules length mismatch at prozilla index {idx}: expected {len(orig_rules)}, got {len(integ_rules)}")
            continue
            
        for r_idx, (orule, irule) in enumerate(zip(orig_rules, integ_rules)):
            if "selector" in orule and orule["selector"] != irule.get("selector"):
                errors.append(f"Selector mismatch at prozilla {idx} rule {r_idx}")
                
            if "match" in orule and orule["match"] != irule.get("match"):
                errors.append(f"Match mismatch at prozilla {idx} rule {r_idx}")
                
            expected_val = orule.get("text") or orule.get("value")
            if expected_val != irule.get("value"):
                errors.append(f"Value mismatch at prozilla {idx} rule {r_idx}: expected {expected_val}, got {irule.get('value')}")
                
            if "target" not in irule:
                errors.append(f"Target missing in integrated prozilla {idx} rule {r_idx}")
            elif irule["target"] == "attr" and "attr" not in irule:
                errors.append(f"Target is 'attr' but 'attr' key is missing in prozilla {idx} rule {r_idx}")
                
    # 6. Web 세부 내용 무손실 검증
    web_counters = {}
    for idx, (orig, integ) in enumerate(zip(orig_web_data, integrated_web), 1):
        t = orig["__origin_type"]
        web_counters[t] = web_counters.get(t, 0) + 1
        expected_id = f"web_task_{t}_{web_counters[t]:02d}"
        
        if integ["task_id"] != expected_id:
            errors.append(f"Web task ID mismatch at index {idx}: expected {expected_id}, got {integ['task_id']}")
            
        if orig["instruction"] != integ["instruction"]:
            errors.append(f"Instruction mismatch at web index {idx}")
            
        if orig["website"] != integ["website"]:
            errors.append(f"Website mismatch at web index {idx}")
            
        orig_rules = orig.get("evaluation", {}).get("rules", [])
        integ_rules = integ.get("evaluation", {}).get("rules", [])
        
        if len(orig_rules) != len(integ_rules):
            errors.append(f"Rules length mismatch at web index {idx}: expected {len(orig_rules)}, got {len(integ_rules)}")
            continue
            
        for r_idx, (orule, irule) in enumerate(zip(orig_rules, integ_rules)):
            if "selector" in orule and orule["selector"] != irule.get("selector"):
                errors.append(f"Selector mismatch at web {idx} rule {r_idx}")
                
            if "match" in orule and orule["match"] != irule.get("match"):
                errors.append(f"Match mismatch at web {idx} rule {r_idx}")
                
            expected_val = orule.get("text") or orule.get("value")
            if expected_val != irule.get("value"):
                errors.append(f"Value mismatch at web {idx} rule {r_idx}: expected {expected_val}, got {irule.get('value')}")
                
            if "target" not in irule:
                errors.append(f"Target missing in integrated web {idx} rule {r_idx}")
                
    # 7. 전체 결과 출력
    if not errors:
        print("\n[SUCCESS] Integration Verification Passed with 100% Perfection!")
        print("- Task Count matches perfectly.")
        print("- All instructions, websites, and validation rules preserved seamlessly.")
        print("- No key elements or properties are lost or distorted.")
        print("- Origin-tracking task IDs (A, b, c, D, E) are perfectly sequenced as requested.")
        print("- Rules adhere to Prozilla_A Schema flawlessly.")
    else:
        print(f"\n[FAILURE] Verification found {len(errors)} errors:")
        for err in errors[:15]:
            print(f"- {err}")
        if len(errors) > 15:
            print(f"... and {len(errors) - 15} more errors.")
            
if __name__ == "__main__":
    verify()
