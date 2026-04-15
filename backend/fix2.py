import os
import glob

# replace all literal backslash-quote pairs
files = glob.glob('f:/morph_os/backend/*.py')
for f in files:
    if 'fix' in f: continue
    with open(f, 'r') as file_obj:
        content = file_obj.read()
    
    # Simple replace
    new_content = content.replace('\\\"', '\"')
    
    with open(f, 'w') as file_obj:
        file_obj.write(new_content)
        
    print("Fixed", f)
