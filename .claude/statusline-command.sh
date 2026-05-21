#!/bin/bash
# Claude Code status line
# Shows context usage with dimmed color and cache indicator with reversed colors

input=$(cat)

output=""

# Cache indicator (reversed/inverted colors via \e[7m)
cache_create=$(echo "$input" | jq -r '.context_window.current_usage.cache_creation_input_tokens // 0')
cache_read=$(echo "$input" | jq -r '.context_window.current_usage.cache_read_input_tokens // 0')

if [ "$cache_create" -gt 0 ] 2>/dev/null || [ "$cache_read" -gt 0 ] 2>/dev/null; then
    cache_total=$((cache_create + cache_read))
    if [ "$cache_total" -ge 1048576 ]; then
        cache_text="$(( cache_total / 1048576 ))M"
    elif [ "$cache_total" -ge 1024 ]; then
        cache_text="$(( cache_total / 1024 ))K"
    else
        cache_text="${cache_total}B"
    fi
    output="${output}\e[7mCACHE ${cache_text}\e[0m"
fi

# Context usage with dimmed color (green < 50%, yellow < 80%, red >= 80%)
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
if [ -n "$used" ]; then
    used_int=$(printf '%.0f' "$used")
    if [ "$used_int" -lt 50 ]; then
        color="\e[2;32m"  # dim green
    elif [ "$used_int" -lt 80 ]; then
        color="\e[2;33m"  # dim yellow
    else
        color="\e[2;31m"  # dim red
    fi
    output="${output} ${color}ctx: ${used_int}%\e[0m"
fi

printf "%b" "$output"
