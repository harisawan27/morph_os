import os
import glob

for filepath in glob.glob(\"f:/morph_os/backend/*.py\"):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Check if there's a backslash followed by a quote
    if '\\\\\"' in content:
        content = content.replace('\\\\\"', '\"')
        with open(filepath, 'w') as f:
            f.write(content)
        print(f\"Fixed {filepath}\")
