#!/usr/bin/env python
"""Test GPA parsing function"""

def _parse_gpa(gpa_value):
    if gpa_value is None:
        return None
    
    gpa_str = str(gpa_value).strip()
    
    if not gpa_str:
        return None
    
    try:
        return float(gpa_str)
    except (ValueError, TypeError):
        pass
    
    if '/' in gpa_str:
        parts = gpa_str.split('/')
        if len(parts) >= 2:
            try:
                return float(parts[0].strip())
            except (ValueError, TypeError):
                pass
    
    if 'out of' in gpa_str.lower():
        parts = gpa_str.lower().split('out of')
        if len(parts) >= 2:
            try:
                return float(parts[0].strip())
            except (ValueError, TypeError):
                pass
    
    return None

# Test cases
test_cases = [
    ('3.8', 3.8),
    ('3.8/4.0', 3.8),
    ('8.5/10', 8.5),
    ('3.8 out of 4.0', 3.8),
    (None, None),
    ('', None),
    ('invalid', None),
]

print("Testing GPA parsing:")
for input_val, expected in test_cases:
    result = _parse_gpa(input_val)
    status = "PASS" if result == expected else "FAIL"
    print(f"{status}: _parse_gpa({repr(input_val)}) = {result}, expected {expected}")
