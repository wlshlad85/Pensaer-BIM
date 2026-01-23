"""
Pensaer BIM Demo - Cursor Control Script
Controls the actual mouse cursor to demonstrate the app
"""

import pyautogui
import time
import sys

# Safety settings
pyautogui.FAILSAFE = True  # Move mouse to corner to abort
pyautogui.PAUSE = 0.1  # Small pause between actions

def slow_type(text, interval=0.05):
    """Type text slowly so it's visible in recording"""
    for char in text:
        pyautogui.write(char, interval=interval)
        time.sleep(0.02)

def type_command(cmd, pause_after=4):
    """Type a command and press enter"""
    print(f"Typing: {cmd}")
    pyautogui.typewrite(cmd, interval=0.08)
    time.sleep(0.5)
    pyautogui.press('enter')
    time.sleep(pause_after)

def click_at(x, y, pause_after=2):
    """Move cursor and click at position"""
    print(f"Clicking at ({x}, {y})")
    pyautogui.moveTo(x, y, duration=1.0)
    time.sleep(0.3)
    pyautogui.click()
    time.sleep(pause_after)

def find_and_click_text(text):
    """Try to find text on screen and click it"""
    try:
        location = pyautogui.locateOnScreen(text)
        if location:
            pyautogui.click(location)
            return True
    except:
        pass
    return False

def run_demo():
    """Run the full demo with cursor control"""
    print("=" * 50)
    print("PENSAER BIM DEMO - Starting in 3 seconds...")
    print("Move mouse to top-left corner to ABORT")
    print("=" * 50)
    time.sleep(3)

    # Get screen size
    screen_width, screen_height = pyautogui.size()
    print(f"Screen size: {screen_width}x{screen_height}")

    # For 1680x1050 screen with Pensaer app
    # Terminal input is at the bottom of the app
    terminal_x = 400  # Middle-left area where terminal input is
    terminal_y = 980  # Near bottom of screen

    # Click on terminal area
    print("\n--- Clicking terminal ---")
    click_at(terminal_x, terminal_y, pause_after=1)

    # Continue building walls (user already drew first wall)
    print("\n--- Building remaining walls ---")
    type_command("wall --start 10,0 --end 10,8 --height 3", pause_after=2)
    type_command("wall --start 10,8 --end 0,8 --height 3", pause_after=2)
    type_command("wall --start 0,8 --end 0,0 --height 3", pause_after=2)
    type_command("wall --start 6,0 --end 6,8 --height 3", pause_after=2)

    # Add floor
    print("\n--- Adding floor ---")
    type_command("floor --min 0,0 --max 10,8", pause_after=2)

    # Add roof
    print("\n--- Adding roof ---")
    type_command("roof --min 0,0 --max 10,8 --type gable --slope 30", pause_after=3)

    # Click view buttons - positioned in top-left of 3D canvas
    # Adjusted for 1680x1050 screen with left panel ~200px
    view_buttons_x = 280  # Left side of canvas area
    top_y = 140
    front_y = 175
    perspective_y = 210
    rotate_y = 245

    print("\n--- Switching views ---")
    click_at(view_buttons_x, top_y, pause_after=2)  # Top view
    click_at(view_buttons_x, front_y, pause_after=2)  # Front view
    click_at(view_buttons_x, perspective_y, pause_after=2)  # Perspective view

    # Back to terminal for status
    print("\n--- Status commands ---")
    click_at(terminal_x, terminal_y, pause_after=1)
    type_command("status", pause_after=2)
    type_command("list", pause_after=2)
    type_command("select-all", pause_after=2)
    type_command("deselect", pause_after=2)

    # Undo/Redo demo
    print("\n--- Undo/Redo demo ---")
    type_command("undo", pause_after=2)
    type_command("redo", pause_after=2)

    print("\n" + "=" * 50)
    print("DEMO COMPLETE!")
    print("=" * 50)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--calibrate":
        # Calibration mode - shows mouse position
        print("Calibration mode - move mouse and watch coordinates")
        print("Press Ctrl+C to stop")
        try:
            while True:
                x, y = pyautogui.position()
                print(f"Mouse position: ({x}, {y})", end='\r')
                time.sleep(0.1)
        except KeyboardInterrupt:
            print("\nCalibration stopped")
    else:
        run_demo()
