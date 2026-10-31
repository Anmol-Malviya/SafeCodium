from pathlib import Path

path = Path("backend/app/services/analysis/ast_scanner.py")
text = path.read_text(encoding="utf-8").replace("\r\n", "\n")

target = """            # 2. Check for CWE-476 (NULL Pointer Dereference on parameters inside body)
            if fn and idx > fn.start_line:
                for param in fn.params:
                    # If parameter is a pointer
                    if "*" in param or "const" in param:
                        parts = param.replace("*", " ").split()
                        param_name = parts[-1].strip() if parts else ""
                        if not param_name or param_name.startswith("char"):
                            continue

                        # Check if param_name is dereferenced like param_name[0] or *param_name
                        deref_pattern = rf"(\\*{param_name}\\b|{param_name}\\[[^\\]]+\\]|{param_name}->)"
                        if re.search(deref_pattern, line_str):"""

replacement = """            # 2. Check for CWE-476 (NULL Pointer Dereference on parameters inside body)
            if fn and idx > fn.start_line:
                for param in fn.params:
                    # If parameter is a pointer
                    if "*" in param or "const" in param:
                        clean_param = param.replace("*", " ").replace("[", " ").replace("]", " ")
                        parts = clean_param.split()
                        param_name = parts[-1].strip() if parts else ""
                        if not param_name or param_name in {"char", "void", "int", "float", "double", "bool"} or param_name.startswith("char"):
                            continue

                        # Check if param_name is dereferenced safely using escaped name
                        safe_name = re.escape(param_name)
                        deref_pattern = rf"(\\*{safe_name}\\b|{safe_name}\\[[^\\]]+\\]|{safe_name}->)"
                        if re.search(deref_pattern, line_str):"""

assert target in text, "Target block not found in ast_scanner.py"
text = text.replace(target, replacement, 1)
path.write_text(text, encoding="utf-8", newline="\n")
print("Successfully updated ast_scanner.py!")

