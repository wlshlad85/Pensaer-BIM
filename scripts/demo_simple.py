"""
Simple Demo - Just types commands (you click terminal first)
"""
import pyautogui
import time

pyautogui.FAILSAFE = True

def type_cmd(cmd, wait=5):
    """Type command slowly and press enter"""
    print(f">>> {cmd}")
    time.sleep(0.5)
    pyautogui.write(cmd, interval=0.08)
    time.sleep(0.5)
    pyautogui.press('return')
    time.sleep(wait)

print("=" * 50)
print("PENSAER DEMO - Click in the terminal input NOW!")
print("Demo starts in 5 seconds...")
print("=" * 50)
time.sleep(5)

# Reset
type_cmd("reset", wait=3)

# Build walls
type_cmd("wall --start 0,0 --end 10,0 --height 3", wait=4)
type_cmd("wall --start 10,0 --end 10,8 --height 3", wait=4)
type_cmd("wall --start 10,8 --end 0,8 --height 3", wait=4)
type_cmd("wall --start 0,8 --end 0,0 --height 3", wait=4)
type_cmd("wall --start 6,0 --end 6,8 --height 3", wait=4)

# Floor and roof
type_cmd("floor --min 0,0 --max 10,8", wait=4)
type_cmd("roof --min 0,0 --max 10,8 --type gable --slope 30", wait=5)

# Status
type_cmd("status", wait=3)

print("\n" + "=" * 50)
print("DEMO COMPLETE!")
print("=" * 50)
