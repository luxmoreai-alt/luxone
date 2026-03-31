import pathlib
root = pathlib.Path('src')
count = 0
for path in root.rglob('*'):
    if path.suffix in ('.ts', '.tsx', '.css'):
        text = path.read_text(encoding='utf-8')
        if '#4d76ff' in text:
            text2 = text.replace('#4d76ff', '#359de9')
            path.write_text(text2, encoding='utf-8')
            count += 1
print('updated files', count)
