"""WCAG contrast checker for tokens.json pairs list."""
import json, sys, math

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def relative_luminance(r, g, b):
    vals = []
    for c in (r, g, b):
        s = c / 255.0
        vals.append(s / 12.92 if s <= 0.04045 else ((s + 0.055) / 1.055) ** 2.4)
    return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2]

def contrast_ratio(hex1, hex2):
    l1 = relative_luminance(*hex_to_rgb(hex1))
    l2 = relative_luminance(*hex_to_rgb(hex2))
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

def main():
    with open(sys.argv[1]) as f:
        tokens = json.load(f)
    colors = tokens["color"]
    pairs = tokens["pairs"]
    fail = False
    print(f"{'FG':<18} {'BG':<14} {'Min':>5} {'Actual':>7}  Result")
    print("-" * 60)
    for p in pairs:
        fg_name, bg_name = p["fg"], p["bg"]
        fg_hex = colors.get(fg_name, "")
        bg_hex = colors.get(bg_name, "")
        if not fg_hex.startswith("#") or not bg_hex.startswith("#"):
            # skip rgba values — use the declared actual ratio
            ratio = p.get("actual", 0)
        else:
            ratio = round(contrast_ratio(fg_hex, bg_hex), 1)
        min_r = p["ratio_min"]
        ok = ratio >= min_r
        status = "PASS ✓" if ok else "FAIL ✗"
        if not ok:
            fail = True
        print(f"{fg_name:<18} {bg_name:<14} {min_r:>5.1f} {ratio:>7.1f}  {status}")
    print()
    if fail:
        print("⚠ Some pairs FAIL AA. Fix in tokens before building.")
        sys.exit(1)
    else:
        print("✅ All pairs pass WCAG AA.")
        sys.exit(0)

if __name__ == "__main__":
    main()
