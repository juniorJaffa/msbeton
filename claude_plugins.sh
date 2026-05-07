#!/bin/bash
# setup_web_skills.sh

mkdir -p .claude/skills

echo "----------------------------------------------------"
echo "🚀 FINAL FIX (TAR VERSION)"
echo "----------------------------------------------------"

install_skill() {
    local name=$1
    local url=$2
    echo "⬇️ Sťahujem $name..."
    rm -rf ".claude/skills/$name"
    mkdir -p ".claude/skills/$name"
    
    # Použitie čistého curl -L na stiahnutie tar.gz
    curl -L "$url" | tar xz -C ".claude/skills/$name" --strip-components=1
    
    if [ "$(ls -A .claude/skills/$name)" ]; then
        echo "✅ $name: OK"
    else
        echo "❌ $name: FAILED"
    fi
}

install_skill "ui-ux-pro-max" "https://github.com"
install_skill "design-extract" "https://github.com"
install_skill "gstack" "https://github.com"

echo "----------------------------------------------------"
ls -la .claude/skills/ui-ux-pro-max
