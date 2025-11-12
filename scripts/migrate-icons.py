#!/usr/bin/env python3
"""
Icon Migration Script
Automatically migrates lucide-react icon imports to use the centralized Icon system.
"""

import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Icon name mapping
ICON_MAP = {
    'HelpCircle': 'ICONS.HELP',
    'Loader2': 'ICONS.LOADING',
    'CheckCircle2': 'ICONS.SUCCESS',
    'CheckCircle': 'ICONS.SUCCESS_ALT',
    'AlertCircle': 'ICONS.WARNING',
    'AlertTriangle': 'ICONS.ALERT',
    'XCircle': 'ICONS.ERROR',
    'X': 'ICONS.CLOSE',
    'Check': 'ICONS.CHECK',
    'Plus': 'ICONS.PLUS',
    'Trash2': 'ICONS.DELETE',
    'Edit2': 'ICONS.EDIT',
    'Save': 'ICONS.SAVE',
    'Search': 'ICONS.SEARCH',
    'Menu': 'ICONS.MENU',
    'ExternalLink': 'ICONS.EXTERNAL_LINK',
    'Link2': 'ICONS.LINK',
    'ChevronDown': 'ICONS.CHEVRON_DOWN',
    'ChevronUp': 'ICONS.CHEVRON_UP',
    'ChevronLeft': 'ICONS.CHEVRON_LEFT',
    'ChevronRight': 'ICONS.CHEVRON_RIGHT',
    'ArrowLeft': 'ICONS.ARROW_LEFT',
    'ArrowRight': 'ICONS.ARROW_RIGHT',
    'ArrowUp': 'ICONS.ARROW_UP',
    'ArrowDown': 'ICONS.ARROW_DOWN',
    'ArrowUpDown': 'ICONS.ARROW_UP_DOWN',
    'Home': 'ICONS.HOME',
    'FileText': 'ICONS.FILE_TEXT',
    'FileIcon': 'ICONS.FILE_ICON',
    'BookOpen': 'ICONS.BOOK_OPEN',
    'Upload': 'ICONS.UPLOAD',
    'Wrench': 'ICONS.WRENCH',
    'Package': 'ICONS.PACKAGE',
    'Calendar': 'ICONS.CALENDAR',
    'Clock': 'ICONS.CLOCK',
    'MapPin': 'ICONS.MAP_PIN',
    'TrendingUp': 'ICONS.TRENDING_UP',
    'TrendingDown': 'ICONS.TRENDING_DOWN',
    'BarChart3': 'ICONS.BAR_CHART',
    'PieChart': 'ICONS.PIE_CHART',
    'Minus': 'ICONS.MINUS',
    'User': 'ICONS.USER',
    'Users': 'ICONS.USERS',
    'MessageSquare': 'ICONS.MESSAGE',
    'Sparkles': 'ICONS.SPARKLES',
    'Volume2': 'ICONS.VOLUME_ON',
    'VolumeX': 'ICONS.VOLUME_OFF',
    'Play': 'ICONS.PLAY',
    'Pause': 'ICONS.PAUSE',
    'Square': 'ICONS.STOP',
    'Mic': 'ICONS.MIC_ON',
    'MicOff': 'ICONS.MIC_OFF',
    'LayoutDashboard': 'ICONS.DASHBOARD',
    'Shield': 'ICONS.SHIELD',
    'CheckIcon': 'ICONS.CHECK_ICON',
    'ChevronDownIcon': 'ICONS.CHEVRON_DOWN_ICON',
    'ChevronUpIcon': 'ICONS.CHEVRON_UP_ICON',
    'CircleIcon': 'ICONS.CIRCLE_ICON',
}

def extract_icon_imports(content: str) -> Tuple[List[str], str]:
    """Extract icon names from lucide-react import statement."""
    import_pattern = r'import\s+\{([^}]+)\}\s+from\s+[\'"]lucide-react[\'"];?'
    match = re.search(import_pattern, content)

    if not match:
        return [], content

    import_text = match.group(0)
    icons_text = match.group(1)
    icons = [icon.strip() for icon in icons_text.split(',')]

    return icons, import_text

def replace_import(content: str) -> str:
    """Replace lucide-react import with Icon system imports."""
    icons, import_text = extract_icon_imports(content)

    if not icons:
        return content

    new_imports = "import { Icon } from '@/components/ui/icons';\nimport { ICONS } from '@/lib/config/icons';"
    content = content.replace(import_text, new_imports)

    return content

def size_to_prop(size_class: str) -> str:
    """Convert className size to Icon size prop."""
    size_map = {
        'h-3 w-3': '"xs"',
        'h-3.5 w-3.5': '{14}',
        'h-4 w-4': '"sm"',
        'h-5 w-5': '"md"',
        'h-6 w-6': '"lg"',
        'h-8 w-8': '"xl"',
    }
    return size_map.get(size_class, '"md"')

def replace_icon_usage(content: str, icon_name: str) -> str:
    """Replace individual icon usages with Icon component."""
    if icon_name not in ICON_MAP:
        print(f"⚠️  Warning: No mapping for icon '{icon_name}'")
        return content

    icon_const = ICON_MAP[icon_name]

    # Pattern 1: <IconName className="h-X w-X ..." />
    pattern1 = rf'<{icon_name}\s+className="([^"]*)"(\s*/?>)'

    def replace1(match):
        class_name = match.group(1)
        closing = match.group(2)

        # Extract size from className
        size_match = re.search(r'h-[\d.]+ w-[\d.]+', class_name)
        if size_match:
            size_class = size_match.group(0)
            size_prop = size_to_prop(size_class)
            # Remove size from className
            remaining_classes = re.sub(r'h-[\d.]+ w-[\d.]+\s*', '', class_name).strip()
        else:
            size_prop = '"md"'
            remaining_classes = class_name.strip()

        if remaining_classes:
            return f'<Icon name={{{icon_const}}} size={size_prop} className="{remaining_classes}"{closing}'
        else:
            return f'<Icon name={{{icon_const}}} size={size_prop}{closing}'

    content = re.sub(pattern1, replace1, content)

    # Pattern 2: <IconName /> (no className)
    pattern2 = rf'<{icon_name}\s*/>'
    content = re.sub(pattern2, f'<Icon name={{{icon_const}}} size="md" />', content)

    return content

def migrate_file(file_path: Path) -> bool:
    """Migrate a single file."""
    try:
        content = file_path.read_text()
        original_content = content

        # Extract icons used
        icons, _ = extract_icon_imports(content)

        if not icons:
            return False

        print(f"\n📄 Migrating: {file_path}")
        print(f"   Icons: {', '.join(icons)}")

        # Replace imports
        content = replace_import(content)

        # Replace each icon usage
        for icon in icons:
            content = replace_icon_usage(content, icon)

        # Write back if changed
        if content != original_content:
            file_path.write_text(content)
            print(f"   ✅ Migrated successfully")
            return True
        else:
            print(f"   ⚠️  No changes made")
            return False

    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    """Main migration function."""
    if len(sys.argv) < 2:
        print("Usage: python migrate-icons.py <file_or_directory>")
        sys.exit(1)

    path = Path(sys.argv[1])

    if not path.exists():
        print(f"❌ Path does not exist: {path}")
        sys.exit(1)

    files_to_migrate = []

    if path.is_file():
        files_to_migrate = [path]
    else:
        # Find all .tsx files with lucide-react imports
        files_to_migrate = [
            f for f in path.rglob('*.tsx')
            if 'lucide-react' in f.read_text()
        ]

    print(f"🔧 Starting icon migration for {len(files_to_migrate)} files...")

    migrated_count = 0
    for file_path in files_to_migrate:
        if migrate_file(file_path):
            migrated_count += 1

    print(f"\n✅ Migration complete!")
    print(f"   Migrated: {migrated_count}/{len(files_to_migrate)} files")

if __name__ == '__main__':
    main()
